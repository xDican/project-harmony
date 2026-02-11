import MainLayout from '@/components/MainLayout';
import { Card } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { useCurrentUser } from '@/context/UserContext';
import { useNavigate } from 'react-router-dom';
import { Calendar, User, MessageSquare, MessageCircle, ChevronRight } from 'lucide-react';

/**
 * ConfiguracionMedico - Settings page for independent doctors (iOS style)
 */
export default function ConfiguracionMedico() {
  const navigate = useNavigate();
  const { user } = useCurrentUser();

  return (
    <MainLayout>
      <div className="p-4 md:p-6 lg:p-8 max-w-lg md:mx-auto">
        <h1 className="hidden md:block text-2xl font-semibold mb-6">Configuración</h1>
        <Card className="divide-y divide-border">
          {/* Profile Info - First */}
          <button
            onClick={() => navigate('/configuracion/perfil')}
            className="w-full flex items-center gap-3 p-4 hover:bg-accent/50 transition-colors text-left"
          >
            <User className="h-5 w-5 text-primary shrink-0" />
            <div className="flex-1 min-w-0">
              <p className="font-medium">Mi Perfil</p>
              <p className="text-sm text-muted-foreground truncate">{user?.email}</p>
            </div>
            <ChevronRight className="h-5 w-5 text-muted-foreground shrink-0" />
          </button>

          {/* Schedule Configuration */}
          {user?.doctorId && (
            <button
              onClick={() => navigate(`/admin/doctors/${user.doctorId}/schedule`)}
              className="w-full flex items-center gap-3 p-4 hover:bg-accent/50 transition-colors text-left"
            >
              <Calendar className="h-5 w-5 text-primary shrink-0" />
              <div className="flex-1 min-w-0">
                <p className="font-medium">Horarios de Atención</p>
                <p className="text-sm text-muted-foreground">Configura tus horarios semanales</p>
              </div>
              <ChevronRight className="h-5 w-5 text-muted-foreground shrink-0" />
            </button>
          )}

          {/* Usage and Notifications */}
          <button
            onClick={() => navigate('/configuracion/uso-mensajes')}
            className="w-full flex items-center gap-3 p-4 hover:bg-accent/50 transition-colors text-left"
          >
            <MessageSquare className="h-5 w-5 text-primary shrink-0" />
            <div className="flex-1 min-w-0">
              <p className="font-medium">Uso y Notificaciones</p>
              <p className="text-sm text-muted-foreground">Mensajes enviados a pacientes</p>
            </div>
            <ChevronRight className="h-5 w-5 text-muted-foreground shrink-0" />
          </button>

          {/* WhatsApp Business */}
          <button
            onClick={() => navigate('/configuracion/whatsapp')}
            className="w-full flex items-center gap-3 p-4 hover:bg-accent/50 transition-colors text-left"
          >
            <MessageCircle className="h-5 w-5 text-primary shrink-0" />
            <div className="flex-1 min-w-0">
              <p className="font-medium">WhatsApp Business</p>
              <p className="text-sm text-muted-foreground">Conexión y plantillas de mensajes</p>
            </div>
            <ChevronRight className="h-5 w-5 text-muted-foreground shrink-0" />
          </button>
        </Card>
      </div>
    </MainLayout>
  );
}
