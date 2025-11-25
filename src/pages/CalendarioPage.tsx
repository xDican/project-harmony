import { useState, useMemo, useCallback } from 'react';
import { Calendar, momentLocalizer, View } from 'react-big-calendar';
import moment from 'moment';
import 'react-big-calendar/lib/css/react-big-calendar.css';
import MainLayout from '@/components/MainLayout';
import { useCurrentUser } from '@/context/UserContext';
import { useAppointmentsRange } from '@/hooks/useAppointmentsRange';
import { AppointmentStatus } from '@/types/appointment';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import StatusBadge from '@/components/StatusBadge';
import { format } from 'date-fns';

moment.locale('es');
const localizer = momentLocalizer(moment);

interface CalendarEvent {
  id: string;
  title: string;
  start: Date;
  end: Date;
  resource: {
    status: AppointmentStatus;
    patientName: string;
    doctorName: string;
    patientPhone?: string;
    notes?: string;
  };
}

export default function CalendarioPage() {
  const { user, isAdmin, isDoctor } = useCurrentUser();
  const [currentView, setCurrentView] = useState<View>('month');
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedEvent, setSelectedEvent] = useState<CalendarEvent | null>(null);

  // Calculate date range based on current view
  const dateRange = useMemo(() => {
    const start = moment(currentDate).startOf(currentView === 'month' ? 'month' : 'week');
    const end = moment(currentDate).endOf(currentView === 'month' ? 'month' : 'week');
    return {
      startDate: start.format('YYYY-MM-DD'),
      endDate: end.format('YYYY-MM-DD'),
    };
  }, [currentDate, currentView]);

  // Fetch appointments for the date range
  const doctorId = isDoctor && user?.doctorId ? user.doctorId : undefined;
  const { data: appointments, isLoading } = useAppointmentsRange({
    startDate: dateRange.startDate,
    endDate: dateRange.endDate,
    doctorId,
  });

  // Convert appointments to calendar events
  const events: CalendarEvent[] = useMemo(() => {
    if (!appointments) return [];

    return appointments.map((apt) => {
      const [hours, minutes] = apt.time.split(':');
      const startDate = new Date(apt.date);
      startDate.setHours(parseInt(hours), parseInt(minutes));
      
      const endDate = new Date(startDate);
      endDate.setMinutes(endDate.getMinutes() + 30); // Default 30 min slots

      return {
        id: apt.id,
        title: `${apt.patient.name}`,
        start: startDate,
        end: endDate,
        resource: {
          status: apt.status,
          patientName: apt.patient.name,
          doctorName: apt.doctor.name,
          patientPhone: apt.patient.phone || undefined,
          notes: apt.notes || undefined,
        },
      };
    });
  }, [appointments]);

  // Event style based on status
  const eventStyleGetter = useCallback((event: CalendarEvent) => {
    const statusColors: Record<AppointmentStatus, string> = {
      agendada: 'bg-blue-100 text-blue-800 border-blue-300',
      confirmada: 'bg-green-100 text-green-800 border-green-300',
      cancelada: 'bg-red-100 text-red-800 border-red-300',
      completada: 'bg-gray-100 text-gray-800 border-gray-300',
      no_asistio: 'bg-orange-100 text-orange-800 border-orange-300',
    };

    const colorClass = statusColors[event.resource.status] || 'bg-gray-100';
    
    // Extract RGB values from the class (simplified for inline styles)
    const colorMap: Record<AppointmentStatus, { backgroundColor: string; borderColor: string; color: string }> = {
      agendada: { backgroundColor: '#dbeafe', borderColor: '#93c5fd', color: '#1e40af' },
      confirmada: { backgroundColor: '#dcfce7', borderColor: '#86efac', color: '#166534' },
      cancelada: { backgroundColor: '#fee2e2', borderColor: '#fca5a5', color: '#991b1b' },
      completada: { backgroundColor: '#f3f4f6', borderColor: '#d1d5db', color: '#374151' },
      no_asistio: { backgroundColor: '#ffedd5', borderColor: '#fdba74', color: '#9a3412' },
    };

    return {
      style: {
        ...colorMap[event.resource.status],
        border: `1px solid ${colorMap[event.resource.status].borderColor}`,
        borderRadius: '4px',
        fontSize: '0.875rem',
        padding: '2px 4px',
      },
    };
  }, []);

  const handleSelectEvent = (event: CalendarEvent) => {
    setSelectedEvent(event);
  };

  const handleNavigate = (date: Date) => {
    setCurrentDate(date);
  };

  const handleViewChange = (view: View) => {
    setCurrentView(view);
  };

  if (isLoading) {
    return (
      <MainLayout>
        <div className="p-6">
          <div className="flex items-center justify-center min-h-[400px]">
            <p className="text-muted-foreground">Cargando calendario...</p>
          </div>
        </div>
      </MainLayout>
    );
  }

  return (
    <MainLayout>
      <div className="p-6 space-y-6">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Calendario de Citas</h1>
          <p className="text-muted-foreground mt-1">
            Vista {currentView === 'month' ? 'mensual' : currentView === 'week' ? 'semanal' : 'diaria'} de las citas
          </p>
        </div>

        {/* Legend */}
        <div className="flex flex-wrap gap-4 p-4 bg-card rounded-lg border">
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 rounded bg-blue-100 border border-blue-300" />
            <span className="text-sm text-muted-foreground">Agendada</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 rounded bg-green-100 border border-green-300" />
            <span className="text-sm text-muted-foreground">Confirmada</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 rounded bg-gray-100 border border-gray-300" />
            <span className="text-sm text-muted-foreground">Completada</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 rounded bg-red-100 border border-red-300" />
            <span className="text-sm text-muted-foreground">Cancelada</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 rounded bg-orange-100 border border-orange-300" />
            <span className="text-sm text-muted-foreground">No se presentó</span>
          </div>
        </div>

        {/* Calendar */}
        <div className="bg-card rounded-lg border p-4" style={{ height: '700px' }}>
          <Calendar
            localizer={localizer}
            events={events}
            startAccessor="start"
            endAccessor="end"
            style={{ height: '100%' }}
            view={currentView}
            onView={handleViewChange}
            date={currentDate}
            onNavigate={handleNavigate}
            onSelectEvent={handleSelectEvent}
            eventPropGetter={eventStyleGetter}
            messages={{
              next: 'Siguiente',
              previous: 'Anterior',
              today: 'Hoy',
              month: 'Mes',
              week: 'Semana',
              day: 'Día',
              agenda: 'Agenda',
              date: 'Fecha',
              time: 'Hora',
              event: 'Cita',
              noEventsInRange: 'No hay citas en este rango de fechas',
              showMore: (total) => `+ Ver más (${total})`,
            }}
            formats={{
              dayHeaderFormat: 'dddd, D [de] MMMM',
              dayRangeHeaderFormat: ({ start, end }) =>
                `${moment(start).format('D MMM')} - ${moment(end).format('D MMM YYYY')}`,
              monthHeaderFormat: 'MMMM YYYY',
            }}
          />
        </div>
      </div>

      {/* Event Details Dialog */}
      <Dialog open={!!selectedEvent} onOpenChange={() => setSelectedEvent(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Detalles de la Cita</DialogTitle>
          </DialogHeader>
          {selectedEvent && (
            <div className="space-y-4">
              <div>
                <p className="text-sm text-muted-foreground">Estado</p>
                <StatusBadge status={selectedEvent.resource.status} />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Paciente</p>
                <p className="font-medium">{selectedEvent.resource.patientName}</p>
                {selectedEvent.resource.patientPhone && (
                  <p className="text-sm text-muted-foreground">{selectedEvent.resource.patientPhone}</p>
                )}
              </div>
              {isAdmin && (
                <div>
                  <p className="text-sm text-muted-foreground">Médico</p>
                  <p className="font-medium">{selectedEvent.resource.doctorName}</p>
                </div>
              )}
              <div>
                <p className="text-sm text-muted-foreground">Fecha y Hora</p>
                <p className="font-medium">
                  {format(selectedEvent.start, "dd/MM/yyyy 'a las' HH:mm")}
                </p>
              </div>
              {selectedEvent.resource.notes && (
                <div>
                  <p className="text-sm text-muted-foreground">Notas</p>
                  <p className="text-sm">{selectedEvent.resource.notes}</p>
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </MainLayout>
  );
}
