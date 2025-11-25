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
  const statusConfig: Record<AppointmentStatus, { label: string; className: string }> = {
    agendada: { 
      label: 'Agendada', 
      className: 'bg-blue-100 text-blue-800 border-blue-300 dark:bg-blue-900/30 dark:text-blue-300 dark:border-blue-700'
    },
    confirmada: { 
      label: 'Confirmada', 
      className: 'bg-green-100 text-green-800 border-green-300 dark:bg-green-900/30 dark:text-green-300 dark:border-green-700'
    },
    cancelada: { 
      label: 'Cancelada', 
      className: 'bg-red-100 text-red-800 border-red-300 dark:bg-red-900/30 dark:text-red-300 dark:border-red-700'
    },
    completada: { 
      label: 'Completada', 
      className: 'bg-gray-100 text-gray-800 border-gray-300 dark:bg-gray-800/50 dark:text-gray-300 dark:border-gray-600'
    },
    no_asistio: {
      label: 'No se presentó',
      className: 'bg-orange-100 text-orange-800 border-orange-300 dark:bg-orange-900/30 dark:text-orange-300 dark:border-orange-700'
    }
  };

  const config = statusConfig[status] || {
    label: status || 'Desconocido',
    className: 'bg-gray-100 text-gray-800 border-gray-300'
  };
  
  return (
    <Badge className={`whitespace-nowrap ${config.className}`}>
      {config.label}
    </Badge>
  );
};

export default StatusBadge;
