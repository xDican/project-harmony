import { useState } from 'react';
import { useParams } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ArrowLeft, Trash2, Plus } from 'lucide-react';
import MainLayout from '@/components/MainLayout';

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
  const { doctorId } = useParams();

  // Mock data del doctor
  const doctorName = 'Dr. Juan Pérez';
  const doctorSpecialty = 'Cardiología';

  // Estado inicial (mock)
  const [schedule, setSchedule] = useState<WeekSchedule>({
    monday: [{ id: '1', start_time: '08:00', end_time: '12:00' }],
    tuesday: [],
    wednesday: [],
    thursday: [],
    friday: [],
    saturday: [],
    sunday: [],
  });

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

  // Guardar cambios (mock)
  const handleSave = () => {
    alert('Horarios guardados (mock)');
    console.log('Horarios a guardar:', schedule);
  };

  return (
    <MainLayout>
      <div className="max-w-4xl mx-auto py-6 px-4">
        {/* Encabezado */}
        <div className="mb-6">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => window.history.back()}
            className="mb-3"
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Volver
          </Button>

          <h1 className="text-2xl font-semibold mb-1">Horarios del doctor</h1>
          <p className="text-sm text-muted-foreground">
            {doctorName} · {doctorSpecialty}
          </p>
        </div>

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
          <Button variant="outline" onClick={() => window.history.back()}>
            Cancelar
          </Button>
          <Button onClick={handleSave}>Guardar cambios</Button>
        </div>
      </div>
    </MainLayout>
  );
}
