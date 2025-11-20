import { useState, useEffect } from 'react';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { CalendarIcon, CheckCircle } from 'lucide-react';
import MainLayout from '@/components/MainLayout';
import PatientSearch from '@/components/PatientSearch';
import DoctorSearch from '@/components/DoctorSearch';
import SlotSelector from '@/components/SlotSelector';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { Card, CardContent } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { toast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';
import { getAvailableSlots, createPatient } from '@/lib/api';
import type { Patient } from '@/types/patient';
import type { Doctor } from '@/types/doctor';

/**
 * NuevaCita - New appointment creation page
 * Multi-step form for scheduling medical appointments
 */
export default function NuevaCita() {
  const [selectedPatient, setSelectedPatient] = useState<Patient | null>(null);
  const [selectedDoctor, setSelectedDoctor] = useState<Doctor | null>(null);
  const [selectedDate, setSelectedDate] = useState<Date>();
  const [selectedSlot, setSelectedSlot] = useState<string | null>(null);
  const [availableSlots, setAvailableSlots] = useState<string[]>([]);
  const [isLoadingSlots, setIsLoadingSlots] = useState(false);

  // Create patient dialog state
  const [isCreatePatientOpen, setIsCreatePatientOpen] = useState(false);
  const [newPatientName, setNewPatientName] = useState('');
  const [newPatientPhone, setNewPatientPhone] = useState('');
  const [isCreatingPatient, setIsCreatingPatient] = useState(false);

  // Fetch available slots when doctor and date are selected
  useEffect(() => {
    if (selectedDoctor && selectedDate) {
      setIsLoadingSlots(true);
      setSelectedSlot(null); // Reset selected slot when date/doctor changes
      
      const dateString = format(selectedDate, 'yyyy-MM-dd');
      getAvailableSlots(selectedDoctor.id, dateString)
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
  }, [selectedDoctor, selectedDate]);

  // Reset date and slots when doctor changes
  useEffect(() => {
    setSelectedDate(undefined);
    setSelectedSlot(null);
    setAvailableSlots([]);
  }, [selectedDoctor]);

  const handlePatientSelect = (patient: Patient) => {
    setSelectedPatient(patient);
  };

  const handleDoctorSelect = (doctor: Doctor) => {
    setSelectedDoctor(doctor);
  };

  const handleCreateNewPatient = ({ nameOrPhone }: { nameOrPhone: string }) => {
    // Try to detect if it's a phone number (mostly digits) or a name
    const isPhone = /^\d+[-\s]?\d*$/.test(nameOrPhone);
    
    if (isPhone) {
      setNewPatientName('');
      setNewPatientPhone(nameOrPhone);
    } else {
      setNewPatientName(nameOrPhone);
      setNewPatientPhone('');
    }
    
    setIsCreatePatientOpen(true);
  };

  const handleSaveNewPatient = async () => {
    // Basic validation
    if (!newPatientName.trim() || !newPatientPhone.trim()) {
      toast({
        variant: "destructive",
        title: "Campos incompletos",
        description: "Por favor, completa el nombre y teléfono del paciente.",
      });
      return;
    }

    setIsCreatingPatient(true);
    
    try {
      const patient = await createPatient({
        name: newPatientName.trim(),
        phone: newPatientPhone.trim(),
      });

      // Set the new patient as selected
      setSelectedPatient(patient);
      
      // Close dialog and reset form
      setIsCreatePatientOpen(false);
      setNewPatientName('');
      setNewPatientPhone('');
      
      toast({
        title: "Paciente creado",
        description: `${patient.name} ha sido agregado exitosamente.`,
      });
    } catch (error) {
      console.error('Error creating patient:', error);
      toast({
        variant: "destructive",
        title: "Error",
        description: "No se pudo crear el paciente. Intenta nuevamente.",
      });
    } finally {
      setIsCreatingPatient(false);
    }
  };

  const handleCancelCreatePatient = () => {
    setIsCreatePatientOpen(false);
    setNewPatientName('');
    setNewPatientPhone('');
  };

  const handleCreateAppointment = () => {
    // Validate all fields are filled
    if (!selectedPatient || !selectedDoctor || !selectedDate || !selectedSlot) {
      toast({
        variant: "destructive",
        title: "Campos incompletos",
        description: "Por favor, completa todos los campos antes de crear la cita.",
      });
      return;
    }

    const dateString = format(selectedDate, "EEEE, d 'de' MMMM 'de' yyyy", { locale: es });

    // Show success message
    toast({
      title: "¡Cita creada exitosamente!",
      description: (
        <div className="mt-2 space-y-1">
          <p><strong>Paciente:</strong> {selectedPatient.name}</p>
          <p><strong>Doctor:</strong> {selectedDoctor.name}</p>
          <p><strong>Fecha:</strong> {dateString}</p>
          <p><strong>Hora:</strong> {selectedSlot}</p>
        </div>
      ),
    });

    // Reset form
    setSelectedPatient(null);
    setSelectedDoctor(null);
    setSelectedDate(undefined);
    setSelectedSlot(null);
    setAvailableSlots([]);
  };

  const isFormValid = selectedPatient && selectedDoctor && selectedDate && selectedSlot;

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
            <PatientSearch 
              onSelect={handlePatientSelect}
              onCreateNew={handleCreateNewPatient}
            />
          </section>

          {/* Step 2: Doctor Selection */}
          <section>
            <Label className="text-lg font-semibold text-foreground mb-3 block">
              2. Seleccionar Médico
            </Label>
            <DoctorSearch onSelect={handleDoctorSelect} />
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
            
            {!selectedDoctor || !selectedDate ? (
              <Alert>
                <AlertDescription>
                  Selecciona un médico y una fecha para ver los horarios disponibles.
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

      {/* Create Patient Dialog */}
      <Dialog open={isCreatePatientOpen} onOpenChange={setIsCreatePatientOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Crear nuevo paciente</DialogTitle>
            <DialogDescription>
              Ingresa los datos del paciente para agregarlo al sistema.
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="patient-name">Nombre completo</Label>
              <Input
                id="patient-name"
                value={newPatientName}
                onChange={(e) => setNewPatientName(e.target.value)}
                placeholder="Ej: María García López"
                autoFocus
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="patient-phone">Teléfono</Label>
              <Input
                id="patient-phone"
                value={newPatientPhone}
                onChange={(e) => setNewPatientPhone(e.target.value)}
                placeholder="Ej: 555-0101"
              />
            </div>
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={handleCancelCreatePatient}
              disabled={isCreatingPatient}
            >
              Cancelar
            </Button>
            <Button
              onClick={handleSaveNewPatient}
              disabled={isCreatingPatient}
            >
              {isCreatingPatient ? 'Guardando...' : 'Guardar'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </MainLayout>
  );
}
