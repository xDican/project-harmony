import MainLayout from '@/components/MainLayout';

const AdminDashboard = () => {
  return (
    <MainLayout>
      <div className="container mx-auto p-8">
        <h1 className="text-4xl font-bold text-foreground">Panel Administrativo</h1>
        <p className="text-muted-foreground mt-4">
          Dashboard para administradores del sistema
        </p>
      </div>
    </MainLayout>
  );
};

export default AdminDashboard;
