# Estado Desarrollo — OrionCare

> Ultima actualizacion: 6 Mar 2026

## Fase actual

Feature freeze (Mar-May 2026). Solo bugs, seguridad y polish.

## Sprint mini — progreso (aprobado 6 Mar, max 2-3 dias)

| # | Item | Estado |
|---|------|--------|
| 1 | Secretaria no puede crear pacientes | DONE (d8fffc2) |
| 2 | Bloquear fechas especificas | PENDIENTE — operacional critico para Dra. Yeni |
| 3 | UI medico unico (ocultar dropdowns innecesarios) | PENDIENTE |
| 4 | Completar hand-off a secretaria/doctor | DONE (f9e263d) |

## Backlog

### Seguridad
- [ ] Vista `bot_analytics_summary`: cambiar SECURITY DEFINER a INVOKER
- [ ] 10 funciones sin `search_path` fijo: agregar `SET search_path = ''`
- [ ] Habilitar leaked password protection en Supabase Auth settings
- [ ] 4 tablas sin RLS policies: documentar (son service_role only)

### Producto (blocker para ads)
- [ ] Flujo "DEMO" en el bot: cuando reciba "DEMO" dar contexto guiado para doctor

### Limpieza
- [ ] Remover `lovable-tagger` de devDependencies en package.json

## Bugs conocidos

(Ninguno reportado actualmente — pendiente feedback de clientes en campo)

## Resuelto recientemente

- Handoff WhatsApp notification completado (6 Mar):
  - Template canonico `handoff_notification` (solicitud_atencion_paciente) agregado
  - `messaging-gateway` acepta tipo `handoff_notification`
  - `bot-handler` notifica al target (secretaria o doctor) via WhatsApp fire-and-forget
  - Resuelve target segun `bot_handoff_type`: secretary→org_members→secretaries.phone, doctor→whatsapp_line_doctors→doctors.phone
  - UI auto-detecta si org tiene secretaria activa; fuerza handoff a doctor si no
  - Templates creados en Meta para las 3 orgs (PENDING aprobacion):
    - Consultorio Familiar: `solicitud_atencion_paciente_060326_235901` (meta_id: 2122880248326847)
    - Dr Guevara: `solicitud_atencion_paciente_060326_235902` (meta_id: 900073702633323)
    - Demo Bot: `solicitud_atencion_paciente_060326_235903` (meta_id: 2684167388611076)
  - template_mappings insertados en DB para las 3 lineas
  - Deploy: bot-handler + messaging-gateway
  - Commit: f9e263d, pushed to main
- Phones verificados: Elena (secretaria Dra Yeni) +50497825738, Wilmer Guevara 99919187, Diego +50412312313, Ana Lopez +50433899824. Dra Yeni sin phone pero su handoff va a secretaria.
- Bot muestra 10 slots por pagina en vez de 5 (PAGE_SIZE, emojis 8→12). Deploy hecho.
- Linea "Demo Bot" (+50493133496) configurada manualmente en org TEsting (c8b1c83b)
  - Registro Meta Cloud API completado (PIN: 246810)
  - Templates: apuntados a legacy templates ya aprobados (encoding UTF-8 correcto)
  - Fix: trailing underscore en template confirmation causaba error #132001
  - Linea vieja duplicada eliminada (org 2edd8692)
- FAQ bot: opciones swapeadas corregidas
- 5 bugs de booking del bot corregidos (stale context, calendarId, post-cancel menu, disponibilidad real)
- Seleccion opcional de tipo de servicio en flujo de booking
- Emojis del bot actualizados, typo secretaria corregido
- Dialog de edicion de linea WhatsApp dividido en tabs General/Bot

## Pendiente

- [ ] **QA handoff notification**: esperar aprobacion de Meta templates, luego probar con Demo Bot (+50493133496). Verificar que doctor/secretaria recibe WhatsApp con datos del paciente
- [ ] Dra. Yeni Ramos no tiene phone en tabla doctors — agregar si algun dia cambian handoff a doctor
- [ ] `TBD_LEGACY_NAME` en canonical-templates.ts para WABA OrionCare — no urgente, no se usa con bot
- [ ] Verificar webhook: WABA 1491078449281051 debe apuntar a whatsapp-inbound-webhook de Supabase
- [ ] Borrar templates rotos de Meta (5 con sufijo _040326_114943) — requiere permisos de Business Admin, no System User

## Notas tecnicas

- Bot de autoagenda entrando a campo con clientes reales
- Onboarding tiene wizard pero requiere activacion SuperAdmin
- Stack: React 18 + TS + Vite + Supabase + Edge Functions (Deno) + Twilio/Meta WhatsApp
- Landing page: prompt maestro creado para actualizar contenido en Lovable (4 Mar). CTAs apuntan a wa.me/+50433899824
- Seguridad: backlog sigue pendiente, priorizar en proxima sesion dev
- Al crear templates via curl en Windows, los emojis/acentos se corrompen. Solucion: reusar templates legacy existentes o usar Unicode escapes (\uXXXX)
- Supabase project ref: `soxrlxvivuplezssgssq` (en config.toml). Deploy CLI: `npx supabase functions deploy <name> --project-ref soxrlxvivuplezssgssq --no-verify-jwt`
- Org de prueba es c8b1c83b (OrionCare), NO se usa la WABA legacy de OrionCare (1292296356040815)
