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
import { ArrowLeft, Calendar, Phone, Mail, Loader2 } from 'lucide-react';
import { usePatientAppointments } from '@/hooks/usePatientAppointments';
import { getAllPatients, updateAppointmentStatus } from '@/lib/api';
import { useToast } from '@/hooks/use-toast';
import StatusBadge from '@/components/StatusBadge';
import type { Patient } from '@/types/patient';
import { useEffect } from 'react';

/**
 * PatientDetail - Detailed view of a patient with appointment history
 */
export default function PatientDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [patient, setPatient] = useState<Patient | null>(null);
  const [loadingPatient, setLoadingPatient] = useState(true);
  const [cancelingId, setCancelingId] = useState<string | null>(null);
  const [appointmentToCancel, setAppointmentToCancel] = useState<string | null>(null);

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
                            <TableCell>{apt.doctorName}</TableCell>
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
                            <TableCell>{apt.doctorName}</TableCell>
                            <TableCell>
                              <StatusBadge status={apt.status} />
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
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
