import { useState, useEffect, useMemo } from 'react';
import { format, startOfMonth, endOfMonth, addMonths, subMonths, eachDayOfInterval, isSameMonth } from 'date-fns';
import { es } from 'date-fns/locale';
import MainLayout from '@/components/MainLayout';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Drawer, DrawerContent, DrawerHeader, DrawerTitle } from '@/components/ui/drawer';
import { AlertCircle, Plus, X } from 'lucide-react';
import { useCurrentUser } from '@/context/UserContext';
import { useIsMobile } from '@/hooks/use-mobile';
import { useMonthlyAgenda } from '@/hooks/useMonthlyAgenda';
import MonthGrid from '@/components/MonthGrid';
import DayAppointmentsModal from '@/components/DayAppointmentsModal';
import { RescheduleModal } from '@/components/RescheduleModal';
import NuevaCitaComposer from '@/components/NuevaCitaComposer';
import { getLocalToday } from '@/lib/dateUtils';

/**
 * Calendario - Monthly agenda view (antes "Agenda Semanal", renombrada porque
 * dejó de ser semanal desde la vista mensual).
 * Calendario mensual siempre visible; al tocar un día se abre un modal con
 * el timeline de citas de ese día + filtro de médico (admin/secretary).
 * Admin can view all doctors, Doctor can only view their own
 */
export default function Calendario() {
  const { user, loading, isAdmin, isDoctor, isSecretary, isAdminOrSecretary, isDoctorView } = useCurrentUser();
  const isMobile = useIsMobile();
  const [selectedDoctorId, setSelectedDoctorId] = useState<string>(
    () => localStorage.getItem('oc_last_doctor') || 'all'
  );
  const [currentPage, setCurrentPage] = useState(1);
  const [rescheduleModalOpen, setRescheduleModalOpen] = useState(false);
  const [selectedAppointment, setSelectedAppointment] = useState<any>(null);
  const [newCitaOpen, setNewCitaOpen] = useState(false);
  const itemsPerPage = 10;

  const today = getLocalToday();

  // Month navigation state
  const [monthAnchor, setMonthAnchor] = useState<Date>(() => startOfMonth(today));

  // Día tocado en el grid — controla el modal de citas del día
  const [modalDate, setModalDate] = useState<Date | null>(null);
  const [modalOpen, setModalOpen] = useState(false);

  const monthAnchorStr = useMemo(() => format(monthAnchor, 'yyyy-MM-dd'), [monthAnchor]);
  const monthDays = useMemo(
    () => eachDayOfInterval({ start: startOfMonth(monthAnchor), end: endOfMonth(monthAnchor) }),
    [monthAnchor],
  );

  // Determine the doctorId to use for fetching appointments
  // Doctors see only their own, admin/secretary can filter by doctor or see all
  const doctorIdToFetch = isDoctorView
    ? user?.doctorId || undefined
    : (selectedDoctorId === 'all' ? undefined : selectedDoctorId);

  // Single RPC call: fetches doctors + appointments for the whole month
  const {
    doctors, isSingleDoctorOrg, singleDoctor,
    appointmentsByDate, daysWithAppointments,
    isLoading: loadingAgenda, refetch,
  } = useMonthlyAgenda({
    userId: user?.id,
    monthAnchor: monthAnchorStr,
    doctorId: doctorIdToFetch,
  });

  // Auto-select doctor for single-doctor orgs
  useEffect(() => {
    if (isSingleDoctorOrg && singleDoctor) {
      setSelectedDoctorId(singleDoctor.id);
      localStorage.setItem('oc_last_doctor', singleDoctor.id);
    }
  }, [isSingleDoctorOrg, singleDoctor]);

  // Citas del día abierto en el modal
  const modalDateStr = modalDate ? format(modalDate, 'yyyy-MM-dd') : null;
  const modalAppointments = modalDateStr ? (appointmentsByDate[modalDateStr] || []) : [];

  // Reset page when day/doctor changes
  useEffect(() => {
    setCurrentPage(1);
  }, [modalDateStr, selectedDoctorId]);

  const handleDaySelect = (date: Date) => {
    setModalDate(date);
    setModalOpen(true);
  };

  const handleGoToToday = () => {
    setMonthAnchor(startOfMonth(today));
  };

  const isCurrentMonth = isSameMonth(monthAnchor, today);

  // Fecha a precargar en "Nueva cita" desde el FAB: el día tocado, solo si
  // sigue dentro del mes que se está viendo (si no, undefined — el composer
  // ya default-selecciona hoy por su cuenta, ver useAppointmentComposer).
  const composerDate = modalDate && isSameMonth(modalDate, monthAnchor) ? modalDate : undefined;

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
  if (!isAdmin && !isDoctor && !isSecretary) {
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

  const handleReschedule = (appointment: any) => {
    setSelectedAppointment(appointment);
    setRescheduleModalOpen(true);
  };

  const showDoctorFilter = isAdminOrSecretary && !isDoctorView && !isSingleDoctorOrg;

  return (
    <MainLayout mainClassName="overflow-hidden">
      <div className="flex flex-col h-full min-h-0 overflow-y-auto overscroll-contain">
        <div className="max-w-3xl w-full mx-auto px-4 py-4">
          {/* Calendario mensual — siempre visible, nunca colapsa */}
          <MonthGrid
            monthAnchor={monthAnchor}
            days={monthDays}
            daysMap={{}}
            selectedDate={modalDate || undefined}
            markedDays={daysWithAppointments}
            disablePast={false}
            onSelect={handleDaySelect}
            canGoPrev={true}
            onPrev={() => setMonthAnchor(prev => subMonths(prev, 1))}
            onNext={() => setMonthAnchor(prev => addMonths(prev, 1))}
            isLoading={loadingAgenda}
            swipeable
            largeDays
            headerExtra={
              <Button
                variant={isCurrentMonth ? "ghost" : "outline"}
                size="sm"
                onClick={handleGoToToday}
                disabled={isCurrentMonth}
                className="text-xs md:text-sm"
              >
                Hoy
              </Button>
            }
          />
        </div>
      </div>

      {/* FAB "Nueva cita" — mobile, abre el drawer embebido precargando el día
          tocado o el mes visible */}
      {isMobile && (
        <Button
          onClick={() => {
            setModalOpen(false);
            setRescheduleModalOpen(false);
            setNewCitaOpen(true);
          }}
          className="fixed bottom-6 right-6 h-14 w-14 rounded-full shadow-lg z-40"
          aria-label="Nueva cita"
        >
          <Plus className="h-6 w-6" />
        </Button>
      )}

      {/* Drawer "Nueva cita" — flujo completo embebido, sin salir de la agenda.
          `repositionInputs={false}`: por default vaul redimensiona el drawer en vivo
          (vía JS, escuchando visualViewport) cuando hay un input enfocado con el
          teclado abierto — pensado para bottom-sheets cortos, no para un form
          completo de 100dvh como este (causaba que el footer "Agendar cita" se
          arrastrara con el teclado). Nuestro layout ya maneja el teclado solo via
          CSS (contenido scrollable + footer shrink-0), no hace falta la ayuda de vaul.
          `dismissible={false}`: vaul cierra por distancia (closeThreshold) O por
          velocidad (constante interna VELOCITY_THRESHOLD=0.4, no configurable) — un
          swipe rápido cierra con mínimo arrastre sin importar closeThreshold
          (confirmado en vivo). Sin forma de afinar eso, se desactiva el cierre por
          arrastre entero — cierre 100% predecible solo con la X del header. */}
      <Drawer open={newCitaOpen} onOpenChange={setNewCitaOpen} repositionInputs={false} dismissible={false}>
        <DrawerContent className="mt-0 h-[100dvh] max-h-[100dvh] rounded-none">
          <DrawerHeader className="flex flex-row items-center justify-between border-b pb-3">
            <DrawerTitle>Nueva cita</DrawerTitle>
            <Button variant="ghost" size="icon" className="shrink-0" onClick={() => setNewCitaOpen(false)}>
              <X className="h-5 w-5" />
            </Button>
          </DrawerHeader>
          <NuevaCitaComposer
            initialDate={composerDate}
            onCreated={() => {
              refetch();
              setNewCitaOpen(false);
            }}
          />
        </DrawerContent>
      </Drawer>

      {/* Modal de citas del día */}
      <DayAppointmentsModal
        open={modalOpen}
        onOpenChange={setModalOpen}
        date={modalDate}
        appointments={modalAppointments}
        isLoading={loadingAgenda}
        showDoctorFilter={showDoctorFilter}
        doctors={doctors}
        selectedDoctorId={selectedDoctorId}
        onDoctorChange={(val) => {
          setSelectedDoctorId(val);
          localStorage.setItem('oc_last_doctor', val);
        }}
        onReschedule={handleReschedule}
        currentPage={currentPage}
        itemsPerPage={itemsPerPage}
        onPageChange={setCurrentPage}
      />

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
