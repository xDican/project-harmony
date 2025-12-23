import MainLayout from '@/components/MainLayout';
import { Card } from '@/components/ui/card';
import { useCurrentUser } from '@/context/UserContext';
import { getDoctorById } from '@/lib/api';
import { useQuery } from '@tanstack/react-query';
import { User, Mail, Phone, Stethoscope, Loader2 } from 'lucide-react';

/**
 * PerfilMedico - Profile page for doctors showing their complete information
 */
export default function PerfilMedico() {
  const { user } = useCurrentUser();

  const { data: doctor, isLoading } = useQuery({
    queryKey: ['doctor', user?.doctorId],
    queryFn: () => getDoctorById(user!.doctorId!),
    enabled: !!user?.doctorId,
  });

  if (isLoading) {
    return (
      <MainLayout>
        <div className="flex items-center justify-center min-h-[200px]">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </div>
      </MainLayout>
    );
  }

  return (
    <MainLayout>
      <div className="p-4 md:p-6 lg:p-8 max-w-lg">
        <h1 className="text-xl font-semibold mb-4">Mi Perfil</h1>

        <Card className="divide-y divide-border">
          {/* Name */}
          <div className="flex items-start gap-3 p-4">
            <User className="h-5 w-5 text-primary shrink-0 mt-0.5" />
            <div className="flex-1 min-w-0">
              <p className="text-sm text-muted-foreground">Nombre</p>
              <p className="font-medium">
                {doctor?.prefix ? `${doctor.prefix} ` : ''}
                {doctor?.name || 'Sin nombre'}
              </p>
            </div>
          </div>

          {/* Email */}
          <div className="flex items-start gap-3 p-4">
            <Mail className="h-5 w-5 text-primary shrink-0 mt-0.5" />
            <div className="flex-1 min-w-0">
              <p className="text-sm text-muted-foreground">Email</p>
              <p className="font-medium truncate">{doctor?.email || user?.email || 'Sin email'}</p>
            </div>
          </div>

          {/* Phone */}
          <div className="flex items-start gap-3 p-4">
            <Phone className="h-5 w-5 text-primary shrink-0 mt-0.5" />
            <div className="flex-1 min-w-0">
              <p className="text-sm text-muted-foreground">Teléfono</p>
              <p className="font-medium">{doctor?.phone || 'Sin teléfono'}</p>
            </div>
          </div>

          {/* Specialty */}
          <div className="flex items-start gap-3 p-4">
            <Stethoscope className="h-5 w-5 text-primary shrink-0 mt-0.5" />
            <div className="flex-1 min-w-0">
              <p className="text-sm text-muted-foreground">Especialidad</p>
              <p className="font-medium">{doctor?.specialtyName || 'Sin especialidad'}</p>
            </div>
          </div>
        </Card>
      </div>
    </MainLayout>
  );
}
