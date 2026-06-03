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
import { listActiveServiceTypesForOrg, type OrgServiceType } from '@/lib/serviceTypesApi';
import {
  getQualifiedDoctors,
  getCombinedDays,
  getCombinedSlots,
  getDoctorLoadForDate,
  pickLeastLoaded,
  doctorLabel,
  type QualifiedDoctor,
} from '@/lib/combinedAvailability';
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
  const { user, isDoctor, isDoctorView, organizationId } = useCurrentUser();
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

  // Service state (motor multi-recurso Fase 4). Si la org tiene servicios, el
  // agendamiento es service-first: el servicio fija la duracion y habilita el
  // chequeo de recursos. Si no tiene, degrada al selector de duracion de siempre.
  const [services, setServices] = useState<OrgServiceType[]>([]);
  const [selectedServiceTypeId, setSelectedServiceTypeId] = useState<string | null>(null);

  // Vista combinada (Fase 4). 'auto' = service-first + auto-asignacion entre todos
  // los profesionales que saben el servicio; 'specific' = elegir un profesional
  // (override). Solo aplica en orgs con servicios y mas de un profesional.
  const [assignMode, setAssignMode] = useState<'auto' | 'specific'>('auto');
  const [qualifiedDoctors, setQualifiedDoctors] = useState<QualifiedDoctor[]>([]);
  const [slotFreeDoctors, setSlotFreeDoctors] = useState<Record<string, string[]>>({});
  const [doctorLoad, setDoctorLoad] = useState<Record<string, number>>({});
  const [assignedDoctorId, setAssignedDoctorId] = useState<string | null>(null);

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

  // Modo combinado: service-first + auto-asignacion. Solo en orgs con servicios y
  // varios profesionales (un doctor logueado o una org de 1 doctor agendan directo).
  const hasServices = services.length > 0;
  const canCombine = hasServices && !isDoctorView && !isSingleDoctorOrg;
  const combinedMode = canCombine && assignMode === 'auto';

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

  // Cargar servicios de la org (service-first si existen)
  useEffect(() => {
    if (!organizationId) return;
    listActiveServiceTypesForOrg(organizationId)
      .then(setServices)
      .catch((error) => {
        console.error('[NuevaCita] Error cargando servicios:', error);
        setServices([]);
      });
  }, [organizationId]);

  // Al elegir servicio, fijar la duracion segun el servicio (fallback 30 min)
  useEffect(() => {
    if (!selectedServiceTypeId) return;
    const svc = services.find((s) => s.id === selectedServiceTypeId);
    if (svc) setDurationMinutes(svc.durationMinutes ?? 30);
  }, [selectedServiceTypeId, services]);

  // Modo combinado: cargar los profesionales que saben hacer el servicio elegido.
  useEffect(() => {
    if (!combinedMode || !organizationId || !selectedServiceTypeId) {
      setQualifiedDoctors([]);
      return;
    }
    getQualifiedDoctors(organizationId, selectedServiceTypeId)
      .then(setQualifiedDoctors)
      .catch((e) => {
        console.error('[NuevaCita] Error cargando profesionales del servicio:', e);
        setQualifiedDoctors([]);
      });
  }, [combinedMode, organizationId, selectedServiceTypeId]);

  // Al cambiar servicio o modo de asignacion, reset de fecha/hora/asignacion.
  useEffect(() => {
    setSelectedDate(undefined);
    setSelectedSlot(null);
    setAvailableSlots([]);
    setSlotFreeDoctors({});
    setAssignedDoctorId(null);
  }, [selectedServiceTypeId, assignMode]);

  // Fetch de dias disponibles: combinado (union de profesionales) o de un doctor.
  const applyDaysMap = useCallback((daysMap: Record<string, { canFit: boolean; working: boolean }>) => {
    setAvailableDaysMap(daysMap);
    if (selectedDate) {
      const ds = format(selectedDate, 'yyyy-MM-dd');
      if (daysMap[ds] && !daysMap[ds].canFit) {
        setSelectedDate(undefined);
        setSelectedSlot(null);
        setAvailableSlots([]);
      }
    }
  }, [selectedDate]);

  useEffect(() => {
    const month = format(currentMonth, 'yyyy-MM');
    const onError = (error: unknown) => {
      console.error('[NuevaCita] Error fetching available days:', error);
      setErrorDays('No se pudieron cargar los días disponibles');
      setAvailableDaysMap({});
    };

    if (combinedMode) {
      if (!selectedServiceTypeId || qualifiedDoctors.length === 0) {
        setAvailableDaysMap({});
        return;
      }
      setIsLoadingDays(true);
      setErrorDays(null);
      getCombinedDays({ doctors: qualifiedDoctors, month, durationMinutes })
        .then(applyDaysMap)
        .catch(onError)
        .finally(() => setIsLoadingDays(false));
    } else if (selectedDoctor) {
      setIsLoadingDays(true);
      setErrorDays(null);
      getAvailableDays({ doctorId: selectedDoctor.id, month, durationMinutes, calendarId: selectedCalendarId })
        .then(applyDaysMap)
        .catch(onError)
        .finally(() => setIsLoadingDays(false));
    } else {
      setAvailableDaysMap({});
    }
  }, [combinedMode, selectedDoctor, qualifiedDoctors, selectedServiceTypeId, currentMonth, durationMinutes, selectedCalendarId, applyDaysMap]);

  // Fetch de slots: combinado (union + profesionales libres por hora) o de un doctor.
  useEffect(() => {
    const ready = !!selectedDate && (combinedMode
      ? (!!selectedServiceTypeId && qualifiedDoctors.length > 0)
      : !!selectedDoctor);

    if (!ready) {
      setAvailableSlots([]);
      setSelectedSlot(null);
      setSlotFreeDoctors({});
      return;
    }

    setIsLoadingSlots(true);
    setSelectedSlot(null);
    const dateString = format(selectedDate!, 'yyyy-MM-dd');
    const todayFilter = (times: string[]) => {
      if (!isToday(selectedDate!)) return times;
      const nowMin = getCurrentTimeInMinutes();
      return times.filter((t) => timeStringToMinutes(t) > nowMin);
    };

    if (combinedMode) {
      getCombinedSlots({ doctors: qualifiedDoctors, date: dateString, durationMinutes, serviceTypeId: selectedServiceTypeId! })
        .then((combined) => {
          const freeMap: Record<string, string[]> = {};
          for (const s of combined) freeMap[s.time] = s.freeDoctorIds;
          setSlotFreeDoctors(freeMap);
          setAvailableSlots(todayFilter(combined.map((s) => s.time)));
        })
        .catch((error) => {
          console.error('Error loading combined slots:', error);
          setAvailableSlots([]);
          setSlotFreeDoctors({});
        })
        .finally(() => setIsLoadingSlots(false));
    } else {
      getAvailableSlots({
        doctorId: selectedDoctor!.id,
        date: dateString,
        durationMinutes,
        calendarId: selectedCalendarId,
        serviceTypeId: selectedServiceTypeId ?? undefined,
      })
        .then((slots) => setAvailableSlots(todayFilter(slots)))
        .catch((error) => {
          console.error('Error loading slots:', error);
          setAvailableSlots([]);
        })
        .finally(() => setIsLoadingSlots(false));
    }
  }, [combinedMode, selectedDoctor, selectedDate, durationMinutes, selectedCalendarId, selectedServiceTypeId, qualifiedDoctors]);

  // Modo combinado: carga del dia para auto-asignar al menos cargado.
  useEffect(() => {
    if (!combinedMode || !organizationId || !selectedDate || qualifiedDoctors.length === 0) {
      setDoctorLoad({});
      return;
    }
    getDoctorLoadForDate({
      organizationId,
      date: format(selectedDate, 'yyyy-MM-dd'),
      doctorIds: qualifiedDoctors.map((d) => d.id),
    })
      .then(setDoctorLoad)
      .catch(() => setDoctorLoad({}));
  }, [combinedMode, organizationId, selectedDate, qualifiedDoctors]);

  // Modo combinado: al elegir hora, auto-asignar el profesional libre menos cargado.
  useEffect(() => {
    if (!combinedMode || !selectedSlot) {
      setAssignedDoctorId(null);
      return;
    }
    setAssignedDoctorId(pickLeastLoaded(slotFreeDoctors[selectedSlot] ?? [], doctorLoad));
  }, [combinedMode, selectedSlot, slotFreeDoctors, doctorLoad]);

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

  const handleDoctorSelect = (doctor: Doctor | null) => {
    setSelectedDoctor(doctor);
    if (!doctor) {
      setSelectedDate(undefined);
      setSelectedSlot(null);
      setAvailableSlots([]);
      setCalendarOpen(false);
    }
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

  // Doctor al que se vincula el paciente nuevo. En modo combinado el paciente no
  // es de un doctor especifico → se usa el asignado o el primer profesional del servicio.
  const patientLinkDoctorId = selectedDoctor?.id ?? assignedDoctorId ?? qualifiedDoctors[0]?.id ?? user?.doctorId;

  const handleCreateNewPatient = ({ nameOrPhone }: { nameOrPhone: string }) => {
    if (!patientLinkDoctorId) {
      toast({
        variant: "destructive",
        title: combinedMode ? "Selecciona un servicio primero" : "Selecciona un médico primero",
        description: combinedMode
          ? "Elige el servicio para poder registrar al paciente."
          : "Debes seleccionar un médico antes de crear un paciente nuevo.",
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

    const doctorId = patientLinkDoctorId;
    if (!doctorId) {
      toast({
        variant: "destructive",
        title: "Médico requerido",
        description: "Selecciona un servicio o médico antes de crear un paciente.",
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
    // Doctor efectivo: en combinado es el auto-asignado; si no, el elegido.
    const effectiveDoctorId = combinedMode ? assignedDoctorId : selectedDoctor?.id ?? null;
    const assignedDoctor = combinedMode
      ? qualifiedDoctors.find((d) => d.id === assignedDoctorId)
      : null;
    const effectiveDoctorName = combinedMode
      ? (assignedDoctor ? doctorLabel(assignedDoctor) : '')
      : (selectedDoctor?.name ?? '');

    if (!selectedPatient || !effectiveDoctorId || !selectedDate || !selectedSlot) {
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
        doctorId: effectiveDoctorId,
        patientId: selectedPatient.id,
        date: dateString,
        time: selectedSlot,
        notes: undefined,
        durationMinutes: durationMinutes,
        reminder3dEnabled,
        serviceTypeId: selectedServiceTypeId ?? undefined,
      });

      const displayDate = format(selectedDate, "EEEE, d 'de' MMMM 'de' yyyy", { locale: es });
      const displayDuration = durationOptions.find(d => d.value === durationMinutes)?.label || `${durationMinutes} min`;

      toast({
        title: "¡Cita creada exitosamente!",
        description: (
          <div className="mt-2 space-y-1">
            <p><strong>Paciente:</strong> {selectedPatient.name}</p>
            <p><strong>Profesional:</strong> {effectiveDoctorName}</p>
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
      setSlotFreeDoctors({});
      setAssignedDoctorId(null);
      setDurationMinutes(30);
      setSelectedServiceTypeId(null);
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

  // Si la org tiene servicios, hay que elegir uno antes de ver disponibilidad
  const needsService = hasServices && !selectedServiceTypeId;
  // Doctor efectivo para validar el form (combinado: auto-asignado).
  const formDoctorId = combinedMode ? assignedDoctorId : (selectedDoctor?.id ?? null);
  const isFormValid = !!selectedPatient && !!formDoctorId && !!selectedDate && !!selectedSlot && !needsService && !isCreatingAppointment;
  // En modo combinado no hay paso "Médico" (service-first); en modo específico sí.
  const showDoctorStep = !combinedMode && !isDoctorView && !loadingDoctors && !isSingleDoctorOrg;
  const patientStepNum = showDoctorStep ? 2 : 1;
  const fechaStepNum = showDoctorStep ? 3 : 2;

  // Calendario listo cuando hay servicio (combinado) o médico+servicio (específico).
  const calendarDisabled = combinedMode ? needsService : (!selectedDoctor || needsService);
  const calendarHint = combinedMode
    ? 'Selecciona un servicio para ver disponibilidad'
    : (!selectedDoctor
        ? 'Selecciona un médico para ver disponibilidad'
        : 'Selecciona un servicio para ver disponibilidad');

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
            {/* Modo de asignación (solo orgs multi-profesional con servicios) */}
            {canCombine && (
              <section>
                <Label className="text-sm text-muted-foreground mb-2 block">¿Cómo agendar?</Label>
                <div className="grid grid-cols-2 gap-2">
                  <Button
                    type="button"
                    variant={assignMode === 'auto' ? 'default' : 'outline'}
                    onClick={() => setAssignMode('auto')}
                    className="h-auto py-2 flex-col items-start text-left"
                  >
                    <span className="font-medium">Cualquier profesional</span>
                    <span className="text-xs font-normal opacity-80">El sistema asigna al que esté libre</span>
                  </Button>
                  <Button
                    type="button"
                    variant={assignMode === 'specific' ? 'default' : 'outline'}
                    onClick={() => setAssignMode('specific')}
                    className="h-auto py-2 flex-col items-start text-left"
                  >
                    <span className="font-medium">Elegir profesional</span>
                    <span className="text-xs font-normal opacity-80">Para un profesional específico</span>
                  </Button>
                </div>
              </section>
            )}

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

              {/* Servicio (si la org tiene) o Duración (degradación) */}
              {services.length > 0 ? (
                <div>
                  <Label className="text-sm text-muted-foreground">Servicio</Label>
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 mt-2">
                    {services.map((svc) => (
                      <Button
                        key={svc.id}
                        type="button"
                        variant={selectedServiceTypeId === svc.id ? 'default' : 'outline'}
                        onClick={() => setSelectedServiceTypeId(svc.id)}
                        className={cn(
                          'h-12 whitespace-normal text-sm leading-tight',
                          selectedServiceTypeId === svc.id && 'ring-2 ring-primary ring-offset-2'
                        )}
                      >
                        {svc.displayName}
                      </Button>
                    ))}
                  </div>
                  {selectedServiceTypeId && (
                    <p className="text-xs text-muted-foreground mt-2">
                      Duración: {durationOptions.find(d => d.value === durationMinutes)?.label || `${durationMinutes} min`}
                    </p>
                  )}
                </div>
              ) : (
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
              )}

              <Separator />

              {/* Date selector — scroll target */}
              <div ref={fechaRef}>
                {/* Desktop calendar: always visible, full-width */}
                <div className="hidden md:block">
                  <Label className="text-sm text-muted-foreground">Fecha</Label>
                  <div className={cn(
                    "relative mt-2 border rounded-md p-4 bg-background",
                    "[&_td_button]:!w-full [&_td_button]:!h-10",
                    (calendarDisabled || isLoadingDays) && "pointer-events-none"
                  )}>
                    {calendarDisabled && (
                      <div className="absolute inset-0 z-10 flex items-center justify-center bg-background/80 rounded-md">
                        <p className="text-sm text-muted-foreground font-medium">
                          {calendarHint}
                        </p>
                      </div>
                    )}
                    {isLoadingDays && (
                      <div className="absolute inset-0 z-10 flex items-center justify-center bg-background/80 rounded-md">
                        <div className="flex items-center gap-2 text-sm text-muted-foreground font-medium">
                          <Loader2 className="h-4 w-4 animate-spin" />
                          <span>Cargando disponibilidad...</span>
                        </div>
                      </div>
                    )}
                    <Calendar
                      mode="single"
                      selected={selectedDate}
                      onSelect={(date) => !isLoadingDays && setSelectedDate(date)}
                      month={currentMonth}
                      onMonthChange={handleMonthChange}
                      disabled={isDateDisabled}
                      className={cn("p-0 w-full")}
                      classNames={{
                        months: "flex flex-col sm:flex-row space-y-4 sm:space-x-4 sm:space-y-0 w-full",
                        month: "space-y-4 w-full",
                        head_cell: "text-muted-foreground rounded-md flex-1 font-normal text-[0.8rem]",
                        cell: "h-10 flex-1 text-center text-sm p-0 relative [&:has([aria-selected].day-range-end)]:rounded-r-md [&:has([aria-selected].day-outside)]:bg-accent/50 [&:has([aria-selected])]:bg-accent first:[&:has([aria-selected])]:rounded-l-md last:[&:has([aria-selected])]:rounded-r-md focus-within:relative focus-within:z-20",
                      }}
                      modifiers={calendarModifiers}
                      modifiersClassNames={calendarModifiersClassNames}
                    />
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
                        {!selectedDoctor
                          ? 'Selecciona un médico primero para ver las fechas disponibles.'
                          : 'Selecciona un servicio primero para ver las fechas disponibles.'}
                      </AlertDescription>
                    </Alert>
                  ) : (
                    <div className="relative mt-2 space-y-3">
                      <Button
                        variant="outline"
                        disabled={isLoadingDays}
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
                            : isLoadingDays
                              ? 'Cargando disponibilidad...'
                              : 'Seleccionar fecha'}
                        </span>
                        {calendarOpen ? (
                          <ChevronUp className="h-4 w-4 opacity-50" />
                        ) : (
                          <ChevronDown className="h-4 w-4 opacity-50" />
                        )}
                      </Button>
                      {calendarOpen && (
                        <div className={cn(
                          "relative absolute bottom-full left-0 right-0 z-50 mb-2 border rounded-md p-3 bg-background shadow-lg",
                          isLoadingDays && "pointer-events-none"
                        )}>
                          {isLoadingDays && (
                            <div className="absolute inset-0 z-10 flex items-center justify-center bg-background/80 rounded-md">
                              <div className="flex items-center gap-2 text-sm text-muted-foreground font-medium">
                                <Loader2 className="h-4 w-4 animate-spin" />
                                <span>Cargando disponibilidad...</span>
                              </div>
                            </div>
                          )}
                          <Calendar
                            mode="single"
                            selected={selectedDate}
                            onSelect={(date) => {
                              if (isLoadingDays) return;
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

              {/* Profesional asignado (modo combinado) */}
              {combinedMode && selectedSlot && (() => {
                const freeIds = slotFreeDoctors[selectedSlot] ?? [];
                const freeDocs = qualifiedDoctors.filter((d) => freeIds.includes(d.id));
                return (
                  <div className="rounded-lg border p-3 bg-card space-y-2">
                    <Label className="text-sm text-muted-foreground">Profesional asignado</Label>
                    {freeDocs.length === 0 ? (
                      <p className="text-sm text-muted-foreground">
                        No hay profesional libre en este horario.
                      </p>
                    ) : freeDocs.length === 1 ? (
                      <p className="text-sm font-medium">{doctorLabel(freeDocs[0])}</p>
                    ) : (
                      <>
                        <div className="flex flex-wrap gap-2">
                          {freeDocs.map((d) => (
                            <Button
                              key={d.id}
                              type="button"
                              size="sm"
                              variant={assignedDoctorId === d.id ? 'default' : 'outline'}
                              onClick={() => setAssignedDoctorId(d.id)}
                            >
                              {doctorLabel(d)}
                            </Button>
                          ))}
                        </div>
                        <p className="text-xs text-muted-foreground">
                          Auto-asignado al menos cargado; podés cambiarlo.
                        </p>
                      </>
                    )}
                  </div>
                );
              })()}
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
