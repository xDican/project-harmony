import { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import MainLayout from '@/components/MainLayout';
import { Input } from '@/components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Search, Eye, User, Plus, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { getAllPatients, createPatient } from '@/lib/api';
import type { Patient } from '@/types/patient';
import { useIsMobile } from '@/hooks/use-mobile';
import { formatPhoneForDisplay, formatPhoneInput, formatPhoneForStorage } from '@/lib/utils';
import { toast } from '@/hooks/use-toast';

/**
 * Pacientes - Patient management and search page
 * Displays a searchable list of all patients
 */
export default function Pacientes() {
  const navigate = useNavigate();
  const isMobile = useIsMobile();
  const [patients, setPatients] = useState<Patient[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 5;

  // Create patient dialog state
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [newPatientName, setNewPatientName] = useState('');
  const [newPatientPhone, setNewPatientPhone] = useState('');
  const [newPatientEmail, setNewPatientEmail] = useState('');
  const [newPatientNotes, setNewPatientNotes] = useState('');
  const [isCreating, setIsCreating] = useState(false);

  // Load patients on mount
  useEffect(() => {
    getAllPatients()
      .then(data => {
        setPatients(data);
      })
      .catch(error => {
        console.error('Error loading patients:', error);
      })
      .finally(() => {
        setIsLoading(false);
      });
  }, []);

  // Filter patients based on search query
  const filteredPatients = useMemo(() => {
    if (!searchQuery.trim()) {
      return patients;
    }

    const query = searchQuery.toLowerCase().trim();
    return patients.filter(patient => {
      const nameMatch = patient.name.toLowerCase().includes(query);
      const phoneMatch = patient.phone?.toLowerCase().includes(query);
      const documentMatch = patient.documentId?.toLowerCase().includes(query);
      return nameMatch || phoneMatch || documentMatch;
    });
  }, [patients, searchQuery]);

  // Reset to page 1 when search changes
  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery]);

  // Calculate pagination for mobile
  const totalPages = Math.ceil(filteredPatients.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const displayedPatients = isMobile ? filteredPatients.slice(startIndex, endIndex) : filteredPatients;

  const handleCreatePatient = async () => {
    if (!newPatientName.trim() || !newPatientPhone.trim()) {
      toast({
        variant: 'destructive',
        title: 'Campos requeridos',
        description: 'El nombre y teléfono son obligatorios',
      });
      return;
    }

    setIsCreating(true);
    try {
      await createPatient({
        name: newPatientName.trim(),
        phone: formatPhoneForStorage(newPatientPhone.trim()),
        email: newPatientEmail.trim() || undefined,
        notes: newPatientNotes.trim() || undefined,
      });

      toast({
        title: 'Paciente creado',
        description: 'El paciente ha sido creado exitosamente',
      });

      // Refresh patients list
      const data = await getAllPatients();
      setPatients(data);

      // Close dialog and reset form
      setIsCreateDialogOpen(false);
      setNewPatientName('');
      setNewPatientPhone('');
      setNewPatientEmail('');
      setNewPatientNotes('');
    } catch (error) {
      console.error('Error creating patient:', error);
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'No se pudo crear el paciente',
      });
    } finally {
      setIsCreating(false);
    }
  };

  return (
    <MainLayout>
      <div className="p-4 md:p-6 space-y-6">
        {/* Page Header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-4xl font-bold text-foreground mb-2">Pacientes</h1>
            <p className="text-muted-foreground">
              Gestión y búsqueda de pacientes registrados
            </p>
          </div>
          <Button onClick={() => setIsCreateDialogOpen(true)}>
            <Plus className="h-4 w-4 mr-2" />
            Nuevo paciente
          </Button>
        </div>

        <div>
            {/* Search Input */}
            <div className="mb-6">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  type="text"
                  placeholder="Buscar por nombre, teléfono o documento..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10"
                />
              </div>
              {searchQuery && (
                <p className="text-sm text-muted-foreground mt-2">
                  {filteredPatients.length} {filteredPatients.length === 1 ? 'resultado' : 'resultados'}
                </p>
              )}
            </div>

            {/* Loading State */}
            {isLoading && (
              <Alert>
                <AlertDescription>Cargando pacientes...</AlertDescription>
              </Alert>
            )}

            {/* Empty State */}
            {!isLoading && filteredPatients.length === 0 && (
              <Alert>
                <AlertDescription>
                  {searchQuery 
                    ? 'No se encontraron pacientes que coincidan con tu búsqueda.' 
                    : 'No hay pacientes registrados.'}
                </AlertDescription>
              </Alert>
            )}

            {/* Patients List */}
            {!isLoading && filteredPatients.length > 0 && (
              <>
                {isMobile ? (
                  <>
                    <div className="space-y-0 border rounded-md overflow-hidden">
                      {displayedPatients.map((patient) => (
                        <PatientCard
                          key={patient.id}
                          patient={patient}
                          onViewDetail={() => navigate(`/pacientes/${patient.id}`)}
                        />
                      ))}
                    </div>
                    {totalPages > 1 && (
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
                    )}
                  </>
                ) : (
                  <>
                    <div className="rounded-md border">
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>Nombre</TableHead>
                            <TableHead>Teléfono</TableHead>
                            <TableHead>Documento</TableHead>
                            <TableHead className="text-right">Acciones</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {(() => {
                            const itemsPerPageDesktop = 10;
                            const totalPagesDesktop = Math.ceil(filteredPatients.length / itemsPerPageDesktop);
                            const startIndexDesktop = (currentPage - 1) * itemsPerPageDesktop;
                            const endIndexDesktop = startIndexDesktop + itemsPerPageDesktop;
                            const paginatedPatientsDesktop = filteredPatients.slice(startIndexDesktop, endIndexDesktop);
                            
                            return paginatedPatientsDesktop.map((patient) => (
                          <TableRow key={patient.id}>
                            <TableCell className="font-medium">
                              <div className="flex items-center gap-2">
                                <User className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                                {patient.name}
                              </div>
                            </TableCell>
                            <TableCell>{formatPhoneForDisplay(patient.phone) || '—'}</TableCell>
                            <TableCell className="text-muted-foreground">
                              {patient.documentId || '—'}
                            </TableCell>
                            <TableCell className="text-right">
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => navigate(`/pacientes/${patient.id}`)}
                              >
                                <Eye className="h-4 w-4 mr-2" />
                                Ver detalle
                              </Button>
                            </TableCell>
                          </TableRow>
                            ));
                          })()}
                        </TableBody>
                      </Table>
                    </div>
                    {(() => {
                      const itemsPerPageDesktop = 10;
                      const totalPagesDesktop = Math.ceil(filteredPatients.length / itemsPerPageDesktop);
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

        {/* Create Patient Dialog */}
        <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Crear nuevo paciente</DialogTitle>
              <DialogDescription>
                Completa la información del nuevo paciente
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="name">Nombre *</Label>
                <Input
                  id="name"
                  value={newPatientName}
                  onChange={(e) => setNewPatientName(e.target.value)}
                  placeholder="Nombre completo"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="phone">Teléfono *</Label>
                <Input
                  id="phone"
                  value={newPatientPhone}
                  onChange={(e) => setNewPatientPhone(formatPhoneInput(e.target.value))}
                  placeholder="1234-5678"
                  maxLength={9}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  value={newPatientEmail}
                  onChange={(e) => setNewPatientEmail(e.target.value)}
                  placeholder="ejemplo@correo.com"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="notes">Notas</Label>
                <Textarea
                  id="notes"
                  value={newPatientNotes}
                  onChange={(e) => setNewPatientNotes(e.target.value)}
                  placeholder="Información adicional"
                  rows={3}
                />
              </div>
            </div>
            <DialogFooter>
              <Button
                variant="outline"
                onClick={() => setIsCreateDialogOpen(false)}
                disabled={isCreating}
              >
                Cancelar
              </Button>
              <Button onClick={handleCreatePatient} disabled={isCreating}>
                {isCreating && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Crear paciente
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </MainLayout>
  );
}

// Mobile Card Component
function PatientCard({ patient, onViewDetail }: { 
  patient: Patient; 
  onViewDetail: () => void;
}) {
  return (
    <div className="border-b last:border-b-0 py-3 px-4 hover:bg-muted/30 transition-colors">
      {/* Line 1: Patient Name */}
      <div className="flex items-center justify-between gap-2 mb-2">
        <div className="flex items-center gap-2">
          <User className="h-4 w-4 text-muted-foreground flex-shrink-0" />
          <span className="text-base font-semibold text-foreground">
            {patient.name}
          </span>
        </div>
      </div>

      {/* Line 2: Phone & Document */}
      <div className="flex items-center justify-between gap-2 mb-2">
        <div className="flex flex-col gap-1 text-sm text-muted-foreground">
          {patient.phone && (
            <span>📱 {formatPhoneForDisplay(patient.phone)}</span>
          )}
          {patient.documentId && (
            <span>🆔 {patient.documentId}</span>
          )}
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={onViewDetail}
        >
          <Eye className="h-4 w-4 mr-1" />
          Ver
        </Button>
      </div>
    </div>
  );
}
