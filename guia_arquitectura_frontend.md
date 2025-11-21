# 📘 Guía de Arquitectura Frontend — Agenda Médica

### *Referencia primaria del proyecto — Siempre revisar antes de crear/modificar código*

---

# 🧭 0. Tabla resumen (Mapa global del proyecto)

| Tipo            | Nombre               | Archivo                         | Descripción corta                                             |
| --------------- | -------------------- | ------------------------------- | ------------------------------------------------------------- |
| Página          | Agenda de Hoy        | `pages/AgendaSecretaria.tsx`    | Lista del día, buscador global, cambiar estado, cancelar cita |
| Página          | Nueva Cita           | `pages/NuevaCita.tsx`           | Wizard: paciente → doctor → fecha → horario (backend-driven)  |
| Página          | Pacientes            | `pages/Pacientes.tsx`           | Listado de pacientes + buscador                               |
| Página          | Agenda Médico        | `pages/AgendaMedico.tsx`        | Citas del día filtradas por médico                            |
| Página          | Admin Dashboard      | `pages/AdminDashboard.tsx`      | Métricas globales (dummy)                                     |
| Página          | Crear Usuario        | `pages/CreateUserPage.tsx`      | Formulario para crear usuarios del sistema (solo admin)       |
| Página          | Lista de Usuarios    | `pages/UsersList.tsx`           | Listado y gestión de todos los usuarios del sistema           |
| Página          | Editar Usuario       | `pages/EditUserPage.tsx`        | Formulario para editar información de usuarios existentes     |
| Página          | Página 404           | `pages/NotFound.tsx`            | Página de error/en construcción para rutas no implementadas   |
| Componente      | MainLayout           | `components/MainLayout.tsx`     | Layout + navegación principal (role-based)                    |
| Componente      | PatientSearch        | `components/PatientSearch.tsx`  | Buscar/crear paciente inline                                  |
| Componente      | DoctorSearch         | `components/DoctorSearch.tsx`   | Buscar doctor por nombre o especialidad                       |
| Componente      | SlotSelector         | `components/SlotSelector.tsx`   | Selección de horario (slots desde backend)                    |
| Componente      | AppointmentRow       | `components/AppointmentRow.tsx` | Renderizado compacto de cita                                  |
| Componente      | StatusBadge          | `components/StatusBadge.tsx`    | Etiqueta visual de estado                                     |
| Hook            | useTodayAppointments | `hooks/useTodayAppointments.ts` | Cargar/gestionar citas del día (con filtro por doctor)        |
| Hook            | usePatientsSearch    | `hooks/usePatientsSearch.ts`    | Búsqueda de pacientes con debounce                            |
| Hook            | useDoctorsSearch     | `hooks/useDoctorsSearch.ts`     | Búsqueda de doctores con debounce                             |
| Hook            | useCurrentUser       | `context/UserContext.tsx`       | Acceso al usuario autenticado y roles                         |
| API (servicios) | api.ts               | `lib/api.ts`                    | Router hacia Supabase real o dummy por flag/env               |
| Dummy data      | data.ts, api.dummy.ts| `lib/data.ts`, `lib/api.dummy.ts`| Fuente de data temporal/fallback                             |
| Supabase        | supabaseClient.ts    | `lib/supabaseClient.ts`         | Config inicial (conecta a la BD)                              |
| Edge Function   | get-available-slots  | `supabase/functions/get-available-slots/index.ts` | Calcula slots disponibles desde BD      |
| Edge Function   | create-appointment   | `supabase/functions/create-appointment/index.ts` | Crea citas validando disponibilidad      |
| Edge Function   | create-user-with-role| `supabase/functions/create-user-with-role/index.ts` | Crea usuarios con roles específicos  |
| Edge Function   | update-doctor        | `supabase/functions/update-doctor/index.ts` | Actualiza información de doctores (solo admins)  |
| Tipos           | Appointment          | `types/appointment.ts`          | Modelo de cita                                                |
| Tipos           | Patient              | `types/patient.ts`              | Modelo de paciente                                            |
| Tipos           | Doctor               | `types/doctor.ts`               | Médico + especialidad                                         |
| Tipos           | DoctorSchedule       | `types/schedule.ts`             | Agenda del médico                                             |
| Tipos           | CurrentUser          | `types/user.ts`                 | Usuario autenticado con rol                                   |

---

# 🔧 1. Convenciones del Proyecto (obligatorias)

- **Páginas**: Solo lógica UI, usan hooks y servicios, en `src/pages/`.
- **Servicios/capa API**: `src/lib/api.ts` es el único entrypoint. NO accedas directo a `api.supabase.ts`.
- **Hooks**: Siempre usan funciones expuestas por `api.ts`.
- **Componentes:** UI mínima, sin fetch, sin lógica de negocio.
- **Edge Functions**: Lógica backend crítica (validaciones, cálculos complejos, llamadas externas).
- Toda promesa (aunque sea síncrona) debe envolverse en `Promise.resolve()`.
- No invoques `api.supabase.ts` ni `api.dummy.ts` directamente desde hooks/páginas.

---

# 🗂️ 2. Estructura de Carpetas

```
src/
├─ components/          // Componentes UI sin estado ni fetch
├─ hooks/               // Custom hooks (state + API calls)
├─ pages/               // Páginas del router (ej. AgendaSecretaria, NuevaCita)
├─ lib/
│  ├─ api.ts            // Router principal (usa dummy o supabase)
│  ├─ api.dummy.ts      // Implementación con data.ts (dev o fallback)
│  ├─ api.supabase.ts   // Implementación real con supabaseClient
│  ├─ data.ts           // Datos en memoria para dummy
│  └─ supabaseClient.ts // Configuración cliente Supabase
├─ types/               // Interfaces y tipos compartidos
└─ context/             // React contexts globales (UserContext)

supabase/
└─ functions/           // Edge Functions (serverless backend)
   ├─ get-available-slots/    // Calcula horarios disponibles
   ├─ create-appointment/     // Crea citas con validación
   └─ create-user-with-role/  // Gestión de usuarios
```

---

# 🎨 3. Arquitectura de la Capa API

```
┌──────────────────────────────────────┐
│   Hooks / Componentes / Páginas      │
│         (useTodayAppointments,       │
│         PatientSearch, etc.)         │
└──────────┬───────────────────────────┘
           │
           │ import { getTodayAppointments, ... } from 'lib/api'
           v
┌──────────────────────────────────────┐
│         lib/api.ts (Router)          │
│  ┌───────────────────────────────┐   │
│  │ if (USE_DUMMY_DATA)          │   │
│  │   -> api.dummy.ts             │   │
│  │ else                          │   │
│  │   -> api.supabase.ts          │   │
│  └───────────────────────────────┘   │
└──────────┬───────────────────────────┘
           │
           ├─────────────────┬──────────────────┐
           v                 v                  v
  ┌─────────────────┐  ┌──────────────┐  ┌─────────────────┐
  │  api.dummy.ts   │  │api.supabase.ts│  │ Edge Functions  │
  │  + data.ts      │  │+ supabaseClient│ │ (Backend Logic) │
  └─────────────────┘  └──────┬────────┘ └─────────────────┘
                              │
                              v
                    ┌────────────────────┐
                    │  Supabase Backend  │
                    │  (DB + Auth)       │
                    └────────────────────┘
```

### Patrón de llamada a Edge Functions

Cuando la lógica es compleja o requiere validación en servidor:

```typescript
// En api.supabase.ts
export async function getAvailableSlots(params: { doctorId: string; date: string }) {
  const { data, error } = await supabase.functions.invoke('get-available-slots', {
    body: { doctorId: params.doctorId, date: params.date }
  });
  
  if (error) throw new Error(error.message || 'Error fetching slots');
  return data?.slots || [];
}
```

---

# 🔀 4. Flujo de datos típico

1. **Página** (ej. `NuevaCita.tsx`) importa `getAvailableSlots` de `lib/api.ts`.
2. **api.ts** enruta a `api.supabase.ts` o `api.dummy.ts`.
3. **api.supabase.ts** llama a Edge Function `get-available-slots` si la lógica es compleja.
4. **Edge Function** consulta `doctor_schedules`, `appointments`, calcula disponibilidad.
5. Retorna array de strings de horarios disponibles.
6. **Página** actualiza estado local con los slots y los muestra en `SlotSelector`.

---

# ⚙️ 5. Cambio de backend (dummy ↔ Supabase)

- En **`.env`**:
  - `VITE_USE_DUMMY_DATA=true` → usa `api.dummy.ts` (data en memoria)
  - `VITE_USE_DUMMY_DATA=false` (o vacío) → usa `api.supabase.ts` (BD real)

- Toda la app debe funcionar igual sin importar el backend seleccionado.

---

# 🚀 6. Control de integración / testing

- Cuando desarrolles, puedes activar dummy para aislar el frontend de Supabase si lo necesitas.
- Para ambientes reales, confirma que `USE_DUMMY_DATA` está en `false` (o vacío).
- Si notas datos vacíos, revisa políticas RLS, formato de datos y errores de consola.

---

# 📌 7. Notas rápidas de migración

- El paso a Supabase es transparente para hooks y pantallas existentes si solo usas `api.ts`.
- Si notas datos incongruentes, primero revisa `.env`, el flag de dummy, y políticas RLS en tu base.
- Si hay cambios en la estructura de datos, actualiza primero los tipos en `src/types/`.

---

# 📝 8. Páginas Principales

## 8.1 Login (`pages/Login.tsx`)
- Autenticación con email/password usando Supabase
- Redirección automática a `/agenda-secretaria` tras login exitoso
- Manejo de errores con mensajes amigables

## 8.2 Agenda de Hoy (`pages/AgendaSecretaria.tsx`)
- Lista de citas del día con buscador global
- Filtro por paciente, médico, teléfono o estado
- Cambio de estado inline (dropdown para no canceladas)
- Botón "Cancelar" por fila (permanente, no reversible)
- Solo accesible para admin y secretary

## 8.3 Nueva Cita (`pages/NuevaCita.tsx`)
- Formulario multi-step en una sola pantalla
- `PatientSearch` con creación inline de paciente
- `DoctorSearch` para buscar por nombre o especialidad
- Selector de fecha y `SlotSelector` para horario
- **Horarios obtenidos desde backend**: Llama a `getAvailableSlots({ doctorId, date })` que invoca Edge Function
- **Creación de cita**: Llama a `createAppointment()` que invoca Edge Function `create-appointment`
- Validación de slots ocupados en servidor antes de crear cita
- Estados de loading, éxito y error con mensajes toast
- Solo accesible para admin y secretary

## 8.4 Agenda Médico (`pages/AgendaMedico.tsx`)
- Vista de citas filtradas por médico
- Si es admin: dropdown para seleccionar médico + columna "Médico" en tabla
- Si es doctor: solo ve sus propias citas (sin dropdown ni columna)
- Usa `useTodayAppointments(doctorId?)` según el rol

## 8.5 Admin Dashboard (`pages/AdminDashboard.tsx`)
- Métricas globales: total pacientes, médicos, citas
- Breakdown por estado de cita
- Solo accesible para admin

## 8.6 Crear Usuario (`pages/CreateUserPage.tsx`)
- Formulario para crear usuarios del sistema
- Campos: email, password, role (admin/secretary/doctor)
- Si role === 'doctor': 
  - Dropdown para seleccionar prefijo (el Dr. / la Dra.)
  - Dropdown para seleccionar especialidad médica
  - Campo de texto: Nombre del doctor (fullName)
  - Campo de texto: Teléfono del doctor (phone)
- Llamada al edge function `create-user-with-role` de Supabase
- Protección de ruta: solo admin puede acceder
- Validación de campos requeridos (incluyendo fullName y phone para doctores)
- Mensajes de éxito/error con estados visuales
- Deshabilita botón durante envío y limpia formulario tras éxito

## 8.7 Lista de Usuarios (`pages/UsersList.tsx`)
- Tabla con todos los usuarios del sistema
- Columnas: Nombre/Email, Rol (con badge coloreado), Especialidad (solo doctores), Teléfono
- Buscador por nombre o email
- Filtro por rol: Todos, Doctores, Secretarias, Administradores
- Botón "Crear usuario" que navega a `/admin/users/create`
- Acciones por usuario:
  - **Editar**: Navega a `/admin/users/:id/edit`
  - **Configurar horarios** (solo doctores): Navega a `/admin/doctors/:doctorId/schedule`
- Llamada a `getAllUsers()` del API que trae joins con doctors y specialties
- Solo accesible para admin

## 8.8 Editar Usuario (`pages/EditUserPage.tsx`)
- Formulario para editar información de usuarios existentes
- Campos de solo lectura: email, role
- Campos editables (según rol):
  - **Doctor**: nombre, teléfono, especialidad
  - **Secretary**: nombre, teléfono
  - **Admin**: sin campos editables adicionales
- Botón "Configurar horarios" (solo para doctores) → `/admin/doctors/:doctorId/schedule`
- **Actualización segura**:
  - Llama a `updateUser(userId, data)` del API
  - Para doctores: invoca Edge Function `update-doctor` con JWT del usuario
  - La Edge Function usa el JWT (NO service role key) para validar que es admin
  - Política RLS `doctors_update_admin` verifica permisos
- Botones: "Guardar cambios" y "Cancelar" (vuelve a lista)
- Solo accesible para admin

---

# 📝 9. Autenticación y Roles

## 9.1 UserContext (`context/UserContext.tsx`)
- Provider global que envuelve toda la app
- Maneja estado de autenticación con `supabase.auth.onAuthStateChange`
- Expone `useCurrentUser()` hook con:
  - `user`: objeto `CurrentUser` con id, email, role, doctorId
  - `loading`: boolean para estado de carga
  - `isAdmin`, `isSecretary`, `isDoctor`: flags de rol
  - `isAdminOrSecretary`: flag combinado

## 9.2 Componentes de Protección de Rutas (en `App.tsx`)

### ProtectedRoute
- Wrapper básico para rutas que requieren autenticación
- Redirecciona a `/login` si no hay usuario autenticado
- Muestra "Cargando..." mientras verifica sesión

### RoleBasedRoute
- Wrapper avanzado para rutas que requieren roles específicos
- Props: `allowedRoles: UserRole[]` (array de roles permitidos)
- Lógica de redirección automática según rol:
  - Si el usuario no tiene un rol permitido, se redirige a su página principal
  - Doctor → `/agenda-medico`
  - Secretary → `/agenda-secretaria`
  - Admin → `/admin`
- Muestra "Cargando..." mientras verifica sesión

### HomeRedirect
- Componente especial para la ruta `/` (home)
- Redirige automáticamente según el rol del usuario:
  - Doctor → `/agenda-medico`
  - Secretary o Admin → `/agenda-secretaria`
- Garantiza que cada usuario llegue a su página principal correcta

## 9.3 MainLayout con navegación por roles y sidebar colapsable

- **Navegación dinámica basada en roles:**
  - **Secretary**: Solo ve Agenda de Hoy, Nueva Cita, Pacientes
  - **Doctor**: Solo ve Agenda Médico
  - **Admin**: Ve todo + grupo Admin colapsable con submenú

- **Grupo Admin colapsable** (solo visible para admins):
  - El grupo "Admin" reemplaza el botón directo "Dashboard Admin"
  - Ubicado al final del menú lateral
  - Click en "Admin" solo expande/colapsa, no navega
  - Se mantiene expandido automáticamente si la ruta actual es `/admin/*`
  - **Submenú Admin**:
    - **Resumen** → `/admin` (usa página AdminDashboard existente)
    - **Usuarios** → `/admin/users` (renombrado de `/admin/usuarios`)
    - **Especialidades** → `/admin/specialties` (en construcción)
    - **Reportes** → `/admin/reports` (en construcción)
    - **Archivos** → `/admin/files` (en construcción)
    - **Configuración** → `/admin/settings` (en construcción)

- **Componentes usados:**
  - `Collapsible` de shadcn/ui para el grupo expandible
  - `ChevronDown` icon con rotación cuando está expandido
  - Items del submenú visualmente indentados (`pl-12`)
  
- **Implementación:**
  - `useState` para `adminMenuOpen`
  - `useEffect` que auto-expande si `location.pathname.startsWith('/admin')`
  - `getNavigationItems()` construye dinámicamente según rol

- Botón "Cerrar sesión" con `supabase.auth.signOut()`
- Muestra "Cargando menú…" mientras se verifica el rol

## 9.4 Login con notificación de rol
- Después de login exitoso, se muestra un toast no intrusivo con:
  - Título: "Login exitoso - Rol: {role}"
  - Descripción: "Usuario: {email}"
  - Duración: 4 segundos
- Ayuda en debugging y confirma al usuario su rol actual

---

# 📝 10. Componentes de Búsqueda

## 10.1 PatientSearch

- **Componente controlado con prop `value`**
- Input con búsqueda debounced (300ms)
- Muestra dropdown con resultados
- **Sincronización automática**: Al seleccionar, se muestra card con información del paciente
- **Creación inline de paciente**:
  - Botón "Crear nuevo paciente" si no hay resultados
  - Dialog/sheet para ingresar nombre y teléfono
  - **Al crear**: paciente se selecciona automáticamente sin recargar página
  - Transición suave mediante control externo del estado
- **Props**:
  - `onSelect`: callback cuando se selecciona un paciente
  - `onCreateNew`: callback para abrir dialog de creación
  - `value`: paciente seleccionado (para control externo)
- **Evita duplicados**: No muestra card adicional fuera del componente

## 10.2 DoctorSearch
- Similar a PatientSearch
- Busca por nombre de doctor o especialidad
- Muestra nombre del doctor + especialidad en resultados
- Al seleccionar: muestra nombre en el input
- Usa `searchDoctors()` del API

---

# 📝 11. Rutas de la Aplicación

## Control de Acceso por Rol

Todas las rutas (excepto `/login`) están protegidas y redirigen según el rol:

```
/login                    → Login (público, accesible sin autenticación)
/                        → HomeRedirect (redirige según rol del usuario)

// Rutas de Secretary (solo secretary y admin)
/agenda-secretaria       → AgendaSecretaria (secretary, admin)
/citas/nueva            → NuevaCita (secretary, admin)
/pacientes              → Pacientes (secretary, admin)

// Rutas de Doctor (solo doctor y admin)
/agenda-medico          → AgendaMedico (doctor, admin)

// Rutas de Admin (solo admin)
/admin                       → AdminDashboard (admin) - Resumen
/admin/users                 → UsersList (admin) - Lista de usuarios
/admin/users/create          → CreateUserPage (admin) - Crear usuario
/admin/users/:id/edit        → EditUserPage (admin) - Editar usuario
/admin/specialties           → NotFound (admin) - En construcción
/admin/reports               → NotFound (admin) - En construcción
/admin/files                 → NotFound (admin) - En construcción
/admin/settings              → NotFound (admin) - En construcción

// Catch-all
*                       → NotFound (404)
```

## Restricciones de Acceso

- **Secretary**: Solo puede acceder a Agenda de Hoy, Nueva Cita y Pacientes
  - Si intenta acceder a otras rutas, es redirigido a `/agenda-secretaria`
  
- **Doctor**: Solo puede acceder a Agenda Médico
  - Si intenta acceder a otras rutas, es redirigido a `/agenda-medico`
  
- **Admin**: Puede acceder a todas las rutas del sistema
  - Tiene privilegios completos de navegación
  - Rutas en construcción muestran página 404 envuelta en MainLayout

## Página 404 / En Construcción

- Componente: `NotFound.tsx`
- Muestra: "404 - Página no encontrada" + "Esta sección todavía está en construcción"
- Botón para volver al dashboard admin (`/admin`)
- Se usa para:
  - Rutas del admin no implementadas aún
  - Rutas desconocidas/inexistentes del proyecto

---

# 📝 12. Edge Functions (Backend Serverless)

## 12.1 get-available-slots

**Ubicación**: `supabase/functions/get-available-slots/index.ts`

**Propósito**: Calcular slots de tiempo disponibles para un doctor en una fecha específica.

**Input** (POST JSON):
```typescript
{
  doctorId: string;  // UUID del doctor
  date: string;      // Formato YYYY-MM-DD
}
```

**Proceso**:
1. Determina día de la semana de la fecha (0=Domingo, 6=Sábado)
2. Consulta `doctor_schedules` para obtener horarios del doctor ese día
3. Si no hay horario configurado, retorna array vacío
4. Genera slots de 30 minutos entre `start_time` y `end_time`
5. Consulta `appointments` para obtener citas existentes (no canceladas)
6. Filtra slots ocupados
7. Retorna array de strings con horarios disponibles

**Output**:
```typescript
{
  slots: string[];  // Ej: ["09:00", "09:30", "10:00", ...]
}
```

**Uso desde frontend**:
```typescript
// En api.supabase.ts
const { data, error } = await supabase.functions.invoke('get-available-slots', {
  body: { doctorId, date }
});
return data?.slots || [];
```

## 12.2 create-appointment

**Ubicación**: `supabase/functions/create-appointment/index.ts`

**Propósito**: Crear una nueva cita médica con validación de disponibilidad.

**Input** (POST JSON):
```typescript
{
  doctorId: string;
  patientId: string;
  date: string;      // YYYY-MM-DD
  time: string;      // HH:MM o HH:MM:SS
  notes?: string;
}
```

**Proceso**:
1. Valida campos requeridos
2. Verifica que el slot no esté ocupado (query a `appointments`)
3. Si está ocupado, retorna error 409 (Conflict)
4. Si está disponible, inserta en `appointments` con status='pending'
5. Retorna la cita creada

**Output**:
```typescript
{
  appointment: Appointment;  // Objeto de la cita creada
}
```

**Manejo de errores**:
- 400: Campos faltantes
- 409: Slot ya ocupado
- 500: Error de servidor

## 12.3 create-user-with-role

**Ubicación**: `supabase/functions/create-user-with-role/index.ts`

**Propósito**: Crear usuarios del sistema con roles específicos.

**Input** (POST JSON):
```typescript
{
  email: string;
  password: string;
  role: 'admin' | 'secretary' | 'doctor';
  specialtyId?: string;  // Requerido si role='doctor'
  fullName?: string;     // Requerido si role='doctor'
  phone?: string;        // Requerido si role='doctor'
  prefix?: string;       // Opcional para doctor (ej: "el Dr." o "la Dra.")
}
```

**Proceso**:
1. Valida campos según rol
2. Crea usuario en `auth.users`
3. Si role='doctor', crea registro en tabla `doctors`
4. Crea registro en tabla `users` vinculando con doctor_id si aplica
5. Retorna éxito o error

## 12.4 update-doctor

**Ubicación**: `supabase/functions/update-doctor/index.ts`

**Propósito**: Actualizar información de un doctor existente.

**⚠️ IMPORTANTE - Seguridad**:
- **NO usa SERVICE_ROLE_KEY** - usa el JWT del usuario autenticado
- Recibe Authorization header con Bearer token del usuario
- Crea cliente Supabase con ANON_KEY + JWT del usuario
- La política RLS `doctors_update_admin` valida que el usuario es admin
- **NUNCA exponer SERVICE_ROLE_KEY en el frontend**

**Input** (POST JSON):
```typescript
{
  doctorId: string;        // UUID del doctor (también acepta doctor_id)
  name?: string;           // Nombre actualizado
  phone?: string;          // Teléfono actualizado
  specialtyId?: string;    // UUID de especialidad actualizada
}
```

**Proceso**:
1. Valida Authorization header (JWT requerido)
2. Crea cliente Supabase con ANON_KEY + JWT del usuario
3. Valida que `doctorId` esté presente
4. Construye objeto de actualización solo con campos provistos
5. Ejecuta UPDATE en tabla `doctors`
6. La política RLS verifica que `current_user_role() = 'admin'`
7. Retorna doctor actualizado o error

**Output**:
```typescript
{
  success: boolean;
  doctor?: Doctor;  // Doctor actualizado si éxito
  error?: string;   // Mensaje de error si falla
}
```

**Políticas RLS relacionadas**:
- `doctors_update_admin`: Permite UPDATE solo si `current_user_role() = 'admin'`

**Uso desde frontend**:
```typescript
// En api.supabase.ts
const { data, error } = await supabase.functions.invoke('update-doctor', {
  body: {
    doctorId: userData.doctor_id,
    name: data.name,
    phone: data.phone,
    specialtyId: data.specialtyId,
  },
});
```

---

# 📝 13. Changelog (para sincronización interna)

- **2025-11-21**  
  - **Gestión completa de usuarios con edición segura**:
    - Nueva página `UsersList.tsx` en `/admin/users` con tabla de usuarios
    - Buscador y filtro por rol (All, Doctors, Secretaries, Admins)
    - Botones de acción: Editar y Configurar horarios (para doctores)
    - Nueva página `EditUserPage.tsx` en `/admin/users/:id/edit`
    - Formulario de edición con campos según rol del usuario
    - Nueva Edge Function `update-doctor` para actualizar doctores
    - **Seguridad reforzada**: Edge function usa JWT del usuario (NO service role key)
    - Política RLS `doctors_update_admin` valida permisos en servidor
    - Flujo completo: Frontend → Edge Function (con JWT) → RLS valida → UPDATE
    - `getAllUsers()` y `getUserById()` agregados al API
    - Función `updateUser()` en API delega a Edge Function para doctores

- **2025-11-20**  
  - **Integración completa de Edge Functions en Nueva Cita**:
    - `getAvailableSlots()` ahora llama a Edge Function `get-available-slots`
    - Slots disponibles se calculan en servidor considerando `doctor_schedules` y `appointments`
    - `createAppointment()` ahora llama a Edge Function `create-appointment`
    - Validación de slots ocupados en servidor antes de crear cita
    - Mensajes de error específicos (ej: "El horario ya está ocupado")
    - Estados de loading mejorados en UI
    - Edge Function con credenciales del proyecto hardcodeadas (sin env vars)

- **2025-11-20**  
  - **Sidebar Admin Colapsable**:
    - Convertido "Dashboard Admin" en grupo colapsable "Admin"
    - Grupo ubicado al final del menú lateral
    - Click en "Admin" solo expande/colapsa, no navega
    - Se mantiene expandido automáticamente si ruta actual es `/admin/*`
    - Submenú con 6 opciones: Resumen, Usuarios, Especialidades, Reportes, Archivos, Configuración
    - Eliminadas opciones "Doctores" y "Secretarias" del plan inicial
    - Rutas no implementadas muestran página 404 con MainLayout

- **2025-11-20**  
  - **Página 404 / En Construcción**:
    - Componente `NotFound.tsx` actualizado
    - Mensaje: "404 - Página no encontrada" + "Esta sección todavía está en construcción"
    - Botón para volver al admin dashboard
    - Usado para rutas admin pendientes y rutas inexistentes
    - Envuelto en MainLayout para rutas admin (mantiene sidebar visible)

- **2025-11-20**  
  - **Mejora en PatientSearch**:
    - Componente ahora es controlado con prop `value`
    - Sincronización automática al crear nuevo paciente
    - Transición suave sin recargar página
    - Eliminada duplicación visual del paciente seleccionado
    - `useEffect` sincroniza estado interno con valor externo

- **2025-11-20**  
  - **Control de Acceso por Roles refinado**:
    - Implementado componente `RoleBasedRoute` para proteger rutas por rol
    - Implementado componente `HomeRedirect` para redirección inteligente según rol
    - Secretary ahora solo puede acceder a: Agenda de Hoy, Nueva Cita, Pacientes
    - Doctor ahora solo puede acceder a: Agenda Médico
    - Admin mantiene acceso completo a todas las rutas
    - MainLayout ahora muestra solo los menús permitidos por rol
    - Agregada notificación toast con rol del usuario después del login

- **2025-11-20**  
  - **Extensión de Gestión de Usuarios**:
    - Página renombrada de `CreateUser.tsx` a `AdminUsuarios.tsx`
    - Agregados campos `fullName` y `phone` para doctores
    - Validación obligatoria de fullName y phone cuando role === 'doctor'
    - Edge function `create-user-with-role` actualizado para manejar nuevos campos
    - Creación automática de registro en tabla `doctors` con nombre y teléfono

- **2025-11-20**  
  - Implementada búsqueda unificada de doctores por nombre o especialidad
  - Componente `DoctorSearch` reemplaza selección de especialidad + doctor
  - Hook `useDoctorsSearch` con debounce
  - Función `searchDoctors()` agregada al API
  - Actualizado tipo `Doctor` con `specialtyName` opcional

- **2025-11-20**  
  - Implementado sistema de autenticación y roles
  - Contexto global `UserContext` con `useCurrentUser` hook
  - Página de login con Supabase Auth
  - Rutas protegidas con redirección a login
  - Navegación dinámica basada en roles
  - Función `getCurrentUserWithRole()` en API

- **2025-11-19**  
  - Migración a Supabase terminada: `api.ts` ahora es proxy/router, dummy data vive en `api.dummy.ts`.
  - Hooks y componentes siguen funcionando sin cambios.
  - Guía alineada con capa de servicios real y dummy.

---

*Si agregas o modificas flujos, documenta siempre aquí y sincroniza con el Documento Maestro (`Proyecto_contexto_maestro.md`).*
