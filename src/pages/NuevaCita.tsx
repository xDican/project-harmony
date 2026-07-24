import { useLocation } from 'react-router-dom';
import MainLayout from '@/components/MainLayout';
import NuevaCitaComposer from '@/components/NuevaCitaComposer';

/**
 * NuevaCita — página completa (`/citas/nueva`). Wrapper delgado: toda la lógica/UI
 * vive en `NuevaCitaComposer` (compartido con el drawer embebido de la agenda mensual).
 */
export default function NuevaCita() {
  const location = useLocation();
  const initialDate = location.state?.date instanceof Date ? location.state.date : undefined;

  return (
    <MainLayout mainClassName="overflow-hidden flex flex-col">
      <NuevaCitaComposer initialDate={initialDate} />
    </MainLayout>
  );
}
