# OrionCare

SaaS de gestion de clinicas con WhatsApp (agenda, recordatorios, bot de autoagenda).

## Fase actual

Feature freeze de Mar-May 2026 cerrado. Ahora: features nuevos SI resuelven dolor real y verificado de un cliente activo (no especulativo) — seguir el flujo de desarrollo de abajo para cualquiera. Features de nicho/vertical requieren 3+ clientes pidiéndolo aparte del caso que lo originó. Bugs y seguridad siguen siendo prioridad sobre features.

## Modos especializados

Activa un modo con su slash command para obtener experticia enfocada:

| Modo | Comando | Cuando usarlo |
|------|---------|---------------|
| Desarrollo | `/project:modo-dev` | Bugs, seguridad, polish tecnico |
| Ads | `/project:modo-ads` | Campanas Meta, metricas, creativos |
| Contenido | `/project:modo-contenido` | Copy para ads, posts, scripts de venta |
| Estrategia | `/project:modo-estrategia` | Decisiones de negocio, datos, prioridades |
| Seguimiento | `/project:modo-seguimiento` | Redactar mensajes de follow-up a leads |
| Revision semanal | `/project:modo-revision` | Viernes: reporte cruzado de todas las areas |

## Reglas universales

1. **Feature freeze:** No agregar features nuevos hasta Junio 2026
2. **80/20:** Automatizar el 80%, hacer manual solo el 20% critico
3. **Meta:** 175 clientes a $40/mes = $7,000/mes
4. **Tiempo:** Max 4-5 horas/dia, familia es prioridad
5. **Idioma:** Responder siempre en espanol

## Flujo de desarrollo (obligatorio para cada feature nuevo)

El contrato es: **BD define la verdad → hook la expone → UI la consume.** Invertir ese orden genera bugs silenciosos de RLS y refactors costosos. Adaptado del framework usado en Aurora PMS (otro proyecto propio) a los patrones reales de este repo — ver verificaciones abajo antes de asumir nada de otro proyecto.

Antes de fijar las fases de cualquier feature de tamaño medio/grande, seguir el hábito ya usado en los planes grandes de este repo (`motor-agendamiento-multirecurso.md`, `rediseno-nueva-cita-ui.md`): validar los supuestos contra el código real (leer los archivos o lanzar exploradores) y dejar un apartado de "hallazgos que corrigen el plan" ANTES de escribir fases. Fase 0 de abajo es esa conversación; Fase 1-4 no arrancan hasta que Fase 0 tenga criterio de salida cumplido.

---

### Fase 0 — Define

Antes de abrir cualquier archivo, recorrer estos seis puntos en conversación. El objetivo es llegar a Fase 1 con el schema casi diseñado, no con preguntas abiertas.

1. **Una oración:** ¿Qué hace el feature? Si no cabe en una oración, fragmentarlo.
2. **Actores y permisos:** OrionCare tiene 3 roles (`admin`, `secretary`, `doctor`, enum `app_role`). Para cada uno: qué puede crear/editar/cancelar/configurar. Además del rol, **el eje de aislamiento por organización** (multi-tenant real: varias clínicas/médicos comparten schema) y, si el feature toca datos de médicos dentro de una MISMA org (caso hub/silla-compartida), **el aislamiento entre doctores de esa org** — ver el gap real encontrado 21 Jul (`whatsapp_line_doctors` no filtraba mensajería por doctor, solo por organización).
3. **Entidades y relaciones:** nombrar cada entidad, decidir si ya existe en el schema o es nueva. Revisar primero (no asumir): p.ej. `doctor_schedules` ya existe pero solo modela horario semanal recurrente, no excepciones puntuales.
4. **Ciclo de vida:** estados y transiciones (`estado_a → estado_b`), quién las dispara, qué las bloquea. Transiciones con condiciones complejas → función `SECURITY DEFINER` o trigger (patrón real: `validate_appointment_resource_capacity`).
5. **Cálculos y reglas de negocio:** fórmulas explícitas, qué combinaciones son inválidas, si la regla vive en BD (constraint/trigger) o en el cliente. Nunca hardcodear precios/config — deben ser campos configurables por el admin.
6. **Casos límite:** listarlos explícitos — se vuelven casos de verificación en Fase 4.

**Anti-scope-creep:** cerrar Fase 0 con una lista explícita de lo que NO se hace ahora. Ejemplo real: el plan del motor (jun 2026) listó "excepciones de horario/feriados" como fuera de alcance — hoy es justo lo que se pide, señal de revisar esa lista cuando cambian las circunstancias, no de ignorarla para siempre.

**Criterio de salida:** cada entidad tiene sus campos principales identificados y cada regla tiene claro si vive en BD o cliente.

---

### Fase 1 — Schema y RLS

- **Antes de escribir SQL, entrar en plan mode.** Proponer la migración completa y obtener aprobación antes de aplicarla.
- **Leer lo que ya existe primero:** `list_tables`/`execute_sql` vía Supabase MCP (project `soxrlxvivuplezssgssq`) + `supabase/migrations/`. Proponer el diseño mínimo.
- Columnas con criterio: cada una se justifica con un caso de uso de Fase 0. Tipo, nullability, default, constraint — explícitos.
- **RLS con los 3 roles + el eje de organización:** patrón real —
  - `has_role(auth.uid(), 'admin'::app_role)` para operaciones privilegiadas.
  - `organization_id IN (SELECT public.get_user_organizations(auth.uid()))` para scoping multi-tenant (toda tabla nueva lo necesita).
  - Si aplica aislamiento por doctor dentro de la org, agregarlo como condición extra, no asumir que el scoping de organización basta (ver punto 2 de Fase 0).
- **Postgres vs cliente:** si la regla requiere permisos elevados o protege integridad (overlaps, capacidad, estados) → función/trigger `SECURITY DEFINER`. Para errores de negocio, usar el patrón ya vigente: `RAISE EXCEPTION 'CODIGO_SEMANTICO: detalle' USING ERRCODE = '...'` (ver `validate_appointment_resource_capacity`, código `RESOURCE_CAPACITY_EXCEEDED`) — el hook parsea `error.message` y mapea a texto amigable (este repo no tiene un `es.ts` centralizado como Aurora; el texto amigable va en el propio componente/hook).
- Nombrar migración `supabase/migrations/YYYYMMDDHHMMSS_descripcion.sql`, timestamp posterior a la última.
- Aplicar vía MCP `apply_migration` y verificar con `execute_sql` real antes de avanzar.

---

### Fase 2 — Capa de datos (TypeScript)

- **Antes de escribir código, entrar en plan mode.** Definir la interfaz del hook (qué expone: estado + mutaciones) antes de implementar.
- **Regenerar types después de cualquier migración:** MCP `generate_typescript_types` (no hay script npm en este repo) → sobrescribe `src/integrations/supabase/types.ts`.
- Seguir el patrón real (ver `useWeeklyAgenda.ts`): `useState` + `useCallback` para el fetch/mutación + `useEffect` inicial. Sin lógica de presentación en el hook.
- Probar las queries directo en Supabase (Studio o MCP `execute_sql`) antes de conectarlas al hook.

---

### Fase 3 — UI

- **Antes de escribir código, entrar en plan mode.** Definir componentes, rutas y wiring de hooks antes de tocar archivos.
- Pantalla nueva con layout propio → mockup en Google Stitch primero (ver `reference_google-stitch`), portar manteniendo los hooks reales, descartar campos que el mockup invente y no existan en el schema. Componente menor o form dentro de pantalla existente → directo en código.
- **Para agregar una página nueva (patrón real de este repo):**
  1. Crear `src/pages/NuevaPagina.tsx`.
  2. Agregar la entrada en `src/components/MainLayout.tsx` (los nav items ya están agrupados por bloque de rol, no es un campo `roles?` plano sobre una lista única).
  3. Envolver el `<Route>` en `src/App.tsx` con `<RoleBasedRoute allowedRoles={[...]}>` (el control de rol vive en el wrapper, no en un prop de `<Route>`).
- Conectar al hook real desde el primer commit — nunca datos hardcodeados como paso intermedio.
- Construir en orden: happy path → estado vacío → errores → edge cases de Fase 0.

---

### Fase 4 — Verificación

- **Antes de verificar, entrar en plan mode.** Listar los casos de prueba exactos (happy path, roles, edge cases de Fase 0) y obtener aprobación antes de ejecutarlos.
- `npx tsc --noEmit` limpio — resolver errores antes de continuar.
- **Probar como admin, luego como el rol de menor privilegio relevante** (`secretary` o `doctor` según el feature) — admin oculta problemas de RLS.
- **Si el feature toca datos que pueden pertenecer a distintos doctores de la MISMA organización** (caso hub/silla-compartida), probar también el aislamiento cruzado entre doctores — no asumir que el scoping de organización es suficiente (gap real 21 Jul).
- Revisar cada edge case de Fase 0 uno por uno — confirmar que está cubierto en código o constraint.
- Commit por fase o bloque lógico. Mensaje que explica el *por qué*, no el *qué*.
