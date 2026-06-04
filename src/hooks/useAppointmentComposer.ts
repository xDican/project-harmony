import { useState, useEffect, useMemo, useCallback } from 'react';
import { format, addDays } from 'date-fns';
import {
  getAvailableDays,
  getAvailableSlots,
  createAppointment,
  createPatient,
  getDoctorById,
} from '@/lib/api';
import {
  getVisitDays,
  getVisitSlots,
  createVisitAppointments,
  updatePatientReminder3d,
  type VisitSlot,
  type VisitDoctorInfo,
} from '@/lib/api.supabase';
import { listActiveServiceTypesForOrg, type OrgServiceType } from '@/lib/serviceTypesApi';
import { getLocalToday, isToday, getCurrentTimeInMinutes, timeStringToMinutes } from '@/lib/dateUtils';
import { useCurrentUser } from '@/context/UserContext';
import { useSingleDoctor } from '@/hooks/useSingleDoctor';
import { supabase } from '@/lib/supabaseClient';
import type { Patient } from '@/types/patient';
import type { Doctor } from '@/types/doctor';

/**
 * useAppointmentComposer — núcleo de datos/lógica de la "Nueva Cita" unificada
 * (rediseño Fase 1). UNA sola vista basada en servicios; la fuente de datos
 * ramifica en 3 paths (decididos en el review 4 Jun, ver plan):
 *
 *  - 'visit-engine'  → ICP (org multi-profesional con servicios, usuario NO doctor).
 *      Disponibilidad por `get-visit-days` (strip) + `get-visit-slots` (slots).
 *      Maneja 1..N servicios y auto-asigna el profesional menos cargado (server-side).
 *  - 'single-doctor' → doctor logueado o org de 1 solo doctor, con servicios.
 *      `get-available-days`/`get-available-slots` con el doctor FIJO + serviceTypeId
 *      (resource-aware). Un solo servicio (sin encadenar visita).
 *  - 'duration'      → org SIN servicios (degradación). Selector de duración +
 *      doctor; `get-available-*` clásico.
 *
 * Insert-split: 1 procedimiento → `create-appointment` (sin visit_id, reagenda
 * normal); 2+ → `create-visit` (atómico). Así no se regresiona el reagendar.
 *
 * No renderiza nada: expone estado + acciones para que la UI (Fase 2) las consuma.
 */

export type ComposerPath = 'visit-engine' | 'single-doctor' | 'duration';

/** Una fila del "detalle" de la cita/visita en construcción (1 por procedimiento). */
export interface ComposerProcedure {
  serviceTypeId: string | null;
  serviceName: string;
  start: string; // HH:mm
  end: string;   // HH:mm
  durationMinutes: number;
  doctorId: string | null;
  /** Alternativas para cambiar el profesional (solo visit-engine; [] si fijo). */
  freeDoctorIds: string[];
}

export interface ComposerSubmitResult {
  kind: 'appointment' | 'visit';
  whatsappSent: boolean;
  whatsappError?: string;
}

const DURATION_OPTIONS = [
  { value: 15, label: '15 min' },
  { value: 30, label: '30 min' },
  { value: 60, label: '1 hora' },
  { value: 90, label: '1.5 horas' },
  { value: 120, label: '2 horas' },
];

const WINDOW_DAYS = 14; // 2 semanas (week-strip del mockup)

const fmtDate = (d: Date) => format(d, 'yyyy-MM-dd');

/** Suma minutos a un "HH:mm" y devuelve "HH:mm" (naive, sin zona). */
function addMinutesToHHMM(hhmm: string, minutes: number): string {
  const [h, m] = hhmm.split(':').map(Number);
  const total = h * 60 + m + minutes;
  const hh = Math.floor(total / 60) % 24;
  const mm = total % 60;
  return `${String(hh).padStart(2, '0')}:${String(mm).padStart(2, '0')}`;
}

/** Filtra horas pasadas si la fecha es hoy (zona local). */
function filterPastIfToday(date: Date, times: string[]): string[] {
  if (!isToday(date)) return times;
  const nowMin = getCurrentTimeInMinutes();
  return times.filter((t) => timeStringToMinutes(t) > nowMin);
}

export function useAppointmentComposer() {
  const { user, isDoctorView, organizationId } = useCurrentUser();
  const { singleDoctor, isSingleDoctorOrg } = useSingleDoctor();

  // --- Catálogo de servicios del org ---
  const [catalog, setCatalog] = useState<OrgServiceType[]>([]);
  const hasServices = catalog.length > 0;

  // --- Path derivado (ver doc del hook) ---
  const path: ComposerPath = !hasServices
    ? 'duration'
    : isDoctorView || isSingleDoctorOrg
      ? 'single-doctor'
      : 'visit-engine';

  const maxItems = path === 'visit-engine' ? 8 : path === 'single-doctor' ? 1 : 0;

  // ¿La UI debe mostrar un selector de profesional? Solo en el path 'duration' de
  // orgs multi-doctor sin servicios (en single-doctor/visit-engine el profesional
  // se auto-rellena o lo asigna el motor).
  const requiresDoctorSelection = path === 'duration' && !isDoctorView && !isSingleDoctorOrg;

  // --- Selección base ---
  const [selectedPatient, setSelectedPatient] = useState<Patient | null>(null);
  const [items, setItems] = useState<OrgServiceType[]>([]); // servicios ordenados
  const [durationMinutes, setDurationMinutes] = useState<number>(30); // solo 'duration'
  const [selectedDoctor, setSelectedDoctor] = useState<Doctor | null>(null);
  const [selectedCalendarId, setSelectedCalendarId] = useState<string | undefined>();
  const [reminder3dEnabled, setReminder3dEnabled] = useState(false);

  // --- Ventana de fechas (week-strip) ---
  const [windowStart, setWindowStart] = useState<Date>(() => getLocalToday());
  const [daysMap, setDaysMap] = useState<Record<string, { working: boolean; canFit: boolean }>>({});
  const [isLoadingDays, setIsLoadingDays] = useState(false);
  const [daysError, setDaysError] = useState<string | null>(null);

  // --- Fecha + slots ---
  const [selectedDate, setSelectedDate] = useState<Date | undefined>();
  const [starts, setStarts] = useState<string[]>([]);
  const [visitSlots, setVisitSlots] = useState<VisitSlot[]>([]);
  const [doctorsDict, setDoctorsDict] = useState<Record<string, VisitDoctorInfo>>({});
  const [isLoadingSlots, setIsLoadingSlots] = useState(false);
  const [slotsReason, setSlotsReason] = useState<string | null>(null);
  const [selectedStart, setSelectedStart] = useState<string | null>(null);

  // --- Asignación por procedimiento (visit-engine; idx → doctorId) ---
  const [assignments, setAssignments] = useState<Record<number, string>>({});

  const [isSubmitting, setIsSubmitting] = useState(false);

  // Duración efectiva para los paths single-doctor/duration.
  const effectiveDuration = path === 'duration' ? durationMinutes : items[0]?.durationMinutes ?? 30;

  // Procedimientos para los EFs de visita.
  const visitProcedures = useMemo(
    () => items.map((s) => ({ serviceTypeId: s.id, durationMinutes: s.durationMinutes ?? undefined })),
    [items],
  );

  // ----- Carga del catálogo -----
  useEffect(() => {
    if (!organizationId) return;
    listActiveServiceTypesForOrg(organizationId)
      .then(setCatalog)
      .catch((e) => {
        console.error('[composer] Error cargando servicios:', e);
        setCatalog([]);
      });
  }, [organizationId]);

  // ----- Auto-fill del profesional (doctor logueado / org de 1 doctor) -----
  useEffect(() => {
    if (isDoctorView && user?.doctorId && !selectedDoctor) {
      getDoctorById(user.doctorId).then((d) => d && setSelectedDoctor(d)).catch(() => {});
    }
  }, [isDoctorView, user?.doctorId, selectedDoctor]);

  useEffect(() => {
    if (isSingleDoctorOrg && singleDoctor && !selectedDoctor) setSelectedDoctor(singleDoctor);
  }, [isSingleDoctorOrg, singleDoctor, selectedDoctor]);

  // ----- Calendario del profesional (paths con doctor fijo) -----
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

  // ----- reminder3d se siembra de la preferencia del paciente -----
  useEffect(() => {
    if (selectedPatient) setReminder3dEnabled(selectedPatient.reminder3dPreferred ?? false);
  }, [selectedPatient]);

  // ----- Reset de fecha/hora cuando cambia lo que altera disponibilidad -----
  useEffect(() => {
    setSelectedDate(undefined);
    setSelectedStart(null);
    setStarts([]);
    setVisitSlots([]);
  }, [items, effectiveDuration, selectedDoctor?.id]);

  // ----- Días disponibles de la ventana (week-strip) -----
  const windowDays = useMemo(
    () => Array.from({ length: WINDOW_DAYS }, (_, i) => addDays(windowStart, i)),
    [windowStart],
  );

  useEffect(() => {
    let cancelled = false;
    async function run() {
      setDaysError(null);
      // Casos sin lo necesario → mapa vacío (UI muestra hint).
      if (path === 'visit-engine' && items.length === 0) return setDaysMap({});
      if (path === 'single-doctor' && (items.length === 0 || !selectedDoctor)) return setDaysMap({});
      if (path === 'duration' && !selectedDoctor) return setDaysMap({});

      setIsLoadingDays(true);
      try {
        if (path === 'visit-engine') {
          const map = await getVisitDays({
            startDate: fmtDate(windowStart),
            days: WINDOW_DAYS,
            procedures: visitProcedures,
            organizationId,
          });
          if (!cancelled) setDaysMap(map);
        } else {
          // get-available-days es por MES y la ventana de 2 sem puede cruzar meses.
          const months = [...new Set(windowDays.map((d) => format(d, 'yyyy-MM')))];
          const maps = await Promise.all(
            months.map((m) =>
              getAvailableDays({
                doctorId: selectedDoctor!.id,
                month: m,
                durationMinutes: effectiveDuration,
                calendarId: selectedCalendarId,
              }),
            ),
          );
          if (!cancelled) {
            const merged: Record<string, { working: boolean; canFit: boolean }> = {};
            for (const m of maps) Object.assign(merged, m);
            setDaysMap(merged);
          }
        }
      } catch (e) {
        console.error('[composer] Error cargando días:', e);
        if (!cancelled) {
          setDaysMap({});
          setDaysError('No se pudieron cargar los días disponibles');
        }
      } finally {
        if (!cancelled) setIsLoadingDays(false);
      }
    }
    run();
    return () => {
      cancelled = true;
    };
  }, [path, items, visitProcedures, selectedDoctor?.id, effectiveDuration, windowStart, windowDays, selectedCalendarId, organizationId]);

  // ----- Slots de la fecha elegida -----
  useEffect(() => {
    if (!selectedDate) {
      setStarts([]);
      setVisitSlots([]);
      setSelectedStart(null);
      return;
    }
    let cancelled = false;
    async function run() {
      setSelectedStart(null);
      setSlotsReason(null);
      if (path === 'visit-engine' && items.length === 0) return;
      if ((path === 'single-doctor' || path === 'duration') && !selectedDoctor) return;

      setIsLoadingSlots(true);
      try {
        const dateStr = fmtDate(selectedDate!);
        if (path === 'visit-engine') {
          const res = await getVisitSlots({ date: dateStr, procedures: visitProcedures, organizationId });
          if (cancelled) return;
          setVisitSlots(res.slots);
          setDoctorsDict(res.doctors);
          setSlotsReason(res.reason ?? null);
          setStarts(filterPastIfToday(selectedDate!, res.slots.map((s) => s.start)));
        } else {
          const slots = await getAvailableSlots({
            doctorId: selectedDoctor!.id,
            date: dateStr,
            durationMinutes: effectiveDuration,
            calendarId: selectedCalendarId,
            serviceTypeId: items[0]?.id,
          });
          if (cancelled) return;
          setVisitSlots([]);
          setStarts(filterPastIfToday(selectedDate!, slots));
        }
      } catch (e) {
        console.error('[composer] Error cargando slots:', e);
        if (!cancelled) {
          setStarts([]);
          setVisitSlots([]);
          setSlotsReason('No se pudo calcular la disponibilidad.');
        }
      } finally {
        if (!cancelled) setIsLoadingSlots(false);
      }
    }
    run();
    return () => {
      cancelled = true;
    };
  }, [path, selectedDate, items, visitProcedures, selectedDoctor?.id, effectiveDuration, selectedCalendarId, organizationId]);

  // ----- Sembrar asignaciones con el sugerido al elegir inicio (visit-engine) -----
  useEffect(() => {
    if (path !== 'visit-engine' || !selectedStart) {
      setAssignments({});
      return;
    }
    const slot = visitSlots.find((s) => s.start === selectedStart);
    const seed: Record<number, string> = {};
    slot?.procedures.forEach((p, i) => {
      if (p.suggestedDoctorId) seed[i] = p.suggestedDoctorId;
    });
    setAssignments(seed);
  }, [selectedStart, path, visitSlots]);

  // ----- Cadena (detalle) del inicio elegido -----
  const chain: ComposerProcedure[] = useMemo(() => {
    if (!selectedStart) return [];
    if (path === 'visit-engine') {
      const slot = visitSlots.find((s) => s.start === selectedStart);
      if (!slot) return [];
      return slot.procedures.map((p, i) => ({
        serviceTypeId: p.serviceTypeId,
        serviceName: p.serviceName ?? 'Procedimiento',
        start: p.start,
        end: p.end,
        durationMinutes: p.durationMinutes,
        doctorId: assignments[i] ?? p.suggestedDoctorId ?? null,
        freeDoctorIds: p.freeDoctorIds,
      }));
    }
    // single-doctor / duration: un solo procedimiento, profesional fijo.
    const svc = items[0];
    return [
      {
        serviceTypeId: svc?.id ?? null,
        serviceName: svc?.displayName ?? 'Cita',
        start: selectedStart,
        end: addMinutesToHHMM(selectedStart, effectiveDuration),
        durationMinutes: effectiveDuration,
        doctorId: selectedDoctor?.id ?? null,
        freeDoctorIds: [],
      },
    ];
  }, [selectedStart, path, visitSlots, assignments, items, effectiveDuration, selectedDoctor?.id]);

  // ----- Totales -----
  const totalDuration = path === 'duration'
    ? durationMinutes
    : items.reduce((acc, s) => acc + (s.durationMinutes ?? 0), 0);
  const totalPrice = items.reduce((acc, s) => acc + (s.price ?? 0), 0);

  // ----- Validez del formulario -----
  const canSubmit =
    !!selectedPatient &&
    !!selectedDate &&
    !!selectedStart &&
    chain.length > 0 &&
    chain.every((r) => !!r.doctorId) &&
    (path === 'duration' || items.length > 0) &&
    (path !== 'visit-engine' || chain.length === items.length) &&
    !isSubmitting;

  // ----- Acciones de servicios -----
  const addService = useCallback((svc: OrgServiceType) => {
    setItems((prev) => (maxItems === 1 ? [svc] : [...prev, svc]));
  }, [maxItems]);
  const removeService = useCallback((idx: number) => {
    setItems((prev) => prev.filter((_, i) => i !== idx));
  }, []);
  const moveService = useCallback((idx: number, dir: -1 | 1) => {
    setItems((prev) => {
      const next = [...prev];
      const j = idx + dir;
      if (j < 0 || j >= next.length) return prev;
      [next[idx], next[j]] = [next[j], next[idx]];
      return next;
    });
  }, []);
  const clearServices = useCallback(() => setItems([]), []);

  const setAssignment = useCallback((idx: number, doctorId: string) => {
    setAssignments((prev) => ({ ...prev, [idx]: doctorId }));
  }, []);

  // ----- Navegación de semana (no antes de hoy) -----
  const today = getLocalToday();
  const canGoPrev = windowStart > today;
  const goPrevWeek = useCallback(() => {
    setWindowStart((prev) => {
      const back = addDays(prev, -7);
      return back < today ? today : back;
    });
  }, [today]);
  const goNextWeek = useCallback(() => setWindowStart((prev) => addDays(prev, 7)), []);

  // ----- Toggle de recordatorio (persiste preferencia del paciente) -----
  const setReminder3d = useCallback((checked: boolean) => {
    setReminder3dEnabled(checked);
    if (selectedPatient) updatePatientReminder3d(selectedPatient.id, checked); // fire-and-forget
  }, [selectedPatient]);

  // ----- Profesional para vincular un paciente nuevo -----
  const resolveLinkDoctorId = useCallback(async (): Promise<string | null> => {
    if (selectedDoctor?.id) return selectedDoctor.id;
    const fromChain = chain[0]?.doctorId;
    if (fromChain) return fromChain;
    const dictKeys = Object.keys(doctorsDict);
    if (dictKeys.length) return dictKeys[0];
    if (user?.doctorId) return user.doctorId;
    if (!organizationId) return null;
    const { data } = await supabase
      .from('doctors')
      .select('id')
      .eq('organization_id', organizationId)
      .order('name', { ascending: true })
      .limit(1)
      .maybeSingle();
    return (data as { id: string } | null)?.id ?? null;
  }, [selectedDoctor?.id, chain, doctorsDict, user?.doctorId, organizationId]);

  const createPatientForBooking = useCallback(async (input: { name: string; phone: string }): Promise<Patient> => {
    const doctorId = await resolveLinkDoctorId();
    if (!doctorId) throw new Error('Selecciona un servicio o profesional antes de crear un paciente.');
    return createPatient({ name: input.name, phone: input.phone, doctorId });
  }, [resolveLinkDoctorId]);

  // ----- Reset total tras agendar -----
  const reset = useCallback(() => {
    setSelectedPatient(null);
    setItems([]);
    setDurationMinutes(30);
    setSelectedDate(undefined);
    setSelectedStart(null);
    setStarts([]);
    setVisitSlots([]);
    setAssignments({});
    setReminder3dEnabled(false);
    setWindowStart(getLocalToday());
    if (!isSingleDoctorOrg && !isDoctorView) setSelectedDoctor(null);
  }, [isSingleDoctorOrg, isDoctorView]);

  // ----- Agendar (insert-split) -----
  const submit = useCallback(async (): Promise<ComposerSubmitResult> => {
    if (!selectedPatient || !selectedDate || !selectedStart) {
      throw new Error('Faltan datos de la cita.');
    }
    const dateStr = fmtDate(selectedDate);
    setIsSubmitting(true);
    try {
      // 2+ procedimientos (solo visit-engine) → visita atómica.
      if (path === 'visit-engine' && chain.length >= 2) {
        const procedures = chain.map((p) => ({
          serviceTypeId: p.serviceTypeId!,
          doctorId: p.doctorId!,
          date: dateStr,
          time: p.start,
          durationMinutes: p.durationMinutes,
        }));
        const res = await createVisitAppointments({
          patientId: selectedPatient.id,
          procedures,
          reminder3dEnabled,
          organizationId,
        });
        return { kind: 'visit', whatsappSent: res.whatsappSent, whatsappError: res.whatsappError };
      }

      // 1 procedimiento (visit-engine 1 servicio, single-doctor o duration) → cita simple.
      const proc = chain[0];
      const res = await createAppointment({
        doctorId: proc.doctorId!,
        patientId: selectedPatient.id,
        date: dateStr,
        time: proc.start,
        durationMinutes: proc.durationMinutes,
        reminder3dEnabled,
        serviceTypeId: proc.serviceTypeId ?? undefined,
      });
      return { kind: 'appointment', whatsappSent: res.whatsappSent, whatsappError: res.whatsappError };
    } finally {
      setIsSubmitting(false);
    }
  }, [path, chain, selectedPatient, selectedDate, selectedStart, reminder3dEnabled, organizationId]);

  return {
    // contexto
    path,
    maxItems,
    requiresDoctorSelection,
    organizationId,
    durationOptions: DURATION_OPTIONS,
    // paciente
    selectedPatient,
    setSelectedPatient,
    createPatientForBooking,
    // servicios
    catalog,
    items,
    addService,
    removeService,
    moveService,
    clearServices,
    // duración (path 'duration')
    durationMinutes,
    setDurationMinutes,
    // profesional (paths con doctor fijo)
    selectedDoctor,
    setSelectedDoctor,
    // ventana / días
    windowDays,
    daysMap,
    isLoadingDays,
    daysError,
    canGoPrev,
    goPrevWeek,
    goNextWeek,
    // fecha + slots
    selectedDate,
    setSelectedDate,
    starts,
    isLoadingSlots,
    slotsReason,
    selectedStart,
    setSelectedStart,
    // asignación
    chain,
    doctorsDict,
    setAssignment,
    // recordatorio
    reminder3dEnabled,
    setReminder3d,
    // totales + acción
    totalDuration,
    totalPrice,
    canSubmit,
    isSubmitting,
    submit,
    reset,
  };
}
