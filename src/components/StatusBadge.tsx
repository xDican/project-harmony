import { Badge } from '@/components/ui/badge';

interface StatusBadgeProps {
  status: 'scheduled' | 'confirmed' | 'cancelled' | 'completed';
}

const statusConfig = {
  scheduled: { label: 'Agendada', variant: 'default' as const },
  confirmed: { label: 'Confirmada', variant: 'default' as const },
  cancelled: { label: 'Cancelada', variant: 'destructive' as const },
  completed: { label: 'Completada', variant: 'secondary' as const },
};

const StatusBadge = ({ status }: StatusBadgeProps) => {
  const config = statusConfig[status];
  
  return (
    <Badge variant={config.variant}>
      {config.label}
    </Badge>
  );
};

export default StatusBadge;
