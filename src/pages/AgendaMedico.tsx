import { useState, useEffect } from 'react';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import MainLayout from '@/components/MainLayout';
import AppointmentRow from '@/components/AppointmentRow';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Calendar, AlertCircle, Stethoscope } from 'lucide-react';
import { doctors } from '@/lib/data';
import { getTodayAppointmentsByDoctor } from '@/lib/api';
import type { AppointmentWithDetails } from '@/lib/api';

/**
 * AgendaMedico - Doctor's daily agenda view
 * Shows appointments for a selected doctor for the current day
 */
export default function AgendaMedico() {
  const [selectedDoctorId, setSelectedDoctorId] = useState<string>('');
  const [appointments, setAppointments] = useState<AppointmentWithDetails[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  // Get today's date in ISO format
  const today = new Date().toISOString().split('T')[0];
  const formattedDate = format(new Date(today + 'T00:00:00'), "EEEE, d 'de' MMMM 'de' yyyy", {
    locale: es,
  });

  // Fetch appointments when doctor is selected
  useEffect(() => {
    if (!selectedDoctorId) {
      setAppointments([]);
      return;
    }

    setIsLoading(true);
    setError(null);

    getTodayAppointmentsByDoctor(selectedDoctorId, today)
      .then(data => {
        setAppointments(data);
      })
      .catch(err => {
        console.error('Error loading appointments:', err);
        setError(err);
      })
      .finally(() => {
        setIsLoading(false);
      });
  }, [selectedDoctorId, today]);

  // Get selected doctor name
  const selectedDoctor = doctors.find(d => d.id === selectedDoctorId);

  return (
    <MainLayout>
      <div className="container mx-auto p-6 max-w-4xl">
        {/* Page Header */}
        <div className="mb-8">
          <h1 className="text-4xl font-bold text-foreground mb-2">Agenda del Médico</h1>
          <div className="flex items-center gap-2 text-muted-foreground">
            <Calendar className="h-4 w-4" />
            <p className="capitalize">{formattedDate}</p>
          </div>
        </div>

        {/* Doctor Selection */}
        <div className="mb-8">
          <Label className="text-base font-semibold text-foreground mb-3 block">
            Médico
          </Label>
          <Select value={selectedDoctorId} onValueChange={setSelectedDoctorId}>
            <SelectTrigger className="w-full max-w-md">
              <SelectValue placeholder="Selecciona un médico" />
            </SelectTrigger>
            <SelectContent>
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

        {/* No Doctor Selected State */}
        {!selectedDoctorId && (
          <Alert>
            <Stethoscope className="h-4 w-4" />
            <AlertTitle>Selecciona un médico</AlertTitle>
            <AlertDescription>
              Selecciona un médico del menú desplegable para ver su agenda de hoy.
            </AlertDescription>
          </Alert>
        )}

        {/* Loading State */}
        {isLoading && selectedDoctorId && (
          <div className="space-y-4">
            <Skeleton className="h-24 w-full" />
            <Skeleton className="h-24 w-full" />
            <Skeleton className="h-24 w-full" />
          </div>
        )}

        {/* Error State */}
        {error && !isLoading && selectedDoctorId && (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertTitle>Error</AlertTitle>
            <AlertDescription>
              No se pudieron cargar las citas. Por favor, intenta nuevamente.
            </AlertDescription>
          </Alert>
        )}

        {/* Empty State */}
        {!isLoading && !error && selectedDoctorId && appointments.length === 0 && (
          <Alert>
            <Calendar className="h-4 w-4" />
            <AlertTitle>Sin citas programadas</AlertTitle>
            <AlertDescription>
              {selectedDoctor?.name} no tiene citas programadas para hoy.
            </AlertDescription>
          </Alert>
        )}

        {/* Appointments List */}
        {!isLoading && !error && selectedDoctorId && appointments.length > 0 && (
          <div className="space-y-3">
            <div className="flex items-center justify-between mb-4">
              <p className="text-sm text-muted-foreground">
                {appointments.length} {appointments.length === 1 ? 'cita' : 'citas'} programadas
              </p>
              {selectedDoctor && (
                <p className="text-sm font-medium text-foreground">
                  {selectedDoctor.name}
                </p>
              )}
            </div>
            {appointments.map((appointment) => (
              <AppointmentRow key={appointment.id} appointment={appointment} />
            ))}
          </div>
        )}
      </div>
    </MainLayout>
  );
}
