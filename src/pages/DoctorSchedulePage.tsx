import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Loader2, ArrowLeft, Calendar } from 'lucide-react';
import MainLayout from '@/components/MainLayout';
import { getDoctorById } from '@/lib/api';
import { supabase } from '@/lib/supabaseClient';
import { toast } from '@/hooks/use-toast';

export default function DoctorSchedulePage() {
  const { doctorId } = useParams<{ doctorId: string }>();
  const navigate = useNavigate();
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    async function loadAndRedirect() {
      if (!doctorId) {
        setError('No se pudo identificar el doctor.');
        setIsLoading(false);
        return;
      }

      try {
        // Verify doctor exists
        const doctor = await getDoctorById(doctorId);
        if (!doctor) {
          setError('No se encontró el doctor.');
          setIsLoading(false);
          return;
        }

        // Resolve calendar for this doctor
        const { data: cdRow } = await supabase
          .from('calendar_doctors')
          .select('calendar_id')
          .eq('doctor_id', doctorId)
          .eq('is_active', true)
          .maybeSingle();

        if (cdRow?.calendar_id) {
          // Redirect to CalendarSchedulePage
          navigate(`/admin/calendars/${cdRow.calendar_id}/schedule`, { replace: true });
        } else {
          setError('Este doctor no tiene calendario asignado. Asigne un calendario primero.');
          setIsLoading(false);
        }
      } catch (err) {
        console.error('Error loading doctor data:', err);
        setError('Error al cargar los datos del doctor.');
        setIsLoading(false);
      }
    }

    loadAndRedirect();
  }, [doctorId, navigate]);

  if (isLoading) {
    return (
      <MainLayout>
        <div className="flex items-center justify-center min-h-[400px]">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      </MainLayout>
    );
  }

  return (
    <MainLayout>
      <div className="max-w-lg mx-auto py-6 px-4">
        <Button
          variant="ghost"
          onClick={() => navigate(-1)}
          className="mb-4"
        >
          <ArrowLeft className="mr-2 h-4 w-4" />
          Volver
        </Button>

        <Alert>
          <Calendar className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      </div>
    </MainLayout>
  );
}
