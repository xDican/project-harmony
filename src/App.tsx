import { lazy, Suspense } from 'react';
import { Toaster as Sonner } from "@/components/ui/sonner";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";

// Lazy-load Radix Toaster — login uses Sonner, not Radix toasts
const Toaster = lazy(() => import("@/components/ui/toaster").then(m => ({ default: m.Toaster })));
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { UserProvider, useCurrentUser } from "./context/UserContext";
import { UserRole } from "./types/user";
const MainLayout = lazy(() => import("./components/MainLayout"));
import SuperAdminRoute from "./components/SuperAdminRoute";

// Eagerly loaded — entry points for all users
import Login from "./pages/Login";
import Register from "./pages/Register";
import NotFound from "./pages/NotFound";

// Lazy-loaded — only downloaded when the route is visited
const AgendaSecretaria = lazy(() => import("./pages/AgendaSecretaria"));
const NuevaCita = lazy(() => import("./pages/NuevaCita"));
const Pacientes = lazy(() => import("./pages/Pacientes"));
const AgendaMedico = lazy(() => import("./pages/AgendaMedico"));
const AgendaSemanal = lazy(() => import("./pages/AgendaSemanal"));
const AdminDashboard = lazy(() => import("./pages/AdminDashboard"));
const UsersList = lazy(() => import("./pages/UsersList"));
const CreateUserPage = lazy(() => import("./pages/CreateUserPage"));
const EditUserPage = lazy(() => import("./pages/EditUserPage"));
const DoctorSchedulePage = lazy(() => import("./pages/DoctorSchedulePage"));
const AppointmentsReport = lazy(() => import("./pages/AppointmentsReport"));
const PatientDetail = lazy(() => import("./pages/PatientDetail"));
const ConfiguracionMedico = lazy(() => import("./pages/ConfiguracionMedico"));
const PerfilMedico = lazy(() => import("./pages/PerfilMedico"));
const UsoMensajes = lazy(() => import("./pages/UsoMensajes"));
const DebugWhatsappPage = lazy(() => import("./pages/DebugWhatsappPage"));
const WhatsAppSettings = lazy(() => import("./pages/WhatsAppSettings"));
const WhatsAppPlantillaNueva = lazy(() => import("./pages/WhatsAppPlantillaNueva"));
const WhatsAppPlantillaDetalle = lazy(() => import("./pages/WhatsAppPlantillaDetalle"));
const MetaOAuthCallback = lazy(() => import("./pages/MetaOAuthCallback"));
const OrganizationSettings = lazy(() => import("./pages/OrganizationSettings"));
const ClinicsList = lazy(() => import("./pages/ClinicsList"));
const CalendarsList = lazy(() => import("./pages/CalendarsList"));
const CalendarSchedulePage = lazy(() => import("./pages/CalendarSchedulePage"));
const WhatsAppLinesList = lazy(() => import("./pages/WhatsAppLinesList"));
const BotFAQsPage = lazy(() => import("./pages/BotFAQsPage"));
const ActivationPanel = lazy(() => import("./pages/ActivationPanel"));
const StepClinic = lazy(() => import("./pages/onboarding/StepClinic"));
const StepDoctor = lazy(() => import("./pages/onboarding/StepDoctor"));
const StepSchedule = lazy(() => import("./pages/onboarding/StepSchedule"));
const StepSummary = lazy(() => import("./pages/onboarding/StepSummary"));

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 30_000,
      gcTime: 5 * 60_000,
      refetchOnWindowFocus: false,
      retry: 1,
    },
  },
});

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
      // Redirect all users to agenda semanal
      return <Navigate to="/agenda-semanal" replace />;
    }

    return <>{children}</>;
  }

  /**
   * OnboardingRoute - Requires auth but not an established org.
   * Redirects to /login if unauthenticated, to /agenda-semanal if org is already active.
   */
  function OnboardingRoute({ children }: { children: React.ReactNode }) {
    const { user, loading, isNewUser, onboardingStatus } = useCurrentUser();

    if (loading) {
      return (
        <div className="min-h-screen flex items-center justify-center">
          <p className="text-muted-foreground">Cargando...</p>
        </div>
      );
    }

    // Not authenticated at all
    if (!user && !isNewUser) {
      return <Navigate to="/login" replace />;
    }

    // Already fully active — send to the app
    if (onboardingStatus === 'active') {
      return <Navigate to="/agenda-semanal" replace />;
    }

    return <>{children}</>;
  }

  /**
   * HomeRedirect - Redirects to appropriate page based on user role and onboarding state
   */
  function HomeRedirect() {
    const { user, loading, isNewUser, onboardingStatus } = useCurrentUser();

    if (loading) {
      return (
        <div className="min-h-screen flex items-center justify-center">
          <p className="text-muted-foreground">Cargando...</p>
        </div>
      );
    }

    // Not authenticated
    if (!user && !isNewUser) {
      return <Navigate to="/login" replace />;
    }

    // Authenticated but without org → start onboarding
    if (isNewUser) {
      return <Navigate to="/onboarding/clinic" replace />;
    }

    // In onboarding → redirect to onboarding start (each step self-redirects)
    if (onboardingStatus && onboardingStatus !== 'active') {
      return <Navigate to="/onboarding/clinic" replace />;
    }

    return <Navigate to="/agenda-semanal" replace />;
  }

  return (
  <QueryClientProvider client={queryClient}>
    <UserProvider>
        <Suspense fallback={null}><Toaster /></Suspense>
        <Sonner />
        <BrowserRouter>
          <Suspense fallback={
            <div className="min-h-screen flex items-center justify-center">
              <p className="text-muted-foreground">Cargando...</p>
            </div>
          }>
          <Routes>
            <Route path="/login" element={<Login />} />
            <Route path="/register" element={<Register />} />
            <Route path="/" element={<HomeRedirect />} />

            {/* Onboarding wizard — auth required, no org required */}
            <Route path="/onboarding/clinic" element={<OnboardingRoute><StepClinic /></OnboardingRoute>} />
            <Route path="/onboarding/doctor" element={<OnboardingRoute><StepDoctor /></OnboardingRoute>} />
            <Route path="/onboarding/schedule" element={<OnboardingRoute><StepSchedule /></OnboardingRoute>} />
            <Route path="/onboarding/summary" element={<OnboardingRoute><StepSummary /></OnboardingRoute>} />
            
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
              <RoleBasedRoute allowedRoles={['doctor', 'admin']}>
                <ConfiguracionMedico />
              </RoleBasedRoute>
            } />
            <Route path="/configuracion/perfil" element={
              <RoleBasedRoute allowedRoles={['doctor', 'admin']}>
                <PerfilMedico />
              </RoleBasedRoute>
            } />
            <Route path="/configuracion/perfil/editar" element={
              <RoleBasedRoute allowedRoles={['doctor', 'admin']}>
                <EditUserPage />
              </RoleBasedRoute>
            } />
            <Route path="/configuracion/uso-mensajes" element={
              <RoleBasedRoute allowedRoles={['doctor', 'admin']}>
                <UsoMensajes />
              </RoleBasedRoute>
            } />
            <Route path="/configuracion/whatsapp" element={
              <RoleBasedRoute allowedRoles={['doctor', 'admin']}>
                <WhatsAppSettings />
              </RoleBasedRoute>
            } />
            <Route path="/configuracion/whatsapp/plantillas/nueva" element={
              <RoleBasedRoute allowedRoles={['doctor', 'admin']}>
                <WhatsAppPlantillaNueva />
              </RoleBasedRoute>
            } />
            <Route path="/configuracion/whatsapp/plantillas/:id" element={
              <RoleBasedRoute allowedRoles={['doctor', 'admin']}>
                <WhatsAppPlantillaDetalle />
              </RoleBasedRoute>
            } />

            {/* Meta OAuth callback (no auth protection) */}
            <Route path="/auth/meta/callback" element={<MetaOAuthCallback />} />
            
            {/* Doctor and Admin routes */}
            <Route path="/agenda-medico" element={
              <RoleBasedRoute allowedRoles={['admin', 'doctor']}>
                <AgendaMedico />
              </RoleBasedRoute>
            } />
            <Route path="/agenda-semanal" element={
              <RoleBasedRoute allowedRoles={['admin', 'doctor', 'secretary']}>
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
            <Route path="/admin/organization" element={
              <RoleBasedRoute allowedRoles={['admin']}>
                <OrganizationSettings />
              </RoleBasedRoute>
            } />
            <Route path="/admin/clinics" element={
              <RoleBasedRoute allowedRoles={['admin']}>
                <ClinicsList />
              </RoleBasedRoute>
            } />
            <Route path="/admin/calendars" element={
              <RoleBasedRoute allowedRoles={['admin']}>
                <CalendarsList />
              </RoleBasedRoute>
            } />
            <Route path="/admin/calendars/:calendarId/schedule" element={
              <RoleBasedRoute allowedRoles={['admin']}>
                <CalendarSchedulePage />
              </RoleBasedRoute>
            } />
            <Route path="/admin/whatsapp-lines" element={
              <RoleBasedRoute allowedRoles={['admin']}>
                <WhatsAppLinesList />
              </RoleBasedRoute>
            } />
            <Route path="/admin/bot-faqs" element={
              <RoleBasedRoute allowedRoles={['admin', 'secretary']}>
                <BotFAQsPage />
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
            
            {/* Internal superadmin routes */}
            <Route path="/internal/activations" element={
              <SuperAdminRoute>
                <ActivationPanel />
              </SuperAdminRoute>
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
          </Suspense>
        </BrowserRouter>
    </UserProvider>
  </QueryClientProvider>
  );
};

export default App;
