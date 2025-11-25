import { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import MainLayout from '@/components/MainLayout';
import { Input } from '@/components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Search, Users, Eye } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { getAllPatients } from '@/lib/api';
import type { Patient } from '@/types/patient';
import { useIsMobile } from '@/hooks/use-mobile';

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

  return (
    <MainLayout>
      <div className="container mx-auto p-6 max-w-6xl">
        {/* Page Header */}
        <div className="mb-8">
          <h1 className="text-4xl font-bold text-foreground mb-2">Pacientes</h1>
          <p className="text-muted-foreground">
            Gestión y búsqueda de pacientes registrados
          </p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Users className="h-5 w-5" />
              Lista de Pacientes
            </CardTitle>
          </CardHeader>
          <CardContent>
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
                  <div className="space-y-0 border rounded-md overflow-hidden">
                    {filteredPatients.map((patient) => (
                      <PatientCard
                        key={patient.id}
                        patient={patient}
                        onViewDetail={() => navigate(`/pacientes/${patient.id}`)}
                      />
                    ))}
                  </div>
                ) : (
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
                        {filteredPatients.map((patient) => (
                          <TableRow key={patient.id}>
                            <TableCell className="font-medium">{patient.name}</TableCell>
                            <TableCell>{patient.phone || '—'}</TableCell>
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
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                )}
              </>
            )}

            {/* Results Count */}
            {!isLoading && filteredPatients.length > 0 && (
              <p className="text-sm text-muted-foreground mt-4">
                Mostrando {filteredPatients.length} de {patients.length} {patients.length === 1 ? 'paciente' : 'pacientes'}
              </p>
            )}
          </CardContent>
        </Card>
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
        <span className="text-base font-semibold text-foreground">
          {patient.name}
        </span>
      </div>

      {/* Line 2: Phone & Document */}
      <div className="flex items-center justify-between gap-2 mb-2">
        <div className="flex flex-col gap-1 text-sm text-muted-foreground">
          {patient.phone && (
            <span>📱 {patient.phone}</span>
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
