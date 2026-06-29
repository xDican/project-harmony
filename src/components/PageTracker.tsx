import { useEffect, useRef } from 'react';
import { useLocation } from 'react-router-dom';
import { useCurrentUser } from '../context/UserContext';
import { supabase } from '../lib/supabaseClient';

/**
 * Normaliza la ruta colapsando los segmentos dinamicos (UUIDs e ids numericos)
 * a `:id`, para que `/pacientes/<uuid>` y `/pacientes/<otro-uuid>` se agrupen
 * como `/pacientes/:id` y no exploten la cardinalidad del tracking.
 */
function normalizePath(pathname: string): string {
  return pathname
    .replace(/\/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/gi, '/:id')
    .replace(/\/\d+/g, '/:id');
}

/**
 * Tracking sencillo de navegacion. Registra una fila en `page_views` cada vez
 * que un usuario autenticado entra a una ruta nueva. Fire-and-forget: nunca
 * bloquea la UI ni muestra errores al usuario.
 *
 * Debe montarse dentro de <BrowserRouter> y de <UserProvider>.
 */
export function PageTracker() {
  const { pathname } = useLocation();
  const { user, organizationId } = useCurrentUser();
  // Evita registrar dos veces la misma ruta (StrictMode dispara efectos x2,
  // y re-renders del provider no deben generar filas duplicadas).
  const lastTracked = useRef<string | null>(null);

  useEffect(() => {
    if (!user) return;

    const path = normalizePath(pathname);
    const key = `${user.id}|${path}`;
    if (lastTracked.current === key) return;
    lastTracked.current = key;

    // page_views aun no esta en los tipos generados (telemetria interna);
    // insert puntual sin tipar. No await: no debe bloquear la navegacion.
    // OJO: el builder de supabase-js v2 es un *thenable* (tiene `.then`) pero
    // NO tiene `.catch()` — usar `.catch` aqui lanza "catch is not a function"
    // y tumba la app. Se traga el error con el 2do argumento de `.then`.
    void (supabase as unknown as {
      from: (t: string) => {
        insert: (v: Record<string, unknown>) => PromiseLike<unknown>;
      };
    })
      .from('page_views')
      .insert({
        user_id: user.id,
        organization_id: organizationId,
        path,
        role: user.role,
      })
      // Swallow: el tracking nunca debe romper la app.
      .then(undefined, () => {});
  }, [pathname, user, organizationId]);

  return null;
}
