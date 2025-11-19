import { Patient } from '@/types/patient';

interface PatientSearchProps {
  onSelectPatient?: (patient: Patient) => void;
}

const PatientSearch = ({ onSelectPatient }: PatientSearchProps) => {
  return (
    <div className="p-4 border rounded-md bg-card">
      <h3 className="text-lg font-semibold text-card-foreground">
        Búsqueda de Pacientes
      </h3>
    </div>
  );
};

export default PatientSearch;
