import { useState, useEffect, useMemo } from 'react';
import { format, startOfWeek, addWeeks, subWeeks, isSameDay } from 'date-fns';
import { es } from 'date-fns/locale';
import MainLayout from '@/components/MainLayout';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Tooltip, TooltipContent, TooltipTrigger, TooltipProvider } from '@/components/ui/tooltip';
import { Calendar, AlertCircle, Stethoscope, User, ChevronLeft, ChevronRight, CalendarClock, CalendarDays } from 'lucide-react';
import { useCurrentUser } from '@/context/UserContext';
import { useWeekAppointments } from '@/hooks/useWeekAppointments';
import { useDoctors } from '@/hooks/useDoctors';
import StatusBadge from '@/components/StatusBadge';
import { RescheduleModal } from '@/components/RescheduleModal';
import { getLocalToday } from '@/lib/dateUtils';
import { ScrollArea, ScrollBar } from '@/components/ui/scroll-area';
import { cn } from '@/lib/utils';

/**
 * AgendaSemanal - Weekly agenda view
 * Shows appointments for the selected week with day-by-day navigation
 * Admin can view all doctors, Doctor can only view their own
 */
export default function AgendaSemanal() {
  const { user, loading, isAdmin, isDoctor } = useCurrentUser();
  const [selectedDoctorId, setSelectedDoctorId] = useState<string>('all');
  const [currentPage, setCurrentPage] = useState(1);
  const [rescheduleModalOpen, setRescheduleModalOpen] = useState(false);
  const [selectedAppointment, setSelectedAppointment] = useState<any>(null);
  const itemsPerPage = 10;
  
  // Week navigation state
  const today = getLocalToday();
  const [weekStart, setWeekStart] = useState(() => {
    // Start week on Monday
    return startOfWeek(today, { weekStartsOn: 1 });
  });
  
  // Selected day within the week (defaults to today if in current week, else first day)
  const [selectedDayIndex, setSelectedDayIndex] = useState<number>(() => {
    const todayIndex = today.getDay() === 0 ? 6 : today.getDay() - 1; // Convert to 0=Monday, 6=Sunday
    return todayIndex;
  });

  // Format weekStart as YYYY-MM-DD for the hook
  const weekStartStr = useMemo(() => {
    const year = weekStart.getFullYear();
    const month = String(weekStart.getMonth() + 1).padStart(2, '0');
    const day = String(weekStart.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }, [weekStart]);

  // Calculate week end date
  const weekEnd = useMemo(() => {
    const end = new Date(weekStart);
    end.setDate(end.getDate() + 6);
    return end;
  }, [weekStart]);

  // Format week range for display
  const weekRangeText = useMemo(() => {
    const startDay = weekStart.getDate();
    const endDay = weekEnd.getDate();
    const startMonth = format(weekStart, 'MMMM', { locale: es });
    const endMonth = format(weekEnd, 'MMMM', { locale: es });
    
    if (startMonth === endMonth) {
      return `Semana del ${startDay} – ${endDay} de ${startMonth}`;
    }
    return `Semana del ${startDay} de ${startMonth} – ${endDay} de ${endMonth}`;
  }, [weekStart, weekEnd]);

  // Format time to 12-hour format
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

  // Fetch appointments for the week
  const { data: appointmentsByDate, weekDates, isLoading: loadingAppointments, refetch } = useWeekAppointments({
    doctorId: doctorIdToFetch,
    weekStart: weekStartStr,
  });

  // Get appointments for the selected day
  const selectedDate = weekDates[selectedDayIndex] || weekDates[0];
  const appointments = appointmentsByDate[selectedDate] || [];

  // Reset page when day changes
  useEffect(() => {
    setCurrentPage(1);
  }, [selectedDayIndex, weekStart]);

  // Reset selected day to today when navigating to current week
  const handleGoToToday = () => {
    const newWeekStart = startOfWeek(today, { weekStartsOn: 1 });
    setWeekStart(newWeekStart);
    const todayIndex = today.getDay() === 0 ? 6 : today.getDay() - 1;
    setSelectedDayIndex(todayIndex);
  };

  // Check if current week contains today
  const isCurrentWeek = useMemo(() => {
    return today >= weekStart && today <= weekEnd;
  }, [today, weekStart, weekEnd]);

  // Generate day tabs data
  const dayTabs = useMemo(() => {
    return weekDates.map((dateStr, index) => {
      const date = new Date(dateStr + 'T00:00:00');
      const dayName = format(date, 'EEE', { locale: es });
      const dayNum = date.getDate();
      const isToday = isSameDay(date, today);
      const appointmentCount = (appointmentsByDate[dateStr] || []).length;
      
      return {
        index,
        dateStr,
        dayName: dayName.charAt(0).toUpperCase() + dayName.slice(1),
        dayNum,
        isToday,
        appointmentCount,
      };
    });
  }, [weekDates, appointmentsByDate, today]);

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

  // Calculate pagination
  const totalPages = Math.ceil(appointments.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const paginatedAppointments = appointments.slice(startIndex, endIndex);

  const handleReschedule = (appointment: any) => {
    setSelectedAppointment(appointment);
    setRescheduleModalOpen(true);
  };

  // Week navigation header action
  const weekNavigation = (
    <div className="flex items-center gap-1">
      <Button
        variant="ghost"
        size="icon"
        onClick={() => setWeekStart(prev => subWeeks(prev, 1))}
        className="h-8 w-8"
        title="Semana anterior"
      >
        <ChevronLeft className="h-4 w-4" />
      </Button>
      {!isCurrentWeek && (
        <Button
          variant="outline"
          size="sm"
          onClick={handleGoToToday}
          className="h-8 text-xs px-2"
        >
          Hoy
        </Button>
      )}
      <Button
        variant="ghost"
        size="icon"
        onClick={() => setWeekStart(prev => addWeeks(prev, 1))}
        className="h-8 w-8"
        title="Semana siguiente"
      >
        <ChevronRight className="h-4 w-4" />
      </Button>
    </div>
  );

  return (
    <MainLayout headerAction={weekNavigation}>
      <div className="container mx-auto p-4 md:p-6 max-w-3xl">
        {/* Week Range Header */}
        <div className="mb-4 text-center">
          <p className="text-sm text-muted-foreground capitalize">{weekRangeText}</p>
        </div>

        {/* Week Navigation - Desktop */}
        <div className="hidden md:flex items-center justify-center gap-2 mb-6">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setWeekStart(prev => subWeeks(prev, 1))}
            className="gap-1"
          >
            <ChevronLeft className="h-4 w-4" />
            Semana anterior
          </Button>
          {!isCurrentWeek && (
            <Button
              variant="outline"
              size="sm"
              onClick={handleGoToToday}
            >
              Hoy
            </Button>
          )}
          <Button
            variant="outline"
            size="sm"
            onClick={() => setWeekStart(prev => addWeeks(prev, 1))}
            className="gap-1"
          >
            Semana siguiente
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>

        {/* Day Selector Tabs */}
        <ScrollArea className="w-full whitespace-nowrap mb-6">
          <div className="flex gap-2 pb-2">
            {dayTabs.map((tab) => (
              <Button
                key={tab.dateStr}
                variant={selectedDayIndex === tab.index ? "default" : "outline"}
                size="sm"
                onClick={() => setSelectedDayIndex(tab.index)}
                className={cn(
                  "flex flex-col items-center min-w-[60px] h-auto py-2 px-3",
                  tab.isToday && selectedDayIndex !== tab.index && "border-primary/50 bg-primary/5"
                )}
              >
                <span className="text-xs font-normal opacity-80">{tab.dayName}</span>
                <span className="text-lg font-semibold">{tab.dayNum}</span>
                {tab.isToday && (
                  <span className="text-[10px] uppercase tracking-wide opacity-70">Hoy</span>
                )}
                {!tab.isToday && tab.appointmentCount > 0 && (
                  <span className="text-[10px] text-muted-foreground">{tab.appointmentCount} citas</span>
                )}
              </Button>
            ))}
          </div>
          <ScrollBar orientation="horizontal" />
        </ScrollArea>

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

        {/* Appointments List */}
        {!loadingAppointments && !loadingDoctors && (
          <>
            {appointments.length === 0 ? (
              <Alert>
                <Calendar className="h-4 w-4" />
                <AlertTitle>No hay citas programadas</AlertTitle>
                <AlertDescription>
                  No hay citas para este día.
                </AlertDescription>
              </Alert>
            ) : (
              <>
                {/* Appointments Count */}
                <div className="flex items-center justify-center gap-2 text-muted-foreground mb-4">
                  <CalendarDays className="h-4 w-4" />
                  <p className="text-sm">
                    {appointments.length} {appointments.length === 1 ? 'cita' : 'citas'}
                  </p>
                </div>

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
                        {/* Time */}
                        <div className="flex-shrink-0 w-16 text-center pt-1">
                          <div className="text-xl font-bold text-primary leading-none">
                            {time}
                          </div>
                          <div className="text-[10px] text-muted-foreground uppercase tracking-wider mt-1">
                            {period}
                          </div>
                        </div>
                        
                        {/* Appointment Content */}
                        <div className="flex-1 min-w-0">
                          {/* Patient Name */}
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
                          
                          {/* Status and Reschedule */}
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
          doctorId={selectedAppointment.doctorId}
          currentDate={selectedAppointment.date}
          currentTime={selectedAppointment.time}
          currentDuration={selectedAppointment.durationMinutes}
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
