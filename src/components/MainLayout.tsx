import { ReactNode, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { NavLink } from '@/components/NavLink';
import { Button } from '@/components/ui/button';
import { Sheet, SheetContent, SheetTrigger } from '@/components/ui/sheet';
import { Menu, Calendar, PlusCircle, Users, Stethoscope, Settings, LogOut } from 'lucide-react';
import { useCurrentUser } from '@/context/UserContext';
import { supabase } from '@/lib/supabaseClient';

interface MainLayoutProps {
  children: ReactNode;
}

/**
 * MainLayout - Responsive layout wrapper with navigation
 * Provides a sidebar on desktop and a hamburger menu on mobile
 */
export default function MainLayout({ children }: MainLayoutProps) {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const navigate = useNavigate();
  const { loading, isAdmin, isSecretary, isDoctor, isAdminOrSecretary } = useCurrentUser();

  const handleLogout = async () => {
    await supabase.auth.signOut();
    navigate('/login');
  };

  // Define navigation items based on user role
  const getNavigationItems = () => {
    const items = [];

    // Admin and Secretary can see: Agenda, Nueva Cita, Pacientes, Admin
    if (isAdminOrSecretary) {
      items.push(
        { to: '/agenda-secretaria', label: 'Agenda de Hoy', icon: Calendar },
        { to: '/citas/nueva', label: 'Nueva Cita', icon: PlusCircle },
        { to: '/pacientes', label: 'Pacientes', icon: Users },
        { to: '/admin', label: 'Admin', icon: Settings }
      );
    }

    // Admin and Doctor can see: Agenda Médico
    if (isAdmin || isDoctor) {
      items.push({ to: '/agenda-medico', label: 'Agenda Médico', icon: Stethoscope });
    }

    // Admin can see: Crear Usuario
    if (isAdmin) {
      items.push({ to: '/admin/usuarios/nuevo', label: 'Crear Usuario', icon: PlusCircle });
    }

    return items;
  };

  const navigationItems = getNavigationItems();

  const NavigationLinks = ({ onClick }: { onClick?: () => void }) => {
    if (loading) {
      return (
        <div className="flex flex-col gap-2 px-4">
          <p className="text-sm text-muted-foreground">Cargando menú…</p>
        </div>
      );
    }

    return (
      <nav className="flex flex-col gap-2">
        {navigationItems.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            className="flex items-center gap-3 px-4 py-3 rounded-lg text-muted-foreground hover:text-foreground hover:bg-accent transition-colors"
            activeClassName="bg-primary/10 text-primary font-medium"
            onClick={onClick}
          >
            <item.icon className="h-5 w-5" />
            <span>{item.label}</span>
          </NavLink>
        ))}
      </nav>
    );
  };

  return (
    <div className="min-h-screen flex flex-col md:flex-row">
      {/* Mobile Header */}
      <header className="md:hidden sticky top-0 z-40 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="flex h-16 items-center justify-between px-4">
          <h1 className="text-xl font-bold text-foreground">Agenda Médica</h1>
          <div className="flex items-center gap-2">
            <Button variant="ghost" size="icon" onClick={handleLogout} title="Cerrar sesión">
              <LogOut className="h-5 w-5" />
              <span className="sr-only">Cerrar sesión</span>
            </Button>
            <Sheet open={mobileMenuOpen} onOpenChange={setMobileMenuOpen}>
              <SheetTrigger asChild>
                <Button variant="ghost" size="icon">
                  <Menu className="h-5 w-5" />
                  <span className="sr-only">Abrir menú</span>
                </Button>
              </SheetTrigger>
              <SheetContent side="left" className="w-64">
                <div className="mt-8">
                  <NavigationLinks onClick={() => setMobileMenuOpen(false)} />
                </div>
              </SheetContent>
            </Sheet>
          </div>
        </div>
      </header>

      {/* Desktop Sidebar */}
      <aside className="hidden md:flex md:flex-col md:w-64 border-r bg-card">
        <div className="sticky top-0 flex flex-col h-screen">
          <div className="flex items-center justify-between h-16 px-6 border-b">
            <h1 className="text-xl font-bold text-foreground">Agenda Médica</h1>
            <Button variant="ghost" size="icon" onClick={handleLogout} title="Cerrar sesión">
              <LogOut className="h-5 w-5" />
              <span className="sr-only">Cerrar sesión</span>
            </Button>
          </div>
          <div className="flex-1 overflow-auto py-6 px-4">
            <NavigationLinks />
          </div>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 overflow-auto">
        {children}
      </main>
    </div>
  );
}
