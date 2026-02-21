# Plan de Cierre: Migración Twilio → Meta Cloud API (Project Harmony)

> **Fecha:** 2026-02-20 | **Proyecto Supabase:** `soxrlxvivuplezssgssq`
> **Estado:** Meta Cloud API **EN PRODUCCIÓN**. Cutover completado.

---

## ESTADO ACTUAL (verificado en DB prod 2026-02-20)

### Cutover completado
- `whatsapp_lines.provider = 'meta'`, credenciales Meta configuradas
- meta-webhook v9 y messaging-gateway v8 activos
- 745 message_logs: 0 con `organization_id = NULL`, 0 con `whatsapp_line_id = NULL` (backfill aplicado)

### Ya completado
| Paso | Descripción | Estado |
|------|-------------|--------|
| Paso 1 | RLS en `template_mappings` y `whatsapp_templates` | ✅ Migración aplicada |
| Paso 2 | Triple-mode auth en gateway + `INTERNAL_FUNCTION_SECRET` | ✅ Deployado en 5 funciones |
| Fase 3 | Cutover a Meta (credenciales, webhook, flip) | ✅ En producción |
| Paso 3 | Enrich `message_logs` con `organization_id` y `whatsapp_line_id` | ✅ Deployado + backfill |
| Paso 5 | meta-webhook: import estático + `Promise.allSettled` | ✅ Deployado v10 |
| Paso 6 | meta-webhook: idempotencia inbound + forward-only status | ✅ Deployado v10 |

### Problemas pendientes
1. **CORS wildcard**: Todas las funciones usan `Access-Control-Allow-Origin: *`
2. **Security advisor**: `bot_sessions`, `meta_oauth_states` sin RLS policies; `bot_analytics_summary` SECURITY DEFINER; funciones con search_path mutable
3. **Twilio legacy activo**: `whatsapp-inbound-webhook` y `twilio-message-status-webhook` siguen deployados y accesibles

---

## PASOS PENDIENTES

### ~~Paso 3: Enriquecer `message_logs` con `organization_id` y `whatsapp_line_id`~~
✅ **COMPLETADO** — messaging-gateway v8, meta-webhook v9. Backfill: 745/745 registros actualizados.

---

### ~~Paso 5: Optimizar meta-webhook (paralelo + static imports)~~
✅ **COMPLETADO** — meta-webhook v10. Import estático de `formatTimeForTemplate`; loops → `Promise.allSettled`.

---

### ~~Paso 6: Idempotencia en meta-webhook~~
✅ **COMPLETADO** — meta-webhook v10. Check de `provider_message_id` antes de procesar mensajes inbound; `STATUS_RANK` para progresión forward-only en status updates.

---

### Paso 5: Optimizar meta-webhook (paralelo + static imports)
- **Prioridad:** MEDIA — previene timeouts en batch grande
- **Scope:** `meta-webhook/index.ts`
- **Cambios:**
  1. Import dinámico `await import("../_shared/datetime.ts")` → import estático al inicio
  2. Loops secuenciales → `Promise.allSettled`
- **Deploy:** meta-webhook
- **Depende de:** Paso 3 (para que el logging de org_id ya esté integrado)

---

### Paso 6: Idempotencia en meta-webhook
- **Prioridad:** MEDIA — previene duplicados si Meta reintenta
- **Scope:** `meta-webhook/index.ts`
- **Cambios:**
  - En `handleIncomingMessage`: check `message_logs.provider_message_id` antes de procesar
  - En `handleStatusUpdate`: solo actualizar si es progresión forward (sent→delivered→read)
- **Deploy:** meta-webhook
- **QA:** Enviar mismo webhook 2 veces → solo 1 row en message_logs

---

### Paso 7: Restringir CORS (OPCIONAL)
- **Prioridad:** BAJA — mitigado por auth en gateway
- **Scope:** `_shared/cors.ts` + funciones webhook
- **Cambios:** `*` → origen(es) específico(s) del frontend
- **NOTA:** Requiere conocer la URL exacta del frontend en producción
- **Deploy:** Todas las funciones que usan cors.ts

---

### Paso 12: Descomisionar Twilio
- **Prioridad:** BAJA — solo después de 1+ semana estable en Meta
- **Acciones:**
  1. En Twilio Console: remover webhook URLs
  2. NO eliminar las Edge Functions (mantener como safety net)
  3. Frontend: `DebugWhatsappPage` → cambiar "Twilio SID" por "Message ID"
  4. Frontend: `api.supabase.ts` → loguear `providerMessageId` en vez de `twilioSid`
- **Deploy:** Frontend (Vercel auto-deploy)

---

## PASOS DESCARTADOS (ya no aplican)

| Paso original | Razón de descarte |
|---------------|-------------------|
| Paso 4: Firma Twilio en whatsapp-inbound-webhook | Twilio ya no es el provider activo. Se descomisionará en Paso 12. |
| Paso 8-11: Cutover a Meta | Ya completado directamente por el usuario. |

---

## ORDEN DE EJECUCIÓN

```
✅ Completados: Paso 3, Paso 5, Paso 6
Cuando se sepa URL frontend: [Paso 7 - CORS]
Después de 1+ semana estable: [Paso 12 - Decommission Twilio]
```
