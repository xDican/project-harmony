import { Badge } from '@/components/ui/badge';
import { AppointmentStatus } from '@/types/appointment';

interface StatusBadgeProps {
  status: AppointmentStatus;
}

/**
 * StatusBadge - Visual indicator for appointment status
 * Maps each status to a color-coded badge for quick recognition
 */
const StatusBadge = ({ status }: StatusBadgeProps) => {
  const statusConfig: Record<AppointmentStatus, { label: string; variant: 'default' | 'secondary' | 'destructive' | 'outline' }> = {
    pending: { 
      label: 'Pendiente', 
      variant: 'outline' 
    },
    confirmed: { 
      label: 'Confirmada', 
      variant: 'default' 
    },
    canceled: { 
      label: 'Cancelada', 
      variant: 'destructive' 
    },
    completed: { 
      label: 'Completada', 
      variant: 'secondary' 
    },
  };

  const config = statusConfig[status] || {
    label: status || 'Desconocido',
    variant: 'outline' as const
  };
  
  return (
    <Badge variant={config.variant} className="whitespace-nowrap">
      {config.label}
    </Badge>
  );
};

export default StatusBadge;
