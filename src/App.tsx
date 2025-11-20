import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { UserProvider, useCurrentUser } from "./context/UserContext";
import { UserRole } from "./types/user";
import AgendaSecretaria from "./pages/AgendaSecretaria";
import NuevaCita from "./pages/NuevaCita";
import Pacientes from "./pages/Pacientes";
import AgendaMedico from "./pages/AgendaMedico";
import AdminDashboard from "./pages/AdminDashboard";
import AdminUsuarios from "./pages/AdminUsuarios";
import Login from "./pages/Login";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

/**
 * ProtectedRoute - Wrapper for routes that require authentication
 */
function ProtectedRoute({ children }: { children: React.ReactNode }) {
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

  return <>{children}</>;
}

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

const App = () => (
  <QueryClientProvider client={queryClient}>
    <UserProvider>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <Routes>
            <Route path="/login" element={<Login />} />
            <Route path="/" element={<HomeRedirect />} />
            
            {/* Secretary and Admin routes */}
            <Route path="/agenda-secretaria" element={
              <RoleBasedRoute allowedRoles={['admin', 'secretary']}>
                <AgendaSecretaria />
              </RoleBasedRoute>
            } />
            <Route path="/citas/nueva" element={
              <RoleBasedRoute allowedRoles={['admin', 'secretary']}>
                <NuevaCita />
              </RoleBasedRoute>
            } />
            <Route path="/pacientes" element={
              <RoleBasedRoute allowedRoles={['admin', 'secretary']}>
                <Pacientes />
              </RoleBasedRoute>
            } />
            
            {/* Doctor and Admin routes */}
            <Route path="/agenda-medico" element={
              <RoleBasedRoute allowedRoles={['admin', 'doctor']}>
                <AgendaMedico />
              </RoleBasedRoute>
            } />
            
            {/* Admin only routes */}
            <Route path="/admin" element={
              <RoleBasedRoute allowedRoles={['admin']}>
                <AdminDashboard />
              </RoleBasedRoute>
            } />
            <Route path="/admin/usuarios" element={
              <RoleBasedRoute allowedRoles={['admin']}>
                <AdminUsuarios />
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

export default App;
