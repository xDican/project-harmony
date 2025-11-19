import MainLayout from '@/components/MainLayout';

const NuevaCita = () => {
  return (
    <MainLayout>
      <div className="container mx-auto p-8">
        <h1 className="text-4xl font-bold text-foreground">Nueva Cita</h1>
        <p className="text-muted-foreground mt-4">
          Formulario para agendar nuevas citas médicas
        </p>
      </div>
    </MainLayout>
  );
};

export default NuevaCita;
