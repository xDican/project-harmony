import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useCurrentUser } from '@/context/UserContext';
import MainLayout from '@/components/MainLayout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { getAllUsers, type UserWithRelations } from '@/lib/api';
import { Loader2, Search, Plus, Edit, Calendar } from 'lucide-react';

const ROLE_LABELS: Record<string, string> = {
  admin: 'Admin',
  secretary: 'Secretaria',
  doctor: 'Doctor',
};

const ROLE_VARIANTS: Record<string, 'default' | 'secondary' | 'outline'> = {
  admin: 'default',
  secretary: 'secondary',
  doctor: 'outline',
};

export default function UsersList() {
  const navigate = useNavigate();
  const { isAdmin } = useCurrentUser();
  const [users, setUsers] = useState<UserWithRelations[]>([]);
  const [filteredUsers, setFilteredUsers] = useState<UserWithRelations[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [roleFilter, setRoleFilter] = useState<string>('all');

  useEffect(() => {
    loadUsers();
  }, []);

  useEffect(() => {
    filterUsers();
  }, [users, searchQuery, roleFilter]);

  const loadUsers = async () => {
    setLoading(true);
    setError('');
    try {
      const data = await getAllUsers();
      setUsers(data);
    } catch (err: any) {
      setError(err.message || 'Error al cargar usuarios');
    } finally {
      setLoading(false);
    }
  };

  const filterUsers = () => {
    let result = [...users];

    // Filter by search query (name or email)
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      result = result.filter((user) => {
        const name = user.doctor?.name?.toLowerCase() || '';
        const email = user.email.toLowerCase();
        return name.includes(query) || email.includes(query);
      });
    }

    // Filter by role
    if (roleFilter !== 'all') {
      result = result.filter((user) => user.role === roleFilter);
    }

    setFilteredUsers(result);
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
      <div className="p-6 max-w-7xl mx-auto">
        <Card>
          <CardHeader>
            <CardTitle>Usuarios</CardTitle>
            <CardDescription>
              Gestiona doctores, secretarias y administradores del sistema.
            </CardDescription>
          </CardHeader>
          <CardContent>
            {/* Controls bar */}
            <div className="flex flex-col sm:flex-row gap-4 mb-6">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Buscar por nombre o correo"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10"
                />
              </div>
              
              <div className="flex gap-2">
                <Button
                  variant={roleFilter === 'all' ? 'default' : 'outline'}
                  onClick={() => setRoleFilter('all')}
                  size="sm"
                >
                  Todos
                </Button>
                <Button
                  variant={roleFilter === 'doctor' ? 'default' : 'outline'}
                  onClick={() => setRoleFilter('doctor')}
                  size="sm"
                >
                  Doctores
                </Button>
                <Button
                  variant={roleFilter === 'secretary' ? 'default' : 'outline'}
                  onClick={() => setRoleFilter('secretary')}
                  size="sm"
                >
                  Secretarias
                </Button>
                <Button
                  variant={roleFilter === 'admin' ? 'default' : 'outline'}
                  onClick={() => setRoleFilter('admin')}
                  size="sm"
                >
                  Admins
                </Button>
              </div>

              <Button onClick={() => navigate('/admin/users/create')} className="sm:ml-auto">
                <Plus className="mr-2 h-4 w-4" />
                Crear usuario
              </Button>
            </div>

            {/* Error state */}
            {error && (
              <Alert variant="destructive" className="mb-4">
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}

            {/* Loading state */}
            {loading ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
              </div>
            ) : (
              /* Table */
              <div className="border rounded-lg overflow-hidden">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Nombre</TableHead>
                      <TableHead>Rol</TableHead>
                      <TableHead>Especialidad</TableHead>
                      <TableHead>Teléfono</TableHead>
                      <TableHead className="text-right">Acciones</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredUsers.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={5} className="text-center py-8 text-muted-foreground">
                          No se encontraron usuarios
                        </TableCell>
                      </TableRow>
                    ) : (
                      filteredUsers.map((user) => (
                        <TableRow key={user.id}>
                          <TableCell className="font-medium">
                            {user.doctor?.name || user.email}
                          </TableCell>
                          <TableCell>
                            <Badge variant={ROLE_VARIANTS[user.role] || 'outline'}>
                              {ROLE_LABELS[user.role] || user.role}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            {user.doctor?.specialtyName || '—'}
                          </TableCell>
                          <TableCell>
                            {user.doctor?.phone || '—'}
                          </TableCell>
                          <TableCell className="text-right">
                            <div className="flex justify-end gap-2">
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => navigate(`/admin/users/${user.id}/edit`)}
                              >
                                <Edit className="h-4 w-4 mr-1" />
                                Editar
                              </Button>
                              {user.role === 'doctor' && user.doctor && (
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => navigate(`/admin/doctors/${user.doctor!.id}/schedule`)}
                                >
                                  <Calendar className="h-4 w-4 mr-1" />
                                  Horarios
                                </Button>
                              )}
                            </div>
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </MainLayout>
  );
}
