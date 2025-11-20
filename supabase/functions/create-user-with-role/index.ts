/**
 * Supabase Edge Function: create-user-with-role
 * 
 * Crea usuarios (admin/secretary/doctor) desde el panel de administración.
 * Solo accesible por administradores autenticados.
 * 
 * Flujo:
 * 1. Valida JWT del admin autenticado
 * 2. Valida inputs (email, password, role, doctorId si role=doctor)
 * 3. Crea usuario en Supabase Auth usando Admin API (service_role)
 * 4. Inserta registro en tabla public.users con rol y doctor_id
 * 5. Si falla la inserción en public.users, limpia el usuario huérfano de Auth
 * 6. Retorna resultado con manejo de errores claro
 */

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.38.4";

// CORS headers para permitir requests del frontend
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

/**
 * Tipos para validación de entrada
 */
interface CreateUserRequest {
  email: string;
  password: string;
  role: 'admin' | 'secretary' | 'doctor';
  doctorId?: string | null;
}

/**
 * Valida que los datos de entrada sean correctos
 */
function validateInput(body: CreateUserRequest): { valid: boolean; error?: string } {
  // Validar campos obligatorios
  if (!body.email || typeof body.email !== 'string') {
    return { valid: false, error: 'Email es requerido y debe ser un string válido' };
  }

  if (!body.password || typeof body.password !== 'string') {
    return { valid: false, error: 'Password es requerido y debe ser un string válido' };
  }

  if (body.password.length < 6) {
    return { valid: false, error: 'La contraseña debe tener al menos 6 caracteres' };
  }

  if (!body.role || typeof body.role !== 'string') {
    return { valid: false, error: 'Role es requerido y debe ser un string válido' };
  }

  // Validar que el rol sea uno de los permitidos
  const validRoles = ['admin', 'secretary', 'doctor'];
  if (!validRoles.includes(body.role)) {
    return { valid: false, error: `Role debe ser uno de: ${validRoles.join(', ')}` };
  }

  // Validar que si el rol es doctor, se proporcione doctorId
  if (body.role === 'doctor' && !body.doctorId) {
    return { valid: false, error: 'doctorId es requerido cuando el role es "doctor"' };
  }

  // Validar formato de email básico
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(body.email)) {
    return { valid: false, error: 'Email tiene un formato inválido' };
  }

  return { valid: true };
}

/**
 * Handler principal de la función
 */
serve(async (req) => {
  // Manejar preflight CORS requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    // PASO 1: Obtener y validar el token JWT del usuario autenticado
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: 'No se proporcionó token de autenticación' }),
        { 
          status: 401, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    // Crear cliente Supabase con anon key para validar el token del usuario
    const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? '';
    const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY') ?? '';
    const supabaseClient = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } },
    });

    // Validar token y obtener usuario autenticado
    const { data: { user }, error: authError } = await supabaseClient.auth.getUser();
    
    if (authError || !user) {
      return new Response(
        JSON.stringify({ error: 'Token de autenticación inválido o expirado' }),
        { 
          status: 401, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    // PASO 2: Verificar que el usuario autenticado tiene rol de admin
    const { data: userData, error: userError } = await supabaseClient
      .from('users')
      .select('role')
      .eq('id', user.id)
      .single();

    if (userError || !userData) {
      return new Response(
        JSON.stringify({ error: 'No se pudo verificar el rol del usuario' }),
        { 
          status: 403, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    if (userData.role !== 'admin') {
      return new Response(
        JSON.stringify({ error: 'Solo los administradores pueden crear usuarios' }),
        { 
          status: 403, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    // PASO 3: Validar datos de entrada
    const body: CreateUserRequest = await req.json();
    const validation = validateInput(body);
    
    if (!validation.valid) {
      return new Response(
        JSON.stringify({ error: validation.error }),
        { 
          status: 400, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    // PASO 4: Crear cliente Supabase con service_role para operaciones admin
    // CRÍTICO: service_role permite bypass de RLS y acceso a Auth Admin API
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';
    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false
      }
    });

    // PASO 5: Crear usuario en Supabase Auth usando Admin API
    // Esto crea el usuario en auth.users
    const { data: authUser, error: createAuthError } = await supabaseAdmin.auth.admin.createUser({
      email: body.email,
      password: body.password,
      email_confirm: true, // Auto-confirmar email para usuarios creados por admin
    });

    if (createAuthError || !authUser.user) {
      return new Response(
        JSON.stringify({ 
          error: `Error al crear usuario en autenticación: ${createAuthError?.message || 'Error desconocido'}` 
        }),
        { 
          status: 500, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    const newUserId = authUser.user.id;

    // PASO 6: Insertar usuario en tabla public.users
    // CRÍTICO: Usar try-catch para limpiar usuario huérfano si esto falla
    try {
      const { error: insertError } = await supabaseAdmin
        .from('users')
        .insert({
          id: newUserId,
          email: body.email,
          role: body.role,
          doctor_id: body.role === 'doctor' ? body.doctorId : null,
        });

      if (insertError) {
        // PASO 7: LIMPIEZA - Si falla la inserción en public.users, eliminar usuario de Auth
        // Esto evita usuarios "huérfanos" que existen en Auth pero no en la BD
        console.error('Error insertando en public.users:', insertError);
        
        const { error: deleteError } = await supabaseAdmin.auth.admin.deleteUser(newUserId);
        
        if (deleteError) {
          console.error('Error limpiando usuario huérfano:', deleteError);
          return new Response(
            JSON.stringify({ 
              error: `Error crítico: Usuario creado en Auth pero no en BD. ID: ${newUserId}. Contacte al administrador.`,
              details: insertError.message
            }),
            { 
              status: 500, 
              headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
            }
          );
        }

        return new Response(
          JSON.stringify({ 
            error: `Error al crear usuario en la base de datos: ${insertError.message}` 
          }),
          { 
            status: 500, 
            headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
          }
        );
      }

      // PASO 8: Éxito - Retornar datos del usuario creado
      return new Response(
        JSON.stringify({ 
          success: true,
          user: {
            id: newUserId,
            email: body.email,
            role: body.role,
            doctorId: body.role === 'doctor' ? body.doctorId : null,
          }
        }),
        { 
          status: 200, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );

    } catch (insertException) {
      // Manejo de excepciones no esperadas durante la inserción
      console.error('Excepción no esperada durante inserción:', insertException);
      
      // Intentar limpiar usuario huérfano
      try {
        await supabaseAdmin.auth.admin.deleteUser(newUserId);
      } catch (cleanupError) {
        console.error('Error durante limpieza de usuario huérfano:', cleanupError);
      }

      return new Response(
        JSON.stringify({ 
          error: 'Error inesperado al crear usuario. Por favor, intente nuevamente.',
          details: insertException instanceof Error ? insertException.message : 'Error desconocido'
        }),
        { 
          status: 500, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

  } catch (error) {
    // Manejo de errores globales
    console.error('Error general en create-user-with-role:', error);
    return new Response(
      JSON.stringify({ 
        error: 'Error del servidor al procesar la solicitud',
        details: error instanceof Error ? error.message : 'Error desconocido'
      }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  }
});
