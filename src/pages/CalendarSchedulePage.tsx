import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Trash2, Plus } from 'lucide-react';
import MainLayout from '@/components/MainLayout';
import { getCalendarSchedules, updateCalendarSchedules, getCalendarsByOrganization } from '@/lib/api.supabase';
import { toast } from '@/hooks/use-toast';

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

export default function CalendarSchedulePage() {
  const { calendarId } = useParams<{ calendarId: string }>();
  const navigate = useNavigate();
  const [isSaving, setIsSaving] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [calendarName, setCalendarName] = useState('');

  const [schedule, setSchedule] = useState<WeekSchedule>({
    monday: [],
    tuesday: [],
    wednesday: [],
    thursday: [],
    friday: [],
    saturday: [],
    sunday: [],
  });

  useEffect(() => {
    async function loadData() {
      if (!calendarId) {
        toast({
          title: 'Error',
          description: 'No se pudo identificar el calendario.',
          variant: 'destructive',
        });
        navigate('/admin/calendars');
        return;
      }

      try {
        setIsLoading(true);
        const [calendars, schedules] = await Promise.all([
          getCalendarsByOrganization(),
          getCalendarSchedules(calendarId),
        ]);
        const cal = calendars.find((c) => c.id === calendarId);
        setCalendarName(cal?.name || 'Calendario');
        setSchedule(schedules as WeekSchedule);
      } catch (error) {
        console.error('Error loading calendar data:', error);
        toast({
          title: 'Error',
          description: 'No se pudieron cargar los datos del calendario.',
          variant: 'destructive',
        });
      } finally {
        setIsLoading(false);
      }
    }

    loadData();
  }, [calendarId, navigate]);

  const handleAddSlot = (day: DayKey) => {
    const newSlot: Slot = {
      id: crypto.randomUUID(),
      start_time: '08:00',
      end_time: '12:00',
    };
    setSchedule((prev) => ({ ...prev, [day]: [...prev[day], newSlot] }));
  };

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

  const handleRemoveSlot = (day: DayKey, slotId: string) => {
    setSchedule((prev) => ({
      ...prev,
      [day]: prev[day].filter((slot) => slot.id !== slotId),
    }));
  };

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

  const handleSave = async () => {
    if (!calendarId) return;
    if (!validateSchedules()) return;

    setIsSaving(true);
    try {
      await updateCalendarSchedules(calendarId, schedule);
      toast({
        title: 'Horarios guardados',
        description: 'Los horarios del calendario se han actualizado correctamente.',
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

  if (isLoading) {
    return (
      <MainLayout backTo="/admin/calendars">
        <div className="max-w-4xl mx-auto py-6 px-4">
          <div className="flex items-center justify-center min-h-[400px]">
            <p className="text-muted-foreground">Cargando...</p>
          </div>
        </div>
      </MainLayout>
    );
  }

  return (
    <MainLayout backTo="/admin/calendars">
      <div className="max-w-4xl mx-auto py-6 px-4">
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-foreground">Horarios — {calendarName}</h1>
          <p className="text-muted-foreground text-sm mt-1">
            Configura los bloques de disponibilidad del calendario.
          </p>
        </div>

        <div className="space-y-4 mb-6">
          {DAYS.map(({ key, label }) => (
            <div key={key} className="border border-border rounded-lg p-4 bg-card">
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

        <div className="flex justify-end gap-3 border-t border-border pt-4">
          <Button variant="outline" onClick={() => navigate(-1)} disabled={isSaving}>
            Cancelar
          </Button>
          <Button onClick={handleSave} disabled={isSaving}>
            {isSaving ? 'Guardando...' : 'Guardar cambios'}
          </Button>
        </div>
      </div>
    </MainLayout>
  );
}
