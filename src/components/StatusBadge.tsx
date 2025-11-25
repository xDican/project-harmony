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
    agendada: { 
      label: 'Agendada', 
      variant: 'outline' 
    },
    confirmada: { 
      label: 'Confirmada', 
      variant: 'default' 
    },
    cancelada: { 
      label: 'Cancelada', 
      variant: 'destructive' 
    },
    completada: { 
      label: 'Completada', 
      variant: 'secondary' 
    },
    no_asistio: {
      label: 'No se presentó',
      variant: 'destructive'
    }
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
