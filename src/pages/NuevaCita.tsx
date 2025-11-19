import { useState, useEffect } from 'react';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { CalendarIcon, CheckCircle } from 'lucide-react';
import MainLayout from '@/components/MainLayout';
import PatientSearch from '@/components/PatientSearch';
import SlotSelector from '@/components/SlotSelector';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { Card, CardContent } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { toast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';
import { doctors } from '@/lib/data';
import { getAvailableSlots } from '@/lib/api';
import type { Patient } from '@/types/patient';

/**
 * NuevaCita - New appointment creation page
 * Multi-step form for scheduling medical appointments
 */
export default function NuevaCita() {
  const [selectedPatient, setSelectedPatient] = useState<Patient | null>(null);
  const [selectedDoctorId, setSelectedDoctorId] = useState<string>('');
  const [selectedDate, setSelectedDate] = useState<Date>();
  const [selectedSlot, setSelectedSlot] = useState<string | null>(null);
  const [availableSlots, setAvailableSlots] = useState<string[]>([]);
  const [isLoadingSlots, setIsLoadingSlots] = useState(false);

  // Fetch available slots when doctor and date are selected
  useEffect(() => {
    if (selectedDoctorId && selectedDate) {
      setIsLoadingSlots(true);
      setSelectedSlot(null); // Reset selected slot when date/doctor changes
      
      const dateString = format(selectedDate, 'yyyy-MM-dd');
      getAvailableSlots(selectedDoctorId, dateString)
        .then(slots => {
          setAvailableSlots(slots);
        })
        .catch(error => {
          console.error('Error loading slots:', error);
          setAvailableSlots([]);
        })
        .finally(() => {
          setIsLoadingSlots(false);
        });
    } else {
      setAvailableSlots([]);
      setSelectedSlot(null);
    }
  }, [selectedDoctorId, selectedDate]);

  const handlePatientSelect = (patient: Patient) => {
    setSelectedPatient(patient);
  };

  const handleCreateAppointment = () => {
    // Validate all fields are filled
    if (!selectedPatient || !selectedDoctorId || !selectedDate || !selectedSlot) {
      toast({
        variant: "destructive",
        title: "Campos incompletos",
        description: "Por favor, completa todos los campos antes de crear la cita.",
      });
      return;
    }

    // Get doctor name
    const doctor = doctors.find(d => d.id === selectedDoctorId);
    const dateString = format(selectedDate, "EEEE, d 'de' MMMM 'de' yyyy", { locale: es });

    // Show success message
    toast({
      title: "¡Cita creada exitosamente!",
      description: (
        <div className="mt-2 space-y-1">
          <p><strong>Paciente:</strong> {selectedPatient.name}</p>
          <p><strong>Doctor:</strong> {doctor?.name}</p>
          <p><strong>Fecha:</strong> {dateString}</p>
          <p><strong>Hora:</strong> {selectedSlot}</p>
        </div>
      ),
    });

    // Reset form
    setSelectedPatient(null);
    setSelectedDoctorId('');
    setSelectedDate(undefined);
    setSelectedSlot(null);
    setAvailableSlots([]);
  };

  const isFormValid = selectedPatient && selectedDoctorId && selectedDate && selectedSlot;

  return (
    <MainLayout>
      <div className="container mx-auto p-6 max-w-2xl">
        {/* Page Header */}
        <div className="mb-8">
          <h1 className="text-4xl font-bold text-foreground mb-2">Nueva Cita</h1>
          <p className="text-muted-foreground">
            Completa los siguientes campos para agendar una nueva cita médica
          </p>
        </div>

        <div className="space-y-8">
          {/* Step 1: Patient Selection */}
          <section>
            <Label className="text-lg font-semibold text-foreground mb-3 block">
              1. Seleccionar Paciente
            </Label>
            <PatientSearch onSelect={handlePatientSelect} />
            
            {selectedPatient && (
              <Card className="mt-4 bg-primary/5 border-primary/20">
                <CardContent className="pt-4">
                  <div className="flex items-center gap-2">
                    <CheckCircle className="h-5 w-5 text-primary" />
                    <div>
                      <p className="font-medium text-foreground">{selectedPatient.name}</p>
                      <p className="text-sm text-muted-foreground">{selectedPatient.phone}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}
          </section>

          {/* Step 2: Doctor Selection */}
          <section>
            <Label className="text-lg font-semibold text-foreground mb-3 block">
              2. Seleccionar Doctor
            </Label>
            <Select value={selectedDoctorId} onValueChange={setSelectedDoctorId}>
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Selecciona un doctor" />
              </SelectTrigger>
              <SelectContent>
                {doctors.map((doctor) => (
                  <SelectItem key={doctor.id} value={doctor.id}>
                    {doctor.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </section>

          {/* Step 3: Date Selection */}
          <section>
            <Label className="text-lg font-semibold text-foreground mb-3 block">
              3. Seleccionar Fecha
            </Label>
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  className={cn(
                    "w-full justify-start text-left font-normal",
                    !selectedDate && "text-muted-foreground"
                  )}
                >
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {selectedDate ? (
                    format(selectedDate, "PPP", { locale: es })
                  ) : (
                    <span>Selecciona una fecha</span>
                  )}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <Calendar
                  mode="single"
                  selected={selectedDate}
                  onSelect={setSelectedDate}
                  disabled={(date) => date < new Date(new Date().setHours(0, 0, 0, 0))}
                  initialFocus
                  className={cn("p-3 pointer-events-auto")}
                />
              </PopoverContent>
            </Popover>
          </section>

          {/* Step 4: Time Slot Selection */}
          <section>
            <Label className="text-lg font-semibold text-foreground mb-3 block">
              4. Seleccionar Horario
            </Label>
            
            {!selectedDoctorId || !selectedDate ? (
              <Alert>
                <AlertDescription>
                  Selecciona un doctor y una fecha para ver los horarios disponibles.
                </AlertDescription>
              </Alert>
            ) : isLoadingSlots ? (
              <Alert>
                <AlertDescription>Cargando horarios disponibles...</AlertDescription>
              </Alert>
            ) : (
              <SlotSelector
                slots={availableSlots}
                selectedSlot={selectedSlot}
                onSelect={setSelectedSlot}
              />
            )}
          </section>

          {/* Submit Button */}
          <div className="pt-6 border-t">
            <Button
              onClick={handleCreateAppointment}
              disabled={!isFormValid}
              size="lg"
              className="w-full"
            >
              <CheckCircle className="mr-2 h-5 w-5" />
              Crear Cita
            </Button>
            
            {!isFormValid && (
              <p className="text-sm text-muted-foreground text-center mt-3">
                Completa todos los campos para crear la cita
              </p>
            )}
          </div>
        </div>
      </div>
    </MainLayout>
  );
}
