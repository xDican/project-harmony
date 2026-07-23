import { useEffect, useMemo, useState } from 'react';
import { format, startOfMonth, endOfMonth, eachDayOfInterval, addMonths, addDays, differenceInCalendarDays, parseISO } from 'date-fns';
import { es } from 'date-fns/locale';
import { ArrowRight, Calendar, Clock, Loader2, X } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Drawer, DrawerContent, DrawerHeader, DrawerTitle, DrawerFooter } from '@/components/ui/drawer';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group';
import { cn } from '@/lib/utils';
import MonthGrid from '@/components/MonthGrid';
import { getAvailableDays, getAvailableSlots } from '@/lib/api';
import { getLocalToday } from '@/lib/dateUtils';
import { useIsMobile } from '@/hooks/use-mobile';
import { toast } from '@/hooks/use-toast';
import { getDaysWithAppointments } from '@/lib/doctorScheduleExceptionsApi';
import type { ConflictingAppointment, CreateExceptionResult } from '@/lib/doctorScheduleExceptionsApi';

/** Honduras no tiene horario de verano — offset fijo, mismo criterio que la pagina. */
const HONDURAS_OFFSET = '-06:00';
function toHondurasISO(date: string, time: string): string {
  return `${date}T${time}:00${HONDURAS_OFFSET}`;
}

/** "HH:mm" -> "HH:mm AM/PM" para mostrar en la barra resumen. */
function to12h(time: string): string {
  const [h, m] = time.split(':').map(Number);
  const period = h >= 12 ? 'PM' : 'AM';
  const h12 = h % 12 === 0 ? 12 : h % 12;
  return `${h12}:${m.toString().padStart(2, '0')} ${period}`;
}

/** Duracion entre 2 horarios "HH:mm" -> "N min" / "N horas" / "Nh Mmin". */
function formatDuration(start: string, end: string): string {
  const [sh, sm] = start.split(':').map(Number);
  const [eh, em] = end.split(':').map(Number);
  const totalMin = eh * 60 + em - (sh * 60 + sm);
  const hours = Math.floor(totalMin / 60);
  const mins = totalMin % 60;
  if (hours === 0) return `${mins} min`;
  if (mins === 0) return `${hours} ${hours === 1 ? 'hora' : 'horas'}`;
  return `${hours}h ${mins}min`;
}

function groupSlots(slots: string[]) {
  const morning = slots.filter((s) => Number(s.split(':')[0]) < 12);
  const afternoon = slots.filter((s) => Number(s.split(':')[0]) >= 12);
  return [
    { label: 'Mañana', times: morning },
    { label: 'Tarde', times: afternoon },
  ].filter((g) => g.times.length > 0);
}

interface StepPickerProps {
  doctorId: string;
  /** Mes en el que arranca el calendario al montar (ej. el mes de la fecha ya
   *  elegida — sin esto siempre arranca en el mes actual). */
  initialAnchor?: Date;
  selectedDate: string;
  onSelectDate: (date: string) => void;
  /** Solo modo "por horas": rango de horas dentro del dia elegido (`selectedDate`
   *  es siempre el mismo dia para inicio y fin en este modo — ver Fase 0 del
   *  fix v5). onSelectTime recibe el horario clickeado; la logica de
   *  inicio/fin/inversion vive en el padre (mismo patron que onSelectDate del
   *  modo dia completo). */
  startTime?: string | null;
  endTime?: string | null;
  onSelectTime?: (time: string) => void;
  /** Mobile: al elegir un dia, el calendario se colapsa a la tira de la semana
   *  para dejar ver los horarios sin scrollear una pantalla completa (mismo
   *  patron ya usado en NuevaCita.tsx / DateTimePanel). */
  collapsible?: boolean;
  /** Bloqueo de dia(s) completo(s): no hace falta elegir hora, se omite la
   *  columna de horarios (y la carga de getAvailableSlots, que no se usa). */
  fullDayMode?: boolean;
  /** Selector de rango (dia completo): fin del rango a resaltar en el
   *  calendario junto con `selectedDate` como inicio. Ver MonthGrid. */
  rangeEnd?: Date;
  /** Solo modo dia completo: se dispara con el set acumulado (todos los meses
   *  ya visitados en esta sesion del picker) de dias 'yyyy-MM-dd' que tienen
   *  al menos 1 cita activa — el padre lo usa para rechazar extensiones de
   *  rango que "saltan" por encima de un dia con citas. */
  onDaysWithAppointmentsChange?: (days: Set<string>) => void;
}

/** Calendario (MonthGrid, reusado tal cual) + grid de horas para un dia elegido. */
function StepPicker({
  doctorId,
  initialAnchor,
  selectedDate,
  startTime,
  endTime,
  onSelectDate,
  onSelectTime,
  collapsible,
  fullDayMode,
  rangeEnd,
  onDaysWithAppointmentsChange,
}: StepPickerProps) {
  const [monthAnchor, setMonthAnchor] = useState<Date>(() => startOfMonth(initialAnchor ?? getLocalToday()));
  const [daysMap, setDaysMap] = useState<Record<string, { working: boolean; canFit: boolean }>>({});
  const [isLoadingDays, setIsLoadingDays] = useState(false);
  const [slots, setSlots] = useState<string[]>([]);
  const [isLoadingSlots, setIsLoadingSlots] = useState(false);
  // Solo fullDayMode: dias con >=1 cita activa, acumulado por cada mes ya
  // visitado (se fusiona, no se reemplaza) para que el chequeo de "rango
  // salta un dia con citas" (en el padre) funcione aunque el rango cruce
  // varios meses ya navegados.
  const [daysWithAppointments, setDaysWithAppointments] = useState<Set<string>>(new Set());

  const monthDays = useMemo(
    () => eachDayOfInterval({ start: startOfMonth(monthAnchor), end: endOfMonth(monthAnchor) }),
    [monthAnchor],
  );

  useEffect(() => {
    if (fullDayMode) return; // usa el criterio de daysWithAppointments (efecto de abajo)
    let cancelled = false;
    setIsLoadingDays(true);
    getAvailableDays({ doctorId, month: format(monthAnchor, 'yyyy-MM'), durationMinutes: 30 })
      .then((map) => {
        if (cancelled) return;
        setDaysMap(map);
      })
      .catch((e) => console.error('[NewScheduleExceptionModal] getAvailableDays failed:', e))
      .finally(() => !cancelled && setIsLoadingDays(false));
    return () => {
      cancelled = true;
    };
  }, [doctorId, monthAnchor, fullDayMode]);

  useEffect(() => {
    if (!fullDayMode) return;
    let cancelled = false;
    setIsLoadingDays(true);
    const monthStart = format(startOfMonth(monthAnchor), 'yyyy-MM-dd');
    const monthEnd = format(startOfMonth(addMonths(monthAnchor, 1)), 'yyyy-MM-dd');
    getDaysWithAppointments(doctorId, monthStart, monthEnd)
      .then((daysThisMonth) => {
        if (cancelled) return;
        setDaysWithAppointments((prev) => {
          const merged = new Set(prev);
          daysThisMonth.forEach((d) => merged.add(d));
          return merged;
        });
      })
      .catch((e) => console.error('[NewScheduleExceptionModal] getDaysWithAppointments failed:', e))
      .finally(() => !cancelled && setIsLoadingDays(false));
    return () => {
      cancelled = true;
    };
  }, [doctorId, monthAnchor, fullDayMode]);

  useEffect(() => {
    if (fullDayMode) onDaysWithAppointmentsChange?.(daysWithAppointments);
  }, [daysWithAppointments, fullDayMode, onDaysWithAppointmentsChange]);

  // En fullDayMode, el criterio de "no disponible" es propio (dia pasado o con
  // citas) y no el de getAvailableDays (que mide cabida para una cita nueva de
  // 30 min) — un dia no laborable pero SIN citas SI debe quedar seleccionable
  // (decision de Fase 0, permite armar un rango de vacaciones que cruce un
  // fin de semana libre).
  const effectiveDaysMap = fullDayMode
    ? Object.fromEntries(
        monthDays.map((d) => {
          const ds = format(d, 'yyyy-MM-dd');
          return [ds, { working: true, canFit: !daysWithAppointments.has(ds) }];
        }),
      )
    : daysMap;

  useEffect(() => {
    if (fullDayMode || !selectedDate) {
      setSlots([]);
      return;
    }
    let cancelled = false;
    setIsLoadingSlots(true);
    getAvailableSlots({ doctorId, date: selectedDate, durationMinutes: 30 })
      .then((data) => {
        if (cancelled) return;
        setSlots(data);
      })
      .catch((e) => console.error('[NewScheduleExceptionModal] getAvailableSlots failed:', e))
      .finally(() => !cancelled && setIsLoadingSlots(false));
    return () => {
      cancelled = true;
    };
  }, [doctorId, selectedDate, fullDayMode]);

  const currentMonthStart = startOfMonth(getLocalToday());
  const groups = groupSlots(slots);

  return (
    // flex-1 en la raiz es correcto en modo "por horas" (reparte el alto/ancho
    // entre calendario y horarios). En modo dia completo no hay columna de
    // horarios con quien compartir ese espacio — el flex-1 estiraba el bloque
    // del calendario y dejaba un hueco vacio antes de la fila resumen (notorio
    // en el Drawer mobile, que tiene alto fijo de pantalla completa; en el
    // Dialog desktop es inerte porque su padre es un grid, no un flex).
    <div className={cn('flex flex-col lg:flex-row gap-6', !fullDayMode && 'flex-1')}>
      <div className={fullDayMode ? 'flex-1' : 'lg:flex-1 lg:border-r border-border lg:pr-6'}>
        <MonthGrid
          monthAnchor={monthAnchor}
          days={monthDays}
          daysMap={effectiveDaysMap}
          selectedDate={selectedDate ? parseISO(selectedDate) : undefined}
          rangeEnd={rangeEnd}
          onSelect={(date) => onSelectDate(format(date, 'yyyy-MM-dd'))}
          canGoPrev={monthAnchor > currentMonthStart}
          onPrev={() => setMonthAnchor((m) => addMonths(m, -1))}
          onNext={() => setMonthAnchor((m) => addMonths(m, 1))}
          isLoading={isLoadingDays}
          collapsible={collapsible}
        />
      </div>
      {!fullDayMode && (
        <div className="lg:flex-1">
          <h3 className="font-medium text-foreground mb-3">Horarios disponibles para bloqueo</h3>
          {!selectedDate ? (
            <p className="text-sm text-muted-foreground py-4">Elegí un día primero.</p>
          ) : isLoadingSlots ? (
            <div className="flex items-center justify-center py-6">
              <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
            </div>
          ) : slots.length === 0 ? (
            <p className="text-sm text-muted-foreground py-4">Sin horarios disponibles ese día.</p>
          ) : (
            <div className="space-y-3 max-h-80 overflow-y-auto pr-1">
              {groups.map((g) => (
                <div key={g.label}>
                  <p className="mb-1.5 text-xs font-medium uppercase text-muted-foreground">{g.label}</p>
                  <div className="grid grid-cols-3 gap-2">
                    {g.times.map((t) => {
                      const isStart = t === startTime;
                      const isEnd = t === endTime;
                      const isBetween = !!(startTime && endTime && t > startTime && t < endTime);
                      return (
                        <Button
                          key={t}
                          type="button"
                          size="sm"
                          variant={isStart || isEnd ? 'default' : 'outline'}
                          onClick={() => onSelectTime?.(t)}
                          className={cn('font-mono', isBetween && 'bg-primary/15 border-transparent')}
                        >
                          {t}
                        </Button>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

interface NewScheduleExceptionModalProps {
  doctorId: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  createException: (
    startAt: string,
    endAt: string,
    reason?: string,
  ) => Promise<CreateExceptionResult>;
}

export default function NewScheduleExceptionModal({
  doctorId,
  open,
  onOpenChange,
  createException,
}: NewScheduleExceptionModalProps) {
  const isMobile = useIsMobile();
  const [startDate, setStartDate] = useState('');
  const [startTime, setStartTime] = useState<string | null>(null);
  const [endDate, setEndDate] = useState('');
  const [endTime, setEndTime] = useState<string | null>(null);
  const [reason, setReason] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  // Bloqueo de dia(s) completo(s): medianoche a medianoche, sin elegir hora.
  // Evita el salto contraintuitivo de tener que elegir "8am del dia siguiente"
  // como fin (getAvailableSlots nunca ofrece la hora de cierre real como opcion,
  // ver plan de este fix).
  const [fullDayMode, setFullDayMode] = useState(false);
  // Dias (acumulados de StepPicker) con >=1 cita activa — usado para rechazar
  // extensiones de rango que "saltan" por encima de un dia con citas (el dato
  // real vive/se carga en StepPicker, esto es solo un espejo para el chequeo).
  const [daysWithAppointments, setDaysWithAppointments] = useState<Set<string>>(new Set());

  // Reset al cerrar, para que la proxima vez que se abra empiece limpio.
  useEffect(() => {
    if (!open) {
      setStartDate('');
      setStartTime(null);
      setEndDate('');
      setEndTime(null);
      setReason('');
      setFullDayMode(false);
      setDaysWithAppointments(new Set());
    }
  }, [open]);

  // Cambiar de modo (dia completo <-> por horas) a mitad de flujo dejaba la
  // UI a medias (ej. apagar el toggle exigia de golpe una hora que nunca se
  // pidio). Reiniciar todo en cada cambio de modo evita ese estado intermedio.
  const handleToggleFullDay = (next: boolean) => {
    setFullDayMode(next);
    setStartDate('');
    setStartTime(null);
    setEndDate('');
    setEndTime(null);
    setDaysWithAppointments(new Set());
  };

  // Cambiar de dia en modo "por horas" reinicia la hora elegida — los
  // horarios disponibles son propios de cada dia (Fase 0 del fix v5: el dia
  // de inicio y fin son siempre el mismo en este modo, ya no hay "paso fin"
  // en otro dia).
  const handleHourDayClick = (d: string) => {
    setStartDate(d);
    setEndDate(d);
    setStartTime(null);
    setEndTime(null);
  };

  // Mismo patron de 2 clicks ya usado para el rango de dias completos (v2):
  // un horario solo no alcanza para un bloqueo valido (a diferencia de un dia
  // calendario completo, que ya es un bloqueo valido por si solo).
  const handleTimeRangeClick = (time: string) => {
    if (!startTime || (startTime && endTime)) {
      setStartTime(time);
      setEndTime(null);
      return;
    }
    if (time < startTime) {
      setEndTime(startTime);
      setStartTime(time);
    } else if (time > startTime) {
      setEndTime(time);
    }
    // time === startTime: no-op, evita un bloqueo de 0 minutos.
  };

  /** Primer dia (yyyy-MM-dd) estrictamente entre fromExclusive y toExclusive
   *  que tiene una cita activa, o null si no hay ninguno. */
  const findBlockedDayBetween = (fromExclusive: string, toExclusive: string): string | null => {
    let cur = addDays(parseISO(fromExclusive), 1);
    const end = parseISO(toExclusive);
    while (cur < end) {
      const ds = format(cur, 'yyyy-MM-dd');
      if (daysWithAppointments.has(ds)) return ds;
      cur = addDays(cur, 1);
    }
    return null;
  };

  const blockedExtensionToast = (blockedDay: string) => {
    toast({
      variant: 'destructive',
      title: 'No se puede extender el bloqueo',
      description: `El ${format(parseISO(blockedDay), "d 'de' MMMM", { locale: es })} ya tiene citas agendadas — creá un bloqueo separado para los demás días.`,
    });
  };

  // Selector de rango de dia completo (una sola vista, sin paso "fin"): un
  // solo click ya deja un bloqueo de 1 dia listo (start=end=ese dia, sin
  // necesitar un segundo click). Clicks siguientes extienden el rango hacia
  // atras/adelante segun caigan antes o despues; un click DENTRO del rango ya
  // elegido (incluidos sus bordes) reinicia a un bloqueo de 1 solo dia en ese
  // punto — forma rapida de achicar/empezar de nuevo sin ir a "Borrar seleccion".
  // Un dia con citas nunca llega aca directo (MonthGrid lo deshabilita), pero
  // SI puede quedar "de paso" al extender — eso se rechaza explicitamente
  // porque el dato (rango continuo) no permite saltarlo.
  const handleRangeDayClick = (dateStr: string) => {
    if (!startDate) {
      setStartDate(dateStr);
      setEndDate(dateStr);
      return;
    }
    if (dateStr < startDate) {
      const blockedDay = findBlockedDayBetween(dateStr, startDate);
      if (blockedDay) {
        blockedExtensionToast(blockedDay);
        return;
      }
      setStartDate(dateStr);
    } else if (dateStr > endDate) {
      const blockedDay = findBlockedDayBetween(endDate, dateStr);
      if (blockedDay) {
        blockedExtensionToast(blockedDay);
        return;
      }
      setEndDate(dateStr);
    } else {
      setStartDate(dateStr);
      setEndDate(dateStr);
    }
  };

  const conflictToast = (conflicts: ConflictingAppointment[]) => {
    toast({
      variant: 'destructive',
      title: 'No se pudo crear el bloqueo',
      description: (
        <div>
          <p className="mb-1">Hay citas agendadas en ese rango:</p>
          <ul className="list-disc pl-4">
            {conflicts.map((c) => (
              <li key={c.id}>
                {c.patientName} — {format(new Date(c.appointmentAt), "d MMM, HH:mm", { locale: es })}
              </li>
            ))}
          </ul>
        </div>
      ),
    });
  };

  const handleConfirm = async () => {
    if (!startDate || !endDate) return;
    if (!fullDayMode && (!startTime || !endTime)) return;

    // Dia completo = medianoche a medianoche (inclusive el dia de fin), no el
    // horario exacto del medico: no existen citas fuera de horario de todos
    // modos, y evita depender de leer doctor_schedules para saber la hora de
    // cierre real de ese dia.
    const startAt = fullDayMode
      ? toHondurasISO(startDate, '00:00')
      : toHondurasISO(startDate, startTime!);
    const endAt = fullDayMode
      ? toHondurasISO(format(addDays(parseISO(endDate), 1), 'yyyy-MM-dd'), '00:00')
      : toHondurasISO(endDate, endTime!);

    if (new Date(endAt).getTime() <= new Date(startAt).getTime()) {
      toast({ variant: 'destructive', title: 'La fecha/hora de fin debe ser posterior a la de inicio.' });
      return;
    }

    setIsSubmitting(true);
    try {
      const result = await createException(startAt, endAt, reason.trim() || undefined);
      if (!result.success) {
        if (result.conflicts && result.conflicts.length > 0) {
          conflictToast(result.conflicts);
        } else {
          toast({ variant: 'destructive', title: 'No se pudo crear el bloqueo', description: result.error });
        }
        return; // se queda en la misma vista para que ajuste
      }
      toast({ title: 'Bloqueo creado', duration: 5000 });
      onOpenChange(false);
    } finally {
      setIsSubmitting(false);
    }
  };

  const summaryStart = fullDayMode
    ? (startDate ? format(parseISO(startDate), 'd MMM', { locale: es }) : null)
    : (startDate && startTime ? `${format(parseISO(startDate), 'd MMM', { locale: es })}, ${to12h(startTime)}` : null);
  const summaryEnd = fullDayMode
    ? (endDate ? format(parseISO(endDate), 'd MMM', { locale: es }) : null)
    : (endDate && endTime ? `${format(parseISO(endDate), 'd MMM', { locale: es })}, ${to12h(endTime)}` : null);

  // Refuerza visualmente lo que ya muestra el calendario (un solo dia resaltado
  // vs. un rango con dias intermedios) — pedido explicito de Diego tras el v2.
  const rangeDayCount =
    fullDayMode && startDate && endDate
      ? differenceInCalendarDays(parseISO(endDate), parseISO(startDate)) + 1
      : null;

  // Fila "icono + Bloqueo de N dias/horas ... Limpiar" — un solo hermano despues
  // del StepPicker en ambos modos (v6, mockup de Stitch). En modo por horas
  // "Limpiar" borra solo la hora (el dia elegido se mantiene); en modo dia
  // completo borra el rango entero (mismo comportamiento que ya tenia "Borrar
  // seleccion").
  const summaryRow = fullDayMode
    ? startDate && endDate && (
        <div className="flex items-center justify-between">
          <span className="inline-flex items-center gap-1.5 text-sm font-medium text-foreground">
            <Calendar className="h-4 w-4 text-muted-foreground" />
            Bloqueo de {rangeDayCount} {rangeDayCount === 1 ? 'día' : 'días'}
          </span>
          <button
            type="button"
            onClick={() => {
              setStartDate('');
              setEndDate('');
            }}
            className="text-sm text-primary hover:underline"
          >
            Limpiar
          </button>
        </div>
      )
    : startTime && endTime && (
        <div className="flex items-center justify-between">
          <span className="inline-flex items-center gap-1.5 text-sm font-medium text-foreground">
            <Clock className="h-4 w-4 text-muted-foreground" />
            Bloqueo de {formatDuration(startTime, endTime)}
          </span>
          <button
            type="button"
            onClick={() => {
              setStartTime(null);
              setEndTime(null);
            }}
            className="text-sm text-primary hover:underline"
          >
            Limpiar
          </button>
        </div>
      );

  // Cuerpo compartido entre el Dialog (desktop) y el Drawer (mobile) — evita
  // duplicar el picker + campo motivo entre los dos cascarones.
  const body = (
    <>
      <ToggleGroup
        type="single"
        value={fullDayMode ? 'full-day' : 'hours'}
        onValueChange={(v) => v && handleToggleFullDay(v === 'full-day')}
        className="bg-muted rounded-lg p-1 w-full"
      >
        <ToggleGroupItem value="hours" className="flex-1 data-[state=on]:bg-background data-[state=on]:shadow-sm">
          Por horas
        </ToggleGroupItem>
        <ToggleGroupItem value="full-day" className="flex-1 data-[state=on]:bg-background data-[state=on]:shadow-sm">
          Día completo
        </ToggleGroupItem>
      </ToggleGroup>

      <div className="bg-muted rounded-lg p-3 flex items-center gap-4 border border-border">
        <div className="flex-1">
          <span className="text-xs font-medium text-muted-foreground block mb-0.5">DESDE</span>
          <span className={summaryStart ? 'font-semibold' : 'text-muted-foreground italic text-sm'}>
            {summaryStart ?? 'Seleccionar'}
          </span>
        </div>
        <ArrowRight className="h-4 w-4 text-muted-foreground shrink-0" />
        <div className="flex-1 text-right">
          <span className="text-xs font-medium text-muted-foreground block mb-0.5">HASTA {fullDayMode && '(incl.)'}</span>
          <span className={summaryEnd ? 'font-semibold' : 'text-muted-foreground italic text-sm'}>
            {summaryEnd ?? 'Seleccionar'}
          </span>
        </div>
      </div>

      {fullDayMode ? (
        <StepPicker
          key="range"
          doctorId={doctorId}
          initialAnchor={startDate ? parseISO(startDate) : undefined}
          selectedDate={startDate}
          onSelectDate={handleRangeDayClick}
          rangeEnd={endDate ? parseISO(endDate) : undefined}
          fullDayMode
          onDaysWithAppointmentsChange={setDaysWithAppointments}
        />
      ) : (
        <StepPicker
          key="hours"
          doctorId={doctorId}
          initialAnchor={startDate ? parseISO(startDate) : undefined}
          selectedDate={startDate}
          startTime={startTime}
          endTime={endTime}
          onSelectDate={handleHourDayClick}
          onSelectTime={handleTimeRangeClick}
          collapsible={isMobile}
        />
      )}

      {summaryRow}

      <div className="space-y-1.5">
        <label className="text-sm text-muted-foreground">Motivo (opcional)</label>
        <Input
          value={reason}
          onChange={(e) => setReason(e.target.value)}
          placeholder="Ej. vacaciones, compromiso personal"
        />
      </div>
    </>
  );

  if (isMobile) {
    return (
      <Drawer open={open} onOpenChange={onOpenChange}>
        <DrawerContent className="h-[100dvh] max-h-[100dvh] rounded-none">
          <DrawerHeader className="flex flex-row items-center justify-between border-b pb-3">
            <DrawerTitle>Nuevo bloqueo</DrawerTitle>
            <Button variant="ghost" size="icon" className="shrink-0" onClick={() => onOpenChange(false)}>
              <X className="h-5 w-5" />
            </Button>
          </DrawerHeader>

          <div className="min-h-0 flex-1 overflow-y-auto p-4 flex flex-col gap-4">{body}</div>

          <DrawerFooter className="border-t pt-3">
            <Button
              className="w-full"
              disabled={!startDate || !endDate || (!fullDayMode && (!startTime || !endTime)) || isSubmitting}
              onClick={handleConfirm}
            >
              {isSubmitting ? 'Creando...' : 'Crear bloqueo'}
            </Button>
          </DrawerFooter>
        </DrawerContent>
      </Drawer>
    );
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] flex flex-col p-0 gap-0">
        <DialogHeader className="p-6 border-b border-border">
          <DialogTitle>Nuevo bloqueo</DialogTitle>
        </DialogHeader>

        <div className="p-6 flex-1 overflow-y-auto flex flex-col gap-4">{body}</div>

        <DialogFooter className="p-6 border-t border-border">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
          <Button
            disabled={!startDate || !endDate || (!fullDayMode && (!startTime || !endTime)) || isSubmitting}
            onClick={handleConfirm}
          >
            {isSubmitting ? 'Creando...' : 'Crear bloqueo'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
