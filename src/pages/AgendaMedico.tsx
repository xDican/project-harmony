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
import { Button } from '@/components/ui/button';
import { Calendar, AlertCircle, Stethoscope, User, ChevronLeft, ChevronRight } from 'lucide-react';
import { useCurrentUser } from '@/context/UserContext';
import { useTodayAppointments } from '@/hooks/useTodayAppointments';
import { useDoctors } from '@/hooks/useDoctors';
import StatusBadge from '@/components/StatusBadge';
import { getLocalDateString, getLocalToday, getLocalTomorrow, getTomorrowDateString } from '@/lib/dateUtils';

/**
 * AgendaMedico - Doctor's daily agenda view
 * Shows appointments for a selected doctor for the current day
 * Admin can view all doctors, Doctor can only view their own
 */
export default function AgendaMedico() {
  const { user, loading, isAdmin, isDoctor } = useCurrentUser();
  const [selectedDoctorId, setSelectedDoctorId] = useState<string>('all');
  const [currentPage, setCurrentPage] = useState(1);
  const [selectedDate, setSelectedDate] = useState<'today' | 'tomorrow'>('today');
  const itemsPerPage = 10;
  
  // Get today's and tomorrow's date in local timezone
  const todayStr = getLocalDateString();
  const tomorrowStr = getTomorrowDateString();
  const currentDateStr = selectedDate === 'today' ? todayStr : tomorrowStr;
  const currentDateObj = selectedDate === 'today' ? getLocalToday() : getLocalTomorrow();
  
  const formattedDate = format(currentDateObj, "EEEE, d 'de' MMMM 'de' yyyy", {
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

  // Fetch appointments based on role, selection, and date
  const { data: appointments, isLoading: loadingAppointments } = useTodayAppointments({
    doctorId: doctorIdToFetch,
    initialDate: currentDateStr,
  });

  // Reset page when date changes
  useEffect(() => {
    setCurrentPage(1);
  }, [selectedDate]);

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

  // Day navigation component for header
  const dayNavigation = (
    <div className="flex items-center gap-1">
      <Button
        variant="ghost"
        size="icon"
        onClick={() => setSelectedDate('today')}
        disabled={selectedDate === 'today'}
        className="h-8 w-8"
      >
        <ChevronLeft className="h-4 w-4" />
      </Button>
      <span className="text-sm font-medium min-w-[60px] text-center">
        {selectedDate === 'today' ? 'Hoy' : 'Mañana'}
      </span>
      <Button
        variant="ghost"
        size="icon"
        onClick={() => setSelectedDate('tomorrow')}
        disabled={selectedDate === 'tomorrow'}
        className="h-8 w-8"
      >
        <ChevronRight className="h-4 w-4" />
      </Button>
    </div>
  );

  return (
    <MainLayout headerAction={dayNavigation}>
      <div className="container mx-auto p-6 max-w-5xl">
        {/* Date Info - Desktop only */}
        <div className="mb-6 hidden md:flex items-center justify-between">
          <div className="flex items-center gap-2 text-muted-foreground">
            <Calendar className="h-4 w-4" />
            <p className="capitalize">{formattedDate}</p>
            {!loadingAppointments && !loadingDoctors && appointments.length > 0 && (
              <span className="text-sm">
                · {appointments.length} {appointments.length === 1 ? 'cita' : 'citas'}
              </span>
            )}
          </div>
          {dayNavigation}
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

        {/* Date Header - Mobile */}
        <div className="mb-4 md:hidden flex items-center justify-center gap-2 text-muted-foreground">
          <Calendar className="h-4 w-4" />
          <p className="capitalize text-sm">{formattedDate}</p>
          {!loadingAppointments && !loadingDoctors && appointments.length > 0 && (
            <span className="text-sm">
              · {appointments.length} {appointments.length === 1 ? 'cita' : 'citas'}
            </span>
          )}
        </div>

        {/* Appointments Table */}
        {!loadingAppointments && !loadingDoctors && (
          <>
            {appointments.length === 0 ? (
              <Alert>
                <Calendar className="h-4 w-4" />
                <AlertTitle>No hay citas programadas</AlertTitle>
                <AlertDescription>
                  No se encontraron citas para {selectedDate === 'today' ? 'hoy' : 'mañana'}.
                </AlertDescription>
              </Alert>
            ) : (
              <>
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
                      {(() => {
                        const totalPages = Math.ceil(appointments.length / itemsPerPage);
                        const startIndex = (currentPage - 1) * itemsPerPage;
                        const endIndex = startIndex + itemsPerPage;
                        const paginatedAppointments = appointments.slice(startIndex, endIndex);
                        
                        return paginatedAppointments.map((appointment) => (
                      <TableRow key={appointment.id}>
                        <TableCell className="font-medium">
                          {formatTime(appointment.time)}
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <User className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                            {appointment.patient.name}
                          </div>
                        </TableCell>
                        {isAdmin && (
                          <TableCell>
                            <div className="flex items-center gap-2">
                              <Stethoscope className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                              {appointment.doctor.name}
                            </div>
                          </TableCell>
                        )}
                        <TableCell>
                          <StatusBadge status={appointment.status} />
                        </TableCell>
                        <TableCell className="text-muted-foreground text-sm">
                          {appointment.notes || '-'}
                        </TableCell>
                      </TableRow>
                        ));
                      })()}
                    </TableBody>
                  </Table>
                </div>
                {(() => {
                  const totalPages = Math.ceil(appointments.length / itemsPerPage);
                  return totalPages > 1 && (
                    <div className="flex items-center justify-between mt-4 px-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                        disabled={currentPage === 1}
                      >
                        Anterior
                      </Button>
                      <span className="text-sm text-muted-foreground">
                        Página {currentPage} de {totalPages}
                      </span>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                        disabled={currentPage === totalPages}
                      >
                        Siguiente
                      </Button>
                    </div>
                  );
                })()}
              </>
            )}
          </>
        )}
      </div>
    </MainLayout>
  );
}
