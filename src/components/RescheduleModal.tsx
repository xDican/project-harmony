import { useState, useEffect } from 'react';
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
import { CalendarIcon, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { supabase } from '@/lib/supabaseClient';
import { getAvailableSlots } from '@/lib/api';
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
  
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(
    DateTime.fromISO(currentDate).toJSDate()
  );
  const [durationMinutes, setDurationMinutes] = useState(currentDuration);
  const [selectedSlot, setSelectedSlot] = useState<string | null>(currentTime.substring(0, 5));
  const [availableSlots, setAvailableSlots] = useState<string[]>([]);
  const [calendarOpen, setCalendarOpen] = useState(false);

  // Fetch available slots when date or duration changes
  useEffect(() => {
    if (!open || !doctorId || !selectedDate) {
      setAvailableSlots([]);
      return;
    }

    setIsLoadingSlots(true);
    setSelectedSlot(null); // Reset slot when date/duration changes

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
    setCalendarOpen(false);
  };

  // Reset form when opening
  const handleOpenChange = (newOpen: boolean) => {
    if (newOpen) {
      setSelectedDate(DateTime.fromISO(currentDate).toJSDate());
      setDurationMinutes(currentDuration);
      setSelectedSlot(null);
      setAvailableSlots([]);
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
            Selecciona la nueva fecha, duración y horario para la cita.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {/* Date picker */}
          <div className="space-y-2">
            <Label>Fecha</Label>
            <Popover open={calendarOpen} onOpenChange={setCalendarOpen}>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  className={cn(
                    'w-full justify-start text-left font-normal',
                    !selectedDate && 'text-muted-foreground'
                  )}
                  disabled={isLoading}
                >
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {selectedDate
                    ? format(selectedDate, "PPP", { locale: es })
                    : 'Seleccionar fecha'}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <Calendar
                  mode="single"
                  selected={selectedDate}
                  onSelect={handleDateSelect}
                  disabled={(date) => date < getLocalToday()}
                  initialFocus
                  className="pointer-events-auto"
                />
              </PopoverContent>
            </Popover>
          </div>

          {/* Duration selector */}
          <div className="space-y-2">
            <Label>Duración de la cita</Label>
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

          {/* Time slot selector */}
          <div className="space-y-2">
            <Label>Horario</Label>
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
