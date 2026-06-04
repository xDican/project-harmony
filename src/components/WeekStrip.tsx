import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { ChevronLeft, ChevronRight, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { getLocalToday } from '@/lib/dateUtils';

/**
 * WeekStrip — selector de fecha tipo "tira de semanas" (rediseño Nueva Cita).
 * Muestra una ventana de días (2 semanas en grilla de 7) con flechas ‹ › para
 * navegar de semana en semana. Los días sin cupo (`canFit=false`) o no laborables
 * (`working=false`) o pasados se muestran tachados y deshabilitados.
 *
 * El estado de cada día viene de `daysMap` (alimentado por get-visit-days en el
 * path ICP, o get-available-days en los demás). Compacto, siempre completo — pensado
 * para una columna angosta donde una grilla de mes se vería cortada.
 */
export default function WeekStrip({
  days,
  daysMap,
  selectedDate,
  onSelect,
  canGoPrev,
  onPrev,
  onNext,
  isLoading,
  disabled,
}: {
  days: Date[];
  daysMap: Record<string, { working: boolean; canFit: boolean }>;
  selectedDate?: Date;
  onSelect: (date: Date) => void;
  canGoPrev: boolean;
  onPrev: () => void;
  onNext: () => void;
  isLoading?: boolean;
  disabled?: boolean;
}) {
  const today = getLocalToday();
  const isUnavailable = (date: Date): boolean => {
    if (date < today) return true;
    const info = daysMap[format(date, 'yyyy-MM-dd')];
    if (!info) return false; // sin dato aún → seleccionable (la verdad llega al abrir)
    return !info.working || !info.canFit;
  };

  const rangeLabel = days.length
    ? `${format(days[0], "d 'de' MMM", { locale: es })} – ${format(days[days.length - 1], "d 'de' MMM", { locale: es })}`
    : '';

  return (
    <div className={cn('rounded-xl border bg-card p-3', disabled && 'opacity-60')}>
      <div className="flex items-center justify-between mb-3">
        <button
          type="button"
          onClick={onPrev}
          disabled={!canGoPrev || disabled}
          className="inline-flex h-8 w-8 items-center justify-center rounded-md border text-muted-foreground hover:bg-accent disabled:opacity-40 disabled:cursor-not-allowed"
          aria-label="Semana anterior"
        >
          <ChevronLeft className="h-4 w-4" />
        </button>
        <span className="text-sm font-medium capitalize flex items-center gap-2">
          {isLoading && <Loader2 className="h-3.5 w-3.5 animate-spin text-muted-foreground" />}
          {rangeLabel}
        </span>
        <button
          type="button"
          onClick={onNext}
          disabled={disabled}
          className="inline-flex h-8 w-8 items-center justify-center rounded-md border text-muted-foreground hover:bg-accent disabled:opacity-40 disabled:cursor-not-allowed"
          aria-label="Semana siguiente"
        >
          <ChevronRight className="h-4 w-4" />
        </button>
      </div>

      <div className="grid grid-cols-7 gap-1.5">
        {days.map((date) => {
          const ds = format(date, 'yyyy-MM-dd');
          const unavailable = isUnavailable(date);
          const selected = selectedDate && format(selectedDate, 'yyyy-MM-dd') === ds;
          return (
            <button
              key={ds}
              type="button"
              disabled={unavailable || disabled}
              onClick={() => onSelect(date)}
              className={cn(
                'flex flex-col items-center justify-center rounded-lg border py-1.5 text-center transition-colors',
                'disabled:cursor-not-allowed',
                selected
                  ? 'bg-primary text-primary-foreground border-primary'
                  : unavailable
                    ? 'text-muted-foreground/50 line-through bg-transparent'
                    : 'hover:bg-accent',
              )}
            >
              <span className="text-[0.65rem] uppercase leading-none mb-1 opacity-80">
                {format(date, 'EEE', { locale: es })}
              </span>
              <span className="text-sm font-semibold leading-none">{format(date, 'd')}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
