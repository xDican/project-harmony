import { useState, useEffect, useMemo } from 'react';
import { useTodayAppointments } from '@/hooks/useTodayAppointments';
import { updateAppointmentStatus } from '@/lib/api';
import MainLayout from '@/components/MainLayout';
import { Skeleton } from '@/components/ui/skeleton';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Calendar, AlertCircle, Search, Clock, User, Stethoscope, Phone } from 'lucide-react';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { AppointmentStatus } from '@/types/appointment';
import { AppointmentWithDetails } from '@/lib/api';
import { useIsMobile } from '@/hooks/use-mobile';
import StatusBadge from '@/components/StatusBadge';

/**
 * AgendaSecretaria - Daily appointment schedule for secretary/administrative staff
 * Displays all appointments for the current day in a searchable table format
 */
export default function AgendaSecretaria() {
  const { data: fetchedAppointments, isLoading, error, date } = useTodayAppointments();
  const [appointments, setAppointments] = useState<AppointmentWithDetails[]>([]);
  const [searchQuery, setSearchQuery] = useState<string>('');

  // Initialize local state when data is loaded
  useEffect(() => {
    if (fetchedAppointments) {
      setAppointments(fetchedAppointments);
    }
  }, [fetchedAppointments]);

  // Format the current date for display
  const formattedDate = format(new Date(date + 'T00:00:00'), "EEEE, d 'de' MMMM 'de' yyyy", {
    locale: es,
  });

  // Status label mapping for search
  const getStatusLabel = (status: AppointmentStatus): string => {
    const labels: Record<AppointmentStatus, string> = {
      agendada: 'agendada',
      confirmada: 'confirmada',
      completada: 'completada',
      cancelada: 'cancelada',
      no_asistio: 'no se presentó',
    };
    return labels[status];
  };

  // Filter appointments based on search query
  const filteredAppointments = useMemo(() => {
    if (!searchQuery.trim()) {
      return appointments;
    }

    const query = searchQuery.toLowerCase().trim();
    
    return appointments.filter(apt => {
      const patientName = apt.patient.name.toLowerCase();
      const doctorName = apt.doctor.name.toLowerCase();
      const phone = apt.patient.phone?.toLowerCase() || '';
      const statusLabel = getStatusLabel(apt.status);

      return (
        patientName.includes(query) ||
        doctorName.includes(query) ||
        phone.includes(query) ||
        statusLabel.includes(query)
      );
    });
  }, [appointments, searchQuery]);

  // Handle status change
  const handleStatusChange = async (appointmentId: string, newStatus: AppointmentStatus) => {
    const updated = await updateAppointmentStatus(appointmentId, newStatus);
    if (updated) {
      setAppointments(prev =>
        prev.map(apt => (apt.id === appointmentId ? { ...apt, status: newStatus } : apt))
      );
    }
  };

  // Handle cancel appointment
  const handleCancel = async (appointmentId: string) => {
    const confirmed = window.confirm('¿Seguro que deseas cancelar esta cita?');
    if (confirmed) {
      const updated = await updateAppointmentStatus(appointmentId, 'cancelada');
      if (updated) {
        setAppointments(prev =>
          prev.map(apt => (apt.id === appointmentId ? { ...apt, status: 'cancelada' } : apt))
        );
      }
    }
  };

  // Format date and time for display
  const formatDateTime = (date: string, time: string): string => {
    try {
      const dateObj = new Date(date + 'T' + time);
      return format(dateObj, "dd/MM/yyyy – h:mm a", { locale: es });
    } catch {
      return `${date} – ${time}`;
    }
  };

  return (
    <MainLayout>
      <div className="container mx-auto p-6 max-w-5xl">
        {/* Page Header */}
        <div className="mb-6">
          <h1 className="text-4xl font-bold text-foreground mb-2">Agenda de Hoy</h1>
          <div className="flex items-center gap-2 text-muted-foreground">
            <Calendar className="h-4 w-4" />
            <p className="capitalize">{formattedDate}</p>
          </div>
          {!isLoading && !error && appointments.length > 0 && (
            <p className="text-sm text-muted-foreground mt-1">
              {appointments.length} {appointments.length === 1 ? 'cita programada' : 'citas programadas'} hoy
            </p>
          )}
        </div>

        {/* Search Bar */}
        {!isLoading && !error && appointments.length > 0 && (
          <div className="mb-6">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                type="text"
                placeholder="Buscar por nombre, doctor, teléfono o estado..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>
          </div>
        )}

        {/* Loading State */}
        {isLoading && (
          <div className="space-y-4">
            <Skeleton className="h-12 w-full" />
            <Skeleton className="h-24 w-full" />
            <Skeleton className="h-24 w-full" />
            <Skeleton className="h-24 w-full" />
          </div>
        )}

        {/* Error State */}
        {error && !isLoading && (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertTitle>Error</AlertTitle>
            <AlertDescription>
              No se pudieron cargar las citas. Por favor, intenta nuevamente.
            </AlertDescription>
          </Alert>
        )}

        {/* Empty State */}
        {!isLoading && !error && appointments.length === 0 && (
          <Alert>
            <Calendar className="h-4 w-4" />
            <AlertTitle>Sin citas programadas</AlertTitle>
            <AlertDescription>
              No hay citas para hoy. La agenda está vacía.
            </AlertDescription>
          </Alert>
        )}

        {/* No Search Results */}
        {!isLoading && !error && appointments.length > 0 && filteredAppointments.length === 0 && (
          <Alert>
            <AlertCircle className="h-4 w-4" />
            <AlertTitle>Sin resultados</AlertTitle>
            <AlertDescription>
              No se encontraron citas para la búsqueda actual.
            </AlertDescription>
          </Alert>
        )}

        {/* Appointments List - Mobile/Desktop */}
        {!isLoading && !error && filteredAppointments.length > 0 && (
          <AppointmentsList
            appointments={filteredAppointments}
            onStatusChange={handleStatusChange}
            onCancel={handleCancel}
            formatDateTime={formatDateTime}
          />
        )}
      </div>
    </MainLayout>
  );
}

interface AppointmentsListProps {
  appointments: AppointmentWithDetails[];
  onStatusChange: (id: string, status: AppointmentStatus) => void;
  onCancel: (id: string) => void;
  formatDateTime: (date: string, time: string) => string;
}

function AppointmentsList({ 
  appointments, 
  onStatusChange, 
  onCancel,
  formatDateTime 
}: AppointmentsListProps) {
  const isMobile = useIsMobile();

  if (isMobile) {
    return (
      <div className="space-y-4">
        {appointments.map((appointment) => (
          <AppointmentCard
            key={appointment.id}
            appointment={appointment}
            onStatusChange={onStatusChange}
            onCancel={onCancel}
            formatDateTime={formatDateTime}
          />
        ))}
      </div>
    );
  }

  return (
    <div className="border rounded-lg overflow-hidden">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="w-[200px]">Paciente</TableHead>
            <TableHead className="w-[150px]">Doctor</TableHead>
            <TableHead className="w-[180px]">Fecha y Hora</TableHead>
            <TableHead className="w-[130px]">WhatsApp</TableHead>
            <TableHead className="w-[160px]">Estado</TableHead>
            <TableHead className="w-[120px] text-right">Acciones</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {appointments.map((appointment) => (
            <AppointmentTableRow
              key={appointment.id}
              appointment={appointment}
              onStatusChange={onStatusChange}
              onCancel={onCancel}
              formatDateTime={formatDateTime}
            />
          ))}
        </TableBody>
      </Table>
    </div>
  );
}

interface AppointmentCardProps {
  appointment: AppointmentWithDetails;
  onStatusChange: (id: string, status: AppointmentStatus) => void;
  onCancel: (id: string) => void;
  formatDateTime: (date: string, time: string) => string;
}

function AppointmentCard({ 
  appointment, 
  onStatusChange, 
  onCancel,
  formatDateTime 
}: AppointmentCardProps) {
  const isCanceled = appointment.status === 'cancelada';

  const formatTime = (time: string): string => {
    try {
      const [hours, minutes] = time.split(':');
      const hour = parseInt(hours);
      const period = hour >= 12 ? 'PM' : 'AM';
      const displayHour = hour % 12 || 12;
      return `${displayHour}:${minutes} ${period}`;
    } catch {
      return time;
    }
  };

  return (
    <Card className="overflow-hidden">
      <CardContent className="p-4">
        {/* Time - Prominente */}
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <Clock className="h-5 w-5 text-primary" />
            <span className="text-2xl font-bold text-foreground">
              {formatTime(appointment.time)}
            </span>
          </div>
          <StatusBadge status={appointment.status} />
        </div>

        {/* Patient Name - Prominente */}
        <div className="flex items-start gap-2 mb-3">
          <User className="h-5 w-5 text-muted-foreground mt-0.5 flex-shrink-0" />
          <div>
            <p className="text-lg font-semibold text-foreground leading-tight">
              {appointment.patient.name}
            </p>
            {appointment.patient.phone && (
              <div className="flex items-center gap-1 mt-1">
                <Phone className="h-3 w-3 text-muted-foreground" />
                <span className="text-sm text-muted-foreground">
                  {appointment.patient.phone}
                </span>
              </div>
            )}
          </div>
        </div>

        {/* Doctor - Prominente */}
        <div className="flex items-center gap-2 mb-4">
          <Stethoscope className="h-5 w-5 text-muted-foreground" />
          <span className="text-base font-medium text-foreground">
            {appointment.doctor.name}
          </span>
        </div>

        {/* Actions */}
        <div className="flex gap-2 pt-3 border-t">
          {isCanceled ? (
            <div className="w-full text-center py-2 text-sm text-muted-foreground">
              Cita cancelada
            </div>
          ) : (
            <>
              <Select
                value={appointment.status}
                onValueChange={(value: AppointmentStatus) =>
                  onStatusChange(appointment.id, value)
                }
              >
                <SelectTrigger className="flex-1 h-9 bg-background">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-background z-50">
                  <SelectItem value="agendada">Agendada</SelectItem>
                  <SelectItem value="confirmada">Confirmada</SelectItem>
                  <SelectItem value="completada">Completada</SelectItem>
                  <SelectItem value="no_asistio">No se presentó</SelectItem>
                </SelectContent>
              </Select>
              <Button
                variant="destructive"
                size="sm"
                onClick={() => onCancel(appointment.id)}
                className="whitespace-nowrap"
              >
                Cancelar
              </Button>
            </>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

interface AppointmentTableRowProps {
  appointment: AppointmentWithDetails;
  onStatusChange: (id: string, status: AppointmentStatus) => void;
  onCancel: (id: string) => void;
  formatDateTime: (date: string, time: string) => string;
}

function AppointmentTableRow({ 
  appointment, 
  onStatusChange, 
  onCancel,
  formatDateTime 
}: AppointmentTableRowProps) {
  const isCanceled = appointment.status === 'cancelada';

  const getStatusBadgeVariant = (status: AppointmentStatus): 'default' | 'secondary' | 'destructive' | 'outline' => {
    switch (status) {
      case 'agendada':
        return 'outline';
      case 'confirmada':
        return 'default';
      case 'completada':
        return 'secondary';
      case 'cancelada':
      case 'no_asistio':
        return 'destructive';
      default:
        return 'outline';
    }
  };

  const getStatusLabel = (status: AppointmentStatus): string => {
    const labels: Record<AppointmentStatus, string> = {
      agendada: 'Agendada',
      confirmada: 'Confirmada',
      completada: 'Completada',
      cancelada: 'Cancelada',
      no_asistio: 'No se presentó',
    };
    return labels[status];
  };

  return (
    <TableRow>
      <TableCell className="font-medium">
        {appointment.patient.name}
      </TableCell>
      <TableCell className="text-muted-foreground">
        {appointment.doctor.name}
      </TableCell>
      <TableCell className="text-sm">
        {formatDateTime(appointment.date, appointment.time)}
      </TableCell>
      <TableCell className="text-sm">
        {appointment.patient.phone || '-'}
      </TableCell>
      <TableCell>
        {isCanceled ? (
          <Badge className="whitespace-nowrap bg-red-100 text-red-800 border-red-300 dark:bg-red-900/30 dark:text-red-300 dark:border-red-700">
            Cancelada
          </Badge>
        ) : (
          <Select
            value={appointment.status}
            onValueChange={(value: AppointmentStatus) =>
              onStatusChange(appointment.id, value)
            }
          >
            <SelectTrigger className="h-8 w-full bg-background">
              <SelectValue />
            </SelectTrigger>
            <SelectContent className="bg-background z-50">
              <SelectItem value="agendada">Agendada</SelectItem>
              <SelectItem value="confirmada">Confirmada</SelectItem>
              <SelectItem value="completada">Completada</SelectItem>
              <SelectItem value="no_asistio">No se presentó</SelectItem>
            </SelectContent>
          </Select>
        )}
      </TableCell>
      <TableCell className="text-right">
        {!isCanceled && (
          <Button
            variant="destructive"
            size="sm"
            onClick={() => onCancel(appointment.id)}
            className="whitespace-nowrap"
          >
            Cancelar
          </Button>
        )}
      </TableCell>
    </TableRow>
  );
}
