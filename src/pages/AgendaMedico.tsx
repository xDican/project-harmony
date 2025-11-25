import { useState, useEffect } from 'react';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import MainLayout from '@/components/MainLayout';
import AppointmentRow from '@/components/AppointmentRow';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Calendar, AlertCircle, Stethoscope } from 'lucide-react';
import { useCurrentUser } from '@/context/UserContext';
import { useTodayAppointments } from '@/hooks/useTodayAppointments';
import { useDoctors } from '@/hooks/useDoctors';
import StatusBadge from '@/components/StatusBadge';
import { getLocalDateString, getLocalToday } from '@/lib/dateUtils';

/**
 * AgendaMedico - Doctor's daily agenda view
 * Shows appointments for a selected doctor for the current day
 * Admin can view all doctors, Doctor can only view their own
 */
export default function AgendaMedico() {
  const { user, loading, isAdmin, isDoctor } = useCurrentUser();
  const [selectedDoctorId, setSelectedDoctorId] = useState<string>('all');
  
  // Get today's date in local timezone
  const today = getLocalDateString();
  const formattedDate = format(getLocalToday(), "EEEE, d 'de' MMMM 'de' yyyy", {
    locale: es,
  });

  // Format time to 12-hour format
  const formatTime = (time: string): string => {
    try {
      const [hours, minutes] = time.split(':');
      const date = new Date();
      date.setHours(parseInt(hours), parseInt(minutes));
      return format(date, 'h:mm a', { locale: es });
    } catch {
      return time;
    }
  };

  // Fetch doctors list (only for admin)
  const { data: doctors, isLoading: loadingDoctors } = useDoctors();

  // Determine the doctorId to use for fetching appointments
  const doctorIdToFetch = isDoctor 
    ? user?.doctorId || undefined 
    : (selectedDoctorId === 'all' ? undefined : selectedDoctorId);

  // Fetch appointments based on role and selection
  const { data: appointments, isLoading: loadingAppointments } = useTodayAppointments({
    doctorId: doctorIdToFetch,
  });

  // Loading state
  if (loading) {
    return (
      <MainLayout>
        <div className="container mx-auto p-6 max-w-4xl">
          <p className="text-muted-foreground">Cargando…</p>
        </div>
      </MainLayout>
    );
  }

  // Permission check
  if (!isAdmin && !isDoctor) {
    return (
      <MainLayout>
        <div className="container mx-auto p-6 max-w-4xl">
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertTitle>Acceso denegado</AlertTitle>
            <AlertDescription>
              No tienes permisos para ver esta página.
            </AlertDescription>
          </Alert>
        </div>
      </MainLayout>
    );
  }

  return (
    <MainLayout>
      <div className="container mx-auto p-6 max-w-5xl">
        {/* Page Header */}
        <div className="mb-8">
          <h1 className="text-4xl font-bold text-foreground mb-2">Agenda del Médico</h1>
          <div className="flex items-center gap-2 text-muted-foreground">
            <Calendar className="h-4 w-4" />
            <p className="capitalize">{formattedDate}</p>
          </div>
          {!loadingAppointments && !loadingDoctors && appointments.length > 0 && (
            <p className="text-sm text-muted-foreground mt-1">
              {appointments.length} {appointments.length === 1 ? 'cita programada' : 'citas programadas'} hoy
            </p>
          )}
        </div>

        {/* Doctor Selection (only for admin) */}
        {isAdmin && (
          <div className="mb-8">
            <Label className="text-base font-semibold text-foreground mb-3 block">
              Médico
            </Label>
            <Select value={selectedDoctorId} onValueChange={setSelectedDoctorId}>
              <SelectTrigger className="w-full max-w-md">
                <SelectValue placeholder="Selecciona un médico" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">
                  <div className="flex items-center gap-2">
                    <Stethoscope className="h-4 w-4" />
                    Todos los médicos
                  </div>
                </SelectItem>
                {doctors.map((doctor) => (
                  <SelectItem key={doctor.id} value={doctor.id}>
                    <div className="flex items-center gap-2">
                      <Stethoscope className="h-4 w-4" />
                      {doctor.name}
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        )}

        {/* Loading State */}
        {(loadingAppointments || loadingDoctors) && (
          <div className="space-y-4">
            <Skeleton className="h-24 w-full" />
            <Skeleton className="h-24 w-full" />
            <Skeleton className="h-24 w-full" />
          </div>
        )}

        {/* Appointments Table */}
        {!loadingAppointments && !loadingDoctors && (
          <>
            {appointments.length === 0 ? (
              <Alert>
                <Calendar className="h-4 w-4" />
                <AlertTitle>No hay citas programadas</AlertTitle>
                <AlertDescription>
                  No se encontraron citas para hoy.
                </AlertDescription>
              </Alert>
            ) : (
              <div className="border rounded-lg overflow-hidden">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Hora</TableHead>
                      <TableHead>Paciente</TableHead>
                      {isAdmin && <TableHead>Médico</TableHead>}
                      <TableHead>Estado</TableHead>
                      <TableHead>Notas</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {appointments.map((appointment) => (
                      <TableRow key={appointment.id}>
                        <TableCell className="font-medium">
                          {formatTime(appointment.time)}
                        </TableCell>
                        <TableCell>{appointment.patient.name}</TableCell>
                        {isAdmin && (
                          <TableCell>{appointment.doctor.name}</TableCell>
                        )}
                        <TableCell>
                          <StatusBadge status={appointment.status} />
                        </TableCell>
                        <TableCell className="text-muted-foreground text-sm">
                          {appointment.notes || '-'}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </>
        )}
      </div>
    </MainLayout>
  );
}
