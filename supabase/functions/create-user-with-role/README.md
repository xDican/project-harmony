# Edge Function: create-user-with-role

## Descripción

Esta función serverless (Edge Function) de Supabase permite la creación robusta de usuarios del sistema (administradores, secretarias y médicos) desde el panel de administración.

## Características

- ✅ **Solo accesible por administradores**: Valida que el usuario autenticado tenga rol `admin`
- ✅ **Validación completa de inputs**: Email, password, role y doctorId (cuando aplica)
- ✅ **Creación en Auth + BD**: Crea usuario en Supabase Auth y luego en `public.users`
- ✅ **Limpieza automática**: Elimina usuarios "huérfanos" de Auth si falla la inserción en BD
- ✅ **Manejo robusto de errores**: Retorna mensajes claros para cada caso de error
- ✅ **Documentación detallada**: Código comentado en zonas críticas

## Flujo de Ejecución

1. **Validación JWT**: Verifica token de autenticación del usuario
2. **Verificación de rol**: Confirma que el usuario autenticado es admin
3. **Validación de inputs**: 
   - Email válido
   - Password mínimo 6 caracteres
   - Role válido (admin/secretary/doctor)
   - doctorId requerido si role = doctor
4. **Creación en Auth**: Usa Admin API con `service_role` para crear usuario
5. **Inserción en BD**: Inserta registro en `public.users` con rol y doctor_id
6. **Limpieza si falla**: Si la inserción falla, elimina el usuario de Auth
7. **Respuesta**: Retorna usuario creado o error detallado

## Request

**Método**: POST  
**Headers**:
- `Authorization: Bearer <jwt_token>` (del admin autenticado)
- `Content-Type: application/json`

**Body**:
```json
{
  "email": "nuevo@ejemplo.com",
  "password": "password123",
  "role": "doctor",
  "doctorId": "uuid-del-medico"  // Solo si role = doctor
}
```

## Response

### Éxito (200)
```json
{
  "success": true,
  "user": {
    "id": "uuid-generado",
    "email": "nuevo@ejemplo.com",
    "role": "doctor",
    "doctorId": "uuid-del-medico"
  }
}
```

### Errores

**401 - No autenticado**
```json
{
  "error": "No se proporcionó token de autenticación"
}
```

**403 - No autorizado**
```json
{
  "error": "Solo los administradores pueden crear usuarios"
}
```

**400 - Datos inválidos**
```json
{
  "error": "doctorId es requerido cuando el role es \"doctor\""
}
```

**500 - Error del servidor**
```json
{
  "error": "Error al crear usuario en autenticación: <detalles>",
  "details": "..."
}
```

## Variables de Entorno Requeridas

La función requiere las siguientes variables de entorno (configuradas automáticamente por Supabase):
- `SUPABASE_URL`: URL del proyecto Supabase
- `SUPABASE_ANON_KEY`: Anon key para validar tokens
- `SUPABASE_SERVICE_ROLE_KEY`: Service role key para operaciones admin

## Deployment

Para desplegar esta función a Supabase:

```bash
# Instalar Supabase CLI
npm install -g supabase

# Login
supabase login

# Link al proyecto
supabase link --project-ref soxrlxvivuplezssgssq

# Desplegar función
supabase functions deploy create-user-with-role
```

## Testing Local

Para probar localmente:

```bash
# Iniciar funciones locales
supabase functions serve create-user-with-role

# Hacer request
curl -X POST http://localhost:54321/functions/v1/create-user-with-role \
  -H "Authorization: Bearer <admin-jwt>" \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@example.com",
    "password": "password123",
    "role": "secretary"
  }'
```

## Seguridad

- ✅ Validación de JWT en cada request
- ✅ Verificación de rol admin antes de procesar
- ✅ Uso de `service_role` solo para operaciones que lo requieren
- ✅ Validación de inputs para prevenir inyección
- ✅ CORS configurado para seguridad
- ✅ Limpieza de datos huérfanos para evitar inconsistencias

## Mantenimiento

### Logs
Los logs están disponibles en el dashboard de Supabase:
Dashboard > Edge Functions > create-user-with-role > Logs

### Errores Comunes
1. **Usuario huérfano**: Si ves el error "Usuario creado en Auth pero no en BD", revisa las políticas RLS de la tabla `users`
2. **Token inválido**: Verifica que el frontend esté enviando el header `Authorization` correctamente
3. **doctorId inválido**: Asegúrate de que el doctor exista en la tabla `doctors`

## Integración con Frontend

El frontend ya está preparado para usar esta función en:
`src/pages/admin/CreateUser.tsx`

```typescript
const { data, error } = await supabase.functions.invoke('create-user-with-role', {
  body: {
    email,
    password,
    role,
    doctorId: role === 'doctor' ? selectedDoctorId : null,
  },
});
```
