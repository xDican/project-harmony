import { useTodayAppointments } from '@/hooks/useTodayAppointments';
import AppointmentRow from '@/components/AppointmentRow';
import { Skeleton } from '@/components/ui/skeleton';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Calendar, AlertCircle } from 'lucide-react';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';

/**
 * AgendaSecretaria - Daily appointment schedule for secretary/administrative staff
 * Displays all appointments for the current day with patient and doctor information
 */
export default function AgendaSecretaria() {
  const { data: appointments, isLoading, error, date } = useTodayAppointments();

  // Format the current date for display
  const formattedDate = format(new Date(date + 'T00:00:00'), "EEEE, d 'de' MMMM 'de' yyyy", {
    locale: es,
  });

  return (
    <main className="container mx-auto p-6 max-w-4xl">
      {/* Page Header */}
      <div className="mb-8">
        <h1 className="text-4xl font-bold text-foreground mb-2">Agenda de Hoy</h1>
        <div className="flex items-center gap-2 text-muted-foreground">
          <Calendar className="h-4 w-4" />
          <p className="capitalize">{formattedDate}</p>
        </div>
      </div>

      {/* Loading State */}
      {isLoading && (
        <div className="space-y-4">
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

      {/* Appointments List */}
      {!isLoading && !error && appointments.length > 0 && (
        <div className="space-y-3">
          <p className="text-sm text-muted-foreground mb-4">
            {appointments.length} {appointments.length === 1 ? 'cita' : 'citas'} programadas
          </p>
          {appointments.map((appointment) => (
            <AppointmentRow key={appointment.id} appointment={appointment} />
          ))}
        </div>
      )}
    </main>
  );
}
