# SportCenter — Frontend

Aplicación web del centro deportivo, pensada para que los socios puedan ver servicios, reservar turnos y administrar su cuenta. Este repo contiene **solo el frontend**: consume la API REST de [sportcenter-api](https://github.com/ManuelFalchettoni/sportcenter-api).

---

## Stack

- **React 19** + **TypeScript** (UI y tipado).
- **Vite** (dev server + build).
- **React Router 7** (navegación entre páginas).
- **react-icons** (iconos del footer y la UI).
- **fetch** nativo del browser (cliente HTTP, sin axios).

---

## Cómo correrlo

```bash
# 1. Instalar dependencias
npm install

# 2. Levantar la API (en otra terminal, repo sportcenter-api)
#    Tiene que quedar escuchando en http://localhost:8080

# 3. Levantar el frontend
npm run dev
```

Vite suele abrir en `http://localhost:5173`. Si el puerto está ocupado, salta al siguiente (5174, 5175, …).

Otros scripts:

| Script | Qué hace |
|---|---|
| `npm run dev` | Servidor de desarrollo con hot-reload. |
| `npm run build` | Compila TypeScript y arma el bundle de producción. |
| `npm run preview` | Sirve localmente el build de producción para probarlo. |
| `npm run lint` | Corre ESLint sobre todo el código. |

---

## Estructura del proyecto

```
src/
├── App.tsx                  # Componente raíz: define las rutas
├── main.tsx                 # Punto de entrada (renderiza <App /> en el DOM)
├── components/              # Componentes compartidos por varias páginas
│   ├── Navbar.tsx
│   └── Footer.tsx
├── pages/                   # Una carpeta por pantalla
│   ├── Home/
│   ├── Login/
│   ├── Register/
│   ├── Profile/
│   ├── Services/
│   ├── Booking/
│   └── Admin/
└── services/                # Lógica que habla con la API
    ├── api.ts               # URL base y clave del localStorage
    ├── auth.ts              # login, register, getCurrentUser, logout
    └── admin.ts             # CRUD de usuarios, servicios, profesionales y turnos
```

Dentro de `pages/Admin/` la organización es:

```
Admin/
├── AdminLayout.tsx          # Sidebar + <Outlet/> con la sub-ruta activa
├── ProtectedAdminRoute.tsx  # Guard: verifica role === "ADMIN" antes de montar
├── Dashboard.tsx            # Tarjetas con totales (usuarios, servicios, etc.)
├── Users.tsx                # Lista paginada + cambio de rol + baja
├── Services.tsx             # ABM de tipos de servicio
├── Professionals.tsx        # ABM de profesionales (con multi-select de servicios)
├── Appointments.tsx         # Listado con filtros + confirmar/cancelar/eliminar
└── Admin.css                # Layout, tablas, forms, métricas, badges
```

**Regla simple:** las páginas (`pages/`) **nunca** llaman a `fetch` directo. Siempre van a través de una función del `services/`. Así, si mañana cambia la URL o agregamos un interceptor, se toca un solo archivo.

---

## Conexión con la API

Toda la comunicación con el back vive en [src/services/auth.ts](src/services/auth.ts).

- URL base: `http://localhost:8080/sportcenter` (definida en [src/services/api.ts](src/services/api.ts)).
- Autenticación: **JWT** en el header `Authorization: Bearer <token>`.
- Token persistido en `localStorage` bajo la clave `sportcenter_token`.

### Endpoints usados hoy

#### Públicos / autenticación

| Método | Endpoint | Para qué |
|---|---|---|
| `POST` | `/auth/login` | Iniciar sesión, obtener token. |
| `POST` | `/users` | Crear una cuenta nueva. |
| `GET`  | `/auth/me` | Datos del usuario logueado (usa el token). |

#### Panel de administración (solo ADMIN, requieren `Bearer <token>`)

| Método | Endpoint | Para qué |
|---|---|---|
| `GET`    | `/users?page&size`            | Listar usuarios paginados. |
| `PATCH`  | `/users/{id}/role`            | Cambiar el rol de un usuario. |
| `DELETE` | `/users/{id}`                 | Eliminar un usuario. |
| `GET`    | `/service-types?page&size`    | Listar tipos de servicio. |
| `POST`   | `/service-types`              | Crear un tipo de servicio. |
| `PUT`    | `/service-types/{id}`         | Editar un tipo de servicio. |
| `DELETE` | `/service-types/{id}`         | Eliminar un tipo de servicio. |
| `GET`    | `/professionals?page&size`    | Listar profesionales. |
| `POST`   | `/professionals`              | Crear profesional. |
| `PUT`    | `/professionals/{id}`         | Editar profesional. |
| `DELETE` | `/professionals/{id}`         | Eliminar profesional. |
| `GET`    | `/appointments?status&...`    | Listar turnos con filtros. |
| `PATCH`  | `/appointments/{id}/confirm`  | Confirmar un turno pendiente. |
| `PATCH`  | `/appointments/{id}/cancel`   | Cancelar un turno. |
| `DELETE` | `/appointments/{id}`          | Eliminar un turno. |

---

## Flujos de la app

Cada acción importante de la app se describe acá con un diagrama de secuencia, así se entiende qué pasa entre el usuario, los componentes, los servicios y la API.

### Flujo: Login

```
[Usuario]                 [Login.tsx]              [auth.ts]            [API Spring]
   │                          │                       │                      │
   │ 1. Escribe email/pass    │                       │                      │
   │─────────────────────────▶│                       │                      │
   │                          │                       │                      │
   │ 2. Click "Ingresar"      │                       │                      │
   │─────────────────────────▶│                       │                      │
   │                          │ 3. handleSubmit       │                      │
   │                          │    setLoading(true)   │                      │
   │                          │    login({...})       │                      │
   │                          │──────────────────────▶│                      │
   │                          │                       │ 4. POST /auth/login  │
   │                          │                       │    body: {email,pwd} │
   │                          │                       │─────────────────────▶│
   │                          │                       │                      │ 5. Verifica
   │                          │                       │                      │    BCrypt
   │                          │                       │                      │    Genera JWT
   │                          │                       │ 6. { token, ... }    │
   │                          │                       │◀─────────────────────│
   │                          │                       │ 7. localStorage      │
   │                          │                       │    .setItem(token)   │
   │                          │ 8. Resuelve promesa   │                      │
   │                          │◀──────────────────────│                      │
   │                          │ 9. navigate("/")      │                      │
   │ 10. Ve el Home logueado  │                       │                      │
   │◀─────────────────────────│                       │                      │
```

**Si algo falla** (credenciales mal, server caído):

- La API devuelve `401` con `{ message: "..." }`.
- `auth.ts` lo convierte en `throw new Error(message)`.
- El `catch` de `Login.tsx` lo guarda en `setError(...)`.
- Se renderiza el `<p className="auth-error">` con ese texto.
- El `finally` ejecuta `setLoading(false)` y libera el botón.

**Archivos involucrados:**
- [src/pages/Login/Login.tsx](src/pages/Login/Login.tsx) — UI y manejo de estado del form.
- [src/services/auth.ts](src/services/auth.ts) — función `login()`.

---

### Flujo: Registro

```
[Usuario]                [Register.tsx]            [auth.ts]            [API Spring]
   │                          │                       │                      │
   │ 1. Llena 4 campos        │                       │                      │
   │─────────────────────────▶│                       │                      │
   │                          │                       │                      │
   │ 2. Click "Crear cuenta"  │                       │                      │
   │─────────────────────────▶│                       │                      │
   │                          │ 3. handleSubmit       │                      │
   │                          │    ¿password ===      │                      │
   │                          │     confirmPassword?  │                      │
   │                          │    Si NO → setError   │                      │
   │                          │              y return │                      │
   │                          │                       │                      │
   │                          │ 4. register({...})    │                      │
   │                          │──────────────────────▶│                      │
   │                          │                       │ 5. POST /users       │
   │                          │                       │    body: {user,      │
   │                          │                       │           email,pwd} │
   │                          │                       │─────────────────────▶│
   │                          │                       │                      │ 6. Valida
   │                          │                       │                      │    (unicidad,
   │                          │                       │                      │     longitudes)
   │                          │                       │                      │    Hashea BCrypt
   │                          │                       │                      │    INSERT en DB
   │                          │                       │ 7. 201 Created       │
   │                          │                       │◀─────────────────────│
   │                          │ 8. Resuelve promesa   │                      │
   │                          │◀──────────────────────│                      │
   │                          │ 9. navigate("/login") │                      │
   │ 10. Ve pantalla de login │                       │                      │
   │◀─────────────────────────│                       │                      │
```

**Detalles clave:**

- El registro **no loguea automáticamente**: solo crea la cuenta. El siguiente paso es `/login`.
- La validación "las dos contraseñas son iguales" se hace en el front **antes** del fetch para no gastar request.
- `minLength`, `maxLength` y `pattern` en los `<input>` replican las reglas del back (3-30 chars, alfanumérico + `._-`, password 8-72). El browser bloquea casos obvios antes de enviar, pero la API igualmente revalida.

**Archivos involucrados:**
- [src/pages/Register/Register.tsx](src/pages/Register/Register.tsx) — UI y validación local.
- [src/services/auth.ts](src/services/auth.ts) — función `register()`.

---

### Diferencias rápidas entre Login y Registro

| | Login | Registro |
|---|---|---|
| Endpoint | `POST /auth/login` | `POST /users` |
| Body | `{ email, password }` | `{ username, email, password }` |
| Respuesta útil | JWT (token) | 201 Created sin body |
| Guarda token | Sí, en `localStorage` | No |
| Redirige a | `/` (Home) | `/login` |
| Validación extra en el front | Solo `required` | Confirmación de contraseña |

---

## Manejo de la sesión

Cuando el login sale bien, [auth.ts](src/services/auth.ts) guarda el JWT en `localStorage`. A partir de ahí:

- `getToken()` → devuelve el token (o `null`).
- `isAuthenticated()` → `true` si hay token guardado.
- `logout()` → borra el token (es básicamente el "cerrar sesión").
- `getCurrentUser()` → pega a `GET /auth/me` con el header `Authorization: Bearer <token>` y devuelve los datos del usuario.

Cualquier pantalla que necesite saber quién está logueado (ej. Perfil) tiene que usar estas funciones, no leer `localStorage` a mano.

---

### Flujo: Panel de administración

Cuando un usuario navega a `/admin/*`, React Router monta el guard antes del contenido. La secuencia es:

```
[Usuario]        [App.tsx Routes]    [ProtectedAdminRoute]   [auth.ts]      [API Spring]
   │                    │                     │                  │                │
   │ 1. va a /admin/x   │                     │                  │                │
   │───────────────────▶│                     │                  │                │
   │                    │ 2. matchea /admin   │                  │                │
   │                    │    monta Protected  │                  │                │
   │                    │────────────────────▶│                  │                │
   │                    │                     │ 3. ¿hay token?   │                │
   │                    │                     │    No → denied   │                │
   │                    │                     │    Si → loading  │                │
   │                    │                     │ 4. getCurrentUser│                │
   │                    │                     │─────────────────▶│                │
   │                    │                     │                  │ 5. GET /auth/me│
   │                    │                     │                  │───────────────▶│
   │                    │                     │                  │ 6. {role,...}  │
   │                    │                     │                  │◀───────────────│
   │                    │                     │ 7. role==="ADMIN"│                │
   │                    │                     │    ? ok : denied │                │
   │                    │                     │                  │                │
   │                    │                     │ ──── si DENIED ──────────────────▶│
   │                    │                     │ <Navigate to=/login replace />    │
   │                    │                     │                  │                │
   │                    │                     │ ──── si OK ──────────────────────▶│
   │                    │                     │ render <AdminLayout>              │
   │                    │                     │   <Outlet/> = Dashboard/Users/... │
   │ 8. ve el panel     │                     │                  │                │
   │◀───────────────────│─────────────────────│                  │                │
```

Una vez dentro del panel, cada sección hace su propio fetch a través de [src/services/admin.ts](src/services/admin.ts). El helper interno `authFetch` agrega automáticamente el `Authorization: Bearer <token>` a cada request, así los componentes no manipulan el token a mano.

**Acciones por sección:**

| Sección | URL | Acciones |
|---|---|---|
| Dashboard      | `/admin`               | Lectura de totales (4 fetchs paralelos con `size=1`). |
| Usuarios       | `/admin/usuarios`      | Cambiar rol (PATCH), eliminar (DELETE). |
| Servicios      | `/admin/servicios`     | ABM completo (POST/PUT/DELETE). |
| Profesionales  | `/admin/profesionales` | ABM completo + relación N-a-N con servicios. |
| Turnos         | `/admin/turnos`        | Confirmar, cancelar y eliminar. Filtro por estado. |

**Detalles de implementación clave:**

- El primer admin del sistema se crea desde la base de datos: registrate por la UI y después corré `UPDATE users SET role = 'ADMIN' WHERE email = '...';`.
- Las tablas usan un patrón de **patch local** después de cada acción: en vez de re-fetchear la página completa, el back devuelve el item actualizado y el front lo reemplaza en el array. Más rápido y mantiene scroll/foco.
- Las acciones por fila se trackean con un `Set<number>` de IDs ocupados, así el spinner/disabled solo afecta a la fila tocada, no a toda la tabla.
- Los formularios de ABM usan un truco para representar tres estados con una sola variable `editingId`: `null` (form cerrado), `0` (creando), `>0` (editando ese id).
- El filtro de turnos por estado dispara un re-fetch automático vía `useEffect` con dependencia en `[page, statusFilter]`.

**Archivos involucrados:**
- [src/App.tsx](src/App.tsx) — declara las rutas anidadas bajo `/admin`.
- [src/pages/Admin/ProtectedAdminRoute.tsx](src/pages/Admin/ProtectedAdminRoute.tsx) — guard de rol.
- [src/pages/Admin/AdminLayout.tsx](src/pages/Admin/AdminLayout.tsx) — sidebar y `<Outlet/>`.
- [src/services/admin.ts](src/services/admin.ts) — todas las llamadas al back.

---

## Próximos flujos a documentar

A medida que vayamos sumando funcionalidad, este README se actualiza con el diagrama correspondiente:

- [ ] Cerrar sesión.
- [ ] Ver perfil del usuario logueado.
- [ ] Listar servicios disponibles.
- [ ] Reservar un turno.
- [ ] Ver mis turnos.
- [x] Panel de admin (gestión de usuarios y roles).
