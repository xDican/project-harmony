import MainLayout from '@/components/MainLayout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useCurrentUser } from '@/context/UserContext';
import { useNavigate } from 'react-router-dom';
import { Calendar, User, MessageSquare } from 'lucide-react';

/**
 * ConfiguracionMedico - Settings page for independent doctors
 */
export default function ConfiguracionMedico() {
  const navigate = useNavigate();
  const { user } = useCurrentUser();

  return (
    <MainLayout>
      <div className="p-4 md:p-6 lg:p-8 space-y-6">
        {/* Info */}
        <p className="text-muted-foreground">Administra tu consultorio</p>

        <div className="grid gap-4 md:grid-cols-2">
          {/* Schedule Configuration */}
          {user?.doctorId && (
            <Card className="cursor-pointer hover:bg-accent/50 transition-colors" onClick={() => navigate(`/admin/doctors/${user.doctorId}/schedule`)}>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Calendar className="h-5 w-5" />
                  Horarios de Atención
                </CardTitle>
                <CardDescription>
                  Configura tus horarios de atención semanales
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Button variant="outline" className="w-full">
                  Configurar Horarios
                </Button>
              </CardContent>
            </Card>
          )}

          {/* Profile Info */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <User className="h-5 w-5" />
                Mi Perfil
              </CardTitle>
              <CardDescription>
                Información de tu cuenta
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-2">
              <div>
                <span className="text-sm text-muted-foreground">Email:</span>
                <p className="font-medium">{user?.email}</p>
              </div>
            </CardContent>
          </Card>

          {/* Usage and Notifications */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <MessageSquare className="h-5 w-5" />
                Uso y Notificaciones
              </CardTitle>
              <CardDescription>
                Revisa cuántas notificaciones se han enviado a tus pacientes
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Button 
                variant="outline" 
                className="w-full"
                onClick={() => navigate('/configuracion/uso-mensajes')}
              >
                Ver uso de mensajes →
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    </MainLayout>
  );
}
