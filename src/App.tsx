import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { UserProvider, useCurrentUser } from "./context/UserContext";
import AgendaSecretaria from "./pages/AgendaSecretaria";
import NuevaCita from "./pages/NuevaCita";
import Pacientes from "./pages/Pacientes";
import AgendaMedico from "./pages/AgendaMedico";
import AdminDashboard from "./pages/AdminDashboard";
import CreateUser from "./pages/admin/CreateUser";
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

const App = () => (
  <QueryClientProvider client={queryClient}>
    <UserProvider>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <Routes>
            <Route path="/login" element={<Login />} />
            <Route path="/" element={
              <ProtectedRoute>
                <Navigate to="/agenda-secretaria" replace />
              </ProtectedRoute>
            } />
            <Route path="/agenda-secretaria" element={
              <ProtectedRoute>
                <AgendaSecretaria />
              </ProtectedRoute>
            } />
            <Route path="/citas/nueva" element={
              <ProtectedRoute>
                <NuevaCita />
              </ProtectedRoute>
            } />
            <Route path="/pacientes" element={
              <ProtectedRoute>
                <Pacientes />
              </ProtectedRoute>
            } />
            <Route path="/agenda-medico" element={
              <ProtectedRoute>
                <AgendaMedico />
              </ProtectedRoute>
            } />
            <Route path="/admin" element={
              <ProtectedRoute>
                <AdminDashboard />
              </ProtectedRoute>
            } />
            <Route path="/admin/usuarios/nuevo" element={
              <ProtectedRoute>
                <CreateUser />
              </ProtectedRoute>
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
