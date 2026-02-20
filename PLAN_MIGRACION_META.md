# Plan de Cierre: Migración Twilio → Meta Cloud API (Project Harmony)

> **Fecha:** 2026-02-20 | **Proyecto Supabase:** `soxrlxvivuplezssgssq`
> **Estado:** Meta Cloud API **EN PRODUCCIÓN**. Cutover completado.

---

## ESTADO ACTUAL (verificado en DB prod 2026-02-20)

### Cutover completado
- `whatsapp_lines.provider = 'meta'`, credenciales Meta configuradas
- 46 mensajes Meta procesados (35 outbound, 11 inbound)
- 32 delivered, 3 failed en últimos 3 días
- meta-webhook v8 y messaging-gateway v7 activos

### Ya completado (sesiones anteriores)
| Paso | Descripción | Estado |
|------|-------------|--------|
| Paso 1 | RLS en `template_mappings` y `whatsapp_templates` | ✅ Migración aplicada |
| Paso 2 | Triple-mode auth en gateway + `INTERNAL_FUNCTION_SECRET` | ✅ Deployado en 5 funciones |
| Fase 3 | Cutover a Meta (credenciales, webhook, flip) | ✅ En producción |

### Problemas detectados
1. **message_logs sin org/line**: Los 46 mensajes Meta tienen `organization_id = NULL` y `whatsapp_line_id = NULL`
2. **meta-webhook sin idempotencia**: reintentos de Meta pueden causar duplicados
3. **CORS wildcard**: Todas las funciones usan `Access-Control-Allow-Origin: *`
4. **Security advisor**: `bot_sessions`, `meta_oauth_states` sin RLS policies; `bot_analytics_summary` SECURITY DEFINER; funciones con search_path mutable
5. **Twilio legacy activo**: `whatsapp-inbound-webhook` y `twilio-message-status-webhook` siguen deployados y accesibles

---

## PASOS PENDIENTES

### Paso 3: Enriquecer `message_logs` con `organization_id` y `whatsapp_line_id`
- **Prioridad:** ALTA — rompe billing multi-tenant y reportes por org
- **Scope:** `message-logger.ts` + `messaging-gateway/index.ts` + `meta-webhook/index.ts`
- **Cambios:**
  - `message-logger.ts`: agregar `organizationId` y `whatsappLineId` al interface y al insert
  - `messaging-gateway/index.ts`: pasar `line.organization_id` y `line.id` al logger; agregar `organization_id` al select de `getActiveLine()`
  - `meta-webhook/index.ts`: buscar línea por `meta_phone_number_id`, pasar org_id y line_id a `logMessage()`
- **Backfill SQL post-deploy:**
  ```sql
  -- Backfill: asignar org y line a todos los logs sin ellos
  UPDATE message_logs ml
  SET whatsapp_line_id = wl.id, organization_id = wl.organization_id
  FROM whatsapp_lines wl
  WHERE ml.whatsapp_line_id IS NULL AND wl.is_active = true;

  -- Backfill inbound sin org: resolver desde paciente
  UPDATE message_logs ml
  SET organization_id = p.organization_id
  FROM patients p
  WHERE ml.organization_id IS NULL AND ml.patient_id = p.id;
  ```
- **Deploy:** messaging-gateway + meta-webhook
- **QA:** Crear cita → verificar que `message_logs` nuevo tiene `organization_id` y `whatsapp_line_id` NOT NULL

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
Inmediato:     [Paso 3] → [Paso 5 + Paso 6 en paralelo]
Cuando se sepa URL frontend: [Paso 7]
Después de 1+ semana estable: [Paso 12]
```

### Tiempo estimado: ~3h de desarrollo para Pasos 3+5+6
