import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { UserProvider, useCurrentUser } from "./context/UserContext";
import { UserRole } from "./types/user";
import MainLayout from "./components/MainLayout";
import AgendaSecretaria from "./pages/AgendaSecretaria";
import NuevaCita from "./pages/NuevaCita";
import Pacientes from "./pages/Pacientes";
import AgendaMedico from "./pages/AgendaMedico";
import AgendaSemanal from "./pages/AgendaSemanal";
import AdminDashboard from "./pages/AdminDashboard";
import UsersList from "./pages/UsersList";
import CreateUserPage from "./pages/CreateUserPage";
import EditUserPage from "./pages/EditUserPage";
import DoctorSchedulePage from "./pages/DoctorSchedulePage";
import AppointmentsReport from "./pages/AppointmentsReport";
import Login from "./pages/Login";
import NotFound from "./pages/NotFound";
import PatientDetail from "./pages/PatientDetail";

import ConfiguracionMedico from "./pages/ConfiguracionMedico";
import PerfilMedico from "./pages/PerfilMedico";
import UsoMensajes from "./pages/UsoMensajes";
import DebugWhatsappPage from "./pages/DebugWhatsappPage";

const queryClient = new QueryClient();

const App = () => {
  /**
   * RoleBasedRoute - Wrapper for routes that require specific roles
   */
  function RoleBasedRoute({ 
    children, 
    allowedRoles 
  }: { 
    children: React.ReactNode;
    allowedRoles: UserRole[];
  }) {
    const { user, loading } = useCurrentUser();

    if (loading) {
      return (
        <div className="min-h-screen flex items-center justify-center">
          <p className="text-muted-foreground">Cargando...</p>
        </div>
      );
    }

    if (!user) {
      return <Navigate to="/login" replace />;
    }

    // Check if user's role is in the allowed roles
    if (!allowedRoles.includes(user.role)) {
      // Redirect based on role
      if (user.role === 'doctor') {
        return <Navigate to="/agenda-medico" replace />;
      }
      if (user.role === 'secretary') {
        return <Navigate to="/agenda-secretaria" replace />;
      }
      if (user.role === 'admin') {
        return <Navigate to="/admin" replace />;
      }
      return <Navigate to="/login" replace />;
    }

    return <>{children}</>;
  }

  /**
   * HomeRedirect - Redirects to appropriate page based on user role
   */
  function HomeRedirect() {
    const { user, loading } = useCurrentUser();

    if (loading) {
      return (
        <div className="min-h-screen flex items-center justify-center">
          <p className="text-muted-foreground">Cargando...</p>
        </div>
      );
    }

    if (!user) {
      return <Navigate to="/login" replace />;
    }

    // Redirect based on role
    if (user.role === 'doctor') {
      return <Navigate to="/agenda-medico" replace />;
    }
    if (user.role === 'secretary' || user.role === 'admin') {
      return <Navigate to="/agenda-secretaria" replace />;
    }

    return <Navigate to="/login" replace />;
  }

  return (
  <QueryClientProvider client={queryClient}>
    <UserProvider>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <Routes>
            <Route path="/login" element={<Login />} />
            <Route path="/" element={<HomeRedirect />} />
            
            {/* Secretary, Admin, and Doctor routes */}
            <Route path="/agenda-secretaria" element={
              <RoleBasedRoute allowedRoles={['admin', 'secretary']}>
                <AgendaSecretaria />
              </RoleBasedRoute>
            } />
            <Route path="/citas/nueva" element={
              <RoleBasedRoute allowedRoles={['admin', 'secretary', 'doctor']}>
                <NuevaCita />
              </RoleBasedRoute>
            } />
            <Route path="/pacientes" element={
              <RoleBasedRoute allowedRoles={['admin', 'secretary', 'doctor']}>
                <Pacientes />
              </RoleBasedRoute>
            } />
            <Route path="/pacientes/:id" element={
              <RoleBasedRoute allowedRoles={['admin', 'secretary', 'doctor']}>
                <PatientDetail />
              </RoleBasedRoute>
            } />
            
            {/* Doctor routes (independent doctor mode) */}
            <Route path="/configuracion" element={
              <RoleBasedRoute allowedRoles={['doctor']}>
                <ConfiguracionMedico />
              </RoleBasedRoute>
            } />
            <Route path="/configuracion/perfil" element={
              <RoleBasedRoute allowedRoles={['doctor']}>
                <PerfilMedico />
              </RoleBasedRoute>
            } />
            <Route path="/configuracion/uso-mensajes" element={
              <RoleBasedRoute allowedRoles={['doctor']}>
                <UsoMensajes />
              </RoleBasedRoute>
            } />
            
            {/* Doctor and Admin routes */}
            <Route path="/agenda-medico" element={
              <RoleBasedRoute allowedRoles={['admin', 'doctor']}>
                <AgendaMedico />
              </RoleBasedRoute>
            } />
            <Route path="/agenda-semanal" element={
              <RoleBasedRoute allowedRoles={['admin', 'doctor']}>
                <AgendaSemanal />
              </RoleBasedRoute>
            } />
            
            {/* Admin only routes */}
            <Route path="/admin" element={
              <RoleBasedRoute allowedRoles={['admin']}>
                <AdminDashboard />
              </RoleBasedRoute>
            } />
            <Route path="/admin/users" element={
              <RoleBasedRoute allowedRoles={['admin']}>
                <UsersList />
              </RoleBasedRoute>
            } />
            <Route path="/admin/users/create" element={
              <RoleBasedRoute allowedRoles={['admin']}>
                <CreateUserPage />
              </RoleBasedRoute>
            } />
            <Route path="/admin/users/:userId/edit" element={
              <RoleBasedRoute allowedRoles={['admin']}>
                <EditUserPage />
              </RoleBasedRoute>
            } />
            <Route path="/admin/doctors/:doctorId/schedule" element={
              <RoleBasedRoute allowedRoles={['admin', 'doctor']}>
                <DoctorSchedulePage />
              </RoleBasedRoute>
            } />
            <Route path="/admin/reports/appointments" element={
              <RoleBasedRoute allowedRoles={['admin']}>
                <AppointmentsReport />
              </RoleBasedRoute>
            } />
            <Route path="/admin/specialties" element={
              <RoleBasedRoute allowedRoles={['admin']}>
                <MainLayout>
                  <NotFound />
                </MainLayout>
              </RoleBasedRoute>
            } />
            <Route path="/admin/reports" element={
              <RoleBasedRoute allowedRoles={['admin']}>
                <MainLayout>
                  <NotFound />
                </MainLayout>
              </RoleBasedRoute>
            } />
            <Route path="/admin/files" element={
              <RoleBasedRoute allowedRoles={['admin']}>
                <MainLayout>
                  <NotFound />
                </MainLayout>
              </RoleBasedRoute>
            } />
            <Route path="/admin/settings" element={
              <RoleBasedRoute allowedRoles={['admin']}>
                <MainLayout>
                  <NotFound />
                </MainLayout>
              </RoleBasedRoute>
            } />
            
            {/* Debug routes */}
            <Route path="/debug-whatsapp" element={
              <RoleBasedRoute allowedRoles={['admin', 'secretary', 'doctor']}>
                <DebugWhatsappPage />
              </RoleBasedRoute>
            } />
            
            {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
            <Route path="*" element={<NotFound />} />
          </Routes>
        </BrowserRouter>
      </TooltipProvider>
    </UserProvider>
  </QueryClientProvider>
  );
};

export default App;
