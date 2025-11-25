import { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { DateTime } from 'luxon';
import MainLayout from '@/components/MainLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { ArrowLeft, Calendar, Phone, Mail, Loader2, User, Stethoscope } from 'lucide-react';
import { usePatientAppointments } from '@/hooks/usePatientAppointments';
import { getAllPatients, updateAppointmentStatus } from '@/lib/api';
import { useToast } from '@/hooks/use-toast';
import StatusBadge from '@/components/StatusBadge';
import type { Patient } from '@/types/patient';
import { useEffect } from 'react';
import { useIsMobile } from '@/hooks/use-mobile';
import { AppointmentStatus } from '@/types/appointment';

/**
 * PatientDetail - Detailed view of a patient with appointment history
 */
export default function PatientDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { toast } = useToast();
  const isMobile = useIsMobile();
  const [patient, setPatient] = useState<Patient | null>(null);
  const [loadingPatient, setLoadingPatient] = useState(true);
  const [cancelingId, setCancelingId] = useState<string | null>(null);
  const [appointmentToCancel, setAppointmentToCancel] = useState<string | null>(null);
  const [upcomingPage, setUpcomingPage] = useState(1);
  const [historyPage, setHistoryPage] = useState(1);
  const itemsPerPage = 5;

  const { upcoming, past, isLoading, error, refetch } = usePatientAppointments(id || '');

  // Load patient data
  useEffect(() => {
    if (!id) return;
    
    getAllPatients()
      .then(patients => {
        const found = patients.find(p => p.id === id);
        setPatient(found || null);
      })
      .catch(err => {
        console.error('Error loading patient:', err);
        toast({
          title: 'Error',
          description: 'No se pudo cargar la información del paciente',
          variant: 'destructive',
        });
      })
      .finally(() => {
        setLoadingPatient(false);
      });
  }, [id, toast]);

  const handleCancelClick = (appointmentId: string) => {
    setAppointmentToCancel(appointmentId);
  };

  const handleConfirmCancel = async () => {
    if (!appointmentToCancel) return;

    setCancelingId(appointmentToCancel);
    try {
      await updateAppointmentStatus(appointmentToCancel, 'cancelada');
      toast({
        title: 'Cita cancelada',
        description: 'La cita ha sido cancelada correctamente',
      });
      refetch();
    } catch (err) {
      console.error('Error canceling appointment:', err);
      toast({
        title: 'Error',
        description: 'No se pudo cancelar la cita',
        variant: 'destructive',
      });
    } finally {
      setCancelingId(null);
      setAppointmentToCancel(null);
    }
  };

  const formatDate = (dateStr: string) => {
    return DateTime.fromISO(dateStr).toFormat('dd/MM/yyyy');
  };

  const formatTime = (timeStr: string) => {
    return timeStr.substring(0, 5); // "HH:mm"
  };

  const canCancelAppointment = (date: string, time: string, status: string) => {
    if (status === 'cancelada') return false;
    
    // Compare only dates, not time
    const aptDate = DateTime.fromISO(date).startOf('day');
    const today = DateTime.now().startOf('day');
    
    return aptDate >= today;
  };

  // Pagination for upcoming appointments
  const upcomingTotalPages = Math.ceil(upcoming.length / itemsPerPage);
  const upcomingStartIndex = (upcomingPage - 1) * itemsPerPage;
  const upcomingEndIndex = upcomingStartIndex + itemsPerPage;
  const paginatedUpcoming = isMobile ? upcoming.slice(upcomingStartIndex, upcomingEndIndex) : upcoming;

  // Pagination for past appointments
  const historyTotalPages = Math.ceil(past.length / itemsPerPage);
  const historyStartIndex = (historyPage - 1) * itemsPerPage;
  const historyEndIndex = historyStartIndex + itemsPerPage;
  const paginatedPast = isMobile ? past.slice(historyStartIndex, historyEndIndex) : past;

  if (!id) {
    return (
      <MainLayout>
        <div className="container mx-auto p-6">
          <Alert variant="destructive">
            <AlertDescription>ID de paciente no válido</AlertDescription>
          </Alert>
        </div>
      </MainLayout>
    );
  }

  if (loadingPatient) {
    return (
      <MainLayout>
        <div className="container mx-auto p-6 flex items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      </MainLayout>
    );
  }

  if (!patient) {
    return (
      <MainLayout>
        <div className="container mx-auto p-6">
          <Alert variant="destructive">
            <AlertDescription>Paciente no encontrado</AlertDescription>
          </Alert>
          <Button onClick={() => navigate('/pacientes')} className="mt-4">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Volver a pacientes
          </Button>
        </div>
      </MainLayout>
    );
  }

  return (
    <MainLayout>
      <div className="container mx-auto p-6 max-w-6xl">
        {/* Back button */}
        <Button
          variant="ghost"
          onClick={() => navigate('/pacientes')}
          className="mb-4"
        >
          <ArrowLeft className="h-4 w-4 mr-2" />
          Volver a pacientes
        </Button>

        {/* Patient Header */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="text-2xl">{patient.name}</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-col gap-2 text-muted-foreground">
              {patient.phone && (
                <div className="flex items-center gap-2">
                  <Phone className="h-4 w-4" />
                  <span>{patient.phone}</span>
                </div>
              )}
              {patient.email && (
                <div className="flex items-center gap-2">
                  <Mail className="h-4 w-4" />
                  <span>{patient.email}</span>
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Appointments Tabs */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Calendar className="h-5 w-5" />
              Citas
            </CardTitle>
          </CardHeader>
          <CardContent>
            <Tabs defaultValue="upcoming">
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="upcoming">
                  Próximas citas ({upcoming.length})
                </TabsTrigger>
                <TabsTrigger value="history">
                  Historial ({past.length})
                </TabsTrigger>
              </TabsList>

              {/* Loading state */}
              {isLoading && (
                <div className="py-8 text-center">
                  <Loader2 className="h-8 w-8 animate-spin text-primary mx-auto" />
                  <p className="text-muted-foreground mt-2">Cargando citas...</p>
                </div>
              )}

              {/* Error state */}
              {error && (
                <Alert variant="destructive" className="mt-4">
                  <AlertDescription>
                    Error al cargar las citas: {error.message}
                  </AlertDescription>
                </Alert>
              )}

              {/* Upcoming appointments */}
              <TabsContent value="upcoming">
                {!isLoading && upcoming.length === 0 && (
                  <Alert>
                    <AlertDescription>
                      No hay citas programadas para este paciente
                    </AlertDescription>
                  </Alert>
                )}

                {!isLoading && upcoming.length > 0 && (
                  <>
                    {isMobile ? (
                      <>
                        <div className="space-y-0 border rounded-md overflow-hidden mt-4">
                          {paginatedUpcoming.map((apt) => (
                            <UpcomingAppointmentCard
                              key={apt.id}
                              appointment={apt}
                              formatDate={formatDate}
                              formatTime={formatTime}
                              canCancelAppointment={canCancelAppointment}
                              handleCancelClick={handleCancelClick}
                              cancelingId={cancelingId}
                            />
                          ))}
                        </div>
                        {upcomingTotalPages > 1 && (
                          <div className="flex items-center justify-between mt-4 px-2">
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => setUpcomingPage(p => Math.max(1, p - 1))}
                              disabled={upcomingPage === 1}
                            >
                              Anterior
                            </Button>
                            <span className="text-sm text-muted-foreground">
                              Página {upcomingPage} de {upcomingTotalPages}
                            </span>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => setUpcomingPage(p => Math.min(upcomingTotalPages, p + 1))}
                              disabled={upcomingPage === upcomingTotalPages}
                            >
                              Siguiente
                            </Button>
                          </div>
                        )}
                      </>
                    ) : (
                      <div className="rounded-md border">
                        <Table>
                          <TableHeader>
                            <TableRow>
                              <TableHead>Fecha</TableHead>
                              <TableHead>Hora</TableHead>
                              <TableHead>Médico</TableHead>
                              <TableHead>Estado</TableHead>
                              <TableHead>Acciones</TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {upcoming.map((apt) => (
                              <TableRow key={apt.id}>
                                <TableCell>{formatDate(apt.date)}</TableCell>
                                <TableCell>{formatTime(apt.time)}</TableCell>
                                <TableCell>
                                  <div className="flex items-center gap-2">
                                    <Stethoscope className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                                    {apt.doctorName}
                                  </div>
                                </TableCell>
                                <TableCell>
                                  <StatusBadge status={apt.status} />
                                </TableCell>
                                <TableCell>
                                  {canCancelAppointment(apt.date, apt.time, apt.status) && (
                                    <Button
                                      variant="destructive"
                                      size="sm"
                                      onClick={() => handleCancelClick(apt.id)}
                                      disabled={cancelingId === apt.id}
                                    >
                                      {cancelingId === apt.id ? (
                                        <>
                                          <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                                          Cancelando...
                                        </>
                                      ) : (
                                        'Cancelar cita'
                                      )}
                                    </Button>
                                  )}
                                  {apt.status === 'cancelada' && (
                                    <Badge variant="outline" className="text-muted-foreground">
                                      Cancelada
                                    </Badge>
                                  )}
                                </TableCell>
                              </TableRow>
                            ))}
                          </TableBody>
                        </Table>
                      </div>
                    )}
                  </>
                )}
              </TabsContent>

              {/* Past appointments (history) */}
              <TabsContent value="history">
                {!isLoading && past.length === 0 && (
                  <Alert>
                    <AlertDescription>
                      No hay historial de citas para este paciente
                    </AlertDescription>
                  </Alert>
                )}

                {!isLoading && past.length > 0 && (
                  <>
                    {isMobile ? (
                      <>
                        <div className="space-y-0 border rounded-md overflow-hidden mt-4">
                          {paginatedPast.map((apt) => (
                            <PastAppointmentCard
                              key={apt.id}
                              appointment={apt}
                              formatDate={formatDate}
                              formatTime={formatTime}
                            />
                          ))}
                        </div>
                        {historyTotalPages > 1 && (
                          <div className="flex items-center justify-between mt-4 px-2">
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => setHistoryPage(p => Math.max(1, p - 1))}
                              disabled={historyPage === 1}
                            >
                              Anterior
                            </Button>
                            <span className="text-sm text-muted-foreground">
                              Página {historyPage} de {historyTotalPages}
                            </span>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => setHistoryPage(p => Math.min(historyTotalPages, p + 1))}
                              disabled={historyPage === historyTotalPages}
                            >
                              Siguiente
                            </Button>
                          </div>
                        )}
                      </>
                    ) : (
                      <div className="rounded-md border">
                        <Table>
                          <TableHeader>
                            <TableRow>
                              <TableHead>Fecha</TableHead>
                              <TableHead>Hora</TableHead>
                              <TableHead>Médico</TableHead>
                              <TableHead>Estado</TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {past.map((apt) => (
                              <TableRow key={apt.id}>
                                <TableCell>{formatDate(apt.date)}</TableCell>
                                <TableCell>{formatTime(apt.time)}</TableCell>
                                <TableCell>
                                  <div className="flex items-center gap-2">
                                    <Stethoscope className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                                    {apt.doctorName}
                                  </div>
                                </TableCell>
                                <TableCell>
                                  <StatusBadge status={apt.status} />
                                </TableCell>
                              </TableRow>
                            ))}
                          </TableBody>
                        </Table>
                      </div>
                    )}
                  </>
                )}
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>

        {/* Cancel confirmation dialog */}
        <AlertDialog open={!!appointmentToCancel} onOpenChange={() => setAppointmentToCancel(null)}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>¿Cancelar cita?</AlertDialogTitle>
              <AlertDialogDescription>
                ¿Está seguro que desea cancelar esta cita? Esta acción no se puede deshacer.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>No, mantener cita</AlertDialogCancel>
              <AlertDialogAction onClick={handleConfirmCancel}>
                Sí, cancelar cita
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </MainLayout>
  );
}

// Mobile Card Component for Upcoming Appointments
interface UpcomingAppointmentCardProps {
  appointment: {
    id: string;
    date: string;
    time: string;
    doctorName: string;
    status: string;
  };
  formatDate: (date: string) => string;
  formatTime: (time: string) => string;
  canCancelAppointment: (date: string, time: string, status: string) => boolean;
  handleCancelClick: (id: string) => void;
  cancelingId: string | null;
}

function UpcomingAppointmentCard({
  appointment,
  formatDate,
  formatTime,
  canCancelAppointment,
  handleCancelClick,
  cancelingId,
}: UpcomingAppointmentCardProps) {
  return (
    <div className="border-b last:border-b-0 py-3 px-4 hover:bg-muted/30 transition-colors">
      {/* Line 1: Date and Time */}
      <div className="flex justify-center mb-2">
        <span className="text-lg font-bold text-foreground">
          {formatDate(appointment.date)} • {formatTime(appointment.time)}
        </span>
      </div>

      {/* Line 2: Doctor and Status */}
      <div className="flex items-center justify-between gap-2 mb-2">
        <div className="flex items-center gap-2">
          <Stethoscope className="h-4 w-4 text-muted-foreground flex-shrink-0" />
          <span className="text-sm text-muted-foreground">
            {appointment.doctorName}
          </span>
        </div>
        <StatusBadge status={appointment.status as AppointmentStatus} />
      </div>

      {/* Line 3: Cancel Button */}
      {canCancelAppointment(appointment.date, appointment.time, appointment.status) && (
        <div className="flex justify-center">
          <Button
            variant="destructive"
            size="sm"
            onClick={() => handleCancelClick(appointment.id)}
            disabled={cancelingId === appointment.id}
          >
            {cancelingId === appointment.id ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Cancelando...
              </>
            ) : (
              'Cancelar cita'
            )}
          </Button>
        </div>
      )}
      {appointment.status === 'cancelada' && (
        <div className="flex justify-center">
          <Badge variant="outline" className="text-muted-foreground">
            Cancelada
          </Badge>
        </div>
      )}
    </div>
  );
}

// Mobile Card Component for Past Appointments
interface PastAppointmentCardProps {
  appointment: {
    id: string;
    date: string;
    time: string;
    doctorName: string;
    status: string;
  };
  formatDate: (date: string) => string;
  formatTime: (time: string) => string;
}

function PastAppointmentCard({
  appointment,
  formatDate,
  formatTime,
}: PastAppointmentCardProps) {
  return (
    <div className="border-b last:border-b-0 py-3 px-4 hover:bg-muted/30 transition-colors">
      {/* Line 1: Date and Time */}
      <div className="flex justify-center mb-2">
        <span className="text-lg font-bold text-foreground">
          {formatDate(appointment.date)} • {formatTime(appointment.time)}
        </span>
      </div>

      {/* Line 2: Doctor and Status */}
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <Stethoscope className="h-4 w-4 text-muted-foreground flex-shrink-0" />
          <span className="text-sm text-muted-foreground">
            {appointment.doctorName}
          </span>
        </div>
        <StatusBadge status={appointment.status as AppointmentStatus} />
      </div>
    </div>
  );
}
