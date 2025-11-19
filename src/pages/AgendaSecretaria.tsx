import { useState, useEffect } from 'react';
import { useTodayAppointments } from '@/hooks/useTodayAppointments';
import { updateAppointmentStatus } from '@/lib/api';
import MainLayout from '@/components/MainLayout';
import StatusBadge from '@/components/StatusBadge';
import { Skeleton } from '@/components/ui/skeleton';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Calendar, AlertCircle, Clock, User, Stethoscope } from 'lucide-react';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { AppointmentStatus } from '@/types/appointment';
import { AppointmentWithDetails } from '@/lib/api';

/**
 * AgendaSecretaria - Daily appointment schedule for secretary/administrative staff
 * Displays all appointments for the current day grouped by status with management controls
 */
export default function AgendaSecretaria() {
  const { data: fetchedAppointments, isLoading, error, date } = useTodayAppointments();
  const [appointments, setAppointments] = useState<AppointmentWithDetails[]>([]);

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

  // Group appointments by status
  const pending = appointments.filter(apt => apt.status === 'pending');
  const active = appointments.filter(
    apt => apt.status === 'confirmed' || apt.status === 'completed'
  );
  const canceled = appointments.filter(apt => apt.status === 'canceled');
  const all = [...appointments].sort((a, b) => a.time.localeCompare(b.time));

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
      const updated = await updateAppointmentStatus(appointmentId, 'canceled');
      if (updated) {
        setAppointments(prev =>
          prev.map(apt => (apt.id === appointmentId ? { ...apt, status: 'canceled' } : apt))
        );
      }
    }
  };

  return (
    <MainLayout>
      <div className="container mx-auto p-6">
        {/* Page Header */}
        <div className="mb-8">
          <h1 className="text-4xl font-bold text-foreground mb-2">Agenda de Hoy</h1>
          <div className="flex items-center gap-2 text-muted-foreground mb-2">
            <Calendar className="h-4 w-4" />
            <p className="capitalize">{formattedDate}</p>
          </div>
          {!isLoading && !error && appointments.length > 0 && (
            <p className="text-sm text-muted-foreground">
              {appointments.length} {appointments.length === 1 ? 'cita' : 'citas'} programadas
            </p>
          )}
        </div>

        {/* Loading State */}
        {isLoading && (
          <div className="grid md:grid-cols-3 gap-6">
            <Skeleton className="h-64 w-full" />
            <Skeleton className="h-64 w-full" />
            <Skeleton className="h-64 w-full" />
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

        {/* Appointments Tabs */}
        {!isLoading && !error && appointments.length > 0 && (
          <Tabs defaultValue="all" className="w-full">
            <TabsList className="w-full justify-start mb-6">
              <TabsTrigger value="all">Todas</TabsTrigger>
              <TabsTrigger value="pending">Pendientes</TabsTrigger>
              <TabsTrigger value="active">Confirmadas / Completadas</TabsTrigger>
              <TabsTrigger value="canceled">Canceladas</TabsTrigger>
            </TabsList>

            {/* All Appointments */}
            <TabsContent value="all">
              <div className="max-w-3xl mx-auto space-y-3">
                {all.length === 0 ? (
                  <Card>
                    <CardContent className="p-8">
                      <p className="text-sm text-muted-foreground text-center">
                        No hay citas programadas
                      </p>
                    </CardContent>
                  </Card>
                ) : (
                  all.map(appointment => (
                    <AppointmentCard
                      key={appointment.id}
                      appointment={appointment}
                      onStatusChange={handleStatusChange}
                      onCancel={handleCancel}
                    />
                  ))
                )}
              </div>
            </TabsContent>

            {/* Pending Appointments */}
            <TabsContent value="pending">
              <div className="max-w-3xl mx-auto space-y-3">
                {pending.length === 0 ? (
                  <Card>
                    <CardContent className="p-8">
                      <p className="text-sm text-muted-foreground text-center">
                        No hay citas pendientes
                      </p>
                    </CardContent>
                  </Card>
                ) : (
                  pending.map(appointment => (
                    <AppointmentCard
                      key={appointment.id}
                      appointment={appointment}
                      onStatusChange={handleStatusChange}
                      onCancel={handleCancel}
                    />
                  ))
                )}
              </div>
            </TabsContent>

            {/* Active Appointments (Confirmed/Completed) */}
            <TabsContent value="active">
              <div className="max-w-3xl mx-auto space-y-3">
                {active.length === 0 ? (
                  <Card>
                    <CardContent className="p-8">
                      <p className="text-sm text-muted-foreground text-center">
                        No hay citas confirmadas o completadas
                      </p>
                    </CardContent>
                  </Card>
                ) : (
                  active.map(appointment => (
                    <AppointmentCard
                      key={appointment.id}
                      appointment={appointment}
                      onStatusChange={handleStatusChange}
                      onCancel={handleCancel}
                    />
                  ))
                )}
              </div>
            </TabsContent>

            {/* Canceled Appointments */}
            <TabsContent value="canceled">
              <div className="max-w-3xl mx-auto space-y-3">
                {canceled.length === 0 ? (
                  <Card>
                    <CardContent className="p-8">
                      <p className="text-sm text-muted-foreground text-center">
                        No hay citas canceladas
                      </p>
                    </CardContent>
                  </Card>
                ) : (
                  canceled.map(appointment => (
                    <AppointmentCard
                      key={appointment.id}
                      appointment={appointment}
                      onStatusChange={handleStatusChange}
                      onCancel={handleCancel}
                    />
                  ))
                )}
              </div>
            </TabsContent>
          </Tabs>
        )}
      </div>
    </MainLayout>
  );
}

interface AppointmentCardProps {
  appointment: AppointmentWithDetails;
  onStatusChange: (id: string, status: AppointmentStatus) => void;
  onCancel: (id: string) => void;
}

function AppointmentCard({ appointment, onStatusChange, onCancel }: AppointmentCardProps) {
  const isCanceled = appointment.status === 'canceled';

  return (
    <Card>
      <CardContent className="p-4">
        <div className="space-y-3">
          {/* Time */}
          <div className="flex items-center gap-2">
            <Clock className="h-4 w-4 text-muted-foreground" />
            <span className="font-semibold text-lg">{appointment.time}</span>
          </div>

          {/* Patient */}
          <div className="flex items-center gap-2">
            <User className="h-4 w-4 text-muted-foreground" />
            <span className="text-sm">{appointment.patient.name}</span>
          </div>

          {/* Doctor */}
          <div className="flex items-center gap-2">
            <Stethoscope className="h-4 w-4 text-muted-foreground" />
            <span className="text-sm text-muted-foreground">{appointment.doctor.name}</span>
          </div>

          {/* Notes */}
          {appointment.notes && (
            <p className="text-xs text-muted-foreground border-l-2 border-border pl-2">
              {appointment.notes}
            </p>
          )}

          {/* Status Controls */}
          <div className="flex items-center gap-2 pt-2 border-t border-border">
            {isCanceled ? (
              // Canceled appointments only show the badge
              <StatusBadge status={appointment.status} />
            ) : (
              <>
                {/* Status Dropdown */}
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
                    <SelectItem value="pending">Pendiente</SelectItem>
                    <SelectItem value="confirmed">Confirmada</SelectItem>
                    <SelectItem value="completed">Completada</SelectItem>
                  </SelectContent>
                </Select>

                {/* Cancel Button */}
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
        </div>
      </CardContent>
    </Card>
  );
}
