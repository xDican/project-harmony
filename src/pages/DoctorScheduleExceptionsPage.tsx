import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import MainLayout from '@/components/MainLayout';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { ArrowLeft, Trash2, CalendarOff, Plus, Info } from 'lucide-react';
import { getDoctorById } from '@/lib/api';
import { useDoctorScheduleExceptions } from '@/hooks/useDoctorScheduleExceptions';
import NewScheduleExceptionModal from '@/components/NewScheduleExceptionModal';
import { toast } from '@/hooks/use-toast';

function formatRange(startAt: string, endAt: string): string {
  const start = new Date(startAt);
  const end = new Date(endAt);
  const sameDay = start.toDateString() === end.toDateString();
  if (sameDay) {
    return `${format(start, "d 'de' MMMM yyyy", { locale: es })}, ${format(start, 'HH:mm')} – ${format(end, 'HH:mm')}`;
  }
  return `${format(start, "d MMM yyyy", { locale: es })} – ${format(end, "d MMM yyyy", { locale: es })}`;
}

/** Bloqueo de un solo dia calendario (misma fecha inicio/fin) vs varios dias. */
function isMultiDay(startAt: string, endAt: string): boolean {
  return new Date(startAt).toDateString() !== new Date(endAt).toDateString();
}

export default function DoctorScheduleExceptionsPage() {
  const { doctorId } = useParams<{ doctorId: string }>();
  const navigate = useNavigate();

  const [doctorName, setDoctorName] = useState('');
  const [isLoadingDoctor, setIsLoadingDoctor] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [deleteTargetId, setDeleteTargetId] = useState<string | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const { exceptions, isLoading, createException, deleteException } =
    useDoctorScheduleExceptions(doctorId);

  useEffect(() => {
    if (!doctorId) return;
    getDoctorById(doctorId)
      .then((doctor) => setDoctorName(doctor?.name ?? 'Doctor'))
      .finally(() => setIsLoadingDoctor(false));
  }, [doctorId]);

  const handleDelete = async () => {
    if (!deleteTargetId) return;
    setIsDeleting(true);
    try {
      await deleteException(deleteTargetId);
      toast({ title: 'Bloqueo eliminado' });
    } catch (e) {
      toast({
        title: 'Error al borrar',
        description: e instanceof Error ? e.message : 'No se pudo borrar el bloqueo.',
        variant: 'destructive',
      });
    } finally {
      setIsDeleting(false);
      setDeleteTargetId(null);
    }
  };

  return (
    <MainLayout backTo="/configuracion">
      <div className="max-w-6xl mx-auto py-6 px-4 pb-28 lg:pb-6">
        {/* MainLayout ya pone su propio header con flecha atrás + título en mobile
            (`backTo`, visible por debajo de md). Este bloque es el equivalente para
            desktop — duplicaba todo en mobile, ahora solo vive de md hacia arriba. */}
        <div className="hidden md:block">
          <Button variant="ghost" onClick={() => navigate(-1)} className="mb-4">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Volver
          </Button>

          <header className="flex justify-between items-center mb-8 gap-4">
            <div>
              <h1 className="text-2xl font-bold text-foreground">
                Bloqueos de horario{!isLoadingDoctor && doctorName ? ` — ${doctorName}` : ''}
              </h1>
              <p className="text-muted-foreground text-sm mt-1">
                Administra tus períodos de indisponibilidad — de horas a semanas completas.
              </p>
            </div>
            <Button onClick={() => setIsModalOpen(true)} className="hidden lg:inline-flex">
              <Plus className="mr-2 h-4 w-4" />
              Crear nuevo bloqueo
            </Button>
          </header>
        </div>

        <div className="flex flex-col gap-3 max-w-3xl">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 mb-1">
            <h2 className="font-semibold text-foreground">Bloqueos activos y futuros</h2>
            <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
              <Info className="h-3.5 w-3.5 shrink-0" />
              Los cambios se aplican de inmediato a lo que el bot y la agenda ofrecen a los pacientes.
            </div>
          </div>

          {isLoading ? (
              <p className="text-sm text-muted-foreground">Cargando...</p>
            ) : exceptions.length === 0 ? (
              <div className="flex items-center gap-2 text-sm text-muted-foreground py-10 justify-center border border-dashed border-border rounded-xl">
                <CalendarOff className="h-4 w-4" />
                Sin bloqueos
              </div>
            ) : (
              exceptions.map((exc) => {
                const multiDay = isMultiDay(exc.start_at, exc.end_at);
                return (
                  <div
                    key={exc.id}
                    className="bg-card border border-border rounded-xl p-4 flex items-center justify-between gap-4 hover:bg-accent/30 transition-colors"
                  >
                    <div className="flex items-start gap-3">
                      <div className="bg-secondary p-2.5 rounded-lg text-secondary-foreground shrink-0">
                        <CalendarOff className="h-5 w-5" />
                      </div>
                      <div>
                        <h3 className="font-semibold text-foreground">
                          {exc.reason || 'Bloqueo de horario'}
                        </h3>
                        <p className="text-sm text-muted-foreground mt-0.5">{formatRange(exc.start_at, exc.end_at)}</p>
                        <Badge variant={multiDay ? 'default' : 'secondary'} className="mt-2">
                          {multiDay ? 'Varios días' : 'Parcial'}
                        </Badge>
                      </div>
                    </div>
                    <Button variant="ghost" size="icon" onClick={() => setDeleteTargetId(exc.id)}>
                      <Trash2 className="h-4 w-4 text-destructive" />
                    </Button>
                  </div>
                );
              })
            )}
        </div>
      </div>

      {/* CTA sticky de ancho completo — solo mobile, el header ya tiene el suyo en desktop. */}
      <div className="lg:hidden fixed bottom-0 inset-x-0 p-4 bg-gradient-to-t from-background via-background to-transparent pt-8 z-40">
        <Button className="w-full" size="lg" onClick={() => setIsModalOpen(true)}>
          <Plus className="mr-2 h-4 w-4" />
          Crear nuevo bloqueo
        </Button>
      </div>

      {doctorId && (
        <NewScheduleExceptionModal
          doctorId={doctorId}
          open={isModalOpen}
          onOpenChange={setIsModalOpen}
          createException={createException}
        />
      )}

      <AlertDialog open={!!deleteTargetId} onOpenChange={(o) => !o && setDeleteTargetId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>¿Borrar este bloqueo?</AlertDialogTitle>
            <AlertDialogDescription>
              El horario volverá a estar disponible para agendar citas.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isDeleting}>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} disabled={isDeleting}>
              {isDeleting ? 'Borrando...' : 'Borrar'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </MainLayout>
  );
}
