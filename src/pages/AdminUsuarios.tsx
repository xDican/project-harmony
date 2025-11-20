import { useState, useEffect } from 'react';
import { useCurrentUser } from '@/context/UserContext';
import MainLayout from '@/components/MainLayout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { createUserWithRole, getSpecialties } from '@/lib/api';
import type { Specialty } from '@/types/doctor';
import type { UserRole } from '@/types/user';
import { Loader2 } from 'lucide-react';

export default function AdminUsuarios() {
  const { isAdmin } = useCurrentUser();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState<UserRole | ''>('');
  const [specialtyId, setSpecialtyId] = useState('');
  const [fullName, setFullName] = useState('');
  const [phone, setPhone] = useState('');
  const [specialties, setSpecialties] = useState<Specialty[]>([]);
  const [loading, setLoading] = useState(false);
  const [loadingSpecialties, setLoadingSpecialties] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  // Load specialties on mount
  useEffect(() => {
    async function loadSpecialties() {
      setLoadingSpecialties(true);
      try {
        const data = await getSpecialties();
        setSpecialties(data);
      } catch (err) {
        console.error('Error loading specialties:', err);
      } finally {
        setLoadingSpecialties(false);
      }
    }
    loadSpecialties();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    // Validation
    if (!email || !password || !role) {
      setError('Email, contraseña y rol son obligatorios');
      return;
    }

    if (role === 'doctor' && !specialtyId) {
      setError('La especialidad es obligatoria para el rol de doctor');
      return;
    }

    if (role === 'doctor' && !fullName) {
      setError('El nombre es obligatorio para el rol de doctor');
      return;
    }

    if (role === 'doctor' && !phone) {
      setError('El teléfono es obligatorio para el rol de doctor');
      return;
    }

    setLoading(true);

    try {
      await createUserWithRole({
        email,
        password,
        role,
        specialtyId: role === 'doctor' ? specialtyId : undefined,
        fullName: role === 'doctor' ? fullName : undefined,
        phone: role === 'doctor' ? phone : undefined,
      });

      setSuccess('Usuario creado exitosamente');
      
      // Clear form
      setEmail('');
      setPassword('');
      setRole('');
      setSpecialtyId('');
      setFullName('');
      setPhone('');
    } catch (err: any) {
      setError(err.message || 'Error al crear el usuario');
    } finally {
      setLoading(false);
    }
  };

  if (!isAdmin) {
    return (
      <MainLayout>
        <div className="p-6">
          <Alert variant="destructive">
            <AlertDescription>
              No tienes permisos para acceder a esta página
            </AlertDescription>
          </Alert>
        </div>
      </MainLayout>
    );
  }

  return (
    <MainLayout>
      <div className="p-6 max-w-2xl mx-auto">
        <Card>
          <CardHeader>
            <CardTitle>Gestión de Usuarios</CardTitle>
            <CardDescription>
              Crear nuevos usuarios del sistema
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="email">Email *</Label>
                <Input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="usuario@ejemplo.com"
                  disabled={loading}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="password">Contraseña *</Label>
                <Input
                  id="password"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Mínimo 6 caracteres"
                  disabled={loading}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="role">Rol *</Label>
                <Select
                  value={role}
                  onValueChange={(value) => {
                    setRole(value as UserRole);
                    if (value !== 'doctor') {
                      setSpecialtyId('');
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
                    <SelectItem value="doctor">Doctor</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {role === 'doctor' && (
                <>
                  <div className="space-y-2">
                    <Label htmlFor="fullName">Nombre completo *</Label>
                    <Input
                      id="fullName"
                      type="text"
                      value={fullName}
                      onChange={(e) => setFullName(e.target.value)}
                      placeholder="Dr. Juan Pérez"
                      disabled={loading}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="phone">Teléfono *</Label>
                    <Input
                      id="phone"
                      type="tel"
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      placeholder="+1234567890"
                      disabled={loading}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="specialty">Especialidad *</Label>
                    <Select
                      value={specialtyId}
                      onValueChange={setSpecialtyId}
                      disabled={loading || loadingSpecialties}
                    >
                      <SelectTrigger id="specialty">
                        <SelectValue placeholder={loadingSpecialties ? 'Cargando...' : 'Selecciona una especialidad'} />
                      </SelectTrigger>
                      <SelectContent>
                        {specialties.map((specialty) => (
                          <SelectItem key={specialty.id} value={specialty.id}>
                            {specialty.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </>
              )}

              {error && (
                <Alert variant="destructive">
                  <AlertDescription>{error}</AlertDescription>
                </Alert>
              )}

              {success && (
                <Alert>
                  <AlertDescription className="text-green-600">
                    {success}
                  </AlertDescription>
                </Alert>
              )}

              <Button type="submit" disabled={loading} className="w-full">
                {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Crear Usuario
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    </MainLayout>
  );
}
