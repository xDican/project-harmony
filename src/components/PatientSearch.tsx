import { useState, useRef, useEffect } from 'react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Patient } from '@/types/patient';
import { usePatientsSearch } from '@/hooks/usePatientsSearch';
import { Search, User, Phone, X } from 'lucide-react';
import { cn } from '@/lib/utils';

interface PatientSearchProps {
  onSelect: (patient: Patient) => void;
}

/**
 * PatientSearch - Searchable patient selector with dropdown results
 * Uses debounced search and displays matching patients with contact info
 */
const PatientSearch = ({ onSelect }: PatientSearchProps) => {
  const { data: patients, isLoading, query, setQuery } = usePatientsSearch();
  const [isOpen, setIsOpen] = useState(false);
  const [selectedPatient, setSelectedPatient] = useState<Patient | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleSelectPatient = (patient: Patient) => {
    setSelectedPatient(patient);
    setQuery('');
    setIsOpen(false);
    onSelect(patient);
  };

  const handleClearSelection = () => {
    setSelectedPatient(null);
    setQuery('');
    setIsOpen(false);
  };

  const handleInputChange = (value: string) => {
    setQuery(value);
    setIsOpen(true);
  };

  const showDropdown = isOpen && query.length > 0 && !selectedPatient;

  return (
    <div className="space-y-2" ref={containerRef}>
      <label className="text-sm font-medium text-foreground">
        Paciente
      </label>

      {selectedPatient ? (
        // Selected patient display
        <Card className="bg-primary/5 border-primary/20">
          <CardContent className="p-3">
            <div className="flex items-start justify-between gap-2">
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <User className="h-4 w-4 text-primary" />
                  <span className="font-medium text-foreground">{selectedPatient.name}</span>
                </div>
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Phone className="h-3 w-3" />
                  <span>{selectedPatient.phone}</span>
                </div>
                {selectedPatient.documentId && (
                  <div className="text-xs text-muted-foreground">
                    DNI: {selectedPatient.documentId}
                  </div>
                )}
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={handleClearSelection}
                aria-label="Cambiar paciente"
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
          </CardContent>
        </Card>
      ) : (
        // Search input
        <div className="relative">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              type="text"
              placeholder="Buscar por nombre o teléfono..."
              value={query}
              onChange={(e) => handleInputChange(e.target.value)}
              onFocus={() => query.length > 0 && setIsOpen(true)}
              className="pl-9"
              aria-label="Buscar paciente"
              aria-expanded={showDropdown}
              aria-controls="patient-results"
            />
          </div>

          {/* Dropdown results */}
          {showDropdown && (
            <Card className="absolute z-50 w-full mt-1 max-h-64 overflow-y-auto bg-popover shadow-lg">
              <CardContent className="p-0">
                {isLoading ? (
                  <div className="p-4 text-center text-sm text-muted-foreground">
                    Buscando...
                  </div>
                ) : patients.length === 0 ? (
                  <div className="p-4 text-center text-sm text-muted-foreground">
                    No se encontraron pacientes
                  </div>
                ) : (
                  <ul id="patient-results" role="listbox" className="divide-y divide-border">
                    {patients.map((patient) => (
                      <li key={patient.id}>
                        <button
                          type="button"
                          onClick={() => handleSelectPatient(patient)}
                          className={cn(
                            'w-full p-3 text-left hover:bg-muted/50 transition-colors',
                            'focus:bg-muted focus:outline-none'
                          )}
                          role="option"
                          aria-selected={false}
                        >
                          <div className="space-y-1">
                            <div className="flex items-center gap-2">
                              <User className="h-4 w-4 text-muted-foreground" />
                              <span className="font-medium text-foreground">{patient.name}</span>
                            </div>
                            <div className="flex items-center gap-2 text-sm text-muted-foreground">
                              <Phone className="h-3 w-3" />
                              <span>{patient.phone}</span>
                            </div>
                            {patient.documentId && (
                              <div className="text-xs text-muted-foreground pl-6">
                                DNI: {patient.documentId}
                              </div>
                            )}
                          </div>
                        </button>
                      </li>
                    ))}
                  </ul>
                )}
              </CardContent>
            </Card>
          )}
        </div>
      )}
    </div>
  );
};

export default PatientSearch;
