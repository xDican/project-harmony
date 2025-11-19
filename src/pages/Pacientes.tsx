import MainLayout from '@/components/MainLayout';

const Pacientes = () => {
  return (
    <MainLayout>
      <div className="container mx-auto p-8">
        <h1 className="text-4xl font-bold text-foreground">Pacientes</h1>
        <p className="text-muted-foreground mt-4">
          Gestión y búsqueda de pacientes
        </p>
      </div>
    </MainLayout>
  );
};

export default Pacientes;
