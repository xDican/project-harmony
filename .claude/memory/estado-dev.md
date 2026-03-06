# Estado Desarrollo — OrionCare

> Ultima actualizacion: 6 Mar 2026

## Fase actual

Feature freeze (Mar-May 2026). Solo bugs, seguridad y polish.

## Backlog urgente

### Seguridad (resolver primera semana de Marzo)
- [ ] Vista `bot_analytics_summary`: cambiar SECURITY DEFINER a INVOKER
- [ ] 10 funciones sin `search_path` fijo: agregar `SET search_path = ''`
- [ ] Habilitar leaked password protection en Supabase Auth settings
- [ ] 4 tablas sin RLS policies: documentar (son service_role only)

### Limpieza
- [ ] Remover `lovable-tagger` de devDependencies en package.json

## Bugs conocidos

(Ninguno reportado actualmente — pendiente feedback de clientes en campo)

## Resuelto recientemente

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

## Pendiente nuevo

- [ ] Flujo "DEMO" en el bot: cuando reciba "DEMO" dar contexto guiado para doctor (blocker para ads)
- [ ] Verificar webhook: WABA 1491078449281051 debe apuntar a whatsapp-inbound-webhook de Supabase
- [ ] Borrar templates rotos de Meta (5 con sufijo _040326_114943) — requiere permisos de Business Admin, no System User

## Notas tecnicas

- Bot de autoagenda entrando a campo con clientes reales
- Onboarding tiene wizard pero requiere activacion SuperAdmin
- Stack: React 18 + TS + Vite + Supabase + Edge Functions (Deno) + Twilio/Meta WhatsApp
- Landing page: prompt maestro creado para actualizar contenido en Lovable (4 Mar). CTAs apuntan a wa.me/+50433899824
- Seguridad: backlog sigue pendiente, priorizar en proxima sesion dev
- Al crear templates via curl en Windows, los emojis/acentos se corrompen. Solucion: reusar templates legacy existentes o usar Unicode escapes (\uXXXX)
