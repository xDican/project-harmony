import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useCurrentUser } from '@/context/UserContext';
import { supabase } from '@/integrations/supabase/client';
import { getDoctors } from '@/lib/api';
import MainLayout from '@/components/MainLayout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import type { Doctor } from '@/types/doctor';
import type { UserRole } from '@/types/user';

export default function CreateUser() {
  const { user, loading: userLoading, isAdmin } = useCurrentUser();
  const navigate = useNavigate();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState<UserRole>('secretary');
  const [selectedDoctorId, setSelectedDoctorId] = useState<string>('');
  const [doctors, setDoctors] = useState<Doctor[]>([]);
  
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  // Load doctors for doctor role selection
  useEffect(() => {
    getDoctors().then(setDoctors).catch(console.error);
  }, []);

  // Redirect if not admin
  useEffect(() => {
    if (!userLoading && !isAdmin) {
      navigate('/');
    }
  }, [userLoading, isAdmin, navigate]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccess(null);
    setLoading(true);

    try {
      // Validate form
      if (!email || !password || !role) {
        setError('Por favor completa todos los campos');
        setLoading(false);
        return;
      }

      if (role === 'doctor' && !selectedDoctorId) {
        setError('Por favor selecciona un médico');
        setLoading(false);
        return;
      }

      // Call edge function
      const { data, error: invokeError } = await supabase.functions.invoke('create-user-with-role', {
        body: {
          email,
          password,
          role,
          doctorId: role === 'doctor' ? selectedDoctorId : null,
        },
      });

      if (invokeError) {
        setError(invokeError.message || 'Error al crear usuario');
        setLoading(false);
        return;
      }

      if (data?.error) {
        setError(data.error);
        setLoading(false);
        return;
      }

      // Success
      setSuccess('Usuario creado correctamente');
      setEmail('');
      setPassword('');
      setRole('secretary');
      setSelectedDoctorId('');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error desconocido');
    } finally {
      setLoading(false);
    }
  };

  if (userLoading) {
    return (
      <MainLayout>
        <div className="flex items-center justify-center min-h-screen">
          <p className="text-muted-foreground">Cargando...</p>
        </div>
      </MainLayout>
    );
  }

  if (!isAdmin) {
    return (
      <MainLayout>
        <div className="flex items-center justify-center min-h-screen">
          <Alert className="max-w-md">
            <AlertDescription>
              No tienes permisos para ver esta página.
            </AlertDescription>
          </Alert>
        </div>
      </MainLayout>
    );
  }

  return (
    <MainLayout>
      <div className="container max-w-2xl py-8">
        <Card>
          <CardHeader>
            <CardTitle>Crear Usuario</CardTitle>
            <CardDescription>
              Crea un nuevo usuario del sistema con rol y permisos específicos
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="usuario@ejemplo.com"
                  disabled={loading}
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="password">Contraseña</Label>
                <Input
                  id="password"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Mínimo 6 caracteres"
                  disabled={loading}
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="role">Rol</Label>
                <Select
                  value={role}
                  onValueChange={(value) => {
                    setRole(value as UserRole);
                    if (value !== 'doctor') {
                      setSelectedDoctorId('');
                    }
                  }}
                  disabled={loading}
                >
                  <SelectTrigger id="role">
                    <SelectValue placeholder="Selecciona un rol" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="admin">Administrador</SelectItem>
                    <SelectItem value="secretary">Secretaria</SelectItem>
                    <SelectItem value="doctor">Médico</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {role === 'doctor' && (
                <div className="space-y-2">
                  <Label htmlFor="doctor">Médico</Label>
                  <Select
                    value={selectedDoctorId}
                    onValueChange={setSelectedDoctorId}
                    disabled={loading}
                  >
                    <SelectTrigger id="doctor">
                      <SelectValue placeholder="Selecciona un médico" />
                    </SelectTrigger>
                    <SelectContent>
                      {doctors.map((doctor) => (
                        <SelectItem key={doctor.id} value={doctor.id}>
                          {doctor.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}

              {error && (
                <Alert variant="destructive">
                  <AlertDescription>{error}</AlertDescription>
                </Alert>
              )}

              {success && (
                <Alert className="border-green-500 text-green-700">
                  <AlertDescription>{success}</AlertDescription>
                </Alert>
              )}

              <Button type="submit" disabled={loading} className="w-full">
                {loading ? 'Creando usuario...' : 'Crear usuario'}
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    </MainLayout>
  );
}
