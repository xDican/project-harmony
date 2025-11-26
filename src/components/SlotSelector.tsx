import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { formatTimeTo12Hour } from '@/lib/dateUtils';

interface SlotSelectorProps {
  slots: string[];
  selectedSlot: string | null;
  onSelect: (slot: string) => void;
}

/**
 * SlotSelector - Interactive time slot picker
 * Displays available time slots as buttons with visual feedback for selection
 */
const SlotSelector = ({ slots, selectedSlot, onSelect }: SlotSelectorProps) => {
  if (slots.length === 0) {
    return (
      <div className="p-8 text-center border rounded-md bg-muted/50">
        <p className="text-muted-foreground">
          No hay horarios disponibles para esta fecha
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <h3 className="text-sm font-medium text-foreground">
        Selecciona un horario disponible:
      </h3>
      
      <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6 gap-2">
        {slots.map((slot) => {
          const isSelected = slot === selectedSlot;
          const displayTime = formatTimeTo12Hour(slot);
          
          return (
            <Button
              key={slot}
              variant={isSelected ? 'default' : 'outline'}
              size="sm"
              onClick={() => onSelect(slot)}
              className={cn(
                'font-mono transition-all',
                isSelected && 'ring-2 ring-primary ring-offset-2'
              )}
              aria-pressed={isSelected}
              aria-label={`Seleccionar horario ${displayTime}`}
            >
              {displayTime}
            </Button>
          );
        })}
      </div>
    </div>
  );
};

export default SlotSelector;
