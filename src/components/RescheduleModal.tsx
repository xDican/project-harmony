import { useState } from 'react';
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
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { CalendarIcon, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { supabase } from '@/lib/supabaseClient';
import { useToast } from '@/hooks/use-toast';

interface RescheduleModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  appointmentId: string;
  currentDate: string;
  currentTime: string;
  currentDuration?: number;
  onSuccess: () => void;
}

export function RescheduleModal({
  open,
  onOpenChange,
  appointmentId,
  currentDate,
  currentTime,
  currentDuration = 60,
  onSuccess,
}: RescheduleModalProps) {
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);
  const [date, setDate] = useState<Date | undefined>(
    DateTime.fromISO(currentDate).toJSDate()
  );
  const [time, setTime] = useState(currentTime.substring(0, 5));
  const [durationMinutes, setDurationMinutes] = useState(currentDuration);
  const [calendarOpen, setCalendarOpen] = useState(false);

  const handleSubmit = async () => {
    if (!date || !time) {
      toast({
        title: 'Error',
        description: 'Por favor selecciona fecha y hora',
        variant: 'destructive',
      });
      return;
    }

    // Validate duration
    if (durationMinutes < 15 || durationMinutes > 480) {
      toast({
        title: 'Error',
        description: 'La duración debe estar entre 15 y 480 minutos',
        variant: 'destructive',
      });
      return;
    }

    setIsLoading(true);

    try {
      const formattedDate = DateTime.fromJSDate(date).toFormat('yyyy-MM-dd');
      
      const { data, error } = await supabase.functions.invoke('update-appointment', {
        body: {
          appointmentId,
          action: 'reschedule',
          date: formattedDate,
          time,
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

  const handleDateSelect = (selectedDate: Date | undefined) => {
    setDate(selectedDate);
    setCalendarOpen(false);
  };

  // Reset form when opening
  const handleOpenChange = (newOpen: boolean) => {
    if (newOpen) {
      setDate(DateTime.fromISO(currentDate).toJSDate());
      setTime(currentTime.substring(0, 5));
      setDurationMinutes(currentDuration);
    }
    onOpenChange(newOpen);
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Re-agendar cita</DialogTitle>
          <DialogDescription>
            Selecciona la nueva fecha y hora para la cita.
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-4 py-4">
          {/* Date picker */}
          <div className="grid gap-2">
            <Label htmlFor="date">Fecha</Label>
            <Popover open={calendarOpen} onOpenChange={setCalendarOpen}>
              <PopoverTrigger asChild>
                <Button
                  id="date"
                  variant="outline"
                  className={cn(
                    'w-full justify-start text-left font-normal',
                    !date && 'text-muted-foreground'
                  )}
                  disabled={isLoading}
                >
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {date ? DateTime.fromJSDate(date).toFormat('dd/MM/yyyy') : 'Seleccionar fecha'}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <Calendar
                  mode="single"
                  selected={date}
                  onSelect={handleDateSelect}
                  disabled={(date) => date < DateTime.now().startOf('day').toJSDate()}
                  initialFocus
                  className="pointer-events-auto"
                />
              </PopoverContent>
            </Popover>
          </div>

          {/* Time input */}
          <div className="grid gap-2">
            <Label htmlFor="time">Hora (HH:MM)</Label>
            <Input
              id="time"
              type="time"
              value={time}
              onChange={(e) => setTime(e.target.value)}
              disabled={isLoading}
            />
          </div>

          {/* Duration input */}
          <div className="grid gap-2">
            <Label htmlFor="duration">Duración (minutos)</Label>
            <Input
              id="duration"
              type="number"
              min={15}
              max={480}
              value={durationMinutes}
              onChange={(e) => setDurationMinutes(Number(e.target.value))}
              disabled={isLoading}
            />
            <p className="text-xs text-muted-foreground">
              Mínimo: 15 min, Máximo: 480 min
            </p>
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
          <Button onClick={handleSubmit} disabled={isLoading}>
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
