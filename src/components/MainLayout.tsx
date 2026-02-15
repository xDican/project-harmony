import { ReactNode, useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { NavLink } from '@/components/NavLink';
import { Button } from '@/components/ui/button';
import { Sheet, SheetContent, SheetTrigger } from '@/components/ui/sheet';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { Menu, Calendar, PlusCircle, Users, Stethoscope, Settings, LogOut, UserPlus, ChevronDown, BarChart3, FileText, Folder, Shield, ChevronLeft, CalendarDays, Building2, Hospital, MessageSquare, MessageCircleQuestion } from 'lucide-react';
import { useCurrentUser } from '@/context/UserContext';
import { supabase } from '@/lib/supabaseClient';
import { cn } from '@/lib/utils';
import OrgSwitcher from '@/components/OrgSwitcher';

// Route to title mapping for dynamic header
const routeTitles: Record<string, string> = {
  '/agenda-secretaria': 'Agenda de Hoy',
  '/agenda-medico': 'Agenda Médica',
  '/agenda-semanal': 'Agenda Semanal',
  '/citas/nueva': 'Nueva Cita',
  '/pacientes': 'Pacientes',
  '/configuracion': 'Configuración',
  '/configuracion/whatsapp': 'WhatsApp Business',
  '/admin/users': 'Usuarios',
  '/admin/organization': 'Organización',
  '/admin/clinics': 'Clínicas',
  '/admin/calendars': 'Calendarios',
  '/admin/whatsapp-lines': 'WhatsApp Lines',
  '/admin/bot-faqs': 'Bot FAQs',
  '/admin/reports/appointments': 'Reporte de Citas'
};
const getPageTitle = (pathname: string): string => {
  // Exact match first
  if (routeTitles[pathname]) return routeTitles[pathname];

  // Pattern matches for dynamic routes
  if (pathname.startsWith('/pacientes/')) return 'Detalle Paciente';
  if (pathname.startsWith('/admin/users/')) return 'Editar Usuario';
  if (pathname.startsWith('/admin/doctors/') && pathname.includes('/schedule')) return 'Horarios';
  if (pathname.startsWith('/configuracion/')) return 'Configuración';
  return 'Agenda Semanal';
};
interface MainLayoutProps {
  children: ReactNode;
  headerAction?: ReactNode;
  backTo?: string;
  mainClassName?: string;
}

/**
 * MainLayout - Responsive layout wrapper with navigation
 * Provides a sidebar on desktop and a hamburger menu on mobile
 */
export default function MainLayout({
  children,
  headerAction,
  backTo,
  mainClassName
}: MainLayoutProps) {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();
  const {
    user,
    loading,
    isAdmin,
    isSecretary,
    isDoctor,
    isAdminOrSecretary
  } = useCurrentUser();

  // Keep admin menu open if current route is an admin route
  const isAdminRoute = location.pathname.startsWith('/admin');
  const [adminMenuOpen, setAdminMenuOpen] = useState(isAdminRoute);

  // Auto-open admin menu when navigating to admin routes
  useEffect(() => {
    if (isAdminRoute) {
      setAdminMenuOpen(true);
    }
  }, [isAdminRoute]);
  const handleLogout = async () => {
    await supabase.auth.signOut();
    navigate('/login');
  };

  // Define navigation items based on user role
  const getNavigationItems = () => {
    const items = [];

    // Secretary can see: Agenda, Nueva Cita, Pacientes, Agenda Semanal (no Admin)
    if (isSecretary) {
      items.push({
        to: '/agenda-secretaria',
        label: 'Agenda de Hoy',
        icon: Calendar
      }, {
        to: '/citas/nueva',
        label: 'Nueva Cita',
        icon: PlusCircle
      }, {
        to: '/pacientes',
        label: 'Pacientes',
        icon: Users
      }, {
        to: '/agenda-semanal',
        label: 'Agenda Semanal',
        icon: CalendarDays
      });
    }

    // Admin can see: Agenda, Nueva Cita, Pacientes, Admin Dashboard
    if (isAdmin) {
      items.push({
        to: '/agenda-secretaria',
        label: 'Agenda de Hoy',
        icon: Calendar
      }, {
        to: '/citas/nueva',
        label: 'Nueva Cita',
        icon: PlusCircle
      }, {
        to: '/pacientes',
        label: 'Pacientes',
        icon: Users
      }, {
        to: '/agenda-semanal',
        label: 'Agenda Semanal',
        icon: CalendarDays
      });
    }

    // Doctor (independent mode) can see: Agenda Médico, Agenda Semanal, Nueva Cita, Pacientes, Configuración
    if (isDoctor && !isAdmin) {
      items.push({
        to: '/agenda-semanal',
        label: 'Agenda Semanal',
        icon: CalendarDays
      }, {
        to: '/citas/nueva',
        label: 'Nueva Cita',
        icon: PlusCircle
      }, {
        to: '/pacientes',
        label: 'Pacientes',
        icon: Users
      }, {
        to: '/configuracion',
        label: 'Configuración',
        icon: Settings
      });
    }
    return items;
  };
  const navigationItems = getNavigationItems();
  const NavigationLinks = ({
    onClick
  }: {
    onClick?: () => void;
  }) => {
    if (loading) {
      return <div className="flex flex-col gap-2 px-4">
          <p className="text-sm text-muted-foreground">Cargando menú…</p>
        </div>;
    }
    const adminSubmenuItems = [{
      to: '/admin/users',
      label: 'Usuarios',
      icon: UserPlus
    }, {
      to: '/admin/organization',
      label: 'Organización',
      icon: Building2
    }, {
      to: '/admin/clinics',
      label: 'Clínicas',
      icon: Hospital
    }, {
      to: '/admin/calendars',
      label: 'Calendarios',
      icon: CalendarDays
    }, {
      to: '/admin/whatsapp-lines',
      label: 'WhatsApp',
      icon: MessageSquare
    }, {
      to: '/admin/bot-faqs',
      label: 'Bot FAQs',
      icon: MessageCircleQuestion
    }, {
      to: '/admin/reports/appointments',
      label: 'Reporte de Citas',
      icon: FileText
    }];
    return <nav className="flex flex-col gap-2">
        {navigationItems.map(item => <NavLink key={item.to} to={item.to} className="flex items-center gap-3 px-4 py-3 rounded-lg text-muted-foreground hover:text-foreground hover:bg-accent transition-colors" activeClassName="bg-primary/10 text-primary font-medium" onClick={onClick}>
            <item.icon className="h-5 w-5" />
            <span>{item.label}</span>
          </NavLink>)}

        {/* Admin collapsible menu */}
        {isAdmin && <Collapsible open={adminMenuOpen} onOpenChange={setAdminMenuOpen}>
            <CollapsibleTrigger className="flex items-center gap-3 px-4 py-3 rounded-lg text-muted-foreground hover:text-foreground hover:bg-accent transition-colors w-full">
              <Settings className="h-5 w-5" />
              <span className="flex-1 text-left">Admin</span>
              <ChevronDown className={`h-4 w-4 transition-transform ${adminMenuOpen ? 'rotate-180' : ''}`} />
            </CollapsibleTrigger>
            <CollapsibleContent className="mt-1">
              {adminSubmenuItems.map(item => <NavLink key={item.to} to={item.to} className="flex items-center gap-3 pl-12 pr-4 py-2 rounded-lg text-sm text-muted-foreground hover:text-foreground hover:bg-accent transition-colors" activeClassName="bg-primary/10 text-primary font-medium" onClick={onClick} end={item.to === '/admin'}>
                  <item.icon className="h-4 w-4" />
                  <span>{item.label}</span>
                </NavLink>)}
            </CollapsibleContent>
          </Collapsible>}
      </nav>;
  };
  return <div className="min-h-screen flex flex-col md:flex-row">
      {/* Mobile Header */}
      <header className="md:hidden sticky top-0 z-40 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="flex h-16 items-center px-4 gap-2">
          {backTo ? <Button variant="ghost" className="gap-1 -ml-2" onClick={() => navigate(backTo)}>
              <ChevronLeft className="h-5 w-5" />
              <span className="text-xl">{getPageTitle(backTo)}</span>
            </Button> : <Sheet open={mobileMenuOpen} onOpenChange={setMobileMenuOpen}>
              <SheetTrigger asChild>
                <Button variant="ghost" size="icon">
                  <Menu className="h-5 w-5" />
                  <span className="sr-only">Abrir menú</span>
                </Button>
              </SheetTrigger>
              <SheetContent side="left" className="w-64 flex flex-col">
                <div className="border-b pb-4 -mt-2 items-center justify-center flex flex-col mx-0 my-0 gap-0">
                  <h2 className="font-semibold text-foreground text-xl text-center">Menú</h2>
                </div>
                <OrgSwitcher />
                <div className="mt-4 flex-1">
                  <NavigationLinks onClick={() => setMobileMenuOpen(false)} />
                </div>
                {/* Footer with user email and logout */}
                <div className="border-t py-4 flex items-center justify-between gap-2">
                  <span className="text-sm text-muted-foreground truncate flex-1">
                    {user?.email || ''}
                  </span>
                  <Button variant="ghost" size="icon" onClick={handleLogout} title="Cerrar sesión" className="flex-shrink-0">
                    <LogOut className="h-5 w-5" />
                    <span className="sr-only">Cerrar sesión</span>
                  </Button>
                </div>
              </SheetContent>
            </Sheet>}
          {!backTo && <h1 className="text-xl font-bold text-foreground flex-1 truncate">{getPageTitle(location.pathname)}</h1>}
          {headerAction}
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
          <OrgSwitcher />
          <div className="flex-1 overflow-auto py-6 px-4">
            <NavigationLinks />
          </div>
        </div>
      </aside>

      {/* Main Content */}
      <main className={cn("flex-1 min-h-0", mainClassName ?? "overflow-auto")}>
        {children}
      </main>
    </div>;
}