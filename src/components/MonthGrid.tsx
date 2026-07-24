import { useState, useRef } from 'react';
import type { ReactNode } from 'react';
import { format, getDay, startOfWeek, addDays, isSameDay } from 'date-fns';
import { es } from 'date-fns/locale';
import { ChevronLeft, ChevronRight, ChevronDown, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { getLocalToday } from '@/lib/dateUtils';

const WEEKDAYS = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'];

/** Clases de borde/fondo/texto de un cuadro de día según su estado (prioridad: seleccionado > en-rango > no-disponible > hoy > default). */
function dayVariantClass(selected: boolean, isBetween: boolean, unavailable: boolean, isToday: boolean): string {
  if (selected) return 'border-primary bg-primary text-primary-foreground';
  if (isBetween) return 'border-transparent bg-primary/15 text-foreground';
  if (unavailable) return 'border-transparent text-muted-foreground/50 line-through';
  if (isToday) return 'border-primary text-primary hover:bg-accent';
  return 'hover:bg-accent';
}

/**
 * MonthGrid — selector de fecha (rediseño Nueva Cita). Grilla mensual de 7 columnas
 * navegable mes a mes; los días sin cupo / no laborables / pasados van tachados.
 *
 * Con `collapsible` (drawer mobile): al elegir un día, el calendario se colapsa a la
 * semana de ese día (tira horizontal tipo cards) para ahorrar espacio; un botón
 * "Expandir" regresa al mes completo. Sin día elegido se muestra el mes.
 */
export default function MonthGrid({
  monthAnchor,
  days,
  daysMap,
  selectedDate,
  rangeEnd,
  markedDays,
  disablePast = true,
  onSelect,
  canGoPrev,
  onPrev,
  onNext,
  isLoading,
  collapsible,
  headerExtra,
  swipeable,
  largeDays,
}: {
  monthAnchor: Date;
  days: Date[];
  daysMap: Record<string, { working: boolean; canFit: boolean }>;
  selectedDate?: Date;
  /** Selector de rango (bloqueo de dia completo): fin del rango, con
   *  `selectedDate` como inicio. Dias estrictamente entre ambos se resaltan
   *  como "en rango". Opcional y retrocompatible — sin este prop el
   *  componente se comporta exactamente igual que antes (seleccion de un
   *  solo dia), como ya lo usan NuevaCita.tsx y el modo "por horas". */
  rangeEnd?: Date;
  /** Dias 'yyyy-MM-dd' que muestran un punto indicador debajo del numero
   *  (ej. "este dia tiene citas") — puramente visual, no afecta si el dia
   *  es clickeable. Usado por la vista mensual de agenda. */
  markedDays?: Set<string>;
  /** Si es false, los dias pasados NO se deshabilitan — para vistas de solo
   *  lectura (ej. agenda mensual, donde tiene sentido ver dias pasados) a
   *  diferencia del booking (NuevaCita, bloqueador de horario), que siempre
   *  los bloquea. Default true = comportamiento actual, sin cambios. */
  disablePast?: boolean;
  onSelect: (date: Date) => void;
  canGoPrev: boolean;
  onPrev: () => void;
  onNext: () => void;
  isLoading?: boolean;
  collapsible?: boolean;
  /** Nodo opcional que se renderiza al final del header (modo no-colapsado),
   *  a la derecha del boton "mes siguiente" — ej. el boton "Hoy" de la
   *  agenda mensual. Opcional y retrocompatible: sin este prop el header se
   *  ve exactamente igual que antes. No aparece en modo `collapsed`. */
  headerExtra?: ReactNode;
  /** Habilita swipe horizontal (touch) sobre la grilla de dias para navegar
   *  entre meses (onPrev/onNext). Opcional, default false — sin cambio de
   *  comportamiento para quien no lo pase. Solo aplica en modo no-colapsado. */
  swipeable?: boolean;
  /** Cuadros de día más grandes (alto y tipografía) — usado por la agenda
   *  mensual, que tiene espacio vertical de sobra. Opcional, default false
   *  = tamaño actual (h-10), sin cambios para NuevaCita/bloqueador de horario. */
  largeDays?: boolean;
}) {
  const today = getLocalToday();
  const leadingBlanks = days.length ? getDay(days[0]) : 0;
  const [expanded, setExpanded] = useState(false);

  // Swipe horizontal (mes anterior/siguiente) — solo si `swipeable`.
  const touchStartRef = useRef<{ x: number; y: number } | null>(null);
  const touchHandledRef = useRef(false);
  const SWIPE_MIN_DISTANCE = 50;
  const SWIPE_MAX_ANGLE_RATIO = 0.5;

  const handleTouchStart = (e: React.TouchEvent) => {
    if (!swipeable || isLoading) return;
    const t = e.touches[0];
    touchStartRef.current = { x: t.clientX, y: t.clientY };
    touchHandledRef.current = false;
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (!swipeable || isLoading || !touchStartRef.current || touchHandledRef.current) return;
    const t = e.touches[0];
    const deltaX = t.clientX - touchStartRef.current.x;
    const deltaY = t.clientY - touchStartRef.current.y;
    if (Math.abs(deltaX) > SWIPE_MIN_DISTANCE && Math.abs(deltaY) < Math.abs(deltaX) * SWIPE_MAX_ANGLE_RATIO) {
      touchHandledRef.current = true;
      if (deltaX > 0) {
        if (canGoPrev) onPrev();
      } else {
        onNext();
      }
      touchStartRef.current = null;
    }
  };

  const handleTouchEnd = () => {
    touchStartRef.current = null;
    touchHandledRef.current = false;
  };

  // Modo colapsable: con un día elegido se ve solo su semana; "Expandir" → mes.
  const collapsed = !!collapsible && !!selectedDate && !expanded;

  const isUnavailable = (date: Date): boolean => {
    if (disablePast && date < today) return true;
    const info = daysMap[format(date, 'yyyy-MM-dd')];
    if (!info) return false; // sin dato aún → seleccionable (la verdad llega al abrir)
    return !info.working || !info.canFit;
  };

  const handleSelect = (date: Date) => {
    onSelect(date);
    if (collapsible) setExpanded(false); // al elegir, colapsa a la semana
  };

  // Semana (Lun→Dom) del día elegido, para la vista colapsada.
  const weekDays = selectedDate
    ? Array.from({ length: 7 }, (_, i) => addDays(startOfWeek(selectedDate, { weekStartsOn: 1 }), i))
    : [];

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
        {/* Header: navegación de mes (expandido) o mes + "Expandir" (colapsado) */}
        <div className="mb-3 flex items-center justify-between">
          {collapsed ? (
            <>
              <span className="text-sm font-medium capitalize">
                {format(selectedDate!, 'LLLL yyyy', { locale: es })}
              </span>
              <button
                type="button"
                onClick={() => setExpanded(true)}
                className="inline-flex items-center gap-1 rounded-md px-2 py-1 text-sm font-medium text-primary hover:bg-accent"
              >
                Expandir <ChevronDown className="h-4 w-4" />
              </button>
            </>
          ) : (
            <>
              <button
                type="button"
                onClick={onPrev}
                disabled={!canGoPrev || isLoading}
                className="inline-flex h-8 w-8 items-center justify-center rounded-md border text-muted-foreground hover:bg-accent disabled:cursor-not-allowed disabled:opacity-40"
                aria-label="Mes anterior"
              >
                <ChevronLeft className="h-4 w-4" />
              </button>
              <span className="flex items-center gap-2 text-sm font-medium capitalize">
                {isLoading && <Loader2 className="h-3.5 w-3.5 animate-spin text-muted-foreground" />}
                {format(monthAnchor, 'LLLL yyyy', { locale: es })}
              </span>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={onNext}
                  disabled={isLoading}
                  className="inline-flex h-8 w-8 items-center justify-center rounded-md border text-muted-foreground hover:bg-accent disabled:cursor-not-allowed disabled:opacity-40"
                  aria-label="Mes siguiente"
                >
                  <ChevronRight className="h-4 w-4" />
                </button>
                {headerExtra}
              </div>
            </>
          )}
        </div>

        {collapsed ? (
          // Vista semana (colapsada): semana Lun→Dom completa en una sola línea.
          <div className="grid grid-cols-7 gap-1">
            {weekDays.map((date) => {
              const ds = format(date, 'yyyy-MM-dd');
              const unavailable = isUnavailable(date);
              const selected = selectedDate && isSameDay(date, selectedDate);
              return (
                <button
                  key={ds}
                  type="button"
                  disabled={unavailable}
                  onClick={() => handleSelect(date)}
                  className={cn(
                    'flex flex-col items-center justify-center gap-0.5 rounded-lg border py-1.5 transition-colors',
                    'disabled:cursor-not-allowed',
                    selected
                      ? 'border-primary bg-primary text-primary-foreground'
                      : unavailable
                        ? 'border-transparent text-muted-foreground/50 line-through'
                        : 'hover:bg-accent',
                  )}
                >
                  <span className="text-[0.6rem] font-medium uppercase">{format(date, 'EEE', { locale: es })}</span>
                  <span className="text-base font-semibold leading-none">{format(date, 'd')}</span>
                </button>
              );
            })}
          </div>
        ) : (
          // Vista mes (expandida): grilla 7×N.
          <>
            <div className="mb-1.5 grid grid-cols-7 gap-1.5">
              {WEEKDAYS.map((w) => (
                <div key={w} className="text-center text-[0.7rem] font-medium uppercase text-muted-foreground">
                  {w}
                </div>
              ))}
            </div>

            <div
              className={cn('grid grid-cols-7', largeDays ? 'gap-2' : 'gap-1.5')}
              onTouchStart={handleTouchStart}
              onTouchMove={handleTouchMove}
              onTouchEnd={handleTouchEnd}
            >
              {Array.from({ length: leadingBlanks }).map((_, i) => (
                <div key={`blank-${i}`} />
              ))}
              {days.map((date) => {
                const ds = format(date, 'yyyy-MM-dd');
                const unavailable = isUnavailable(date);
                const isRangeStart = selectedDate && format(selectedDate, 'yyyy-MM-dd') === ds;
                const isRangeEnd = rangeEnd && format(rangeEnd, 'yyyy-MM-dd') === ds;
                const selected = isRangeStart || isRangeEnd;
                const isBetween = !!(selectedDate && rangeEnd && date > selectedDate && date < rangeEnd);
                const marked = markedDays?.has(ds);
                const isToday = isSameDay(date, today);
                return (
                  <button
                    key={ds}
                    type="button"
                    disabled={unavailable}
                    onClick={() => handleSelect(date)}
                    className={cn(
                      'relative flex items-center justify-center rounded-lg border font-medium transition-colors',
                      largeDays ? 'h-20 text-lg' : 'h-10 text-sm',
                      'disabled:cursor-not-allowed',
                      dayVariantClass(selected, isBetween, unavailable, isToday),
                    )}
                  >
                    {format(date, 'd')}
                    {marked && (
                      <span
                        className={cn(
                          'absolute rounded-full',
                          largeDays ? 'bottom-2 h-1.5 w-1.5' : 'bottom-1 h-1 w-1',
                          selected ? 'bg-primary-foreground' : 'bg-primary',
                        )}
                      />
                    )}
                  </button>
                );
              })}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
