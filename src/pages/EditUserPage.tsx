import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useCurrentUser } from '@/context/UserContext';
import MainLayout from '@/components/MainLayout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Separator } from '@/components/ui/separator';
import { getUserById, updateUser, getSpecialties } from '@/lib/api';
import type { Specialty } from '@/types/doctor';
import type { UserWithRelations } from '@/lib/api';
import { Loader2, ArrowLeft, Calendar } from 'lucide-react';

export default function EditUserPage() {
  const { userId } = useParams<{ userId: string }>();
  const navigate = useNavigate();
  const { isAdmin } = useCurrentUser();
  
  const [user, setUser] = useState<UserWithRelations | null>(null);
  const [fullName, setFullName] = useState('');
  const [phone, setPhone] = useState('');
  const [specialtyId, setSpecialtyId] = useState('');
  const [specialties, setSpecialties] = useState<Specialty[]>([]);
  
  const [loading, setLoading] = useState(true);
  const [loadingSpecialties, setLoadingSpecialties] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  // Load user data and specialties
  useEffect(() => {
    async function loadData() {
      if (!userId) {
        setError('ID de usuario no válido');
        setLoading(false);
        return;
      }

      try {
        setLoading(true);
        const [userData, specialtiesData] = await Promise.all([
          getUserById(userId),
          getSpecialties(),
        ]);

        if (!userData) {
          setError('Usuario no encontrado');
          setLoading(false);
          return;
        }

        setUser(userData);
        setSpecialties(specialtiesData);

        // Pre-fill form if user is a doctor
        if (userData.role === 'doctor' && userData.doctor) {
          setFullName(userData.doctor.name || '');
          setPhone(userData.doctor.phone || '');
          setSpecialtyId(userData.doctor.specialtyId || '');
        }
      } catch (err: any) {
        console.error('Error loading user:', err);
        setError(err.message || 'Error al cargar el usuario');
      } finally {
        setLoading(false);
      }
    }

    loadData();
  }, [userId]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    if (!user) return;

    // Validation for doctors
    if (user.role === 'doctor') {
      if (!fullName.trim()) {
        setError('El nombre completo es obligatorio');
        return;
      }
      if (!phone.trim()) {
        setError('El teléfono es obligatorio');
        return;
      }
      if (!specialtyId) {
        setError('La especialidad es obligatoria');
        return;
      }
    }

    setSaving(true);

    try {
      const result = await updateUser(userId!, {
        name: fullName,
        phone: phone,
        specialtyId: specialtyId,
      });

      if (result.success) {
        setSuccess('Usuario actualizado exitosamente');
        setTimeout(() => {
          navigate('/admin/users');
        }, 1500);
      } else {
        setError(result.error || 'Error al actualizar el usuario');
      }
    } catch (err: any) {
      setError(err.message || 'Error al actualizar el usuario');
    } finally {
      setSaving(false);
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

  if (loading) {
    return (
      <MainLayout>
        <div className="flex items-center justify-center min-h-[400px]">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      </MainLayout>
    );
  }

  if (!user) {
    return (
      <MainLayout>
        <div className="p-6">
          <Alert variant="destructive">
            <AlertDescription>{error || 'Usuario no encontrado'}</AlertDescription>
          </Alert>
          <Button
            variant="ghost"
            onClick={() => navigate('/admin/users')}
            className="mt-4"
          >
            <ArrowLeft className="mr-2 h-4 w-4" />
            Volver a usuarios
          </Button>
        </div>
      </MainLayout>
    );
  }

  return (
    <MainLayout>
      <div className="p-6 max-w-2xl mx-auto">
        <Button
          variant="ghost"
          onClick={() => navigate('/admin/users')}
          className="mb-4"
        >
          <ArrowLeft className="mr-2 h-4 w-4" />
          Volver a usuarios
        </Button>

        <Card>
          <CardHeader>
            <CardTitle>Editar usuario</CardTitle>
            <CardDescription>
              Actualiza la información del usuario del sistema
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-6">
              {/* Acceso Section */}
              <div className="space-y-4">
                <h3 className="text-sm font-medium">Acceso</h3>
                <Separator />
                
                <div className="space-y-2">
                  <Label htmlFor="email">Email</Label>
                  <Input
                    id="email"
                    type="email"
                    value={user.email}
                    disabled
                    className="bg-muted"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="role">Rol</Label>
                  <Input
                    id="role"
                    value={
                      user.role === 'admin' ? 'Administrador' :
                      user.role === 'secretary' ? 'Secretaria' :
                      user.role === 'doctor' ? 'Doctor' : user.role
                    }
                    disabled
                    className="bg-muted"
                  />
                </div>
              </div>

              {/* Datos del perfil Section */}
              <div className="space-y-4">
                <h3 className="text-sm font-medium">Datos del perfil</h3>
                <Separator />

                <div className="space-y-2">
                  <Label htmlFor="fullName">Nombre completo {user.role === 'doctor' && '*'}</Label>
                  <Input
                    id="fullName"
                    type="text"
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    placeholder="Nombre del usuario"
                    disabled={saving}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="phone">Teléfono {user.role === 'doctor' && '*'}</Label>
                  <Input
                    id="phone"
                    type="tel"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    placeholder="+1234567890"
                    disabled={saving}
                  />
                </div>

                {user.role === 'doctor' && (
                  <>
                    <div className="space-y-2">
                      <Label htmlFor="specialty">Especialidad *</Label>
                      <Select
                        value={specialtyId}
                        onValueChange={setSpecialtyId}
                        disabled={saving || loadingSpecialties}
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

                    <Button
                      type="button"
                      variant="secondary"
                      onClick={() => navigate(`/admin/doctors/${user.doctor?.id}/schedule`)}
                      className="w-full"
                    >
                      <Calendar className="mr-2 h-4 w-4" />
                      Configurar horarios
                    </Button>
                  </>
                )}
              </div>

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

              <div className="flex gap-3">
                <Button
                  type="submit"
                  disabled={saving}
                  className="flex-1"
                >
                  {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  Guardar cambios
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => navigate('/admin/users')}
                  disabled={saving}
                  className="flex-1"
                >
                  Cancelar
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      </div>
    </MainLayout>
  );
}
