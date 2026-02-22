import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Trash2, Plus } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { toast } from '@/hooks/use-toast';
import OnboardingLayout from './OnboardingLayout';
import { getOnboardingStatus, setupSchedule } from '@/lib/api.supabase';
import { useCurrentUser } from '@/context/UserContext';

type Slot = { id: string; start_time: string; end_time: string };
type DayKey = 'monday' | 'tuesday' | 'wednesday' | 'thursday' | 'friday' | 'saturday' | 'sunday';

type WeekSchedule = Record<DayKey, Slot[]>;

const DAYS: { key: DayKey; label: string; dayOfWeek: number }[] = [
  { key: 'monday',    label: 'Lunes',     dayOfWeek: 1 },
  { key: 'tuesday',   label: 'Martes',    dayOfWeek: 2 },
  { key: 'wednesday', label: 'Miércoles', dayOfWeek: 3 },
  { key: 'thursday',  label: 'Jueves',    dayOfWeek: 4 },
  { key: 'friday',    label: 'Viernes',   dayOfWeek: 5 },
  { key: 'saturday',  label: 'Sábado',    dayOfWeek: 6 },
  { key: 'sunday',    label: 'Domingo',   dayOfWeek: 0 },
];

const emptySchedule = (): WeekSchedule => ({
  monday: [],
  tuesday: [],
  wednesday: [],
  thursday: [],
  friday: [],
  saturday: [],
  sunday: [],
});

export default function StepSchedule() {
  const navigate = useNavigate();
  const { loading: userLoading } = useCurrentUser();
  const [schedule, setSchedule] = useState<WeekSchedule>(emptySchedule());
  const [loading, setLoading] = useState(false);
  const [checking, setChecking] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Verify we're at the right step — wait for auth to settle first
  useEffect(() => {
    if (userLoading) return;

    getOnboardingStatus()
      .then(({ step }) => {
        if (step === 'clinic') navigate('/onboarding/clinic', { replace: true });
        else if (step === 'doctor') navigate('/onboarding/doctor', { replace: true });
        else if (step === 'summary') navigate('/onboarding/summary', { replace: true });
        else if (step === 'complete') navigate('/agenda-semanal', { replace: true });
      })
      .catch(() => {})
      .finally(() => setChecking(false));
  }, [navigate, userLoading]);

  const handleAddSlot = (day: DayKey) => {
    setSchedule((prev) => ({
      ...prev,
      [day]: [...prev[day], { id: crypto.randomUUID(), start_time: '08:00', end_time: '17:00' }],
    }));
  };

  const handleChangeSlot = (day: DayKey, slotId: string, field: 'start_time' | 'end_time', value: string) => {
    setSchedule((prev) => ({
      ...prev,
      [day]: prev[day].map((s) => (s.id === slotId ? { ...s, [field]: value } : s)),
    }));
  };

  const handleRemoveSlot = (day: DayKey, slotId: string) => {
    setSchedule((prev) => ({
      ...prev,
      [day]: prev[day].filter((s) => s.id !== slotId),
    }));
  };

  const validate = (): boolean => {
    const totalSlots = DAYS.reduce((acc, { key }) => acc + schedule[key].length, 0);
    if (totalSlots === 0) {
      setError('Agrega al menos un horario para continuar.');
      return false;
    }
    for (const { key, label } of DAYS) {
      for (const slot of schedule[key]) {
        if (slot.start_time >= slot.end_time) {
          setError(`En ${label}, la hora de inicio debe ser menor que la hora de fin.`);
          return false;
        }
      }
    }
    return true;
  };

  const handleSubmit = async () => {
    setError(null);
    if (!validate()) return;

    // Flatten to array of { day_of_week, start_time, end_time }
    const schedules: { day_of_week: number; start_time: string; end_time: string }[] = [];
    for (const { key, dayOfWeek } of DAYS) {
      for (const slot of schedule[key]) {
        schedules.push({ day_of_week: dayOfWeek, start_time: slot.start_time, end_time: slot.end_time });
      }
    }

    setLoading(true);
    try {
      await setupSchedule(schedules);
      navigate('/onboarding/summary');
    } catch (err: any) {
      setError(err.message || 'Error al guardar los horarios. Intenta de nuevo.');
      toast({
        title: 'Error',
        description: err.message || 'No se pudieron guardar los horarios.',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  if (checking) {
    return (
      <OnboardingLayout currentStep={3}>
        <div className="flex items-center justify-center min-h-[200px]">
          <p className="text-muted-foreground">Cargando...</p>
        </div>
      </OnboardingLayout>
    );
  }

  return (
    <OnboardingLayout currentStep={3}>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Horario de atención</h1>
          <p className="text-muted-foreground mt-1">
            Configura los días y horas en que atiendes pacientes. Puedes agregar múltiples bloques por día.
          </p>
        </div>

        <div className="space-y-3">
          {DAYS.map(({ key, label }) => (
            <div key={key} className="border border-border rounded-lg p-4 bg-card">
              <div className="flex items-center justify-between mb-3">
                <h3 className="font-medium text-foreground">{label}</h3>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => handleAddSlot(key)}
                  disabled={schedule[key].length >= 4}
                >
                  <Plus className="h-4 w-4 mr-1" />
                  Agregar
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
                        onChange={(e) => handleChangeSlot(key, slot.id, 'start_time', e.target.value)}
                        className="w-32"
                      />
                      <span className="text-muted-foreground">—</span>
                      <Input
                        type="time"
                        value={slot.end_time}
                        onChange={(e) => handleChangeSlot(key, slot.id, 'end_time', e.target.value)}
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

        {error && (
          <Alert variant="destructive">
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        <Button className="w-full" onClick={handleSubmit} disabled={loading}>
          {loading ? 'Guardando...' : 'Continuar'}
        </Button>
      </div>
    </OnboardingLayout>
  );
}
