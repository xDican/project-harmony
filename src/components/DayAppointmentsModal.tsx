import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { Drawer, DrawerContent, DrawerHeader, DrawerTitle } from '@/components/ui/drawer';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Tooltip, TooltipContent, TooltipTrigger, TooltipProvider } from '@/components/ui/tooltip';
import { Calendar, Stethoscope, User, CalendarClock, X } from 'lucide-react';
import { useIsMobile } from '@/hooks/use-mobile';
import StatusBadge from '@/components/StatusBadge';
import type { AppointmentWithDetails } from '@/lib/api';
import type { Doctor } from '@/types/doctor';

interface DayAppointmentsModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  date: Date | null;
  appointments: AppointmentWithDetails[];
  isLoading: boolean;
  showDoctorFilter: boolean;
  doctors: Doctor[];
  selectedDoctorId: string;
  onDoctorChange: (id: string) => void;
  onReschedule: (appointment: AppointmentWithDetails) => void;
  currentPage: number;
  itemsPerPage: number;
  onPageChange: (page: number) => void;
}

const formatTimeParts = (time: string): { time: string; period: string } => {
  try {
    const [hours, minutes] = time.split(':');
    const d = new Date();
    d.setHours(parseInt(hours), parseInt(minutes));
    const formatted = format(d, 'h:mm a', { locale: es });
    const parts = formatted.split(' ');
    return { time: parts[0], period: parts[1]?.toUpperCase() || '' };
  } catch {
    return { time, period: '' };
  }
};

export default function DayAppointmentsModal({
  open,
  onOpenChange,
  date,
  appointments,
  isLoading,
  showDoctorFilter,
  doctors,
  selectedDoctorId,
  onDoctorChange,
  onReschedule,
  currentPage,
  itemsPerPage,
  onPageChange,
}: DayAppointmentsModalProps) {
  const isMobile = useIsMobile();

  const totalPages = Math.ceil(appointments.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const paginatedAppointments = appointments.slice(startIndex, startIndex + itemsPerPage);

  const titleText = date ? format(date, "EEEE d 'de' MMMM", { locale: es }) : '';

  const body = (
    <>
      {showDoctorFilter && (
        <div className="mb-4">
          <Label className="text-sm font-semibold text-foreground mb-2 block">Médico</Label>
          <Select value={selectedDoctorId} onValueChange={onDoctorChange}>
            <SelectTrigger className="w-full">
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

      {isLoading ? (
        <div className="space-y-4">
          <Skeleton className="h-20 w-full" />
          <Skeleton className="h-20 w-full" />
        </div>
      ) : appointments.length === 0 ? (
        <Alert>
          <Calendar className="h-4 w-4" />
          <AlertTitle>No hay citas programadas</AlertTitle>
          <AlertDescription>No hay citas para este día.</AlertDescription>
        </Alert>
      ) : (
        <>
          <div className="space-y-0">
            {paginatedAppointments.map((appointment, index) => {
              const { time, period } = formatTimeParts(appointment.time);
              const isLast = index === paginatedAppointments.length - 1;

              return (
                <div key={appointment.id} className="flex gap-3">
                  <div className="flex-shrink-0 w-14 text-right pt-1">
                    <div className="text-sm font-bold text-primary leading-none">{time}</div>
                    <div className="text-[9px] text-muted-foreground uppercase tracking-wider mt-0.5">
                      {period}
                    </div>
                  </div>

                  <div className="flex flex-col items-center flex-shrink-0 pt-1.5">
                    <div className="h-2.5 w-2.5 rounded-full bg-primary" />
                    {!isLast && <div className="w-px flex-1 bg-border mt-1" />}
                  </div>

                  <div className="flex-1 min-w-0 pb-5">
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

                    <div className="flex items-center justify-between gap-2">
                      <StatusBadge status={appointment.status} />

                      {appointment.status !== 'cancelada' && (
                        <Button
                          variant="outline"
                          size="sm"
                          className="h-8 text-xs"
                          onClick={() => onReschedule(appointment)}
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

          {totalPages > 1 && (
            <div className="flex items-center justify-between mt-2 pt-4 border-t">
              <Button
                variant="outline"
                size="sm"
                onClick={() => onPageChange(Math.max(1, currentPage - 1))}
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
                onClick={() => onPageChange(Math.min(totalPages, currentPage + 1))}
                disabled={currentPage === totalPages}
              >
                Siguiente
              </Button>
            </div>
          )}
        </>
      )}
    </>
  );

  if (isMobile) {
    return (
      <Drawer open={open} onOpenChange={onOpenChange}>
        <DrawerContent className="max-h-[90dvh] rounded-t-lg">
          <DrawerHeader className="flex flex-row items-center justify-between border-b pb-3">
            <div>
              <DrawerTitle className="capitalize">{titleText}</DrawerTitle>
              {!isLoading && (
                <p className="text-xs text-muted-foreground mt-0.5">
                  {appointments.length} {appointments.length === 1 ? 'cita' : 'citas'}
                </p>
              )}
            </div>
            <Button variant="ghost" size="icon" className="shrink-0" onClick={() => onOpenChange(false)}>
              <X className="h-5 w-5" />
            </Button>
          </DrawerHeader>
          <div className="min-h-0 overflow-y-auto p-4">{body}</div>
        </DrawerContent>
      </Drawer>
    );
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[85vh] flex flex-col p-0 gap-0">
        <DialogHeader className="p-6 border-b border-border">
          <DialogTitle className="capitalize">{titleText}</DialogTitle>
          {!isLoading && (
            <p className="text-sm text-muted-foreground">
              {appointments.length} {appointments.length === 1 ? 'cita' : 'citas'}
            </p>
          )}
        </DialogHeader>
        <div className="p-6 flex-1 overflow-y-auto">{body}</div>
      </DialogContent>
    </Dialog>
  );
}
