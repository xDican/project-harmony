import MainLayout from '@/components/MainLayout';

const AgendaMedico = () => {
  return (
    <MainLayout>
      <div className="container mx-auto p-8">
        <h1 className="text-4xl font-bold text-foreground">Agenda Médico</h1>
        <p className="text-muted-foreground mt-4">
          Vista de agenda para médicos
        </p>
      </div>
    </MainLayout>
  );
};

export default AgendaMedico;
