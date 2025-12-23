import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Trash2, Plus } from 'lucide-react';
import MainLayout from '@/components/MainLayout';
import { updateDoctorSchedules, getDoctorById, getDoctorSchedules } from '@/lib/api';
import { toast } from '@/hooks/use-toast';

// Tipos
type Slot = {
  id: string;
  start_time: string;
  end_time: string;
};

type WeekSchedule = {
  monday: Slot[];
  tuesday: Slot[];
  wednesday: Slot[];
  thursday: Slot[];
  friday: Slot[];
  saturday: Slot[];
  sunday: Slot[];
};

type DayKey = keyof WeekSchedule;

const DAYS: { key: DayKey; label: string }[] = [
  { key: 'monday', label: 'Lunes' },
  { key: 'tuesday', label: 'Martes' },
  { key: 'wednesday', label: 'Miércoles' },
  { key: 'thursday', label: 'Jueves' },
  { key: 'friday', label: 'Viernes' },
  { key: 'saturday', label: 'Sábado' },
  { key: 'sunday', label: 'Domingo' },
];

export default function DoctorSchedulePage() {
  const { doctorId } = useParams<{ doctorId: string }>();
  const navigate = useNavigate();
  const [isSaving, setIsSaving] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [doctorName, setDoctorName] = useState('');
  const [doctorSpecialty, setDoctorSpecialty] = useState('');

  // Estado inicial (vacío hasta cargar)
  const [schedule, setSchedule] = useState<WeekSchedule>({
    monday: [],
    tuesday: [],
    wednesday: [],
    thursday: [],
    friday: [],
    saturday: [],
    sunday: [],
  });

  // Cargar datos del doctor y sus horarios
  useEffect(() => {
    async function loadDoctorData() {
      if (!doctorId) {
        toast({
          title: 'Error',
          description: 'No se pudo identificar el doctor.',
          variant: 'destructive',
        });
        navigate('/admin/users');
        return;
      }

      try {
        setIsLoading(true);

        // Cargar datos del doctor
        const doctor = await getDoctorById(doctorId);
        if (!doctor) {
          toast({
            title: 'Error',
            description: 'No se encontró el doctor.',
            variant: 'destructive',
          });
          navigate('/admin/users');
          return;
        }

        setDoctorName(doctor.name);
        setDoctorSpecialty(doctor.specialtyName || 'Sin especialidad');

        // Cargar horarios existentes
        const schedules = await getDoctorSchedules(doctorId);
        setSchedule(schedules as WeekSchedule);
      } catch (error) {
        console.error('Error loading doctor data:', error);
        toast({
          title: 'Error',
          description: 'No se pudieron cargar los datos del doctor.',
          variant: 'destructive',
        });
      } finally {
        setIsLoading(false);
      }
    }

    loadDoctorData();
  }, [doctorId, navigate]);

  // Añadir nuevo slot a un día
  const handleAddSlot = (day: DayKey) => {
    const newSlot: Slot = {
      id: crypto.randomUUID(),
      start_time: '08:00',
      end_time: '12:00',
    };

    setSchedule((prev) => ({
      ...prev,
      [day]: [...prev[day], newSlot],
    }));
  };

  // Cambiar horario de un slot
  const handleChangeSlot = (
    day: DayKey,
    slotId: string,
    field: 'start_time' | 'end_time',
    value: string
  ) => {
    setSchedule((prev) => ({
      ...prev,
      [day]: prev[day].map((slot) =>
        slot.id === slotId ? { ...slot, [field]: value } : slot
      ),
    }));
  };

  // Eliminar slot
  const handleRemoveSlot = (day: DayKey, slotId: string) => {
    setSchedule((prev) => ({
      ...prev,
      [day]: prev[day].filter((slot) => slot.id !== slotId),
    }));
  };

  // Validar horarios antes de guardar
  const validateSchedules = (): boolean => {
    for (const day of DAYS) {
      for (const slot of schedule[day.key]) {
        if (slot.start_time >= slot.end_time) {
          toast({
            title: 'Error de validación',
            description: `En ${day.label}, la hora de inicio debe ser menor que la hora de fin.`,
            variant: 'destructive',
          });
          return false;
        }
      }
    }
    return true;
  };

  // Guardar cambios
  const handleSave = async () => {
    if (!doctorId) {
      toast({
        title: 'Error',
        description: 'No se pudo identificar el doctor.',
        variant: 'destructive',
      });
      return;
    }

    if (!validateSchedules()) {
      return;
    }

    setIsSaving(true);
    try {
      await updateDoctorSchedules(doctorId, schedule);
      
      toast({
        title: 'Horarios guardados',
        description: 'Los horarios del doctor se han actualizado correctamente.',
      });
    } catch (error) {
      console.error('Error saving schedules:', error);
      toast({
        title: 'Error al guardar',
        description: error instanceof Error ? error.message : 'No se pudieron guardar los horarios.',
        variant: 'destructive',
      });
    } finally {
      setIsSaving(false);
    }
  };

  // Mostrar loading mientras se cargan los datos
  if (isLoading) {
    return (
      <MainLayout backTo="/configuracion">
        <div className="max-w-4xl mx-auto py-6 px-4">
          <div className="flex items-center justify-center min-h-[400px]">
            <p className="text-muted-foreground">Cargando...</p>
          </div>
        </div>
      </MainLayout>
    );
  }

  return (
    <MainLayout backTo="/configuracion">
      <div className="max-w-4xl mx-auto py-6 px-4">
        {/* Contenedor de días */}
        <div className="space-y-4 mb-6">
          {DAYS.map(({ key, label }) => (
            <div key={key} className="border border-border rounded-lg p-4 bg-card">
              {/* Cabecera del día */}
              <div className="flex items-center justify-between mb-3">
                <h3 className="font-medium text-foreground">{label}</h3>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => handleAddSlot(key)}
                disabled={schedule[key].length >= 6}
              >
                <Plus className="h-4 w-4 mr-1" />
                Añadir horario
              </Button>
              </div>

              {/* Slots del día */}
              {schedule[key].length === 0 ? (
                <p className="text-sm text-muted-foreground">Sin horarios</p>
              ) : (
                <div className="space-y-2">
                  {schedule[key].map((slot) => (
                    <div key={slot.id} className="flex items-center gap-2">
                      <Input
                        type="time"
                        value={slot.start_time}
                        onChange={(e) =>
                          handleChangeSlot(key, slot.id, 'start_time', e.target.value)
                        }
                        className="w-32"
                      />
                      <span className="text-muted-foreground">—</span>
                      <Input
                        type="time"
                        value={slot.end_time}
                        onChange={(e) =>
                          handleChangeSlot(key, slot.id, 'end_time', e.target.value)
                        }
                        className="w-32"
                      />
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleRemoveSlot(key, slot.id)}
                      >
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>

        {/* Footer con acciones */}
        <div className="flex justify-end gap-3 border-t border-border pt-4">
          <Button 
            variant="outline" 
            onClick={() => navigate(-1)}
            disabled={isSaving}
          >
            Cancelar
          </Button>
          <Button 
            onClick={handleSave}
            disabled={isSaving}
          >
            {isSaving ? 'Guardando...' : 'Guardar cambios'}
          </Button>
        </div>
      </div>
    </MainLayout>
  );
}
