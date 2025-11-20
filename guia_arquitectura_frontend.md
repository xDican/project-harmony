# 📘 Guía de Arquitectura Frontend — Agenda Médica

### *Referencia primaria del proyecto — Siempre revisar antes de crear/modificar código*

---

# 🧭 0. Tabla resumen (Mapa global del proyecto)

| Tipo            | Nombre               | Archivo                         | Descripción corta                                             |
| --------------- | -------------------- | ------------------------------- | ------------------------------------------------------------- |
| Página          | Agenda de Hoy        | `pages/AgendaSecretaria.tsx`    | Lista del día, buscador global, cambiar estado, cancelar cita |
| Página          | Nueva Cita           | `pages/NuevaCita.tsx`           | Wizard: paciente → doctor → fecha → horario                   |
| Página          | Pacientes            | `pages/Pacientes.tsx`           | Listado de pacientes + buscador                               |
| Página          | Agenda Médico        | `pages/AgendaMedico.tsx`        | Citas del día filtradas por médico                            |
| Página          | Admin Dashboard      | `pages/AdminDashboard.tsx`      | Métricas globales (dummy)                                     |
| Página          | Gestión de Usuarios  | `pages/AdminUsuarios.tsx`       | Formulario para crear usuarios del sistema (solo admin)       |
| Componente      | MainLayout           | `components/MainLayout.tsx`     | Layout + navegación principal (role-based)                    |
| Componente      | PatientSearch        | `components/PatientSearch.tsx`  | Buscar/crear paciente inline                                  |
| Componente      | DoctorSearch         | `components/DoctorSearch.tsx`   | Buscar doctor por nombre o especialidad                       |
| Componente      | SlotSelector         | `components/SlotSelector.tsx`   | Selección de horario                                          |
| Componente      | AppointmentRow       | `components/AppointmentRow.tsx` | Renderizado compacto de cita                                  |
| Componente      | StatusBadge          | `components/StatusBadge.tsx`    | Etiqueta visual de estado                                     |
| Hook            | useTodayAppointments | `hooks/useTodayAppointments.ts` | Cargar/gestionar citas del día (con filtro por doctor)        |
| Hook            | usePatientsSearch    | `hooks/usePatientsSearch.ts`    | Búsqueda de pacientes con debounce                            |
| Hook            | useDoctorsSearch     | `hooks/useDoctorsSearch.ts`     | Búsqueda de doctores con debounce                             |
| Hook            | useCurrentUser       | `context/UserContext.tsx`       | Acceso al usuario autenticado y roles                         |
| API (servicios) | api.ts               | `lib/api.ts`                    | Router hacia Supabase real o dummy por flag/env               |
| Dummy data      | data.ts, api.dummy.ts| `lib/data.ts`, `lib/api.dummy.ts`| Fuente de data temporal/fallback                             |
| Supabase        | supabaseClient.ts    | `lib/supabaseClient.ts`         | Config inicial (conecta a la BD)                              |
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
- **Tipos:** Definidos en `src/types/`, uno por entidad.

---

# 🗂️ 2. Capa de Servicios (lib/api.ts, api.supabase.ts, api.dummy.ts)

## 2.1 api.ts (router público frontend)

- Expone funciones:  
  `getTodayAppointments`, `getTodayAppointmentsByDoctor`,  
  `updateAppointmentStatus`, `createAppointment`,  
  `getAvailableSlots`, `searchPatients`, `getAllPatients`,  
  `createPatient`, `getSpecialties`, `getDoctorsBySpecialty`, `getDoctors`,  
  `searchDoctors`, `getCurrentUserWithRole`
- Por defecto usa Supabase real (`api.supabase.ts`).
- Permite swap a dummy data (`api.dummy.ts`) por flag/env (`USE_DUMMY_DATA`).
- Los hooks y páginas solo deben importar de aquí.

## 2.2 api.supabase.ts

- Implementación real, usa `supabaseClient`.
- Hace queries reales y aplica lógica de negocio (signalado en la guía backend).

## 2.3 api.dummy.ts

- Implementación paralela de las mismas firmas, retorna dummy data para pruebas/local/demo.
- Nunca deberías acceder directo a esto, salvo para tests o si se activa en el router vía flag.

---

# 🔌 3. Integración actual Supabase

- `.env` contiene claves y URL de Supabase.
- Debes reiniciar Vite si cambias `.env`.
- El frontend ahora consume directamente de la base real por el router de `api.ts`.
- Acceso a datos reales depende también de permisos RLS en Supabase (ver guía backend).

---

# 🧪 4. Hooks

Los hooks de negocio (ej: `useTodayAppointments`, `usePatientsSearch`):

- Usan siempre las funciones públicas expuestas por `api.ts`.
- No deben importar directo de `api.supabase.ts`.
- Controlan estado (loading, error, data) y reaccionan a cambios del backend.

---

# 🧩 5. Dependencias internas y reglas de oro

- Actualiza/crea cualquier función nueva siempre primero en `api.supabase.ts` (implementación real), luego expónla en el router (`api.ts`).
- Los componentes y hooks nunca acceden directo a Supabase ni a dummy; siempre al router `api.ts`.
- Si necesitas lógica fuera de lo ya documentado, debes agregarla en el router y documentarla aquí.
- Apóyate en los tipos de `src/types/`.

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
- Validación antes de crear cita
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

## 8.6 Gestión de Usuarios (`pages/AdminUsuarios.tsx`)
- Formulario para crear usuarios del sistema
- Campos: email, password, role (admin/secretary/doctor)
- Si role === 'doctor': 
  - Dropdown para seleccionar especialidad médica
  - Campo de texto: Nombre del doctor (fullName)
  - Campo de texto: Teléfono del doctor (phone)
- Llamada al edge function `create-user-with-role` de Supabase
- Protección de ruta: solo admin puede acceder
- Validación de campos requeridos (incluyendo fullName y phone para doctores)
- Mensajes de éxito/error con estados visuales
- Deshabilita botón durante envío y limpia formulario tras éxito

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

## 9.3 MainLayout con navegación por roles
- Navegación dinámica que se adapta al rol del usuario:
  - **Secretary**: Solo ve Agenda de Hoy, Nueva Cita, Pacientes
  - **Doctor**: Solo ve Agenda Médico
  - **Admin**: Ve todo (Agenda de Hoy, Nueva Cita, Pacientes, Dashboard Admin, Usuarios, Agenda Médico)
- Implementado con lógica condicional en `getNavigationItems()`
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
- Input con búsqueda debounced (300ms)
- Muestra dropdown con resultados
- Al seleccionar: muestra nombre en el input
- Botón "Crear nuevo paciente" si no hay resultados
- Creación inline de paciente con dialog/sheet

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

```tsx
/login                    → Login (público, accesible sin autenticación)
/                        → HomeRedirect (redirige según rol del usuario)

// Rutas de Secretary (solo secretary y admin)
/agenda-secretaria       → AgendaSecretaria (secretary, admin)
/citas/nueva            → NuevaCita (secretary, admin)
/pacientes              → Pacientes (secretary, admin)

// Rutas de Doctor (solo doctor y admin)
/agenda-medico          → AgendaMedico (doctor, admin)

// Rutas de Admin (solo admin)
/admin                  → AdminDashboard (admin)
/admin/usuarios         → AdminUsuarios (admin)
```

## Restricciones de Acceso

- **Secretary**: Solo puede acceder a Agenda de Hoy, Nueva Cita y Pacientes
  - Si intenta acceder a otras rutas, es redirigido a `/agenda-secretaria`
  
- **Doctor**: Solo puede acceder a Agenda Médico
  - Si intenta acceder a otras rutas, es redirigido a `/agenda-medico`
  
- **Admin**: Puede acceder a todas las rutas del sistema
  - Tiene privilegios completos de navegación

---

# 📝 12. Changelog (para sincronización interna)

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
