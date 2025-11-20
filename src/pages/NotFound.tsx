import { useLocation } from "react-router-dom";
import { useEffect } from "react";

const NotFound = () => {
  const location = useLocation();

  useEffect(() => {
    console.error("404 Error: User attempted to access non-existent route:", location.pathname);
  }, [location.pathname]);

  return (
    <div className="flex min-h-screen items-center justify-center bg-background">
      <div className="text-center max-w-md px-6">
        <h1 className="mb-4 text-6xl font-bold text-foreground">404</h1>
        <h2 className="mb-2 text-2xl font-semibold text-foreground">Página no encontrada</h2>
        <p className="mb-6 text-base text-muted-foreground">Esta sección todavía está en construcción.</p>
        <a 
          href="/admin" 
          className="inline-flex items-center justify-center rounded-md bg-primary px-6 py-3 text-sm font-medium text-primary-foreground hover:bg-primary/90 transition-colors"
        >
          Volver al Dashboard
        </a>
      </div>
    </div>
  );
};

export default NotFound;
