import { ReactNode, useState } from 'react';
import { NavLink } from '@/components/NavLink';
import { Button } from '@/components/ui/button';
import { Sheet, SheetContent, SheetTrigger } from '@/components/ui/sheet';
import { Menu, Calendar, PlusCircle, Users, Stethoscope, Settings } from 'lucide-react';

interface MainLayoutProps {
  children: ReactNode;
}

const navigationItems = [
  { to: '/agenda-secretaria', label: 'Agenda de Hoy', icon: Calendar },
  { to: '/citas/nueva', label: 'Nueva Cita', icon: PlusCircle },
  { to: '/pacientes', label: 'Pacientes', icon: Users },
  { to: '/agenda-medico', label: 'Agenda Médico', icon: Stethoscope },
  { to: '/admin', label: 'Admin', icon: Settings },
];

/**
 * MainLayout - Responsive layout wrapper with navigation
 * Provides a sidebar on desktop and a hamburger menu on mobile
 */
export default function MainLayout({ children }: MainLayoutProps) {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const NavigationLinks = ({ onClick }: { onClick?: () => void }) => (
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

  return (
    <div className="min-h-screen flex flex-col md:flex-row">
      {/* Mobile Header */}
      <header className="md:hidden sticky top-0 z-40 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="flex h-16 items-center justify-between px-4">
          <h1 className="text-xl font-bold text-foreground">Agenda Médica</h1>
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
      </header>

      {/* Desktop Sidebar */}
      <aside className="hidden md:flex md:flex-col md:w-64 border-r bg-card">
        <div className="sticky top-0 flex flex-col h-screen">
          <div className="flex items-center h-16 px-6 border-b">
            <h1 className="text-xl font-bold text-foreground">Agenda Médica</h1>
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
