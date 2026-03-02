# Estado Desarrollo — OrionCare

> Ultima actualizacion: 2 Mar 2026

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

- FAQ bot: opciones swapeadas corregidas
- 5 bugs de booking del bot corregidos (stale context, calendarId, post-cancel menu, disponibilidad real)
- Seleccion opcional de tipo de servicio en flujo de booking
- Emojis del bot actualizados, typo secretaria corregido
- Dialog de edicion de linea WhatsApp dividido en tabs General/Bot

## Notas tecnicas

- Bot de autoagenda entrando a campo con clientes reales
- Onboarding tiene wizard pero requiere activacion SuperAdmin
- Stack: React 18 + TS + Vite + Supabase + Edge Functions (Deno) + Twilio/Meta WhatsApp
