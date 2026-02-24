import { useNavigate } from 'react-router-dom';
import MainLayout from '@/components/MainLayout';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useCurrentUser } from '@/context/UserContext';
import { getDoctorById } from '@/lib/api';
import { useQuery } from '@tanstack/react-query';
import { User, Mail, Phone, Stethoscope, Loader2, Pencil } from 'lucide-react';
import { formatPhoneForDisplay } from '@/lib/utils';

/**
 * PerfilMedico - Profile page for doctors showing their complete information
 */
export default function PerfilMedico() {
  const navigate = useNavigate();
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
    <MainLayout backTo="/configuracion">
      <div className="p-4 md:p-6 lg:p-8 max-w-lg">
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
              <p className="font-medium">
                {doctor?.phone ? (() => {
                  const cleaned = doctor.phone.replace(/\D/g, '');
                  return `+504 ${cleaned.slice(0, 4)}-${cleaned.slice(4, 8)}`;
                })() : 'Sin teléfono'}
              </p>
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

          <div className="mt-4">
            <Button
              onClick={() => navigate('/configuracion/perfil/editar')}
              className="w-full"
              variant="outline"
            >
              <Pencil className="mr-2 h-4 w-4" />
              Editar perfil
            </Button>
          </div>
      </div>
    </MainLayout>
  );
}
