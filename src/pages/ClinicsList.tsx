import { useState, useEffect } from 'react';
import { useCurrentUser } from '@/context/UserContext';
import MainLayout from '@/components/MainLayout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Checkbox } from '@/components/ui/checkbox';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { useToast } from '@/hooks/use-toast';
import { useIsMobile } from '@/hooks/use-mobile';
import { getClinicsByOrganization, createClinic, updateClinic } from '@/lib/api.supabase';
import type { Clinic } from '@/types/organization';
import { Loader2, Search, Plus, Edit, Building } from 'lucide-react';

export default function ClinicsList() {
  const { isAdmin } = useCurrentUser();
  const { toast } = useToast();
  const isMobile = useIsMobile();

  const [clinics, setClinics] = useState<Clinic[]>([]);
  const [filteredClinics, setFilteredClinics] = useState<Clinic[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = isMobile ? 5 : 10;

  // Dialog state
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingClinic, setEditingClinic] = useState<Clinic | null>(null);
  const [saving, setSaving] = useState(false);

  // Form fields
  const [formName, setFormName] = useState('');
  const [formAddress, setFormAddress] = useState('');
  const [formPhone, setFormPhone] = useState('');
  const [formIsActive, setFormIsActive] = useState(true);

  useEffect(() => {
    loadClinics();
  }, []);

  useEffect(() => {
    filterClinics();
  }, [clinics, searchQuery]);

  const loadClinics = async () => {
    setLoading(true);
    try {
      const data = await getClinicsByOrganization();
      setClinics(data);
    } catch (err: any) {
      toast({
        title: 'Error',
        description: err.message || 'Error al cargar clinicas',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const filterClinics = () => {
    let result = [...clinics];
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      result = result.filter((c) => c.name.toLowerCase().includes(query));
    }
    setFilteredClinics(result);
    setCurrentPage(1);
  };

  const openCreateDialog = () => {
    setEditingClinic(null);
    setFormName('');
    setFormAddress('');
    setFormPhone('');
    setFormIsActive(true);
    setDialogOpen(true);
  };

  const openEditDialog = (clinic: Clinic) => {
    setEditingClinic(clinic);
    setFormName(clinic.name);
    setFormAddress(clinic.address || '');
    setFormPhone(clinic.phone || '');
    setFormIsActive(clinic.isActive);
    setDialogOpen(true);
  };

  const handleSave = async () => {
    if (!formName.trim()) {
      toast({
        title: 'Error',
        description: 'El nombre es obligatorio',
        variant: 'destructive',
      });
      return;
    }

    setSaving(true);
    try {
      if (editingClinic) {
        await updateClinic(editingClinic.id, {
          name: formName.trim(),
          address: formAddress.trim() || undefined,
          phone: formPhone.trim() || undefined,
          isActive: formIsActive,
        });
        toast({
          title: 'Exito',
          description: 'Clinica actualizada correctamente',
        });
      } else {
        await createClinic({
          name: formName.trim(),
          address: formAddress.trim() || undefined,
          phone: formPhone.trim() || undefined,
        });
        toast({
          title: 'Exito',
          description: 'Clinica creada correctamente',
        });
      }
      setDialogOpen(false);
      await loadClinics();
    } catch (err: any) {
      toast({
        title: 'Error',
        description: err.message || 'Error al guardar la clinica',
        variant: 'destructive',
      });
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
              No tienes permisos para acceder a esta pagina
            </AlertDescription>
          </Alert>
        </div>
      </MainLayout>
    );
  }

  const totalPages = Math.ceil(filteredClinics.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const paginatedClinics = filteredClinics.slice(startIndex, startIndex + itemsPerPage);

  return (
    <MainLayout>
      <div className="p-4 md:p-6 space-y-6">
        {/* Page Header */}
        <div className="mb-6">
          <h1 className="text-4xl font-bold text-foreground mb-2">Clinicas</h1>
          <p className="text-muted-foreground">
            Gestiona las clinicas de tu organizacion.
          </p>
        </div>

        <div>
          {/* Create Button - Mobile Top */}
          {isMobile && (
            <div className="mb-4">
              <Button onClick={openCreateDialog} className="w-full">
                <Plus className="mr-2 h-4 w-4" />
                Nueva Clinica
              </Button>
            </div>
          )}

          {/* Search Bar */}
          <div className="mb-4 flex gap-2">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Buscar por nombre"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>
            {/* Create Button - Desktop */}
            {!isMobile && (
              <Button onClick={openCreateDialog}>
                <Plus className="mr-2 h-4 w-4" />
                Nueva Clinica
              </Button>
            )}
          </div>

          {/* Loading state */}
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
          ) : (
            <>
              {isMobile ? (
                /* Mobile Card View */
                <div className="space-y-0 border rounded-md overflow-hidden">
                  {filteredClinics.length === 0 ? (
                    <div className="py-8 text-center text-muted-foreground">
                      No se encontraron clinicas
                    </div>
                  ) : (
                    <>
                      {paginatedClinics.map((clinic) => (
                        <ClinicCard
                          key={clinic.id}
                          clinic={clinic}
                          onEdit={() => openEditDialog(clinic)}
                        />
                      ))}
                      {totalPages > 1 && (
                        <div className="border-t p-4">
                          <div className="flex items-center justify-between">
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                              disabled={currentPage === 1}
                            >
                              Anterior
                            </Button>
                            <span className="text-sm text-muted-foreground">
                              Pagina {currentPage} de {totalPages}
                            </span>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                              disabled={currentPage === totalPages}
                            >
                              Siguiente
                            </Button>
                          </div>
                        </div>
                      )}
                    </>
                  )}
                </div>
              ) : (
                /* Desktop Table View */
                <>
                  <div className="border rounded-lg overflow-hidden">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Nombre</TableHead>
                          <TableHead>Direccion</TableHead>
                          <TableHead>Telefono</TableHead>
                          <TableHead>Estado</TableHead>
                          <TableHead className="text-right">Acciones</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {filteredClinics.length === 0 ? (
                          <TableRow>
                            <TableCell colSpan={5} className="text-center py-8 text-muted-foreground">
                              No se encontraron clinicas
                            </TableCell>
                          </TableRow>
                        ) : (
                          paginatedClinics.map((clinic) => (
                            <TableRow key={clinic.id}>
                              <TableCell className="font-medium">
                                <div className="flex items-center gap-2">
                                  <Building className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                                  {clinic.name}
                                </div>
                              </TableCell>
                              <TableCell>{clinic.address || '\u2014'}</TableCell>
                              <TableCell>{clinic.phone || '\u2014'}</TableCell>
                              <TableCell>
                                <Badge variant={clinic.isActive ? 'default' : 'secondary'}>
                                  {clinic.isActive ? 'Activa' : 'Inactiva'}
                                </Badge>
                              </TableCell>
                              <TableCell className="text-right">
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => openEditDialog(clinic)}
                                >
                                  <Edit className="h-4 w-4 mr-1" />
                                  Editar
                                </Button>
                              </TableCell>
                            </TableRow>
                          ))
                        )}
                      </TableBody>
                    </Table>
                  </div>
                  {totalPages > 1 && (
                    <div className="flex items-center justify-between mt-4 px-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                        disabled={currentPage === 1}
                      >
                        Anterior
                      </Button>
                      <span className="text-sm text-muted-foreground">
                        Pagina {currentPage} de {totalPages}
                      </span>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                        disabled={currentPage === totalPages}
                      >
                        Siguiente
                      </Button>
                    </div>
                  )}
                </>
              )}
            </>
          )}
        </div>

        {/* Create/Edit Dialog */}
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>
                {editingClinic ? 'Editar Clinica' : 'Nueva Clinica'}
              </DialogTitle>
              <DialogDescription>
                {editingClinic
                  ? 'Modifica los datos de la clinica.'
                  : 'Completa los datos para crear una nueva clinica.'}
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="clinic-name">Nombre *</Label>
                <Input
                  id="clinic-name"
                  value={formName}
                  onChange={(e) => setFormName(e.target.value)}
                  placeholder="Nombre de la clinica"
                  disabled={saving}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="clinic-address">Direccion</Label>
                <Input
                  id="clinic-address"
                  value={formAddress}
                  onChange={(e) => setFormAddress(e.target.value)}
                  placeholder="Direccion de la clinica"
                  disabled={saving}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="clinic-phone">Telefono</Label>
                <Input
                  id="clinic-phone"
                  type="tel"
                  value={formPhone}
                  onChange={(e) => setFormPhone(e.target.value)}
                  placeholder="Ej: +504 9999-9999"
                  disabled={saving}
                />
              </div>

              {editingClinic && (
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="clinic-active"
                    checked={formIsActive}
                    onCheckedChange={(checked) => setFormIsActive(checked === true)}
                    disabled={saving}
                  />
                  <Label htmlFor="clinic-active" className="cursor-pointer">
                    Clinica activa
                  </Label>
                </div>
              )}
            </div>

            <DialogFooter>
              <Button
                variant="outline"
                onClick={() => setDialogOpen(false)}
                disabled={saving}
              >
                Cancelar
              </Button>
              <Button onClick={handleSave} disabled={saving}>
                {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                {editingClinic ? 'Guardar cambios' : 'Crear clinica'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </MainLayout>
  );
}

// Mobile Card Component
interface ClinicCardProps {
  clinic: Clinic;
  onEdit: () => void;
}

function ClinicCard({ clinic, onEdit }: ClinicCardProps) {
  return (
    <div className="border-b last:border-b-0 py-3 px-4 hover:bg-muted/30 transition-colors">
      {/* Line 1: Name and Status Badge */}
      <div className="flex items-center justify-between gap-2 mb-2">
        <div className="flex items-center gap-2">
          <Building className="h-4 w-4 text-muted-foreground flex-shrink-0" />
          <span className="text-base font-semibold text-foreground">
            {clinic.name}
          </span>
        </div>
        <Badge variant={clinic.isActive ? 'default' : 'secondary'}>
          {clinic.isActive ? 'Activa' : 'Inactiva'}
        </Badge>
      </div>

      {/* Line 2: Details */}
      <div className="flex flex-col gap-1 mb-3 text-sm text-muted-foreground">
        {clinic.address && <span>{clinic.address}</span>}
        {clinic.phone && <span>{clinic.phone}</span>}
      </div>

      {/* Line 3: Actions */}
      <div className="flex gap-2">
        <Button variant="outline" size="sm" onClick={onEdit} className="flex-1">
          <Edit className="h-4 w-4 mr-1" />
          Editar
        </Button>
      </div>
    </div>
  );
}
