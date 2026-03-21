import { useState, useEffect, useCallback, useRef } from 'react';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { CheckCircle, Loader2, AlertCircle, Bell, Calendar as CalendarIcon, ChevronUp, ChevronDown } from 'lucide-react';
import MainLayout from '@/components/MainLayout';
import PatientSearch from '@/components/PatientSearch';
import DoctorSearch from '@/components/DoctorSearch';
import SlotSelector from '@/components/SlotSelector';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Calendar } from '@/components/ui/calendar';
import { Switch } from '@/components/ui/switch';
import { Separator } from '@/components/ui/separator';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { toast } from '@/hooks/use-toast';
import { cn, formatPhoneInput, formatPhoneForStorage } from '@/lib/utils';
import { getAvailableSlots, getAvailableDays, createPatient, createAppointment, getDoctorById } from '@/lib/api';
import { getLocalToday, isToday, getCurrentTimeInMinutes, timeStringToMinutes } from '@/lib/dateUtils';
import { useCurrentUser } from '@/context/UserContext';
import { useSingleDoctor } from '@/hooks/useSingleDoctor';
import { supabase } from '@/lib/supabaseClient';
import { updatePatientReminder3d } from '@/lib/api.supabase';
import type { Patient } from '@/types/patient';
import type { Doctor } from '@/types/doctor';

/**
 * NuevaCita - New appointment creation page
 *
 * Desktop: 2-column layout (left=who, right=when) with always-visible calendar
 * Mobile: single-column with toggle calendar popup
 */
export default function NuevaCita() {
  const { user, isDoctor, isDoctorView } = useCurrentUser();
  const { singleDoctor, isSingleDoctorOrg, isLoading: loadingDoctors } = useSingleDoctor();

  // Core selection state
  const [selectedPatient, setSelectedPatient] = useState<Patient | null>(null);
  const [selectedDoctor, setSelectedDoctor] = useState<Doctor | null>(null);
  const [selectedCalendarId, setSelectedCalendarId] = useState<string | undefined>();
  const [selectedDate, setSelectedDate] = useState<Date>();
  const [selectedSlot, setSelectedSlot] = useState<string | null>(null);
  const [calendarOpen, setCalendarOpen] = useState(false);
  const agendarRef = useRef<HTMLDivElement>(null);
  const fechaRef = useRef<HTMLDivElement>(null);

  // Duration state
  const [durationMinutes, setDurationMinutes] = useState<number>(30);
  const [reminder3dEnabled, setReminder3dEnabled] = useState(false);

  // Available days state
  const [currentMonth, setCurrentMonth] = useState<Date>(new Date());
  const [availableDaysMap, setAvailableDaysMap] = useState<Record<string, { canFit: boolean; working: boolean }>>({});
  const [isLoadingDays, setIsLoadingDays] = useState(false);
  const [errorDays, setErrorDays] = useState<string | null>(null);

  // Slots state
  const [availableSlots, setAvailableSlots] = useState<string[]>([]);
  const [isLoadingSlots, setIsLoadingSlots] = useState(false);

  // Loading states
  const [isLoadingDoctor, setIsLoadingDoctor] = useState(false);
  const [isCreatingAppointment, setIsCreatingAppointment] = useState(false);

  // Create patient dialog state
  const [isCreatePatientOpen, setIsCreatePatientOpen] = useState(false);
  const [newPatientName, setNewPatientName] = useState('');
  const [newPatientPhone, setNewPatientPhone] = useState('');
  const [isCreatingPatient, setIsCreatingPatient] = useState(false);

  // Duration options
  const durationOptions = [
    { value: 15, label: '15 min' },
    { value: 30, label: '30 min' },
    { value: 60, label: '1 hora' },
    { value: 90, label: '1.5 horas' },
    { value: 120, label: '2 horas' },
  ];

  // Auto-fill doctor for logged-in doctors
  useEffect(() => {
    if (isDoctorView && user?.doctorId && !selectedDoctor) {
      setIsLoadingDoctor(true);
      getDoctorById(user.doctorId)
        .then((doctor) => {
          if (doctor) {
            setSelectedDoctor(doctor);
          }
        })
        .catch((error) => {
          console.error('Error fetching doctor info:', error);
        })
        .finally(() => {
          setIsLoadingDoctor(false);
        });
    }
  }, [isDoctorView, user?.doctorId, selectedDoctor]);

  // Auto-fill doctor for single-doctor orgs
  useEffect(() => {
    if (isSingleDoctorOrg && singleDoctor && !selectedDoctor) {
      setSelectedDoctor(singleDoctor);
    }
  }, [isSingleDoctorOrg, singleDoctor, selectedDoctor]);

  // Auto-fill reminder toggle when patient is selected
  useEffect(() => {
    if (selectedPatient) {
      setReminder3dEnabled(selectedPatient.reminder3dPreferred ?? false);
    }
  }, [selectedPatient]);

  /**
   * Fetch available days when doctor, duration, or month changes
   */
  const fetchAvailableDays = useCallback(async (doctorId: string, month: Date, duration: number) => {
    const monthString = format(month, 'yyyy-MM');

    setIsLoadingDays(true);
    setErrorDays(null);

    try {
      const daysMap = await getAvailableDays({
        doctorId,
        month: monthString,
        durationMinutes: duration,
        calendarId: selectedCalendarId,
      });
      setAvailableDaysMap(daysMap);

      if (selectedDate) {
        const dateString = format(selectedDate, 'yyyy-MM-dd');
        if (daysMap[dateString] && !daysMap[dateString].canFit) {
          setSelectedDate(undefined);
          setSelectedSlot(null);
          setAvailableSlots([]);
        }
      }
    } catch (error) {
      console.error('[NuevaCita] Error fetching available days:', error);
      setErrorDays('No se pudieron cargar los días disponibles');
      setAvailableDaysMap({});
    } finally {
      setIsLoadingDays(false);
    }
  }, [selectedDate, selectedCalendarId]);

  // Trigger fetch when doctor, duration, or month changes
  useEffect(() => {
    if (selectedDoctor) {
      fetchAvailableDays(selectedDoctor.id, currentMonth, durationMinutes);
    }
  }, [selectedDoctor, currentMonth, durationMinutes, selectedCalendarId, fetchAvailableDays]);

  // Fetch available slots when doctor, date, or duration changes
  useEffect(() => {
    if (selectedDoctor && selectedDate) {
      setIsLoadingSlots(true);
      setSelectedSlot(null);

      const dateString = format(selectedDate, 'yyyy-MM-dd');
      getAvailableSlots({
        doctorId: selectedDoctor.id,
        date: dateString,
        durationMinutes: durationMinutes,
        calendarId: selectedCalendarId,
      })
        .then(slots => {
          let filteredSlots = slots;
          if (isToday(selectedDate)) {
            const currentTimeInMinutes = getCurrentTimeInMinutes();
            filteredSlots = slots.filter(slot => {
              const slotTimeInMinutes = timeStringToMinutes(slot);
              return slotTimeInMinutes > currentTimeInMinutes;
            });
          }
          setAvailableSlots(filteredSlots);
        })
        .catch(error => {
          console.error('Error loading slots:', error);
          setAvailableSlots([]);
        })
        .finally(() => {
          setIsLoadingSlots(false);
        });
    } else {
      setAvailableSlots([]);
      setSelectedSlot(null);
    }
  }, [selectedDoctor, selectedDate, durationMinutes, selectedCalendarId]);

  // Auto-scroll to Agendar button when slots finish loading
  useEffect(() => {
    if (!isLoadingSlots && availableSlots.length > 0) {
      setTimeout(() => {
        agendarRef.current?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
      }, 100);
    }
  }, [isLoadingSlots, availableSlots]);

  // Fetch calendarId when doctor changes
  useEffect(() => {
    setSelectedCalendarId(undefined);
    if (!selectedDoctor) return;
    supabase
      .from('calendar_doctors')
      .select('calendar_id')
      .eq('doctor_id', selectedDoctor.id)
      .eq('is_active', true)
      .maybeSingle()
      .then(({ data }) => setSelectedCalendarId(data?.calendar_id ?? undefined))
      .catch(() => {});
  }, [selectedDoctor?.id]);

  // Reset patient, date, slots, and available days when doctor changes
  useEffect(() => {
    setSelectedPatient(null);
    setSelectedDate(undefined);
    setSelectedSlot(null);
    setAvailableSlots([]);
    setAvailableDaysMap({});
    setCurrentMonth(new Date());
    setCalendarOpen(false);
  }, [selectedDoctor]);

  // Reset date and slots when duration changes
  useEffect(() => {
    setSelectedDate(undefined);
    setSelectedSlot(null);
    setAvailableSlots([]);
  }, [durationMinutes]);

  const handlePatientSelect = (patient: Patient) => {
    setSelectedPatient(patient);
    setTimeout(() => {
      fechaRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' });
    }, 150);
  };

  const handleDoctorSelect = (doctor: Doctor) => {
    setSelectedDoctor(doctor);
  };

  const handleMonthChange = (month: Date) => {
    setCurrentMonth(month);
  };

  const handleReminder3dToggle = (checked: boolean) => {
    setReminder3dEnabled(checked);
    if (selectedPatient) {
      updatePatientReminder3d(selectedPatient.id, checked); // fire-and-forget
    }
  };

  const isDateDisabled = (date: Date): boolean => {
    if (date < getLocalToday()) return true;

    const dateString = format(date, 'yyyy-MM-dd');
    const dayInfo = availableDaysMap[dateString];

    if (!dayInfo) return false;

    return !dayInfo.working || !dayInfo.canFit;
  };

  const handleCreateNewPatient = ({ nameOrPhone }: { nameOrPhone: string }) => {
    if (!selectedDoctor && !user?.doctorId) {
      toast({
        variant: "destructive",
        title: "Selecciona un médico primero",
        description: "Debes seleccionar un médico antes de crear un paciente nuevo.",
      });
      return;
    }

    const isPhone = /^\d+[-\s]?\d*$/.test(nameOrPhone);

    if (isPhone) {
      setNewPatientName('');
      setNewPatientPhone(nameOrPhone);
    } else {
      setNewPatientName(nameOrPhone);
      setNewPatientPhone('');
    }

    setIsCreatePatientOpen(true);
  };

  const handleSaveNewPatient = async () => {
    if (!newPatientName.trim() || !newPatientPhone.trim()) {
      toast({
        variant: "destructive",
        title: "Campos incompletos",
        description: "Por favor, completa el nombre y teléfono del paciente.",
      });
      return;
    }

    const doctorId = selectedDoctor?.id ?? user?.doctorId;
    if (!doctorId) {
      toast({
        variant: "destructive",
        title: "Médico requerido",
        description: "Selecciona un médico antes de crear un paciente.",
      });
      return;
    }

    setIsCreatingPatient(true);

    try {
      const patient = await createPatient({
        name: newPatientName.trim(),
        phone: formatPhoneForStorage(newPatientPhone.trim()),
        doctorId,
      });

      setSelectedPatient(patient);
      setIsCreatePatientOpen(false);
      setNewPatientName('');
      setNewPatientPhone('');

      if (patient.isExisting) {
        toast({
          title: "Número ya registrado",
          description: `El teléfono ya pertenece al paciente "${patient.name}". Se ha seleccionado para esta cita.`,
        });
      } else {
        toast({
          title: "Paciente creado",
          description: `${patient.name} ha sido agregado exitosamente.`,
        });
      }
    } catch (error) {
      console.error('Error creating patient:', error);
      toast({
        variant: "destructive",
        title: "Error",
        description: "No se pudo crear el paciente. Intenta nuevamente.",
      });
    } finally {
      setIsCreatingPatient(false);
    }
  };

  const handleCancelCreatePatient = () => {
    setIsCreatePatientOpen(false);
    setNewPatientName('');
    setNewPatientPhone('');
  };

  const handleCreateAppointment = async () => {
    if (!selectedPatient || !selectedDoctor || !selectedDate || !selectedSlot) {
      toast({
        variant: "destructive",
        title: "Campos incompletos",
        description: "Por favor, completa todos los campos antes de crear la cita.",
      });
      return;
    }

    setIsCreatingAppointment(true);

    try {
      const dateString = format(selectedDate, 'yyyy-MM-dd');

      const result = await createAppointment({
        doctorId: selectedDoctor.id,
        patientId: selectedPatient.id,
        date: dateString,
        time: selectedSlot,
        notes: undefined,
        durationMinutes: durationMinutes,
        reminder3dEnabled,
      });

      const displayDate = format(selectedDate, "EEEE, d 'de' MMMM 'de' yyyy", { locale: es });
      const displayDuration = durationOptions.find(d => d.value === durationMinutes)?.label || `${durationMinutes} min`;

      toast({
        title: "¡Cita creada exitosamente!",
        description: (
          <div className="mt-2 space-y-1">
            <p><strong>Paciente:</strong> {selectedPatient.name}</p>
            <p><strong>Doctor:</strong> {selectedDoctor.name}</p>
            <p><strong>Fecha:</strong> {displayDate}</p>
            <p><strong>Hora:</strong> {selectedSlot}</p>
            <p><strong>Duración:</strong> {displayDuration}</p>
            {!result.whatsappSent && (
              <p className="text-muted-foreground text-xs mt-1">
                WhatsApp no enviado{result.whatsappError ? `: ${result.whatsappError}` : ': no hay línea configurada'}.
              </p>
            )}
          </div>
        ),
      });

      // Reset form + volver a paso 1
      setSelectedPatient(null);
      setSelectedDoctor(null);
      setSelectedDate(undefined);
      setSelectedSlot(null);
      setAvailableSlots([]);
      setDurationMinutes(30);
      setReminder3dEnabled(false);
      setCalendarOpen(false);
    } catch (error: any) {
      console.error('Error creating appointment:', error);
      toast({
        variant: "destructive",
        title: "Error al crear la cita",
        description: error.message || "Ocurrió un error al intentar crear la cita. Por favor, intenta nuevamente.",
      });
    } finally {
      setIsCreatingAppointment(false);
    }
  };

  const isFormValid = selectedPatient && selectedDoctor && selectedDate && selectedSlot && !isCreatingAppointment;
  const showDoctorStep = !isDoctorView && !loadingDoctors && !isSingleDoctorOrg;
  const patientStepNum = showDoctorStep ? 2 : 1;
  const fechaStepNum = showDoctorStep ? 3 : 2;

  // Calendar is not ready until a doctor is selected
  const calendarDisabled = !selectedDoctor;

  // Shared calendar modifiers
  const calendarModifiers = {
    unavailable: (date: Date) => {
      const dateString = format(date, 'yyyy-MM-dd');
      const dayInfo = availableDaysMap[dateString];
      return dayInfo ? (!dayInfo.working || !dayInfo.canFit) : false;
    }
  };
  const calendarModifiersClassNames = {
    unavailable: 'text-muted-foreground/50 line-through cursor-not-allowed'
  };

  // Reminder toggle (shown below PatientSearch when patient is selected)
  const renderReminderToggle = () => {
    if (!selectedPatient) return null;
    return (
      <div className="border rounded-xl p-4 bg-card">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Bell className="h-4 w-4 text-muted-foreground" />
            <div>
              <p className="text-sm font-medium">Recordatorio extra</p>
              <p className="text-xs text-muted-foreground">
                {reminder3dEnabled ? "2 WhatsApp: 3 días + 24h" : "1 WhatsApp: 24h antes"}
              </p>
            </div>
          </div>
          <Switch checked={reminder3dEnabled} onCheckedChange={handleReminder3dToggle} />
        </div>
      </div>
    );
  };

  return (
    <MainLayout>
      <div className="container mx-auto p-6 max-w-2xl">
        <div className="space-y-8">
            {/* Paso 1: Médico (si aplica) */}
            {showDoctorStep && (
              <section>
                <Label className="text-lg font-semibold text-foreground mb-3 block">
                  1. Seleccionar Médico
                </Label>
                <DoctorSearch onSelect={handleDoctorSelect} value={selectedDoctor} />
              </section>
            )}

            {/* Paso: Paciente + toggle en card */}
            <section>
              <Label className="text-lg font-semibold text-foreground mb-3 block">
                {patientStepNum}. Seleccionar Paciente
              </Label>
              <PatientSearch
                onSelect={handlePatientSelect}
                onCreateNew={handleCreateNewPatient}
                value={selectedPatient}
                doctorId={selectedDoctor?.id}
              />
              <div className="mt-3">
                {renderReminderToggle()}
              </div>
            </section>

            {/* Paso: Fecha y hora */}
            <section className="space-y-4">
              <Label className="text-lg font-semibold text-foreground mb-3 block">
                {fechaStepNum}. Seleccionar Fecha
              </Label>

              {/* Duration */}
              <div>
                <Label className="text-sm text-muted-foreground">Duración</Label>
                <div className="grid grid-cols-3 sm:grid-cols-5 gap-2 mt-2">
                  {durationOptions.map((option) => (
                    <Button
                      key={option.value}
                      type="button"
                      variant={durationMinutes === option.value ? 'default' : 'outline'}
                      onClick={() => setDurationMinutes(option.value)}
                      className={cn(
                        'h-12',
                        durationMinutes === option.value && 'ring-2 ring-primary ring-offset-2'
                      )}
                    >
                      {option.label}
                    </Button>
                  ))}
                </div>
              </div>

              <Separator />

              {/* Date selector — scroll target */}
              <div ref={fechaRef}>
                {/* Desktop calendar: always visible, full-width */}
                <div className="hidden md:block">
                  <Label className="text-sm text-muted-foreground">Fecha</Label>
                  <div className={cn(
                    "relative mt-2 border rounded-md p-4 bg-background",
                    "[&_th]:!flex-1 [&_th]:!max-w-none [&_td]:!flex-1 [&_td]:!max-w-none [&_td]:!h-10 [&_td_button]:!w-full [&_td_button]:!max-w-none [&_td_button]:!h-10",
                    calendarDisabled && "pointer-events-none"
                  )}>
                    {calendarDisabled && (
                      <div className="absolute inset-0 z-10 flex items-center justify-center bg-background/80 rounded-md">
                        <p className="text-sm text-muted-foreground font-medium">
                          Selecciona un médico para ver disponibilidad
                        </p>
                      </div>
                    )}
                    <Calendar
                      mode="single"
                      selected={selectedDate}
                      onSelect={(date) => setSelectedDate(date)}
                      month={currentMonth}
                      onMonthChange={handleMonthChange}
                      disabled={isDateDisabled}
                      className={cn("p-0 w-full")}
                      modifiers={calendarModifiers}
                      modifiersClassNames={calendarModifiersClassNames}
                    />
                    {isLoadingDays && (
                      <div className="flex items-center gap-2 text-sm text-muted-foreground mt-2">
                        <Loader2 className="h-4 w-4 animate-spin" />
                        <span>Cargando disponibilidad...</span>
                      </div>
                    )}
                  </div>
                  {errorDays && (
                    <Alert variant="destructive" className="py-2 mt-2">
                      <AlertCircle className="h-4 w-4" />
                      <AlertDescription className="text-sm">
                        {errorDays}. Puedes seleccionar cualquier fecha manualmente.
                      </AlertDescription>
                    </Alert>
                  )}
                </div>

                {/* Mobile calendar: toggle popup */}
                <div className="md:hidden">
                  <Label className="text-sm text-muted-foreground">Fecha</Label>
                  {calendarDisabled ? (
                    <Alert className="mt-2">
                      <AlertDescription>
                        Selecciona un médico primero para ver las fechas disponibles.
                      </AlertDescription>
                    </Alert>
                  ) : (
                    <div className="relative mt-2 space-y-3">
                      <Button
                        variant="outline"
                        className={cn(
                          'w-full justify-between text-left font-normal',
                          !selectedDate && 'text-muted-foreground'
                        )}
                        onClick={() => setCalendarOpen(!calendarOpen)}
                      >
                        <span className="flex items-center">
                          {isLoadingDays ? (
                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          ) : (
                            <CalendarIcon className="mr-2 h-4 w-4" />
                          )}
                          {selectedDate
                            ? format(selectedDate, "PPP", { locale: es })
                            : 'Seleccionar fecha'}
                        </span>
                        {calendarOpen ? (
                          <ChevronUp className="h-4 w-4 opacity-50" />
                        ) : (
                          <ChevronDown className="h-4 w-4 opacity-50" />
                        )}
                      </Button>
                      {calendarOpen && (
                        <div className="absolute bottom-full left-0 right-0 z-50 mb-2 border rounded-md p-3 bg-background shadow-lg">
                          <Calendar
                            mode="single"
                            selected={selectedDate}
                            onSelect={(date) => {
                              setSelectedDate(date);
                              setCalendarOpen(false);
                            }}
                            month={currentMonth}
                            onMonthChange={handleMonthChange}
                            disabled={isDateDisabled}
                            className={cn("p-0 w-full")}
                            modifiers={calendarModifiers}
                            modifiersClassNames={calendarModifiersClassNames}
                          />
                          {isLoadingDays && (
                            <div className="flex items-center gap-2 text-sm text-muted-foreground mt-2">
                              <Loader2 className="h-4 w-4 animate-spin" />
                              <span>Cargando disponibilidad...</span>
                            </div>
                          )}
                        </div>
                      )}
                      {errorDays && (
                        <Alert variant="destructive" className="py-2">
                          <AlertCircle className="h-4 w-4" />
                          <AlertDescription className="text-sm">
                            {errorDays}. Puedes seleccionar cualquier fecha manualmente.
                          </AlertDescription>
                        </Alert>
                      )}
                    </div>
                  )}
                </div>
              </div>

              <Separator />

              {/* Slots */}
              <div>
                <Label className="text-sm text-muted-foreground">
                  {selectedDate ? `Horario — ${format(selectedDate, "EEEE d 'de' MMMM", { locale: es })}` : "Horario"}
                </Label>
                {!selectedDate ? (
                  <p className="text-sm text-muted-foreground italic text-center py-4">
                    Selecciona una fecha en el calendario
                  </p>
                ) : isLoadingSlots ? (
                  <div className="flex items-center justify-center py-4">
                    <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
                  </div>
                ) : (
                  <div className="mt-2">
                    <SlotSelector
                      slots={availableSlots}
                      selectedSlot={selectedSlot}
                      onSelect={setSelectedSlot}
                    />
                  </div>
                )}
              </div>
            </section>

            {/* Botón Agendar */}
            <div ref={agendarRef} className="pt-6 border-t">
              <Button
                onClick={handleCreateAppointment}
                disabled={!isFormValid}
                size="lg"
                className="w-full"
              >
                <CheckCircle className="mr-2 h-5 w-5" />
                {isCreatingAppointment ? 'Agendando...' : 'Agendar'}
              </Button>
              {!isFormValid && (
                <p className="text-sm text-muted-foreground text-center mt-3">
                  Completa todos los campos para crear la cita
                </p>
              )}
            </div>
        </div>
      </div>

      {/* Create Patient Dialog */}
      <Dialog open={isCreatePatientOpen} onOpenChange={setIsCreatePatientOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Crear nuevo paciente</DialogTitle>
            <DialogDescription>
              Ingresa los datos del paciente para agregarlo al sistema.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="patient-name">Nombre completo</Label>
              <Input
                id="patient-name"
                value={newPatientName}
                onChange={(e) => setNewPatientName(e.target.value)}
                placeholder="Ej: María García López"
                autoFocus
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="patient-phone">Teléfono</Label>
              <Input
                id="patient-phone"
                value={newPatientPhone}
                onChange={(e) => setNewPatientPhone(formatPhoneInput(e.target.value))}
                placeholder="1234-5678"
                maxLength={9}
              />
            </div>
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={handleCancelCreatePatient}
              disabled={isCreatingPatient}
            >
              Cancelar
            </Button>
            <Button
              onClick={handleSaveNewPatient}
              disabled={isCreatingPatient}
            >
              {isCreatingPatient ? 'Guardando...' : 'Guardar'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </MainLayout>
  );
}
