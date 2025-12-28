import { useState, useEffect } from 'react';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import MainLayout from '@/components/MainLayout';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Tooltip, TooltipContent, TooltipTrigger, TooltipProvider } from '@/components/ui/tooltip';
import { Calendar, AlertCircle, Stethoscope, User, ChevronLeft, ChevronRight, CalendarClock } from 'lucide-react';
import { useCurrentUser } from '@/context/UserContext';
import { useTodayAppointments } from '@/hooks/useTodayAppointments';
import { useDoctors } from '@/hooks/useDoctors';
import StatusBadge from '@/components/StatusBadge';
import { RescheduleModal } from '@/components/RescheduleModal';
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
  const [rescheduleModalOpen, setRescheduleModalOpen] = useState(false);
  const [selectedAppointment, setSelectedAppointment] = useState<any>(null);
  const itemsPerPage = 10;
  
  // Get today's and tomorrow's date in local timezone
  const todayStr = getLocalDateString();
  const tomorrowStr = getTomorrowDateString();
  const currentDateStr = selectedDate === 'today' ? todayStr : tomorrowStr;
  const currentDateObj = selectedDate === 'today' ? getLocalToday() : getLocalTomorrow();
  
  const formattedDate = format(currentDateObj, "EEEE, d 'de' MMMM 'de' yyyy", {
    locale: es,
  });

  // Format time to 12-hour format, returns {time, period}
  const formatTimeParts = (time: string): { time: string; period: string } => {
    try {
      const [hours, minutes] = time.split(':');
      const date = new Date();
      date.setHours(parseInt(hours), parseInt(minutes));
      const formatted = format(date, 'h:mm a', { locale: es });
      const parts = formatted.split(' ');
      return { time: parts[0], period: parts[1]?.toUpperCase() || '' };
    } catch {
      return { time, period: '' };
    }
  };

  // Fetch doctors list (only for admin)
  const { data: doctors, isLoading: loadingDoctors } = useDoctors();

  // Determine the doctorId to use for fetching appointments
  const doctorIdToFetch = isDoctor 
    ? user?.doctorId || undefined 
    : (selectedDoctorId === 'all' ? undefined : selectedDoctorId);

  // Fetch appointments based on role, selection, and date
  const { data: appointments, isLoading: loadingAppointments, refetch } = useTodayAppointments({
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

  // Calculate pagination
  const totalPages = Math.ceil(appointments.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const paginatedAppointments = appointments.slice(startIndex, endIndex);

  const handleReschedule = (appointment: any) => {
    setSelectedAppointment(appointment);
    setRescheduleModalOpen(true);
  };

  return (
    <MainLayout headerAction={dayNavigation}>
      <div className="container mx-auto p-4 md:p-6 max-w-3xl">
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
          <div className="mb-6">
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
            <Skeleton className="h-20 w-full" />
            <Skeleton className="h-20 w-full" />
            <Skeleton className="h-20 w-full" />
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

        {/* Timeline View */}
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
                {/* Timeline Container */}
                <div className="space-y-0">
                  {paginatedAppointments.map((appointment, index) => {
                    const { time, period } = formatTimeParts(appointment.time);
                    const isLast = index === paginatedAppointments.length - 1;
                    
                    return (
                      <div 
                        key={appointment.id} 
                        className={`flex items-start gap-4 py-4 ${!isLast ? 'border-b border-dashed border-border' : ''}`}
                      >
                        {/* Hora prominente a la izquierda */}
                        <div className="flex-shrink-0 w-16 text-center pt-1">
                          <div className="text-xl font-bold text-primary leading-none">
                            {time}
                          </div>
                          <div className="text-[10px] text-muted-foreground uppercase tracking-wider mt-1">
                            {period}
                          </div>
                        </div>
                        
                        {/* Contenido de la cita */}
                        <div className="flex-1 min-w-0">
                          {/* Nombre del paciente con truncado */}
                          <TooltipProvider>
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <div className="flex items-center gap-2 mb-2 cursor-default">
                                  <User className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                                  <span className="font-medium truncate text-foreground">
                                    {appointment.patient.name}
                                  </span>
                                </div>
                              </TooltipTrigger>
                              <TooltipContent side="top">
                                <p>{appointment.patient.name}</p>
                              </TooltipContent>
                            </Tooltip>
                          </TooltipProvider>
                          
                          {/* Estado y botón reagendar */}
                          <div className="flex items-center justify-between gap-2">
                            <StatusBadge status={appointment.status} />
                            
                            {appointment.status !== 'cancelada' && (
                              <Button
                                variant="outline"
                                size="sm"
                                className="h-8 text-xs"
                                onClick={() => handleReschedule(appointment)}
                              >
                                <CalendarClock className="h-3.5 w-3.5 mr-1.5" />
                                <span className="hidden sm:inline">Reagendar</span>
                                <span className="sm:hidden">Mover</span>
                              </Button>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>

                {/* Pagination */}
                {totalPages > 1 && (
                  <div className="flex items-center justify-between mt-6 pt-4 border-t">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                      disabled={currentPage === 1}
                    >
                      Anterior
                    </Button>
                    <span className="text-sm text-muted-foreground">
                      {currentPage} / {totalPages}
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
                )}
              </>
            )}
          </>
        )}
      </div>

      {/* Reschedule Modal */}
      {selectedAppointment && (
        <RescheduleModal
          open={rescheduleModalOpen}
          onOpenChange={setRescheduleModalOpen}
          appointmentId={selectedAppointment.id}
          doctorId={selectedAppointment.doctor_id}
          currentDate={selectedAppointment.date}
          currentTime={selectedAppointment.time}
          currentDuration={selectedAppointment.duration_minutes}
          onSuccess={() => {
            refetch();
            setRescheduleModalOpen(false);
            setSelectedAppointment(null);
          }}
        />
      )}
    </MainLayout>
  );
}
