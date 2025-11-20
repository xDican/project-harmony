import { useState, useRef, useEffect } from 'react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Doctor } from '@/types/doctor';
import { useDoctorsSearch } from '@/hooks/useDoctorsSearch';
import { Search, User, X, Stethoscope } from 'lucide-react';
import { cn } from '@/lib/utils';

interface DoctorSearchProps {
  onSelect: (doctor: Doctor) => void;
}

/**
 * DoctorSearch - Searchable doctor selector with dropdown results
 * Uses debounced search and displays matching doctors with specialty info
 */
const DoctorSearch = ({ onSelect }: DoctorSearchProps) => {
  const { data: doctors, isLoading, query, setQuery } = useDoctorsSearch();
  const [isOpen, setIsOpen] = useState(false);
  const [selectedDoctor, setSelectedDoctor] = useState<Doctor | null>(null);
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

  const handleSelectDoctor = (doctor: Doctor) => {
    setSelectedDoctor(doctor);
    setQuery('');
    setIsOpen(false);
    onSelect(doctor);
  };

  const handleClearSelection = () => {
    setSelectedDoctor(null);
    setQuery('');
    setIsOpen(false);
  };

  const handleInputChange = (value: string) => {
    setQuery(value);
    setIsOpen(true);
  };

  const showDropdown = isOpen && query.length > 0 && !selectedDoctor;

  return (
    <div className="space-y-2" ref={containerRef}>
      <label className="text-sm font-medium text-foreground">
        Médico
      </label>

      {selectedDoctor ? (
        // Selected doctor display
        <Card className="bg-primary/5 border-primary/20">
          <CardContent className="p-3">
            <div className="flex items-start justify-between gap-2">
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <User className="h-4 w-4 text-primary" />
                  <span className="font-medium text-foreground">{selectedDoctor.name}</span>
                </div>
                {selectedDoctor.specialtyName && (
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Stethoscope className="h-3 w-3" />
                    <span>{selectedDoctor.specialtyName}</span>
                  </div>
                )}
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={handleClearSelection}
                aria-label="Cambiar médico"
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
              placeholder="Buscar por médico o especialidad..."
              value={query}
              onChange={(e) => handleInputChange(e.target.value)}
              onFocus={() => query.length > 0 && setIsOpen(true)}
              className="pl-9"
              aria-label="Buscar médico"
              aria-expanded={showDropdown}
              aria-controls="doctor-results"
            />
          </div>

          {/* Dropdown results */}
          {showDropdown && (
            <Card 
              id="doctor-results" 
              className="absolute z-50 w-full mt-1 max-h-72 overflow-y-auto bg-card shadow-lg border-border"
              role="listbox"
            >
              <CardContent className="p-0">
                {isLoading ? (
                  <div className="p-4 text-center text-sm text-muted-foreground">
                    Buscando médicos...
                  </div>
                ) : doctors.length > 0 ? (
                  <ul className="divide-y divide-border">
                    {doctors.map((doctor) => (
                      <li key={doctor.id}>
                        <button
                          type="button"
                          onClick={() => handleSelectDoctor(doctor)}
                          className="w-full p-3 text-left hover:bg-accent transition-colors focus:bg-accent focus:outline-none"
                          role="option"
                          aria-selected="false"
                        >
                          <div className="space-y-1">
                            <div className="flex items-center gap-2">
                              <User className="h-4 w-4 text-primary flex-shrink-0" />
                              <span className="font-medium text-foreground">{doctor.name}</span>
                            </div>
                            {doctor.specialtyName && (
                              <div className="flex items-center gap-2 text-sm text-muted-foreground pl-6">
                                <Stethoscope className="h-3 w-3" />
                                <span>{doctor.specialtyName}</span>
                              </div>
                            )}
                          </div>
                        </button>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <div className="p-4 text-center">
                    <p className="text-sm text-muted-foreground">
                      No se encontraron médicos para "{query}"
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>
          )}
        </div>
      )}
    </div>
  );
};

export default DoctorSearch;
