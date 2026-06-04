import { format, getDay } from 'date-fns';
import { es } from 'date-fns/locale';
import { ChevronLeft, ChevronRight, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { getLocalToday } from '@/lib/dateUtils';

const WEEKDAYS = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'];

/**
 * MonthGrid — selector de fecha tipo calendario mensual (rediseño Nueva Cita).
 * Muestra TODO el mes en una grilla de 7 columnas alineada por día de semana,
 * navegable mes a mes con ‹ ›. Los días sin cupo (`canFit=false`), no laborables
 * (`working=false`) o pasados se muestran tachados y deshabilitados.
 *
 * El estado de cada día viene de `daysMap` (get-visit-days en el path ICP, o
 * get-available-days en los demás). Sin borde propio: va dentro de la card del paso 3.
 */
export default function MonthGrid({
  monthAnchor,
  days,
  daysMap,
  selectedDate,
  onSelect,
  canGoPrev,
  onPrev,
  onNext,
  isLoading,
}: {
  monthAnchor: Date;
  days: Date[];
  daysMap: Record<string, { working: boolean; canFit: boolean }>;
  selectedDate?: Date;
  onSelect: (date: Date) => void;
  canGoPrev: boolean;
  onPrev: () => void;
  onNext: () => void;
  isLoading?: boolean;
}) {
  const today = getLocalToday();
  const leadingBlanks = days.length ? getDay(days[0]) : 0;

  const isUnavailable = (date: Date): boolean => {
    if (date < today) return true;
    const info = daysMap[format(date, 'yyyy-MM-dd')];
    if (!info) return false; // sin dato aún → seleccionable (la verdad llega al abrir)
    return !info.working || !info.canFit;
  };

  return (
    <div className="relative">
      {isLoading && (
        <div className="absolute inset-0 z-10 flex items-center justify-center rounded-lg bg-background/70">
          <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" />
            <span>Cargando disponibilidad…</span>
          </div>
        </div>
      )}
      <div className={cn(isLoading && 'pointer-events-none')}>
      <div className="mb-3 flex items-center justify-between">
        <button
          type="button"
          onClick={onPrev}
          disabled={!canGoPrev}
          className="inline-flex h-8 w-8 items-center justify-center rounded-md border text-muted-foreground hover:bg-accent disabled:cursor-not-allowed disabled:opacity-40"
          aria-label="Mes anterior"
        >
          <ChevronLeft className="h-4 w-4" />
        </button>
        <span className="flex items-center gap-2 text-sm font-medium capitalize">
          {isLoading && <Loader2 className="h-3.5 w-3.5 animate-spin text-muted-foreground" />}
          {format(monthAnchor, 'LLLL yyyy', { locale: es })}
        </span>
        <button
          type="button"
          onClick={onNext}
          className="inline-flex h-8 w-8 items-center justify-center rounded-md border text-muted-foreground hover:bg-accent"
          aria-label="Mes siguiente"
        >
          <ChevronRight className="h-4 w-4" />
        </button>
      </div>

      <div className="mb-1.5 grid grid-cols-7 gap-1.5">
        {WEEKDAYS.map((w) => (
          <div key={w} className="text-center text-[0.7rem] font-medium uppercase text-muted-foreground">
            {w}
          </div>
        ))}
      </div>

      <div className="grid grid-cols-7 gap-1.5">
        {Array.from({ length: leadingBlanks }).map((_, i) => (
          <div key={`blank-${i}`} />
        ))}
        {days.map((date) => {
          const ds = format(date, 'yyyy-MM-dd');
          const unavailable = isUnavailable(date);
          const selected = selectedDate && format(selectedDate, 'yyyy-MM-dd') === ds;
          return (
            <button
              key={ds}
              type="button"
              disabled={unavailable}
              onClick={() => onSelect(date)}
              className={cn(
                'flex h-10 items-center justify-center rounded-lg border text-sm font-medium transition-colors',
                'disabled:cursor-not-allowed',
                selected
                  ? 'border-primary bg-primary text-primary-foreground'
                  : unavailable
                    ? 'border-transparent text-muted-foreground/50 line-through'
                    : 'hover:bg-accent',
              )}
            >
              {format(date, 'd')}
            </button>
          );
        })}
      </div>
      </div>
    </div>
  );
}
