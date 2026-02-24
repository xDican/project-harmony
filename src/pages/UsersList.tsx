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
import { Loader2, Search, Plus, Edit, User, Stethoscope } from 'lucide-react';
import { useIsMobile } from '@/hooks/use-mobile';
import { formatPhoneForDisplay } from '@/lib/utils';

const ROLE_LABELS: Record<string, string> = {
  admin: 'Propietario',
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
  const isMobile = useIsMobile();
  const [users, setUsers] = useState<UserWithRelations[]>([]);
  const [filteredUsers, setFilteredUsers] = useState<UserWithRelations[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [roleFilter, setRoleFilter] = useState<string>('all');
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 5;

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
        const name = (user.doctor?.name || user.secretary?.name || '').toLowerCase();
        const email = user.email.toLowerCase();
        return name.includes(query) || email.includes(query);
      });
    }

    // Filter by role
    if (roleFilter !== 'all') {
      result = result.filter((user) => user.role === roleFilter);
    }

    setFilteredUsers(result);
    setCurrentPage(1); // Reset to page 1 when filters change
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
      <div className="p-4 md:p-6 space-y-6">
        {/* Page Header */}
        <div className="mb-6">
          <h1 className="text-4xl font-bold text-foreground mb-2">Usuarios</h1>
          <p className="text-muted-foreground">
            Gestiona doctores, secretarias y administradores del sistema.
          </p>
        </div>

        <div>
            {/* Create User Button - Mobile Top */}
            {isMobile && (
              <div className="mb-4">
                <Button 
                  onClick={() => navigate('/admin/users/create')} 
                  className="w-full"
                >
                  <Plus className="mr-2 h-4 w-4" />
                  Crear usuario
                </Button>
              </div>
            )}

            {/* Search Bar */}
            <div className="mb-4">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Buscar por nombre o correo"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>

            {/* Role Filters */}
            <div className="flex flex-wrap gap-2 mb-6">
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
              
              {/* Create User Button - Desktop */}
              {!isMobile && (
                <Button 
                  onClick={() => navigate('/admin/users/create')} 
                  className="ml-auto"
                >
                  <Plus className="mr-2 h-4 w-4" />
                  Crear usuario
                </Button>
              )}
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
              <>
                {isMobile ? (
                  /* Mobile Card View */
                  <>
                    <div className="space-y-0 border rounded-md overflow-hidden">
                      {filteredUsers.length === 0 ? (
                        <div className="py-8 text-center text-muted-foreground">
                          No se encontraron usuarios
                        </div>
                      ) : (
                        (() => {
                          const totalPages = Math.ceil(filteredUsers.length / itemsPerPage);
                          const startIndex = (currentPage - 1) * itemsPerPage;
                          const endIndex = startIndex + itemsPerPage;
                          const paginatedUsers = filteredUsers.slice(startIndex, endIndex);
                          
                          return (
                            <>
                              {paginatedUsers.map((user) => (
                                <UserCard
                                  key={user.id}
                                  user={user}
                                  onEdit={() => navigate(`/admin/users/${user.id}/edit`)}
                                />
                              ))}
                              {totalPages > 1 && (
                                <div className="border-t p-4">
                                  <div className="flex items-center justify-between">
                                    <Button
                                      variant="outline"
                                      size="sm"
                                      onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                                      disabled={currentPage === 1}
                                    >
                                      Anterior
                                    </Button>
                                    <span className="text-sm text-muted-foreground">
                                      Página {currentPage} de {totalPages}
                                    </span>
                                    <Button
                                      variant="outline"
                                      size="sm"
                                      onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                                      disabled={currentPage === totalPages}
                                    >
                                      Siguiente
                                    </Button>
                                  </div>
                                </div>
                              )}
                            </>
                          );
                        })()
                      )}
                    </div>
                  </>
                ) : (
                  /* Desktop Table View */
                  <>
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
                            (() => {
                              const itemsPerPageDesktop = 10;
                              const totalPagesDesktop = Math.ceil(filteredUsers.length / itemsPerPageDesktop);
                              const startIndexDesktop = (currentPage - 1) * itemsPerPageDesktop;
                              const endIndexDesktop = startIndexDesktop + itemsPerPageDesktop;
                              const paginatedUsersDesktop = filteredUsers.slice(startIndexDesktop, endIndexDesktop);
                              
                              return paginatedUsersDesktop.map((user) => (
                          <TableRow key={user.id}>
                            <TableCell className="font-medium">
                              <div className="flex items-center gap-2">
                                {user.role === 'doctor' ? (
                                  <Stethoscope className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                                ) : (
                                  <User className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                                )}
                                {user.doctor?.name || user.secretary?.name || user.email}
                              </div>
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
                                {formatPhoneForDisplay(user.doctor?.phone) || '—'}
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
                                </div>
                              </TableCell>
                            </TableRow>
                              ));
                            })()
                          )}
                        </TableBody>
                      </Table>
                    </div>
                    {(() => {
                      const itemsPerPageDesktop = 10;
                      const totalPagesDesktop = Math.ceil(filteredUsers.length / itemsPerPageDesktop);
                      return totalPagesDesktop > 1 && (
                        <div className="flex items-center justify-between mt-4 px-2">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                            disabled={currentPage === 1}
                          >
                            Anterior
                          </Button>
                          <span className="text-sm text-muted-foreground">
                            Página {currentPage} de {totalPagesDesktop}
                          </span>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => setCurrentPage(p => Math.min(totalPagesDesktop, p + 1))}
                            disabled={currentPage === totalPagesDesktop}
                          >
                            Siguiente
                          </Button>
                        </div>
                      );
                    })()}
                  </>
                )}
              </>
            )}
        </div>
      </div>
    </MainLayout>
  );
}

// Mobile Card Component for Users
interface UserCardProps {
  user: UserWithRelations;
  onEdit: () => void;
}

function UserCard({ user, onEdit }: UserCardProps) {
  return (
    <div className="border-b last:border-b-0 py-3 px-4 hover:bg-muted/30 transition-colors">
      {/* Line 1: Name and Role Badge */}
      <div className="flex items-center justify-between gap-2 mb-2">
        <div className="flex items-center gap-2">
          {user.role === 'doctor' ? (
            <Stethoscope className="h-4 w-4 text-muted-foreground flex-shrink-0" />
          ) : (
            <User className="h-4 w-4 text-muted-foreground flex-shrink-0" />
          )}
          <span className="text-base font-semibold text-foreground">
            {user.doctor?.name || user.secretary?.name || user.email}
          </span>
        </div>
        <Badge variant={ROLE_VARIANTS[user.role] || 'outline'}>
          {ROLE_LABELS[user.role] || user.role}
        </Badge>
      </div>

      {/* Line 2: Specialty and Phone */}
      <div className="flex flex-col gap-1 mb-3 text-sm text-muted-foreground">
        {user.doctor?.specialtyName && (
          <span>🩺 {user.doctor.specialtyName}</span>
        )}
        {user.doctor?.phone && (
          <span>📱 {formatPhoneForDisplay(user.doctor.phone)}</span>
        )}
      </div>

      {/* Line 3: Action Buttons */}
      <div className="flex gap-2">
        <Button
          variant="outline"
          size="sm"
          onClick={onEdit}
          className="flex-1"
        >
          <Edit className="h-4 w-4 mr-1" />
          Editar
        </Button>
      </div>
    </div>
  );
}
