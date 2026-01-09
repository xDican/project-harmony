import { useState, useEffect, useCallback } from 'react';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { CalendarIcon, CheckCircle, Stethoscope, Loader2, AlertCircle } from 'lucide-react';
import MainLayout from '@/components/MainLayout';
import PatientSearch from '@/components/PatientSearch';
import DoctorSearch from '@/components/DoctorSearch';
import SlotSelector from '@/components/SlotSelector';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { Card, CardContent } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { toast } from '@/hooks/use-toast';
import { cn, formatPhoneInput, formatPhoneForStorage } from '@/lib/utils';
import { getAvailableSlots, getAvailableDays, createPatient, createAppointment, getDoctorById } from '@/lib/api';
import { getLocalToday, isToday, getCurrentTimeInMinutes, timeStringToMinutes } from '@/lib/dateUtils';
import { useCurrentUser } from '@/context/UserContext';
import type { Patient } from '@/types/patient';
import type { Doctor } from '@/types/doctor';

/**
 * NuevaCita - New appointment creation page
 * 
 * Flow (UX mejorado):
 * 1. Seleccionar paciente
 * 2. Seleccionar médico (si no es doctor)
 * 3. Seleccionar DURACIÓN primero
 * 4. Ver calendario con días disponibles/no disponibles según duración
 * 5. Seleccionar horario del día elegido
 */
export default function NuevaCita() {
  const { user, isDoctor } = useCurrentUser();
  
  // Core selection state
  const [selectedPatient, setSelectedPatient] = useState<Patient | null>(null);
  const [selectedDoctor, setSelectedDoctor] = useState<Doctor | null>(null);
  const [selectedDate, setSelectedDate] = useState<Date>();
  const [selectedSlot, setSelectedSlot] = useState<string | null>(null);
  
  // Duration state (ahora es el primer paso después de seleccionar médico)
  const [durationMinutes, setDurationMinutes] = useState<number>(30);
  
  // Available days state (para bloquear días en el calendario)
  const [currentMonth, setCurrentMonth] = useState<Date>(new Date());
  const [availableDaysMap, setAvailableDaysMap] = useState<Record<string, { canFit: boolean; working: boolean }>>({});
  const [isLoadingDays, setIsLoadingDays] = useState(false);
  const [errorDays, setErrorDays] = useState<string | null>(null);
  
  // Slots state
  const [availableSlots, setAvailableSlots] = useState<string[]>([]);
  const [isLoadingSlots, setIsLoadingSlots] = useState(false);
  const [isCalendarOpen, setIsCalendarOpen] = useState(false);
  
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
    { value: 30, label: '30 min' },
    { value: 60, label: '1 hora' },
    { value: 90, label: '1.5 horas' },
    { value: 120, label: '2 horas' },
  ];

  // Auto-fill doctor for logged-in doctors
  useEffect(() => {
    if (isDoctor && user?.doctorId && !selectedDoctor) {
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
  }, [isDoctor, user?.doctorId, selectedDoctor]);

  /**
   * Fetch available days when doctor, duration, or month changes
   * This allows the calendar to show which days can accommodate the appointment
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
      });
      setAvailableDaysMap(daysMap);
      
      // Si la fecha seleccionada ya no es válida (canFit=false), limpiarla
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
      // En caso de error, no bloqueamos nada - fallback manual
      setAvailableDaysMap({});
    } finally {
      setIsLoadingDays(false);
    }
  }, [selectedDate]);

  // Trigger fetch when doctor, duration, or month changes
  useEffect(() => {
    if (selectedDoctor) {
      fetchAvailableDays(selectedDoctor.id, currentMonth, durationMinutes);
    }
  }, [selectedDoctor, currentMonth, durationMinutes, fetchAvailableDays]);

  // Fetch available slots when doctor, date, or duration changes
  useEffect(() => {
    if (selectedDoctor && selectedDate) {
      setIsLoadingSlots(true);
      setSelectedSlot(null);

      const dateString = format(selectedDate, 'yyyy-MM-dd');
      getAvailableSlots({
        doctorId: selectedDoctor.id,
        date: dateString,
        durationMinutes: durationMinutes
      })
        .then(slots => {
          // Filter slots to show only future times if the selected date is today
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
  }, [selectedDoctor, selectedDate, durationMinutes]);

  // Reset date, slots, and available days when doctor changes
  useEffect(() => {
    setSelectedDate(undefined);
    setSelectedSlot(null);
    setAvailableSlots([]);
    setAvailableDaysMap({});
    setCurrentMonth(new Date());
  }, [selectedDoctor]);

  // Reset date and slots when duration changes (days availability may change)
  useEffect(() => {
    setSelectedDate(undefined);
    setSelectedSlot(null);
    setAvailableSlots([]);
  }, [durationMinutes]);

  const handlePatientSelect = (patient: Patient) => {
    setSelectedPatient(patient);
  };

  const handleDoctorSelect = (doctor: Doctor) => {
    setSelectedDoctor(doctor);
  };

  const handleMonthChange = (month: Date) => {
    setCurrentMonth(month);
  };

  /**
   * Determine if a date should be disabled in the calendar
   */
  const isDateDisabled = (date: Date): boolean => {
    // Always disable past dates
    if (date < getLocalToday()) return true;
    
    const dateString = format(date, 'yyyy-MM-dd');
    const dayInfo = availableDaysMap[dateString];
    
    // If no info available yet (loading or error), don't block
    if (!dayInfo) return false;
    
    // Block if not working day or can't fit the appointment
    return !dayInfo.working || !dayInfo.canFit;
  };

  const handleCreateNewPatient = ({ nameOrPhone }: { nameOrPhone: string }) => {
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

    setIsCreatingPatient(true);
    
    try {
      const patient = await createPatient({
        name: newPatientName.trim(),
        phone: formatPhoneForStorage(newPatientPhone.trim()),
        doctorId: user?.doctorId ?? undefined,
      });

      setSelectedPatient(patient);
      setIsCreatePatientOpen(false);
      setNewPatientName('');
      setNewPatientPhone('');
      
      toast({
        title: "Paciente creado",
        description: `${patient.name} ha sido agregado exitosamente.`,
      });
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
      
      await createAppointment({
        doctorId: selectedDoctor.id,
        patientId: selectedPatient.id,
        date: dateString,
        time: selectedSlot,
        notes: undefined,
        durationMinutes: durationMinutes,
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
          </div>
        ),
      });

      // Reset form
      setSelectedPatient(null);
      setSelectedDoctor(null);
      setSelectedDate(undefined);
      setSelectedSlot(null);
      setAvailableSlots([]);
      setDurationMinutes(30);
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

  // Step numbering helper
  const getStepNumber = (baseStep: number) => isDoctor ? baseStep - 1 : baseStep;

  return (
    <MainLayout>
      <div className="container mx-auto p-6 max-w-2xl">
        <div className="space-y-8">
          {/* Step 1: Patient Selection */}
          <section>
            <Label className="text-lg font-semibold text-foreground mb-3 block">
              1. Seleccionar Paciente
            </Label>
            <PatientSearch 
              onSelect={handlePatientSelect}
              onCreateNew={handleCreateNewPatient}
              value={selectedPatient}
            />
          </section>

          {/* Step 2: Doctor Selection (hidden for doctors) */}
          {!isDoctor && (
            <section>
              <Label className="text-lg font-semibold text-foreground mb-3 block">
                2. Seleccionar Médico
              </Label>
              <DoctorSearch onSelect={handleDoctorSelect} value={selectedDoctor} />
            </section>
          )}


          {/* Step 3 (or 2): Duration Selection - AHORA ANTES DE LA FECHA */}
          <section>
            <Label className="text-lg font-semibold text-foreground mb-3 block">
              {getStepNumber(3)}. Duración de la Cita
            </Label>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
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
          </section>

          {/* Step 4 (or 3): Date Selection - CON DÍAS BLOQUEADOS */}
          <section>
            <Label className="text-lg font-semibold text-foreground mb-3 block">
              {getStepNumber(4)}. Seleccionar Fecha
            </Label>
            
            {!selectedDoctor ? (
              <Alert>
                <AlertDescription>
                  Selecciona un médico primero para ver las fechas disponibles.
                </AlertDescription>
              </Alert>
            ) : (
              <div className="space-y-3">
                <Popover open={isCalendarOpen} onOpenChange={setIsCalendarOpen}>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      className={cn(
                        "w-full justify-start text-left font-normal",
                        !selectedDate && "text-muted-foreground"
                      )}
                      disabled={isLoadingDays}
                    >
                      {isLoadingDays ? (
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      ) : (
                        <CalendarIcon className="mr-2 h-4 w-4" />
                      )}
                      {selectedDate ? (
                        format(selectedDate, "PPP", { locale: es })
                      ) : isLoadingDays ? (
                        <span>Cargando disponibilidad...</span>
                      ) : (
                        <span>Selecciona una fecha</span>
                      )}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <Calendar
                      mode="single"
                      selected={selectedDate}
                      onSelect={(date) => {
                        setSelectedDate(date);
                        setIsCalendarOpen(false);
                      }}
                      month={currentMonth}
                      onMonthChange={handleMonthChange}
                      disabled={isDateDisabled}
                      initialFocus
                      className={cn("p-3 pointer-events-auto")}
                      modifiers={{
                        unavailable: (date) => {
                          const dateString = format(date, 'yyyy-MM-dd');
                          const dayInfo = availableDaysMap[dateString];
                          return dayInfo ? (!dayInfo.working || !dayInfo.canFit) : false;
                        }
                      }}
                      modifiersClassNames={{
                        unavailable: 'text-muted-foreground/50 line-through cursor-not-allowed'
                      }}
                    />
                    {/* Leyenda simple */}
                    <div className="px-3 pb-3 flex items-center gap-4 text-xs text-muted-foreground border-t pt-2">
                      <div className="flex items-center gap-1.5">
                        <div className="w-3 h-3 rounded-full bg-primary/20 border border-primary" />
                        <span>Disponible</span>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <div className="w-3 h-3 rounded-full bg-muted line-through" />
                        <span>No disponible</span>
                      </div>
                    </div>
                  </PopoverContent>
                </Popover>

                {/* Warning si hubo error cargando días */}
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
          </section>

          {/* Step 5 (or 4): Time Slot Selection */}
          <section>
            <Label className="text-lg font-semibold text-foreground mb-3 block">
              {getStepNumber(5)}. Seleccionar Horario
            </Label>
            
            {!selectedDoctor || !selectedDate ? (
              <Alert>
                <AlertDescription>
                  {!selectedDoctor 
                    ? 'Selecciona un médico primero.'
                    : 'Selecciona una fecha para ver los horarios disponibles.'
                  }
                </AlertDescription>
              </Alert>
            ) : isLoadingSlots ? (
              <Alert>
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
                <AlertDescription>Cargando horarios disponibles...</AlertDescription>
              </Alert>
            ) : (
              <SlotSelector
                slots={availableSlots}
                selectedSlot={selectedSlot}
                onSelect={setSelectedSlot}
              />
            )}
          </section>

          {/* Submit Button */}
          <div className="pt-6 border-t">
            <Button
              onClick={handleCreateAppointment}
              disabled={!isFormValid}
              size="lg"
              className="w-full"
            >
              <CheckCircle className="mr-2 h-5 w-5" />
              {isCreatingAppointment ? 'Creando cita...' : 'Crear Cita'}
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
