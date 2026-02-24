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
import { getCalendarsByOrganization } from '@/lib/api.supabase';
import type { Specialty } from '@/types/doctor';
import type { UserWithRelations } from '@/lib/api';
import type { CalendarEntry } from '@/types/organization';
import { supabase } from '@/lib/supabaseClient';
import { Loader2, ArrowLeft, Calendar } from 'lucide-react';
import { formatPhoneForDisplay, formatPhoneInput, formatPhoneForStorage } from '@/lib/utils';

export default function EditUserPage() {
  const { userId: paramUserId } = useParams<{ userId: string }>();
  const navigate = useNavigate();
  const { isAdmin, isDoctor, user: currentUser } = useCurrentUser();
  const userId = paramUserId || currentUser?.id;
  const isOwnProfile = (isDoctor || isAdmin) && currentUser?.id === userId && !paramUserId;
  const backPath = isOwnProfile ? '/configuracion/perfil' : '/admin/users';
  const backLabel = isOwnProfile ? 'Volver a mi perfil' : 'Volver a usuarios';
  
  const [user, setUser] = useState<UserWithRelations | null>(null);
  const [fullName, setFullName] = useState('');
  const [phone, setPhone] = useState('');
  const [specialtyId, setSpecialtyId] = useState('');
  const [specialties, setSpecialties] = useState<Specialty[]>([]);
  const [calendarId, setCalendarId] = useState('');
  const [currentCalendarId, setCurrentCalendarId] = useState('');
  const [calendars, setCalendars] = useState<CalendarEntry[]>([]);
  const [loadingCalendars, setLoadingCalendars] = useState(false);

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
        const [userData, specialtiesData, calendarsData] = await Promise.all([
          getUserById(userId),
          getSpecialties(),
          getCalendarsByOrganization(),
        ]);

        if (!userData) {
          setError('Usuario no encontrado');
          setLoading(false);
          return;
        }

        setUser(userData);
        setSpecialties(specialtiesData);
        setCalendars(calendarsData);

        // Pre-fill form based on role
        if (userData.role === 'doctor' && userData.doctor) {
          setFullName(userData.doctor.name || '');
          setPhone(formatPhoneForDisplay(userData.doctor.phone) || '');
          setSpecialtyId(userData.doctor.specialtyId || '');
          // Load current calendar assignment
          const { data: cdRow } = await supabase
            .from('calendar_doctors')
            .select('calendar_id')
            .eq('doctor_id', userData.doctor.id)
            .eq('is_active', true)
            .maybeSingle();
          if (cdRow?.calendar_id) {
            setCalendarId(cdRow.calendar_id);
            setCurrentCalendarId(cdRow.calendar_id);
          }
        } else if (userData.role === 'secretary' && userData.secretary) {
          setFullName(userData.secretary.name || '');
          setPhone(formatPhoneForDisplay(userData.secretary.phone) || '');
        } else if (userData.role === 'admin' && userData.doctor) {
          // Admin/owner who also has a doctor profile (went through onboarding)
          setFullName(userData.doctor.name || '');
          setPhone(formatPhoneForDisplay(userData.doctor.phone) || '');
          setSpecialtyId(userData.doctor.specialtyId || '');
          // Load current calendar assignment
          const { data: cdRow } = await supabase
            .from('calendar_doctors')
            .select('calendar_id')
            .eq('doctor_id', userData.doctor.id)
            .eq('is_active', true)
            .maybeSingle();
          if (cdRow?.calendar_id) {
            setCalendarId(cdRow.calendar_id);
            setCurrentCalendarId(cdRow.calendar_id);
          }
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

    const isDoctorProfile = user.role === 'doctor' || (user.role === 'admin' && !!user.doctor);

    // Validation based on role
    if (isDoctorProfile) {
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
    } else if (user.role === 'secretary') {
      if (!fullName.trim()) {
        setError('El nombre completo es obligatorio');
        return;
      }
      if (!phone.trim()) {
        setError('El teléfono es obligatorio');
        return;
      }
    }

    setSaving(true);

    try {
      const result = await updateUser(userId!, {
        name: fullName,
        phone: formatPhoneForStorage(phone),
        specialtyId: specialtyId,
      });

      if (result.success) {
        // Update calendar assignment if changed
        const doctorId = user.doctor?.id;
        if (isDoctorProfile && doctorId && calendarId !== currentCalendarId) {
          // Deactivate previous assignment
          await supabase
            .from('calendar_doctors')
            .update({ is_active: false })
            .eq('doctor_id', doctorId)
            .eq('is_active', true);

          // Insert new assignment if a calendar is selected
          if (calendarId) {
            await supabase
              .from('calendar_doctors')
              .insert({ calendar_id: calendarId, doctor_id: doctorId, is_active: true });
          }
          setCurrentCalendarId(calendarId);
        }

        setSuccess(isOwnProfile ? 'Perfil actualizado exitosamente' : 'Usuario actualizado exitosamente');
        setTimeout(() => {
          navigate(backPath);
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

  if (!isAdmin && !isOwnProfile) {
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
            onClick={() => navigate(backPath)}
            className="mt-4"
          >
            <ArrowLeft className="mr-2 h-4 w-4" />
            {backLabel}
          </Button>
        </div>
      </MainLayout>
    );
  }

  const isDoctorProfile = user.role === 'doctor' || (user.role === 'admin' && !!user.doctor);

  return (
    <MainLayout>
      <div className="p-6 max-w-2xl mx-auto">
        <Button
          variant="ghost"
          onClick={() => navigate(backPath)}
          className="mb-4"
        >
          <ArrowLeft className="mr-2 h-4 w-4" />
          {backLabel}
        </Button>

        <Card>
          <CardHeader>
            <CardTitle>{isOwnProfile ? 'Editar mi perfil' : 'Editar usuario'}</CardTitle>
            <CardDescription>
              {isOwnProfile ? 'Actualiza tu información personal' : 'Actualiza la información del usuario del sistema'}
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

              {/* Datos del perfil Section — shown for doctor, secretary, and admin with doctor profile */}
              {(user.role !== 'admin' || !!user.doctor) && (
              <div className="space-y-4">
                <h3 className="text-sm font-medium">Datos del perfil</h3>
                <Separator />

                <div className="space-y-2">
                  <Label htmlFor="fullName">Nombre completo {isDoctorProfile && '*'}</Label>
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
                  <Label htmlFor="phone">Teléfono {isDoctorProfile && '*'}</Label>
                  <Input
                    id="phone"
                    type="tel"
                    value={phone}
                    onChange={(e) => setPhone(formatPhoneInput(e.target.value))}
                    placeholder="1234-5678"
                    maxLength={9}
                    disabled={saving}
                  />
                </div>

                {isDoctorProfile && (
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

                    <div className="space-y-2">
                      <Label htmlFor="calendar">Calendario</Label>
                      <Select
                        value={calendarId}
                        onValueChange={setCalendarId}
                        disabled={saving || loadingCalendars}
                      >
                        <SelectTrigger id="calendar">
                          <SelectValue placeholder={loadingCalendars ? 'Cargando...' : 'Selecciona un calendario'} />
                        </SelectTrigger>
                        <SelectContent>
                          {calendars.map((cal) => (
                            <SelectItem key={cal.id} value={cal.id}>
                              {cal.name}{cal.clinicName ? ` — ${cal.clinicName}` : ''}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    {calendarId && (
                      <Button
                        type="button"
                        variant="secondary"
                        onClick={() => navigate(`/admin/calendars/${calendarId}/schedule`)}
                        className="w-full"
                      >
                        <Calendar className="mr-2 h-4 w-4" />
                        Configurar horarios
                      </Button>
                    )}
                  </>
                )}
              </div>
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
                  onClick={() => navigate(backPath)}
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
