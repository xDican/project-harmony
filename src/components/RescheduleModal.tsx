import { useState, useEffect, useCallback } from 'react';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { DateTime } from 'luxon';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { CalendarIcon, Loader2, AlertCircle } from 'lucide-react';
import { cn } from '@/lib/utils';
import { supabase } from '@/lib/supabaseClient';
import { getAvailableSlots, getAvailableDays } from '@/lib/api';
import { getLocalToday, isToday, getCurrentTimeInMinutes, timeStringToMinutes } from '@/lib/dateUtils';
import { useToast } from '@/hooks/use-toast';
import SlotSelector from '@/components/SlotSelector';

interface RescheduleModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  appointmentId: string;
  doctorId: string;
  currentDate: string;
  currentTime: string;
  currentDuration?: number;
  onSuccess: () => void;
}

// Duration options (same as NuevaCita)
const durationOptions = [
  { value: 60, label: '1 hora' },
  { value: 90, label: '1.5 horas' },
  { value: 120, label: '2 horas' },
  { value: 180, label: '3 horas' },
];

export function RescheduleModal({
  open,
  onOpenChange,
  appointmentId,
  doctorId,
  currentDate,
  currentTime,
  currentDuration = 60,
  onSuccess,
}: RescheduleModalProps) {
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);
  const [isLoadingSlots, setIsLoadingSlots] = useState(false);
  
  // Duration state (primer paso en el flujo)
  const [durationMinutes, setDurationMinutes] = useState(currentDuration);
  
  // Available days state (para bloquear días en el calendario)
  const [currentMonth, setCurrentMonth] = useState<Date>(new Date());
  const [availableDaysMap, setAvailableDaysMap] = useState<Record<string, { canFit: boolean; working: boolean }>>({});
  const [isLoadingDays, setIsLoadingDays] = useState(false);
  const [errorDays, setErrorDays] = useState<string | null>(null);
  
  // Date and slot state
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(undefined);
  const [selectedSlot, setSelectedSlot] = useState<string | null>(null);
  const [availableSlots, setAvailableSlots] = useState<string[]>([]);
  const [calendarOpen, setCalendarOpen] = useState(false);

  /**
   * Fetch available days when duration or month changes
   */
  const fetchAvailableDays = useCallback(async (month: Date, duration: number) => {
    if (!doctorId) return;
    
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
      console.error('[RescheduleModal] Error fetching available days:', error);
      setErrorDays('No se pudieron cargar los días disponibles');
      // En caso de error, no bloqueamos nada - fallback manual
      setAvailableDaysMap({});
    } finally {
      setIsLoadingDays(false);
    }
  }, [doctorId, selectedDate]);

  // Fetch available days when modal opens, duration or month changes
  useEffect(() => {
    if (open && doctorId) {
      fetchAvailableDays(currentMonth, durationMinutes);
    }
  }, [open, doctorId, currentMonth, durationMinutes, fetchAvailableDays]);

  // Fetch available slots when date changes
  useEffect(() => {
    if (!open || !doctorId || !selectedDate) {
      setAvailableSlots([]);
      return;
    }

    setIsLoadingSlots(true);
    setSelectedSlot(null); // Reset slot when date changes

    const dateString = format(selectedDate, 'yyyy-MM-dd');
    getAvailableSlots({
      doctorId,
      date: dateString,
      durationMinutes,
    })
      .then((slots) => {
        // Filter slots to show only future times if the selected date is today
        let filteredSlots = slots;
        if (isToday(selectedDate)) {
          const currentTimeInMinutes = getCurrentTimeInMinutes();
          filteredSlots = slots.filter((slot) => {
            const slotTimeInMinutes = timeStringToMinutes(slot);
            return slotTimeInMinutes > currentTimeInMinutes;
          });
        }
        setAvailableSlots(filteredSlots);
      })
      .catch((error) => {
        console.error('Error loading slots:', error);
        setAvailableSlots([]);
      })
      .finally(() => {
        setIsLoadingSlots(false);
      });
  }, [open, doctorId, selectedDate, durationMinutes]);

  // Reset date and slots when duration changes
  useEffect(() => {
    setSelectedDate(undefined);
    setSelectedSlot(null);
    setAvailableSlots([]);
  }, [durationMinutes]);

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

  const handleSubmit = async () => {
    if (!selectedDate || !selectedSlot) {
      toast({
        title: 'Error',
        description: 'Por favor selecciona fecha y horario',
        variant: 'destructive',
      });
      return;
    }

    setIsLoading(true);

    try {
      const formattedDate = format(selectedDate, 'yyyy-MM-dd');

      const { data, error } = await supabase.functions.invoke('update-appointment', {
        body: {
          appointmentId,
          action: 'reschedule',
          date: formattedDate,
          time: selectedSlot,
          durationMinutes,
        },
      });

      if (error) {
        throw new Error(error.message || 'Error al re-agendar la cita');
      }

      // Check for errors in the response
      if (!data?.ok) {
        const errorMessage = data?.error || 'Error al re-agendar la cita';

        // Check for conflict (slot already taken)
        if (errorMessage.toLowerCase().includes('ocupado') || data?.status === 409) {
          toast({
            title: 'Horario no disponible',
            description: 'Ese horario ya está ocupado. Elige otro.',
            variant: 'destructive',
          });
          return;
        }

        throw new Error(errorMessage);
      }

      toast({
        title: 'Cita re-agendada',
        description: 'Cita re-agendada correctamente.',
      });

      onSuccess();
      onOpenChange(false);
    } catch (error: any) {
      console.error('Error rescheduling appointment:', error);

      // Check if error message indicates conflict
      const errorMsg = error?.message || '';
      if (errorMsg.toLowerCase().includes('ocupado') || errorMsg.includes('409')) {
        toast({
          title: 'Horario no disponible',
          description: 'Ese horario ya está ocupado. Elige otro.',
          variant: 'destructive',
        });
      } else {
        toast({
          title: 'Error',
          description: errorMsg || 'No se pudo re-agendar la cita',
          variant: 'destructive',
        });
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleDateSelect = (date: Date | undefined) => {
    setSelectedDate(date);
    // Small delay to prevent ghost clicks on elements below the popover
    setTimeout(() => {
      setCalendarOpen(false);
    }, 50);
  };

  const handleMonthChange = (month: Date) => {
    setCurrentMonth(month);
  };

  // Reset form when opening
  const handleOpenChange = (newOpen: boolean) => {
    if (newOpen) {
      // Reset to initial state with current appointment values
      setDurationMinutes(currentDuration);
      setCurrentMonth(new Date());
      setSelectedDate(undefined);
      setSelectedSlot(null);
      setAvailableSlots([]);
      setAvailableDaysMap({});
      setErrorDays(null);
    }
    onOpenChange(newOpen);
  };

  const isFormValid = selectedDate && selectedSlot && !isLoading;

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-[500px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Re-agendar cita</DialogTitle>
          <DialogDescription>
            Selecciona la duración, fecha y horario para la cita.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {/* Step 1: Duration selector (PRIMERO) */}
          <div className="space-y-2">
            <Label>1. Duración de la cita</Label>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              {durationOptions.map((option) => (
                <Button
                  key={option.value}
                  type="button"
                  variant={durationMinutes === option.value ? 'default' : 'outline'}
                  onClick={() => setDurationMinutes(option.value)}
                  disabled={isLoading}
                  className={cn(
                    'h-10',
                    durationMinutes === option.value && 'ring-2 ring-primary ring-offset-2'
                  )}
                >
                  {option.label}
                </Button>
              ))}
            </div>
          </div>

          {/* Step 2: Date picker (CON DÍAS BLOQUEADOS) */}
          <div className="space-y-2">
            <Label>2. Fecha</Label>
            
            {/* Error warning */}
            {errorDays && (
              <Alert variant="destructive" className="py-2">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription className="ml-2">{errorDays}</AlertDescription>
              </Alert>
            )}
            
            <Popover open={calendarOpen} onOpenChange={setCalendarOpen}>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  className={cn(
                    'w-full justify-start text-left font-normal',
                    !selectedDate && 'text-muted-foreground'
                  )}
                  disabled={isLoading || isLoadingDays}
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
                    <span>Seleccionar fecha</span>
                  )}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <Calendar
                  mode="single"
                  selected={selectedDate}
                  onSelect={handleDateSelect}
                  month={currentMonth}
                  onMonthChange={handleMonthChange}
                  disabled={isDateDisabled}
                  initialFocus
                  className="pointer-events-auto"
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
                  <div className="flex items-center gap-1">
                    <div className="w-3 h-3 rounded-sm bg-primary/20 border border-primary"></div>
                    <span>Disponible</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <div className="w-3 h-3 rounded-sm bg-muted line-through"></div>
                    <span>No disponible</span>
                  </div>
                </div>
              </PopoverContent>
            </Popover>
          </div>

          {/* Step 3: Time slot selector */}
          <div className="space-y-2">
            <Label>3. Horario</Label>
            {!selectedDate ? (
              <Alert>
                <AlertDescription>
                  Selecciona una fecha para ver los horarios disponibles.
                </AlertDescription>
              </Alert>
            ) : isLoadingSlots ? (
              <div className="flex items-center justify-center p-8 border rounded-md bg-muted/50">
                <Loader2 className="h-6 w-6 animate-spin text-muted-foreground mr-2" />
                <span className="text-muted-foreground">Cargando horarios...</span>
              </div>
            ) : (
              <SlotSelector
                slots={availableSlots}
                selectedSlot={selectedSlot}
                onSelect={setSelectedSlot}
              />
            )}
          </div>
        </div>

        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={isLoading}
          >
            Cancelar
          </Button>
          <Button onClick={handleSubmit} disabled={!isFormValid}>
            {isLoading ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Guardando...
              </>
            ) : (
              'Guardar cambios'
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
