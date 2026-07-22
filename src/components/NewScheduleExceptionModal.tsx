import { useEffect, useMemo, useState } from 'react';
import { format, startOfMonth, endOfMonth, eachDayOfInterval, addMonths, parseISO } from 'date-fns';
import { es } from 'date-fns/locale';
import { ArrowLeft, ArrowRight, Loader2 } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { Drawer, DrawerContent, DrawerHeader, DrawerTitle, DrawerFooter } from '@/components/ui/drawer';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import MonthGrid from '@/components/MonthGrid';
import { getAvailableDays, getAvailableSlots } from '@/lib/api';
import { getLocalToday } from '@/lib/dateUtils';
import { useIsMobile } from '@/hooks/use-mobile';
import { toast } from '@/hooks/use-toast';
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
  minDate?: string;
  /** Mes en el que arranca el calendario al montar (ej. el mes de la fecha de
   *  inicio ya elegida, para el paso "fin" — sin esto siempre arranca en el
   *  mes actual aunque el inicio ya este en un mes futuro). */
  initialAnchor?: Date;
  selectedDate: string;
  selectedTime: string | null;
  onSelectDate: (date: string) => void;
  onSelectTime: (time: string) => void;
  excludeTimesAtOrBefore?: string;
  /** Mobile: al elegir un dia, el calendario se colapsa a la tira de la semana
   *  para dejar ver los horarios sin scrollear una pantalla completa (mismo
   *  patron ya usado en NuevaCita.tsx / DateTimePanel). */
  collapsible?: boolean;
}

/** Calendario (MonthGrid, reusado tal cual) + grid de horas para un dia elegido. */
function StepPicker({
  doctorId,
  minDate,
  initialAnchor,
  selectedDate,
  selectedTime,
  onSelectDate,
  onSelectTime,
  excludeTimesAtOrBefore,
  collapsible,
}: StepPickerProps) {
  const [monthAnchor, setMonthAnchor] = useState<Date>(() => startOfMonth(initialAnchor ?? getLocalToday()));
  const [daysMap, setDaysMap] = useState<Record<string, { working: boolean; canFit: boolean }>>({});
  const [isLoadingDays, setIsLoadingDays] = useState(false);
  const [slots, setSlots] = useState<string[]>([]);
  const [isLoadingSlots, setIsLoadingSlots] = useState(false);

  const monthDays = useMemo(
    () => eachDayOfInterval({ start: startOfMonth(monthAnchor), end: endOfMonth(monthAnchor) }),
    [monthAnchor],
  );

  useEffect(() => {
    let cancelled = false;
    setIsLoadingDays(true);
    getAvailableDays({ doctorId, month: format(monthAnchor, 'yyyy-MM'), durationMinutes: 30 })
      .then((map) => {
        if (cancelled) return;
        // Fuerza no-disponibles los dias antes del minimo (ej. paso "fin" no puede
        // terminar antes de empezar) sin tocar MonthGrid.
        if (minDate) {
          for (const key of Object.keys(map)) {
            if (key < minDate) map[key] = { working: false, canFit: false };
          }
        }
        setDaysMap(map);
      })
      .catch((e) => console.error('[NewScheduleExceptionModal] getAvailableDays failed:', e))
      .finally(() => !cancelled && setIsLoadingDays(false));
    return () => {
      cancelled = true;
    };
  }, [doctorId, monthAnchor, minDate]);

  useEffect(() => {
    if (!selectedDate) {
      setSlots([]);
      return;
    }
    let cancelled = false;
    setIsLoadingSlots(true);
    getAvailableSlots({ doctorId, date: selectedDate, durationMinutes: 30 })
      .then((data) => {
        if (cancelled) return;
        const filtered = excludeTimesAtOrBefore
          ? data.filter((t) => t > excludeTimesAtOrBefore)
          : data;
        setSlots(filtered);
      })
      .catch((e) => console.error('[NewScheduleExceptionModal] getAvailableSlots failed:', e))
      .finally(() => !cancelled && setIsLoadingSlots(false));
    return () => {
      cancelled = true;
    };
  }, [doctorId, selectedDate, excludeTimesAtOrBefore]);

  const currentMonthStart = startOfMonth(getLocalToday());
  const groups = groupSlots(slots);

  return (
    // flex-1 en las 2 columnas es correcto en desktop (lg:flex-row, reparte ANCHO
    // por igual) pero en mobile (flex-col) forzaba a cada bloque a estirarse a la
    // mitad del ALTO disponible del Drawer — el calendario colapsado (1 fila) quedaba
    // con un hueco enorme antes de los horarios. Por eso flex-1 ahora es lg:flex-1.
    <div className="flex-1 flex flex-col lg:flex-row gap-6">
      <div className="lg:flex-1 lg:border-r border-border lg:pr-6">
        <MonthGrid
          monthAnchor={monthAnchor}
          days={monthDays}
          daysMap={daysMap}
          selectedDate={selectedDate ? parseISO(selectedDate) : undefined}
          onSelect={(date) => onSelectDate(format(date, 'yyyy-MM-dd'))}
          canGoPrev={monthAnchor > currentMonthStart}
          onPrev={() => setMonthAnchor((m) => addMonths(m, -1))}
          onNext={() => setMonthAnchor((m) => addMonths(m, 1))}
          isLoading={isLoadingDays}
          collapsible={collapsible}
        />
      </div>
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
                  {g.times.map((t) => (
                    <Button
                      key={t}
                      type="button"
                      size="sm"
                      variant={selectedTime === t ? 'default' : 'outline'}
                      onClick={() => onSelectTime(t)}
                      className="font-mono"
                    >
                      {t}
                    </Button>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
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
  const [step, setStep] = useState<'start' | 'end'>('start');
  const [startDate, setStartDate] = useState('');
  const [startTime, setStartTime] = useState<string | null>(null);
  const [endDate, setEndDate] = useState('');
  const [endTime, setEndTime] = useState<string | null>(null);
  const [reason, setReason] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Reset al cerrar, para que la proxima vez que se abra empiece limpio.
  useEffect(() => {
    if (!open) {
      setStep('start');
      setStartDate('');
      setStartTime(null);
      setEndDate('');
      setEndTime(null);
      setReason('');
    }
  }, [open]);

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
    if (!startDate || !startTime || !endDate || !endTime) return;
    const startAt = toHondurasISO(startDate, startTime);
    const endAt = toHondurasISO(endDate, endTime);

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
        return; // se queda en el paso 'end' para que ajuste
      }
      toast({ title: 'Bloqueo creado', duration: 5000 });
      onOpenChange(false);
    } finally {
      setIsSubmitting(false);
    }
  };

  const summaryStart = startDate && startTime ? `${format(parseISO(startDate), 'd MMM', { locale: es })}, ${to12h(startTime)}` : null;
  const summaryEnd = endDate && endTime ? `${format(parseISO(endDate), 'd MMM', { locale: es })}, ${to12h(endTime)}` : null;

  // Cuerpo compartido entre el Dialog (desktop) y el Drawer (mobile) — evita
  // duplicar el picker + campo motivo entre los dos cascarones.
  const body = (
    <>
      <div className="bg-muted rounded-lg p-3 flex items-center gap-4 border border-border">
        <div className="flex-1">
          <span className="text-xs font-medium text-muted-foreground block mb-0.5">DESDE</span>
          <span className={summaryStart ? 'font-semibold' : 'text-muted-foreground italic text-sm'}>
            {summaryStart ?? 'Seleccionar'}
          </span>
        </div>
        <ArrowRight className="h-4 w-4 text-muted-foreground shrink-0" />
        <div className="flex-1 text-right">
          <span className="text-xs font-medium text-muted-foreground block mb-0.5">HASTA</span>
          <span className={summaryEnd ? 'font-semibold' : 'text-muted-foreground italic text-sm'}>
            {summaryEnd ?? 'Seleccionar'}
          </span>
        </div>
      </div>

      {step === 'start' ? (
        <StepPicker
          key="start"
          doctorId={doctorId}
          initialAnchor={startDate ? parseISO(startDate) : undefined}
          selectedDate={startDate}
          selectedTime={startTime}
          onSelectDate={(d) => {
            setStartDate(d);
            setStartTime(null);
          }}
          onSelectTime={setStartTime}
          collapsible={isMobile}
        />
      ) : (
        <>
          <StepPicker
            key="end"
            doctorId={doctorId}
            minDate={startDate}
            initialAnchor={endDate ? parseISO(endDate) : startDate ? parseISO(startDate) : undefined}
            selectedDate={endDate}
            selectedTime={endTime}
            onSelectDate={(d) => {
              setEndDate(d);
              setEndTime(null);
            }}
            onSelectTime={setEndTime}
            excludeTimesAtOrBefore={endDate === startDate ? startTime ?? undefined : undefined}
            collapsible={isMobile}
          />
          <div className="space-y-1.5">
            <label className="text-sm text-muted-foreground">Motivo (opcional)</label>
            <Input
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="Ej. vacaciones, compromiso personal"
            />
          </div>
        </>
      )}
    </>
  );

  const stepDescription =
    step === 'start' ? 'Elegí desde cuándo empieza el bloqueo.' : 'Ahora elegí cuándo termina el bloqueo.';

  if (isMobile) {
    return (
      <Drawer open={open} onOpenChange={onOpenChange}>
        <DrawerContent className="h-[100dvh] max-h-[100dvh] rounded-none">
          <DrawerHeader className="flex flex-row items-center gap-2 border-b pb-3 text-left">
            <Button
              variant="ghost"
              size="icon"
              className="shrink-0"
              onClick={() => (step === 'end' ? setStep('start') : onOpenChange(false))}
            >
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <div>
              <DrawerTitle>Nuevo bloqueo</DrawerTitle>
              <p className="text-sm text-muted-foreground">{stepDescription}</p>
            </div>
          </DrawerHeader>

          <div className="min-h-0 flex-1 overflow-y-auto p-4 flex flex-col gap-4">{body}</div>

          <DrawerFooter className="border-t pt-3">
            {step === 'start' ? (
              <Button className="w-full" disabled={!startDate || !startTime} onClick={() => setStep('end')}>
                Seleccionar fecha de fin
                <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            ) : (
              <Button className="w-full" disabled={!endDate || !endTime || isSubmitting} onClick={handleConfirm}>
                {isSubmitting ? 'Creando...' : 'Crear bloqueo'}
              </Button>
            )}
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
          <DialogDescription>{stepDescription}</DialogDescription>
        </DialogHeader>

        <div className="p-6 flex-1 overflow-y-auto flex flex-col gap-4">{body}</div>

        <DialogFooter className="p-6 border-t border-border">
          {step === 'start' ? (
            <>
              <Button variant="outline" onClick={() => onOpenChange(false)}>
                Cancelar
              </Button>
              <Button disabled={!startDate || !startTime} onClick={() => setStep('end')}>
                Seleccionar fecha de fin
                <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            </>
          ) : (
            <>
              <Button variant="outline" onClick={() => setStep('start')} disabled={isSubmitting}>
                <ArrowLeft className="mr-2 h-4 w-4" />
                Volver
              </Button>
              <Button disabled={!endDate || !endTime || isSubmitting} onClick={handleConfirm}>
                {isSubmitting ? 'Creando...' : 'Crear bloqueo'}
              </Button>
            </>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
