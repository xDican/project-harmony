import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import AgendaSecretaria from "./pages/AgendaSecretaria";
import NuevaCita from "./pages/NuevaCita";
import Pacientes from "./pages/Pacientes";
import AgendaMedico from "./pages/AgendaMedico";
import AdminDashboard from "./pages/AdminDashboard";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<Navigate to="/agenda-secretaria" replace />} />
          <Route path="/agenda-secretaria" element={<AgendaSecretaria />} />
          <Route path="/citas/nueva" element={<NuevaCita />} />
          <Route path="/pacientes" element={<Pacientes />} />
          <Route path="/agenda-medico" element={<AgendaMedico />} />
          <Route path="/admin" element={<AdminDashboard />} />
          {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
          <Route path="*" element={<NotFound />} />
        </Routes>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
