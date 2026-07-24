import { ReactNode, useState, useEffect, useRef } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { NavLink } from '@/components/NavLink';
import { Button } from '@/components/ui/button';
import { Sheet, SheetContent, SheetTrigger } from '@/components/ui/sheet';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { Menu, Calendar, PlusCircle, Users, Stethoscope, Settings, LogOut, UserPlus, ChevronDown, BarChart3, FileText, Folder, Shield, ChevronLeft, CalendarDays, Building2, Hospital, MessageSquare, MessageCircleQuestion, Inbox as InboxIcon, Sparkles, Cog } from 'lucide-react';
import { useCurrentUser } from '@/context/UserContext';
import { supabase } from '@/lib/supabaseClient';
import { cn } from '@/lib/utils';
import OrgSwitcher from '@/components/OrgSwitcher';
import { useInbox } from '@/context/InboxContext';
import { usePromotionsExpiringSoon } from '@/hooks/usePromotionsExpiringSoon';

// Route to title mapping for dynamic header
const routeTitles: Record<string, string> = {
  '/agenda-secretaria': 'Agenda de Hoy',
  '/agenda-medico': 'Agenda Médica',
  '/calendario': 'Calendario',
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
  '/admin/reports/appointments': 'Reporte de Citas',
  '/inbox': 'Bandeja',
  '/configuracion/promociones': 'Promociones',
  '/configuracion/quick-replies': 'Respuestas rápidas'
};
const getPageTitle = (pathname: string): string => {
  // Exact match first
  if (routeTitles[pathname]) return routeTitles[pathname];

  // Pattern matches for dynamic routes
  if (pathname.startsWith('/pacientes/')) return 'Detalle Paciente';
  if (pathname.startsWith('/admin/users/')) return 'Editar Usuario';
  if (pathname.startsWith('/admin/doctors/') && pathname.includes('/schedule')) return 'Horarios';
  if (pathname.startsWith('/admin/doctors/') && pathname.includes('/bloqueos')) return 'Bloqueos de Horario';
  if (pathname.startsWith('/configuracion/')) return 'Configuración';
  return 'Calendario';
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
    isAdminOrSecretary,
    isAdminDoctor,
    adminView,
    setAdminView,
    organizationId,
  } = useCurrentUser();

  // Badge global de Bandeja: derivado del InboxContext (misma fuente de
  // verdad que la lista del inbox — sin lag entre badge y burbuja).
  const { unreadCount: inboxUnread } = useInbox();

  // Badge promociones expirando en proximos 3 dias (Sprint 5)
  const { count: expiringPromos } = usePromotionsExpiringSoon(
    organizationId ?? undefined,
    { withinDays: 3, enabled: isAdminOrSecretary },
  );

  // Keep admin menu open if current route is an admin route
  const isAdminRoute = location.pathname.startsWith('/admin');
  const [adminMenuOpen, setAdminMenuOpen] = useState(isAdminRoute);

  // Auto-open admin menu when navigating to admin routes
  useEffect(() => {
    if (isAdminRoute) {
      setAdminMenuOpen(true);
    }
  }, [isAdminRoute]);

  // Al abrir el menu movil, posicionar el scroll sobre la opcion activa antes
  // del primer paint (salto instantaneo, sin animacion visible para el usuario).
  const navScrollRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!mobileMenuOpen) return;
    const raf = requestAnimationFrame(() => {
      navScrollRef.current
        ?.querySelector('[aria-current="page"]')
        ?.scrollIntoView({ block: 'center' });
    });
    return () => cancelAnimationFrame(raf);
  }, [mobileMenuOpen]);
  const handleLogout = async () => {
    await supabase.auth.signOut();
    navigate('/login');
  };

  // Define navigation items based on user role
  const getNavigationItems = () => {
    const items = [];

    // Secretary
    if (isSecretary) {
      items.push({
        to: '/inbox',
        label: 'Bandeja',
        icon: InboxIcon,
        badge: inboxUnread
      }, {
        to: '/calendario',
        label: 'Calendario',
        icon: CalendarDays
      }, {
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
        to: '/configuracion/promociones',
        label: 'Promociones',
        icon: Sparkles,
        badge: expiringPromos
      });
    }

    // Admin-doctor in Vista Médico: show doctor nav
    if (isAdminDoctor && adminView === 'doctor') {
      items.push({
        to: '/calendario',
        label: 'Calendario',
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
        label: 'Mi Configuración',
        icon: Settings
      });
    }

    // Admin (not in doctor view): Bandeja, Calendario primero, Agenda de Hoy, Nueva Cita, Pacientes
    if (isAdmin && !(isAdminDoctor && adminView === 'doctor')) {
      items.push({
        to: '/inbox',
        label: 'Bandeja',
        icon: InboxIcon,
        badge: inboxUnread
      }, {
        to: '/calendario',
        label: 'Calendario',
        icon: CalendarDays
      }, {
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
        to: '/configuracion/promociones',
        label: 'Promociones',
        icon: Sparkles,
        badge: expiringPromos
      });
    }

    // Doctor (independent, not admin)
    if (isDoctor && !isAdmin) {
      items.push({
        to: '/calendario',
        label: 'Calendario',
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
      to: '/admin/motor',
      label: 'Motor',
      icon: Cog
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
            <span className="flex-1">{item.label}</span>
            {'badge' in item && typeof item.badge === 'number' && item.badge > 0 && (
              <span className="ml-auto min-w-[1.25rem] h-5 px-1.5 rounded-full bg-primary text-primary-foreground text-xs font-semibold inline-flex items-center justify-center">
                {item.badge > 99 ? '99+' : item.badge}
              </span>
            )}
          </NavLink>)}

        {/* Admin collapsible menu — hidden when admin-doctor is in Vista Médico */}
        {isAdmin && !(isAdminDoctor && adminView === 'doctor') && <Collapsible open={adminMenuOpen} onOpenChange={setAdminMenuOpen}>
            <CollapsibleTrigger className="flex items-center gap-3 px-4 py-3 rounded-lg text-muted-foreground hover:text-foreground hover:bg-accent transition-colors w-full">
              <Settings className="h-5 w-5" />
              <span className="flex-1 text-left">Administrador</span>
              <ChevronDown className={`h-4 w-4 transition-transform ${adminMenuOpen ? 'rotate-180' : ''}`} />
            </CollapsibleTrigger>
            <CollapsibleContent className="mt-1">
              {adminSubmenuItems.map(item => <NavLink key={item.to} to={item.to} className="flex items-center gap-3 pl-12 pr-4 py-2 rounded-lg text-sm text-muted-foreground hover:text-foreground hover:bg-accent transition-colors" activeClassName="bg-primary/10 text-primary font-medium" onClick={onClick} end={item.to === '/admin'}>
                  <item.icon className="h-4 w-4" />
                  <span>{item.label}</span>
                </NavLink>)}
            </CollapsibleContent>
          </Collapsible>}

        {/* Vista toggle — only for admin-doctors */}
        {isAdminDoctor && (
          <div className="mt-4 pt-3 border-t">
            <div className="flex rounded-md border overflow-hidden text-xs">
              <button
                className={cn(
                  "flex-1 py-1.5 flex items-center justify-center gap-1.5 transition-colors",
                  adminView === 'doctor'
                    ? "bg-primary text-primary-foreground"
                    : "text-muted-foreground hover:bg-muted"
                )}
                onClick={() => setAdminView('doctor')}
              >
                <Stethoscope className="h-3 w-3" /> Médico
              </button>
              <button
                className={cn(
                  "flex-1 py-1.5 flex items-center justify-center gap-1.5 transition-colors",
                  adminView === 'admin'
                    ? "bg-primary text-primary-foreground"
                    : "text-muted-foreground hover:bg-muted"
                )}
                onClick={() => setAdminView('admin')}
              >
                <Building2 className="h-3 w-3" /> Administrador
              </button>
            </div>
          </div>
        )}
      </nav>;
  };
  return <div className="h-dvh flex flex-col md:flex-row overflow-hidden">
      {/* Mobile Header */}
      <header className="md:hidden fixed top-0 left-0 z-40 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
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
                <div ref={navScrollRef} className="mt-4 flex-1 min-h-0 overflow-y-auto">
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
      <main className={cn("flex-1 min-h-0 pt-16 md:pt-0", mainClassName ?? "overflow-auto")}>
        {children}
      </main>
    </div>;
}