import { useState, useEffect, useCallback } from 'react';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { CheckCircle, Loader2, Plus, X, ArrowUp, ArrowDown, AlertCircle } from 'lucide-react';
import PatientSearch from '@/components/PatientSearch';
import SlotSelector from '@/components/SlotSelector';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Calendar } from '@/components/ui/calendar';
import { Separator } from '@/components/ui/separator';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { toast } from '@/hooks/use-toast';
import { cn, formatPhoneInput, formatPhoneForStorage } from '@/lib/utils';
import { getLocalToday } from '@/lib/dateUtils';
import { createPatient } from '@/lib/api';
import { getVisitSlots, createVisitAppointments, type VisitSlot, type VisitDoctorInfo } from '@/lib/api.supabase';
import { getQualifiedDoctors } from '@/lib/combinedAvailability';
import type { OrgServiceType } from '@/lib/serviceTypesApi';
import type { Patient } from '@/types/patient';

/**
 * VisitBooking — agendamiento de una VISITA multi-procedimiento (motor Fase 5).
 *
 * Autocontenido: el usuario arma una lista ordenada de procedimientos para un
 * paciente, elige fecha, y el secuenciador (get-visit-slots) devuelve los inicios
 * factibles back-to-back con profesional sugerido por procedimiento (override).
 * Confirmar inserta N citas que comparten visit_id (create-visit, atomico).
 *
 * Aislado de NuevaCita para no tocar el flujo de cita simple ya probado.
 */
export default function VisitBooking({
  organizationId,
  services,
}: {
  organizationId: string;
  services: OrgServiceType[];
}) {
  const [selectedPatient, setSelectedPatient] = useState<Patient | null>(null);
  const [procedureIds, setProcedureIds] = useState<string[]>([]); // ordenado
  const [selectedDate, setSelectedDate] = useState<Date>();
  const [currentMonth, setCurrentMonth] = useState<Date>(new Date());

  const [slots, setSlots] = useState<VisitSlot[]>([]);
  const [doctorsDict, setDoctorsDict] = useState<Record<string, VisitDoctorInfo>>({});
  const [reason, setReason] = useState<string | null>(null);
  const [isLoadingSlots, setIsLoadingSlots] = useState(false);

  const [selectedStart, setSelectedStart] = useState<string | null>(null);
  const [assignments, setAssignments] = useState<Record<number, string>>({}); // idx -> doctorId
  const [reminder3dEnabled, setReminder3dEnabled] = useState(false);
  const [isCreating, setIsCreating] = useState(false);

  // Crear paciente
  const [isCreatePatientOpen, setIsCreatePatientOpen] = useState(false);
  const [newPatientName, setNewPatientName] = useState('');
  const [newPatientPhone, setNewPatientPhone] = useState('');
  const [isCreatingPatient, setIsCreatingPatient] = useState(false);

  const svcById = new Map(services.map((s) => [s.id, s]));

  // Reset de slots/seleccion al cambiar procedimientos o fecha
  useEffect(() => {
    setSlots([]);
    setSelectedStart(null);
    setAssignments({});
    setReason(null);
  }, [procedureIds, selectedDate]);

  // Fetch de inicios de visita factibles
  useEffect(() => {
    if (!selectedDate || procedureIds.length === 0) {
      setSlots([]);
      return;
    }
    const dateString = format(selectedDate, 'yyyy-MM-dd');
    const procedures = procedureIds.map((id) => ({
      serviceTypeId: id,
      durationMinutes: svcById.get(id)?.durationMinutes ?? 30,
    }));
    setIsLoadingSlots(true);
    setReason(null);
    getVisitSlots({ date: dateString, procedures, organizationId })
      .then((res) => {
        setSlots(res.slots);
        setDoctorsDict(res.doctors);
        setReason(res.reason ?? null);
      })
      .catch((e) => {
        console.error('[VisitBooking] Error cargando disponibilidad de visita:', e);
        setSlots([]);
        setReason('No se pudo calcular la disponibilidad.');
      })
      .finally(() => setIsLoadingSlots(false));
  }, [selectedDate, procedureIds, organizationId]); // eslint-disable-line react-hooks/exhaustive-deps

  // Al elegir inicio, sembrar asignaciones con el profesional sugerido por procedimiento
  const currentChain = selectedStart ? slots.find((s) => s.start === selectedStart)?.procedures ?? [] : [];
  useEffect(() => {
    if (!selectedStart) {
      setAssignments({});
      return;
    }
    const chain = slots.find((s) => s.start === selectedStart)?.procedures ?? [];
    const seed: Record<number, string> = {};
    chain.forEach((p, i) => {
      if (p.suggestedDoctorId) seed[i] = p.suggestedDoctorId;
    });
    setAssignments(seed);
  }, [selectedStart]); // eslint-disable-line react-hooks/exhaustive-deps

  const addProcedure = (id: string) => setProcedureIds((prev) => [...prev, id]);
  const removeProcedure = (idx: number) => setProcedureIds((prev) => prev.filter((_, i) => i !== idx));
  const moveProcedure = (idx: number, dir: -1 | 1) => {
    setProcedureIds((prev) => {
      const next = [...prev];
      const j = idx + dir;
      if (j < 0 || j >= next.length) return prev;
      [next[idx], next[j]] = [next[j], next[idx]];
      return next;
    });
  };

  const handleCreateNewPatient = async ({ nameOrPhone }: { nameOrPhone: string }) => {
    if (procedureIds.length === 0) {
      toast({ variant: 'destructive', title: 'Agrega un procedimiento primero', description: 'Necesito saber el servicio para registrar al paciente.' });
      return;
    }
    const isPhone = /^\d+[-\s]?\d*$/.test(nameOrPhone);
    if (isPhone) { setNewPatientName(''); setNewPatientPhone(nameOrPhone); }
    else { setNewPatientName(nameOrPhone); setNewPatientPhone(''); }
    setIsCreatePatientOpen(true);
  };

  const handleSaveNewPatient = async () => {
    if (!newPatientName.trim() || !newPatientPhone.trim()) {
      toast({ variant: 'destructive', title: 'Campos incompletos', description: 'Completa nombre y teléfono.' });
      return;
    }
    setIsCreatingPatient(true);
    try {
      // Vincular al primer profesional calificado del primer procedimiento (el EF
      // re-vincula cada profesional de la visita igual; esto solo crea el paciente).
      const qualified = await getQualifiedDoctors(organizationId, procedureIds[0]);
      const linkDoctorId = qualified[0]?.id;
      if (!linkDoctorId) {
        toast({ variant: 'destructive', title: 'Sin profesionales', description: 'El primer servicio no tiene profesionales configurados.' });
        return;
      }
      const patient = await createPatient({
        name: newPatientName.trim(),
        phone: formatPhoneForStorage(newPatientPhone.trim()),
        doctorId: linkDoctorId,
      });
      setSelectedPatient(patient);
      setIsCreatePatientOpen(false);
      setNewPatientName('');
      setNewPatientPhone('');
      toast({
        title: patient.isExisting ? 'Número ya registrado' : 'Paciente creado',
        description: patient.isExisting
          ? `El teléfono ya pertenece a "${patient.name}". Se seleccionó para esta visita.`
          : `${patient.name} agregado exitosamente.`,
      });
    } catch (e) {
      console.error('[VisitBooking] Error creando paciente:', e);
      toast({ variant: 'destructive', title: 'Error', description: 'No se pudo crear el paciente.' });
    } finally {
      setIsCreatingPatient(false);
    }
  };

  const isFormValid =
    !!selectedPatient &&
    procedureIds.length > 0 &&
    !!selectedDate &&
    !!selectedStart &&
    currentChain.length === procedureIds.length &&
    currentChain.every((_, i) => !!assignments[i]) &&
    !isCreating;

  const handleConfirm = async () => {
    if (!selectedPatient || !selectedDate || !selectedStart) return;
    const chain = slots.find((s) => s.start === selectedStart)?.procedures ?? [];
    if (chain.length === 0) return;

    const dateString = format(selectedDate, 'yyyy-MM-dd');
    const procedures = chain.map((p, i) => ({
      serviceTypeId: p.serviceTypeId,
      doctorId: assignments[i],
      date: dateString,
      time: p.start,
      durationMinutes: p.durationMinutes,
    }));

    if (procedures.some((p) => !p.doctorId)) {
      toast({ variant: 'destructive', title: 'Falta asignar profesional', description: 'Cada procedimiento necesita un profesional.' });
      return;
    }

    setIsCreating(true);
    try {
      const res = await createVisitAppointments({
        patientId: selectedPatient.id,
        procedures,
        reminder3dEnabled,
        organizationId,
      });
      const displayDate = format(selectedDate, "EEEE, d 'de' MMMM 'de' yyyy", { locale: es });
      toast({
        title: '¡Visita agendada!',
        description: (
          <div className="mt-2 space-y-1">
            <p><strong>Paciente:</strong> {selectedPatient.name}</p>
            <p><strong>Fecha:</strong> {displayDate}</p>
            {chain.map((p, i) => (
              <p key={i}>
                <strong>{p.start}</strong> — {p.serviceName ?? 'Procedimiento'}{' '}
                ({doctorsDict[assignments[i]]?.label ?? '—'})
              </p>
            ))}
            {!res.whatsappSent && (
              <p className="text-muted-foreground text-xs mt-1">
                WhatsApp no enviado{res.whatsappError ? `: ${res.whatsappError}` : ''}.
              </p>
            )}
          </div>
        ),
      });
      // Reset
      setSelectedPatient(null);
      setProcedureIds([]);
      setSelectedDate(undefined);
      setSlots([]);
      setSelectedStart(null);
      setAssignments({});
      setReminder3dEnabled(false);
    } catch (e: any) {
      console.error('[VisitBooking] Error creando visita:', e);
      toast({ variant: 'destructive', title: 'Error al agendar la visita', description: e.message || 'Intenta nuevamente.' });
    } finally {
      setIsCreating(false);
    }
  };

  const startTimes = slots.map((s) => s.start);

  return (
    <div className="space-y-8">
      {/* Paciente */}
      <section>
        <Label className="text-lg font-semibold text-foreground mb-3 block">1. Seleccionar Paciente</Label>
        <PatientSearch onSelect={setSelectedPatient} onCreateNew={handleCreateNewPatient} value={selectedPatient} />
      </section>

      {/* Procedimientos (lista ordenada) */}
      <section>
        <Label className="text-lg font-semibold text-foreground mb-3 block">2. Procedimientos de la visita</Label>
        <p className="text-sm text-muted-foreground mb-2">Agrega los servicios en el orden en que se atenderán (uno tras otro).</p>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
          {services.map((svc) => (
            <Button
              key={svc.id}
              type="button"
              variant="outline"
              onClick={() => addProcedure(svc.id)}
              className="h-12 whitespace-normal text-sm leading-tight justify-start"
            >
              <Plus className="h-4 w-4 mr-1 shrink-0" />
              {svc.displayName}
            </Button>
          ))}
        </div>

        {procedureIds.length > 0 && (
          <div className="mt-4 space-y-2">
            {procedureIds.map((id, idx) => {
              const svc = svcById.get(id);
              return (
                <div key={`${id}-${idx}`} className="flex items-center gap-2 rounded-lg border p-2 bg-card">
                  <span className="text-xs font-mono text-muted-foreground w-5 text-center">{idx + 1}</span>
                  <span className="flex-1 text-sm font-medium">
                    {svc?.displayName ?? 'Servicio'}
                    <span className="text-xs text-muted-foreground ml-2">{svc?.durationMinutes ?? 30} min</span>
                  </span>
                  <Button type="button" size="icon" variant="ghost" className="h-7 w-7" disabled={idx === 0} onClick={() => moveProcedure(idx, -1)}>
                    <ArrowUp className="h-4 w-4" />
                  </Button>
                  <Button type="button" size="icon" variant="ghost" className="h-7 w-7" disabled={idx === procedureIds.length - 1} onClick={() => moveProcedure(idx, 1)}>
                    <ArrowDown className="h-4 w-4" />
                  </Button>
                  <Button type="button" size="icon" variant="ghost" className="h-7 w-7 text-destructive" onClick={() => removeProcedure(idx)}>
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              );
            })}
          </div>
        )}
      </section>

      {/* Fecha + inicios */}
      <section className="space-y-4">
        <Label className="text-lg font-semibold text-foreground mb-3 block">3. Fecha y hora de inicio</Label>

        <div className="border rounded-md p-4 bg-background [&_td_button]:!w-full [&_td_button]:!h-10">
          <Calendar
            mode="single"
            selected={selectedDate}
            onSelect={setSelectedDate}
            month={currentMonth}
            onMonthChange={setCurrentMonth}
            disabled={(date) => date < getLocalToday()}
            className="p-0 w-full"
            classNames={{
              months: 'flex flex-col sm:flex-row space-y-4 sm:space-x-4 sm:space-y-0 w-full',
              month: 'space-y-4 w-full',
              head_cell: 'text-muted-foreground rounded-md flex-1 font-normal text-[0.8rem]',
              cell: 'h-10 flex-1 text-center text-sm p-0 relative',
            }}
          />
        </div>

        <Separator />

        <div>
          <Label className="text-sm text-muted-foreground">
            {selectedDate ? `Inicio de visita — ${format(selectedDate, "EEEE d 'de' MMMM", { locale: es })}` : 'Inicio de visita'}
          </Label>
          {!selectedDate || procedureIds.length === 0 ? (
            <p className="text-sm text-muted-foreground italic text-center py-4">
              Agrega procedimientos y elige una fecha para ver los horarios.
            </p>
          ) : isLoadingSlots ? (
            <div className="flex items-center justify-center py-4">
              <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
            </div>
          ) : startTimes.length === 0 ? (
            <Alert className="mt-2">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription className="text-sm">
                {reason ?? 'No hay horarios donde toda la visita quepa ese día. Prueba otra fecha.'}
              </AlertDescription>
            </Alert>
          ) : (
            <div className="mt-2">
              <SlotSelector slots={startTimes} selectedSlot={selectedStart} onSelect={setSelectedStart} />
            </div>
          )}
        </div>

        {/* Cadena de la visita con asignacion por procedimiento */}
        {selectedStart && currentChain.length > 0 && (
          <div className="rounded-lg border p-3 bg-card space-y-3">
            <Label className="text-sm text-muted-foreground">Detalle de la visita</Label>
            {currentChain.map((p, i) => {
              const freeDocs = p.freeDoctorIds;
              return (
                <div key={i} className="border-b last:border-b-0 pb-2 last:pb-0">
                  <p className="text-sm font-medium">
                    {p.start}–{p.end} · {p.serviceName ?? 'Procedimiento'}
                  </p>
                  {freeDocs.length === 0 ? (
                    <p className="text-sm text-destructive">Sin profesional libre.</p>
                  ) : freeDocs.length === 1 ? (
                    <p className="text-sm text-muted-foreground">{doctorsDict[freeDocs[0]]?.label ?? '—'}</p>
                  ) : (
                    <div className="flex flex-wrap gap-2 mt-1">
                      {freeDocs.map((docId) => (
                        <Button
                          key={docId}
                          type="button"
                          size="sm"
                          variant={assignments[i] === docId ? 'default' : 'outline'}
                          onClick={() => setAssignments((prev) => ({ ...prev, [i]: docId }))}
                        >
                          {doctorsDict[docId]?.label ?? docId}
                        </Button>
                      ))}
                    </div>
                  )}
                </div>
              );
            })}
            <p className="text-xs text-muted-foreground">Auto-asignado al profesional menos cargado; podés cambiarlo.</p>
          </div>
        )}
      </section>

      {/* Agendar */}
      <div className="pt-6 border-t">
        <Button onClick={handleConfirm} disabled={!isFormValid} size="lg" className="w-full">
          <CheckCircle className="mr-2 h-5 w-5" />
          {isCreating ? 'Agendando visita...' : 'Agendar visita'}
        </Button>
        {!isFormValid && (
          <p className="text-sm text-muted-foreground text-center mt-3">
            Completa paciente, procedimientos, fecha, hora y asignación.
          </p>
        )}
      </div>

      {/* Crear paciente */}
      <Dialog open={isCreatePatientOpen} onOpenChange={setIsCreatePatientOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Crear nuevo paciente</DialogTitle>
            <DialogDescription>Ingresa los datos del paciente para agregarlo al sistema.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="visit-patient-name">Nombre completo</Label>
              <Input id="visit-patient-name" value={newPatientName} onChange={(e) => setNewPatientName(e.target.value)} placeholder="Ej: María García López" autoFocus />
            </div>
            <div className="space-y-2">
              <Label htmlFor="visit-patient-phone">Teléfono</Label>
              <Input id="visit-patient-phone" value={newPatientPhone} onChange={(e) => setNewPatientPhone(formatPhoneInput(e.target.value))} placeholder="1234-5678" maxLength={9} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsCreatePatientOpen(false)} disabled={isCreatingPatient}>Cancelar</Button>
            <Button onClick={handleSaveNewPatient} disabled={isCreatingPatient}>{isCreatingPatient ? 'Guardando...' : 'Guardar'}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
