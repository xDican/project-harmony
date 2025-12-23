import { useNavigate } from 'react-router-dom';
import MainLayout from '@/components/MainLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { PlusCircle, Users, Settings, Calendar, Clock, User } from 'lucide-react';
import { useTodayAppointments } from '@/hooks/useTodayAppointments';
import { useCurrentUser } from '@/context/UserContext';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import StatusBadge from '@/components/StatusBadge';
import { formatTimeTo12Hour } from '@/lib/dateUtils';

/**
 * Consultorio - Main dashboard for independent doctors
 * Shows today's appointments, quick actions, and navigation
 */
export default function Consultorio() {
  const navigate = useNavigate();
  const { user, loading: userLoading } = useCurrentUser();
  const doctorId = user?.doctorId;
  
  const { data: appointments, isLoading: appointmentsLoading, error } = useTodayAppointments({
    doctorId
  });

  const loading = userLoading || appointmentsLoading;
  const today = new Date();
  const formattedDate = format(today, "EEEE, d 'de' MMMM", { locale: es });

  return (
    <MainLayout>
      <div className="p-4 md:p-6 lg:p-8 space-y-6">
        {/* Date Info */}
        <p className="text-muted-foreground capitalize">{formattedDate}</p>

        {/* Quick Actions */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Button
            onClick={() => navigate('/citas/nueva')}
            className="h-24 flex flex-col items-center justify-center gap-2 text-lg"
            size="lg"
          >
            <PlusCircle className="h-8 w-8" />
            <span>Nueva Cita</span>
          </Button>
          
          <Button
            onClick={() => navigate('/pacientes')}
            variant="outline"
            className="h-24 flex flex-col items-center justify-center gap-2 text-lg"
            size="lg"
          >
            <Users className="h-8 w-8" />
            <span>Pacientes</span>
          </Button>
          
          <Button
            onClick={() => navigate('/configuracion')}
            variant="outline"
            className="h-24 flex flex-col items-center justify-center gap-2 text-lg"
            size="lg"
          >
            <Settings className="h-8 w-8" />
            <span>Configuración</span>
          </Button>

          <Card className="h-24 flex flex-col items-center justify-center">
            <div className="text-3xl font-bold text-primary">{appointments.length}</div>
            <p className="text-sm text-muted-foreground">Citas hoy</p>
          </Card>
        </div>

        {/* Today's Appointments */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-lg">
              <Calendar className="h-5 w-5" />
              Citas de Hoy
            </CardTitle>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="space-y-3">
                {[1, 2, 3].map((i) => (
                  <Skeleton key={i} className="h-16 w-full" />
                ))}
              </div>
            ) : error ? (
              <Alert variant="destructive">
                <AlertTitle>Error</AlertTitle>
                <AlertDescription>{error.message}</AlertDescription>
              </Alert>
            ) : appointments.length === 0 ? (
              <Alert>
                <Calendar className="h-4 w-4" />
                <AlertTitle>Sin citas</AlertTitle>
                <AlertDescription>
                  No tienes citas programadas para hoy.
                </AlertDescription>
              </Alert>
            ) : (
              <div className="space-y-3">
                {appointments.map((appointment) => (
                  <div
                    key={appointment.id}
                    className="flex items-center justify-between p-4 rounded-lg border bg-card hover:bg-accent/50 transition-colors"
                  >
                    <div className="flex items-center gap-4">
                      <div className="flex items-center gap-2 text-primary font-medium min-w-[80px]">
                        <Clock className="h-4 w-4" />
                        {formatTimeTo12Hour(appointment.time)}
                      </div>
                      <div className="flex items-center gap-2">
                        <User className="h-4 w-4 text-muted-foreground" />
                        <span className="font-medium">{appointment.patient?.name}</span>
                      </div>
                    </div>
                    <StatusBadge status={appointment.status} />
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </MainLayout>
  );
}
