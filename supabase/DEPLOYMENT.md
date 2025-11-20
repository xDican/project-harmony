# 🚀 Guía de Deployment - Supabase Edge Functions

Esta guía explica cómo desplegar las Edge Functions de Supabase a producción.

## Prerrequisitos

1. **Instalar Supabase CLI**
   ```bash
   npm install -g supabase
   ```

2. **Autenticarse**
   ```bash
   supabase login
   ```

3. **Vincular al proyecto**
   ```bash
   cd /path/to/project-harmony
   supabase link --project-ref soxrlxvivuplezssgssq
   ```

## Desplegar Edge Functions

### Desplegar todas las funciones
```bash
supabase functions deploy
```

### Desplegar una función específica
```bash
supabase functions deploy create-user-with-role
```

## Verificar Deployment

1. **Ver logs en tiempo real**
   ```bash
   supabase functions logs create-user-with-role --follow
   ```

2. **Verificar en Dashboard**
   - Ir a: https://supabase.com/dashboard/project/soxrlxvivuplezssgssq
   - Navegar a: Edge Functions
   - Verificar estado y logs de `create-user-with-role`

## Testing en Producción

Después del deployment, puedes probar la función usando:

```bash
curl -X POST https://soxrlxvivuplezssgssq.supabase.co/functions/v1/create-user-with-role \
  -H "Authorization: Bearer <ADMIN_JWT_TOKEN>" \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@example.com",
    "password": "password123",
    "role": "secretary"
  }'
```

O desde el frontend de la aplicación:
1. Login como admin
2. Ir a `/admin/usuarios/nuevo`
3. Llenar el formulario y crear un usuario

## Variables de Entorno

Las Edge Functions en Supabase tienen acceso automático a:
- `SUPABASE_URL`: URL del proyecto
- `SUPABASE_ANON_KEY`: Anon key pública
- `SUPABASE_SERVICE_ROLE_KEY`: Service role key (solo en server-side)

**No es necesario configurar estas variables manualmente**, Supabase las inyecta automáticamente.

## Troubleshooting

### Función no aparece en el dashboard
- Verifica que el deployment fue exitoso
- Refresca el dashboard
- Revisa los logs de deployment: `supabase functions deploy --debug`

### Error 404 al invocar la función
- Verifica que el nombre de la función es correcto: `create-user-with-role`
- Confirma que la función fue desplegada: `supabase functions list`

### Error 401 en producción
- Verifica que el token JWT del admin es válido
- Confirma que el usuario existe en la tabla `users` con role `admin`

### Error 500 al crear usuario
- Revisa los logs: `supabase functions logs create-user-with-role`
- Verifica que la tabla `users` existe y tiene las columnas correctas
- Confirma que las políticas RLS permiten la inserción (con service_role esto debería bypassearse)

## Desarrollo Local

Para probar localmente antes de desplegar:

```bash
# Iniciar Supabase localmente
supabase start

# Servir la función localmente
supabase functions serve create-user-with-role

# La función estará disponible en:
# http://localhost:54321/functions/v1/create-user-with-role
```

## CI/CD (Opcional)

Para deployment automático en GitHub Actions:

```yaml
name: Deploy Edge Functions

on:
  push:
    branches: [main]
    paths:
      - 'supabase/functions/**'

jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      
      - name: Setup Supabase CLI
        uses: supabase/setup-cli@v1
        
      - name: Deploy Functions
        run: supabase functions deploy --project-ref ${{ secrets.SUPABASE_PROJECT_REF }}
        env:
          SUPABASE_ACCESS_TOKEN: ${{ secrets.SUPABASE_ACCESS_TOKEN }}
```

## Mejores Prácticas

1. **Siempre probar localmente** antes de desplegar a producción
2. **Revisar logs** después de cada deployment
3. **Mantener documentación actualizada** cuando agregues nuevas funciones
4. **Versionar funciones** si haces cambios breaking (ej: `create-user-with-role-v2`)
5. **Monitorear uso** desde el dashboard de Supabase

## Recursos Adicionales

- [Documentación oficial de Edge Functions](https://supabase.com/docs/guides/functions)
- [Ejemplos de Edge Functions](https://github.com/supabase/supabase/tree/master/examples/edge-functions)
- [Best Practices](https://supabase.com/docs/guides/functions/best-practices)
