# SportCenter — Frontend

Aplicación web del centro deportivo: los socios reservan turnos, ven su historial y editan su cuenta; los administradores gestionan usuarios, servicios, profesionales y turnos.
Este repo contiene **solo el frontend**: consume la API REST de [sportcenter-api](https://github.com/ManuelFalchettoni/sportcenter-api).

---

## Índice

1. [Stack](#stack)
2. [Cómo correrlo](#cómo-correrlo)
3. [Estructura del proyecto](#estructura-del-proyecto)
4. [Arquitectura general](#arquitectura-general)
5. [Manejo de la sesión (JWT)](#manejo-de-la-sesión-jwt)
6. [Conexión con la API](#conexión-con-la-api)
7. [Flujos de la app](#flujos-de-la-app)
   - [Login](#flujo-login)
   - [Registro](#flujo-registro)
   - [Reservar un turno](#flujo-reservar-un-turno)
   - [Mi perfil y mis turnos](#flujo-mi-perfil-y-mis-turnos)
   - [Configuración (editar mi cuenta)](#flujo-configuración-editar-mi-cuenta)
   - [Panel de administración](#flujo-panel-de-administración)
8. [Patrones de código que se repiten](#patrones-de-código-que-se-repiten)
9. [Glosario](#glosario)
10. [Preguntas frecuentes](#preguntas-frecuentes)

---

## Stack

- **React 19** + **TypeScript**: UI declarativa con tipado estático.
- **Vite**: bundler ultra-rápido (dev server con HMR y build de producción).
- **React Router 7**: navegación SPA, sin recargas, con rutas anidadas y guards.
- **react-icons**: catálogo de íconos en componentes.
- **fetch** nativo del browser: no usamos axios; menos dependencias.

> **¿Por qué no Redux / Zustand?** Los datos se piden cuando se necesitan y el estado vive en el componente más cercano a donde se usa. Para una app de este tamaño, sumar una librería de estado global sería sobreingeniería.

---

## Cómo correrlo

```bash
# 1. Instalar dependencias
npm install

# 2. Levantar la API (otra terminal, repo sportcenter-api)
#    Tiene que quedar escuchando en http://localhost:8080

# 3. Levantar el frontend
npm run dev
```

Vite suele abrir en `http://localhost:5173`. Si el puerto está ocupado, salta al siguiente.

| Script | Qué hace |
|---|---|
| `npm run dev` | Servidor de desarrollo con hot-reload. |
| `npm run build` | Compila TypeScript y arma el bundle de producción. |
| `npm run preview` | Sirve localmente el build de producción. |
| `npm run lint` | Corre ESLint sobre todo el código. |

---

## Estructura del proyecto

```
src/
├── App.tsx                  # Componente raíz: define las rutas
├── main.tsx                 # Punto de entrada (renderiza <App /> en el DOM)
├── index.css                # Variables CSS globales (--primary, fuentes, etc.)
├── components/              # Componentes compartidos por varias páginas
│   ├── Navbar.tsx           # Barra superior con dropdown de perfil
│   └── Footer.tsx
├── pages/                   # Una carpeta por pantalla
│   ├── Home/                # Landing pública
│   ├── Login/               # Form de inicio de sesión
│   ├── Register/            # Form de creación de cuenta
│   ├── Profile/             # Mi perfil + mis turnos + stats del mes
│   ├── Configuration/       # Edición de username / email / contraseña
│   ├── Services/            # Catálogo público de servicios
│   ├── Booking/             # Flujo de reserva (servicio → pro → fecha → slot)
│   └── Admin/               # Panel de administración (ABM completo)
├── services/                # Lógica que habla con la API
│   ├── api.ts               # URL base y clave del localStorage
│   ├── auth.ts              # login, register, getCurrentUser, updateMyProfile, logout
│   ├── booking.ts           # listar servicios/profesionales, disponibilidad, reservar
│   └── admin.ts             # CRUD de usuarios, servicios, profesionales y turnos
└── styles/
    └── buttons.css          # Sistema de botones reutilizable (.btn .btn-primary, etc.)
```

**Regla simple:** las páginas (`pages/`) **nunca** llaman a `fetch` directo. Siempre van a través de una función de `services/`. Así, si cambia la URL del back o agregamos un interceptor, se toca un solo archivo.

---

## Arquitectura general

```
┌─────────────────────────────────────────────────────────────┐
│                       Browser (SPA)                          │
│                                                              │
│  ┌──────────────┐    ┌──────────────┐    ┌──────────────┐  │
│  │   pages/     │───▶│  services/   │───▶│   fetch()    │  │
│  │  (UI/JSX)    │    │  (HTTP+map)  │    │              │  │
│  └──────────────┘    └──────────────┘    └──────┬───────┘  │
│         ▲                                        │          │
│         │                                        │ JWT en   │
│         │                                        │ header   │
│  ┌──────┴───────┐                                │          │
│  │ localStorage │                                │          │
│  │ (JWT token)  │                                │          │
│  └──────────────┘                                │          │
└──────────────────────────────────────────────────┼──────────┘
                                                   ▼
                                    ┌───────────────────────────┐
                                    │   API Spring Boot         │
                                    │   http://localhost:8080   │
                                    │   /sportcenter/*          │
                                    └───────────────────────────┘
```

**Capas:**

1. **UI (pages / components):** componentes React con estado local (`useState`, `useEffect`, `useMemo`). No saben nada de HTTP.
2. **Services:** centralizan los `fetch`, agregan el header `Authorization`, parsean errores y devuelven datos ya tipados.
3. **API:** Spring Boot + JWT. Valida permisos por rol (`@PreAuthorize`).

---

## Manejo de la sesión (JWT)

El login devuelve un **JSON Web Token (JWT)** que persiste en `localStorage`. Cualquier request a un endpoint protegido lleva ese token en el header `Authorization: Bearer <token>`.

Helpers en [auth.ts](src/services/auth.ts):

| Función | Qué hace |
|---|---|
| `login({ email, password })` | POST `/auth/login`, guarda el JWT en `localStorage`. |
| `register({ username, email, password })` | POST `/users`. No loguea automáticamente. |
| `getCurrentUser()` | GET `/auth/me` con el Bearer; devuelve `{ id, username, email, role, createdDate }`. |
| `updateMyProfile(id, payload)` | PUT `/users/{id}` con los campos editados. |
| `getToken()` | Lee el token (o `null`). |
| `isAuthenticated()` | `true` si hay token. **Solo verifica presencia**, no validez ni vencimiento. |
| `logout()` | Borra el token del `localStorage`. |

> **Importante:** ninguna pantalla lee `localStorage` a mano. Si algo nuevo necesita saber si hay sesión, importa `isAuthenticated()` de `auth.ts`.

**Limitación conocida:** `isAuthenticated()` no comprueba si el JWT venció. Si el token caducó, la próxima request al back devolverá `401` y eso se mostrará como error en la UI; la sesión NO se cierra automáticamente.

---

## Conexión con la API

- URL base: `http://localhost:8080/sportcenter` (constante `API_BASE_URL` en [api.ts](src/services/api.ts)).
- Clave del token en `localStorage`: `sportcenter_token` (constante `TOKEN_STORAGE_KEY`).
- Autenticación: **JWT** en `Authorization: Bearer <token>`.
- Manejo de errores: si el back responde con `!response.ok`, se intenta leer `{ message, error }` del body y se lanza `Error(message)`. El componente lo atrapa con `try/catch` y lo muestra en pantalla.

### Endpoints usados hoy

#### Públicos / autenticación

| Método | Endpoint | Para qué |
|---|---|---|
| `POST` | `/auth/login` | Iniciar sesión, obtener token. |
| `POST` | `/users` | Crear una cuenta nueva. |
| `GET`  | `/auth/me` | Datos del usuario logueado. |

#### Catálogo público (sin token)

| Método | Endpoint | Para qué |
|---|---|---|
| `GET` | `/service-types?page&size` | Listado de servicios. |
| `GET` | `/professionals?page&size` | Listado de profesionales. |
| `GET` | `/professionals/{id}/availability?date=YYYY-MM-DD` | Slots ocupados de un profesional un día. |

#### Usuario logueado (`Bearer <token>`, rol USER o ADMIN)

| Método | Endpoint | Para qué |
|---|---|---|
| `PUT`    | `/users/{id}`                 | Editar mi propio perfil (un ADMIN puede editar a cualquiera). |
| `POST`   | `/appointments`               | Crear una reserva. El dueño se infiere del JWT. |
| `GET`    | `/appointments?page&size&...` | Para un USER, devuelve solo SUS turnos. |
| `PATCH`  | `/appointments/{id}/cancel`   | El dueño puede cancelar su propio turno. |

#### Panel de administración (solo ADMIN)

| Método | Endpoint | Para qué |
|---|---|---|
| `GET`    | `/users?page&size`            | Listar usuarios paginados. |
| `PATCH`  | `/users/{id}/role`            | Cambiar el rol de un usuario. |
| `DELETE` | `/users/{id}`                 | Eliminar un usuario. |
| `POST` `PUT` `DELETE` | `/service-types[/{id}]` | ABM de tipos de servicio. |
| `POST` `PUT` `DELETE` | `/professionals[/{id}]` | ABM de profesionales. |
| `PATCH`  | `/appointments/{id}/confirm`  | Confirmar un turno pendiente. |
| `DELETE` | `/appointments/{id}`          | Baja física de un turno. |

---

## Flujos de la app

Cada acción importante de la app se documenta con un diagrama de secuencia entre el usuario, los componentes, los servicios y la API.

### Flujo: Login

```
[Usuario]                 [Login.tsx]              [auth.ts]            [API Spring]
   │                          │                       │                      │
   │ 1. Escribe email/pass    │                       │                      │
   │─────────────────────────▶│                       │                      │
   │ 2. Click "Ingresar"      │                       │                      │
   │─────────────────────────▶│                       │                      │
   │                          │ 3. handleSubmit       │                      │
   │                          │    setLoading(true)   │                      │
   │                          │    login({...})       │                      │
   │                          │──────────────────────▶│                      │
   │                          │                       │ 4. POST /auth/login  │
   │                          │                       │    body: {email,pwd} │
   │                          │                       │─────────────────────▶│
   │                          │                       │                      │ 5. Verifica BCrypt
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

**Archivos:** [Login.tsx](src/pages/Login/Login.tsx), [auth.ts](src/services/auth.ts).

---

### Flujo: Registro

```
[Usuario]                [Register.tsx]            [auth.ts]            [API Spring]
   │                          │                       │                      │
   │ 1. Llena 4 campos        │                       │                      │
   │─────────────────────────▶│                       │                      │
   │ 2. Click "Crear cuenta"  │                       │                      │
   │─────────────────────────▶│                       │                      │
   │                          │ 3. ¿password ===      │                      │
   │                          │     confirmPassword?  │                      │
   │                          │    Si NO → setError   │                      │
   │                          │                       │                      │
   │                          │ 4. register({...})    │                      │
   │                          │──────────────────────▶│                      │
   │                          │                       │ 5. POST /users       │
   │                          │                       │─────────────────────▶│
   │                          │                       │                      │ 6. Valida unicidad
   │                          │                       │                      │    Hashea BCrypt
   │                          │                       │                      │    INSERT en DB
   │                          │                       │ 7. 201 Created       │
   │                          │                       │◀─────────────────────│
   │                          │ 9. navigate("/login") │                      │
   │ 10. Ve pantalla de login │                       │                      │
   │◀─────────────────────────│                       │                      │
```

**Detalles clave:**

- El registro **no loguea automáticamente**: solo crea la cuenta. El siguiente paso es `/login`.
- La validación "las dos contraseñas son iguales" se hace en el front **antes** del fetch.
- `minLength`, `maxLength` y `pattern` en los `<input>` replican las reglas del back (3-30 chars, alfanumérico + `._-`, password 8-72). El browser bloquea casos obvios; la API igualmente revalida.

**Archivos:** [Register.tsx](src/pages/Register/Register.tsx), [auth.ts](src/services/auth.ts).

#### Diferencias rápidas entre Login y Registro

| | Login | Registro |
|---|---|---|
| Endpoint | `POST /auth/login` | `POST /users` |
| Body | `{ email, password }` | `{ username, email, password }` |
| Respuesta útil | JWT (token) | 201 Created sin body |
| Guarda token | Sí, en `localStorage` | No |
| Redirige a | `/` (Home) | `/login` |

---

### Flujo: Reservar un turno

Pantalla `/turnos`. Es el flujo más complejo de la app: combina **catálogos públicos**, **cálculo en el front** y una **escritura autenticada**.

**Pasos visibles al usuario:**

1. Elegir servicio → 2. Elegir profesional → 3. Elegir fecha → 4. Elegir slot → 5. (Opcional) escribir nota → confirmar.

```
[Usuario]            [Booking.tsx]           [booking.ts]          [API Spring]
   │                       │                      │                      │
   │ Entra a /turnos       │                      │                      │
   │──────────────────────▶│                      │                      │
   │                       │ 1. useEffect inicial │                      │
   │                       │    Promise.all([     │                      │
   │                       │      listServices,   │                      │
   │                       │      listPros])      │                      │
   │                       │─────────────────────▶│ GET /service-types   │
   │                       │                      │─────────────────────▶│
   │                       │                      │ GET /professionals   │
   │                       │                      │─────────────────────▶│
   │                       │                      │◀── catálogos ────────│
   │                       │◀─────────────────────│                      │
   │ Elige servicio        │                      │                      │
   │──────────────────────▶│ filtra profesionales │                      │
   │                       │  con useMemo         │                      │
   │ Elige profesional     │                      │                      │
   │──────────────────────▶│                      │                      │
   │ Elige fecha           │                      │                      │
   │──────────────────────▶│ 2. useEffect [pro+   │                      │
   │                       │    fecha]            │                      │
   │                       │    getAvailability() │                      │
   │                       │─────────────────────▶│ GET /pros/{id}/      │
   │                       │                      │     availability     │
   │                       │                      │─────────────────────▶│
   │                       │                      │◀── busySlots ────────│
   │                       │ 3. buildSlots()      │                      │
   │                       │    pinta grilla      │                      │
   │ Elige slot libre      │                      │                      │
   │──────────────────────▶│ muestra resumen      │                      │
   │ Click "Confirmar"     │                      │                      │
   │──────────────────────▶│ createAppointment()  │                      │
   │                       │─────────────────────▶│ POST /appointments   │
   │                       │                      │     (Bearer JWT)     │
   │                       │                      │─────────────────────▶│
   │                       │                      │                      │ Verifica
   │                       │                      │                      │ que no haya
   │                       │                      │                      │ pisada;
   │                       │                      │                      │ INSERT
   │                       │                      │◀── 201 / 409 ────────│
   │                       │ 4. refetch disponib. │                      │
   │                       │    para tachar slot  │                      │
   │ Ve mensaje OK         │                      │                      │
   │◀──────────────────────│                      │                      │
```

**Decisiones técnicas importantes:**

- **Los slots se calculan en el front, no en el back.** La función `buildSlots()` de [Booking.tsx](src/pages/Booking/Booking.tsx) genera la grilla cada `SLOT_STEP = 30` minutos entre `OPEN_HOUR = 8` y `CLOSE_HOUR = 22`. Cada slot dura lo que dura el servicio (puede abarcar varios pasos de 30 min). El back solo devuelve los rangos ocupados; el front decide cuáles "pisa".
- **Función `overlaps()`:** `startA < endB && startB < endA` con `<` estricto, para que dos turnos que se *tocan* en el borde (ej. uno termina 10:00 y otro arranca 10:00) **no** cuenten como solapados.
- **`useMemo` para `slots`:** no recalcula la grilla en cada render; solo cuando cambia servicio, profesional, fecha o `busy`.
- **`useEffect` con cleanup (`let cancelled = false`):** evita race conditions si el usuario cambia de profesional rápido (la respuesta vieja podría llegar después de la nueva).
- **El back valida `@Future`:** aunque el front filtra los slots ya pasados, no confiamos en el cliente.
- **El dueño NO viaja en el body del POST.** El back lo infiere del JWT, así nadie puede reservar a nombre de otro.

**Archivos:** [Booking.tsx](src/pages/Booking/Booking.tsx), [Booking.css](src/pages/Booking/Booking.css), [booking.ts](src/services/booking.ts).

---

### Flujo: Mi perfil y mis turnos

Pantalla `/perfil`. Muestra:

- Datos del usuario (`getCurrentUser()`).
- Stats del mes en curso (turnos totales y top 3 servicios).
- Próximos turnos (futuros, no cancelados): cada uno con botón **Cancelar**.
- Historial de turnos (pasados + cancelados): con badge de estado.

```
[Usuario]           [Profile.tsx]          [auth.ts + booking.ts]    [API Spring]
   │                       │                       │                       │
   │ Entra a /perfil       │                       │                       │
   │──────────────────────▶│                       │                       │
   │                       │ Promise.all([         │                       │
   │                       │   getCurrentUser,     │                       │
   │                       │   listMyAppointments  │                       │
   │                       │ ])                    │                       │
   │                       │──────────────────────▶│ GET /auth/me          │
   │                       │                       │──────────────────────▶│
   │                       │                       │ GET /appointments     │
   │                       │                       │   (back filtra por    │
   │                       │                       │    usuario del JWT)   │
   │                       │                       │──────────────────────▶│
   │                       │                       │◀── { user, apps[] } ──│
   │                       │ useMemo: separa       │                       │
   │                       │   upcoming vs past,   │                       │
   │                       │   calcula stats       │                       │
   │ Ve perfil completo    │                       │                       │
   │◀──────────────────────│                       │                       │
   │ Click "Cancelar"      │                       │                       │
   │──────────────────────▶│ cancelMyAppointment() │                       │
   │                       │──────────────────────▶│ PATCH /apps/{id}/     │
   │                       │                       │   cancel              │
   │                       │                       │──────────────────────▶│
   │                       │ Update OPTIMISTA:     │                       │
   │                       │   marca CANCELLED     │                       │
   │                       │   en estado local     │                       │
   │ Ve fila tachada       │                       │                       │
   │◀──────────────────────│                       │                       │
```

**Decisiones técnicas importantes:**

- **`GET /appointments` reaprovecha el endpoint del admin.** El back lo discrimina por rol: a un USER le devuelve solo sus turnos.
- **`useMemo` para particionar:** separa próximos y pasados, y arma stats del mes, en una sola pasada.
- **Update optimista en `handleCancel`:** en vez de re-fetchear todo el listado, se reemplaza el item local con `setAppointments(prev => prev.map(...))`.
- **El botón ⚙️ Configuración es un `Link`** a `/configuracion` con `text-decoration: none` y `display: inline-block` para mantener el padding (pisa el estilo default de los anchors).

**Archivos:** [Profile.tsx](src/pages/Profile/Profile.tsx), [Profile.css](src/pages/Profile/Profile.css).

---

### Flujo: Configuración (editar mi cuenta)

Pantalla `/configuracion`, se entra desde el botón ⚙️ del perfil. Permite editar **username**, **email** y, opcionalmente, **contraseña**.

```
[Usuario]        [Configuration.tsx]         [auth.ts]            [API Spring]
   │                       │                      │                      │
   │ Click ⚙️ del perfil    │                      │                      │
   │──────────────────────▶│                      │                      │
   │                       │ getCurrentUser()     │                      │
   │                       │─────────────────────▶│ GET /auth/me         │
   │                       │                      │─────────────────────▶│
   │                       │◀── volcar al form ───│                      │
   │ Edita campos          │                      │                      │
   │──────────────────────▶│                      │                      │
   │ Click "Guardar"       │                      │                      │
   │──────────────────────▶│ Valida cliente:      │                      │
   │                       │  - username ≥3       │                      │
   │                       │  - email tiene "@"   │                      │
   │                       │  - si quiere cambiar │                      │
   │                       │    clave: nueva≥8,   │                      │
   │                       │    coincide, hay     │                      │
   │                       │    currentPassword   │                      │
   │                       │ updateMyProfile()    │                      │
   │                       │─────────────────────▶│ PUT /users/{id}      │
   │                       │                      │   body limpio:       │
   │                       │                      │   omite password si  │
   │                       │                      │   está vacía         │
   │                       │                      │─────────────────────▶│
   │                       │                      │                      │ @PreAuthorize
   │                       │                      │                      │ "ADMIN o
   │                       │                      │                      │  principal.id"
   │                       │                      │                      │ Verifica unicidad
   │                       │                      │                      │ Si cambia clave
   │                       │                      │                      │ → matches BCrypt
   │                       │                      │                      │ Hashea nueva
   │                       │                      │◀── UserResponse ─────│
   │                       │ setUser(updated)     │                      │
   │                       │ limpia campos clave  │                      │
   │ Ve "Datos OK"         │                      │                      │
   │◀──────────────────────│                      │                      │
```

**Decisiones técnicas importantes:**

- **Doble validación.** El front frena los casos obvios (campos vacíos, passwords distintas) sin esperar al back; el back igualmente revalida tamaño/regex/unicidad.
- **Body "limpio".** Si el usuario no escribió nueva contraseña, la función `updateMyProfile` **omite** los campos `password` y `currentPassword` del JSON. El back distingue "no quiere cambiarla" (campo ausente) de "quiere ponerla en vacío" (lo rechazaría).
- **Permiso a nivel API.** El controller Spring tiene `@PreAuthorize("hasRole('ADMIN') or #id == principal.id")`: un USER común solo puede editarse a sí mismo, no a otro id.
- **`currentPassword` obligatoria al cambiar clave.** Un token robado no alcanza para tomar la cuenta: hay que demostrar conocimiento de la contraseña vigente. El front lo exige también.
- **Dos tarjetas (`.config-card`).** Separación visual entre "datos personales" y "cambiar contraseña" — comunica al usuario que el segundo bloque es opcional.

**Archivos:** [Configuration.tsx](src/pages/Configuration/Configuration.tsx), [Configuration.css](src/pages/Configuration/Configuration.css), [auth.ts](src/services/auth.ts) (función `updateMyProfile`).

---

### Flujo: Panel de administración

Cuando un usuario navega a `/admin/*`, React Router monta el guard antes del contenido.

```
[Usuario]       [App.tsx]       [ProtectedAdminRoute]   [auth.ts]      [API Spring]
   │                │                     │                  │                │
   │ /admin/x       │                     │                  │                │
   │───────────────▶│                     │                  │                │
   │                │ matchea /admin      │                  │                │
   │                │ monta Protected     │                  │                │
   │                │────────────────────▶│                  │                │
   │                │                     │ ¿hay token?      │                │
   │                │                     │    No → denied   │                │
   │                │                     │    Si → loading  │                │
   │                │                     │ getCurrentUser() │                │
   │                │                     │─────────────────▶│ GET /auth/me   │
   │                │                     │                  │───────────────▶│
   │                │                     │                  │◀── {role,...} ─│
   │                │                     │ role==="ADMIN"?  │                │
   │                │                     │                  │                │
   │                │                     │ DENIED → <Navigate to=/login>     │
   │                │                     │ OK     → render <AdminLayout>     │
   │                │                     │           <Outlet/> = sub-ruta    │
   │ Ve el panel    │                     │                  │                │
   │◀───────────────│─────────────────────│                  │                │
```

Una vez dentro del panel, cada sección hace su propio fetch a través de [admin.ts](src/services/admin.ts). El helper interno `authFetch` agrega automáticamente el `Authorization: Bearer <token>` a cada request.

**Acciones por sección:**

| Sección | URL | Acciones |
|---|---|---|
| Dashboard      | `/admin`               | Lectura de totales (4 fetchs paralelos con `size=1`). |
| Usuarios       | `/admin/usuarios`      | Cambiar rol (PATCH), eliminar (DELETE). |
| Servicios      | `/admin/servicios`     | ABM completo (POST/PUT/DELETE). |
| Profesionales  | `/admin/profesionales` | ABM completo + relación N-a-N con servicios. |
| Turnos         | `/admin/turnos`        | Confirmar, cancelar y eliminar. Filtro por estado. |

**Detalles de implementación clave:**

- **El primer admin del sistema se crea desde la base de datos:** registrate por la UI y después corré `UPDATE users SET role = 'ADMIN' WHERE email = '...';`.
- **Patch local después de cada acción:** en vez de re-fetchear la página completa, el back devuelve el item actualizado y el front lo reemplaza en el array. Más rápido y mantiene scroll/foco.
- **`Set<number>` de IDs ocupados:** el spinner/disabled afecta solo a la fila tocada, no a toda la tabla.
- **Truco del `editingId`:** tres estados con una sola variable — `null` (form cerrado), `0` (creando), `>0` (editando ese id).
- **Filtro de turnos por estado:** dispara un re-fetch automático vía `useEffect` con dependencia en `[page, statusFilter]`.

**Archivos:** [App.tsx](src/App.tsx), [ProtectedAdminRoute.tsx](src/pages/Admin/ProtectedAdminRoute.tsx), [AdminLayout.tsx](src/pages/Admin/AdminLayout.tsx), [admin.ts](src/services/admin.ts).

---

## Patrones de código que se repiten

Aparecen en varias páginas del proyecto.

### 1. `let cancelled = false` en `useEffect` con fetch

```ts
useEffect(() => {
  let cancelled = false;
  fetchSomething().then((data) => {
    if (!cancelled) setData(data);
  });
  return () => { cancelled = true; };
}, [dep]);
```

Evita el clásico bug: si el efecto se ejecuta dos veces (o el componente se desmonta antes de que termine el fetch), no escribimos un estado obsoleto.

### 2. `useMemo` para derivar datos del estado

```ts
const slots = useMemo(() => buildSlots(date, duration, busy), [date, duration, busy]);
```

`buildSlots` es una **pure function**: misma entrada → misma salida, sin efectos. `useMemo` memoriza el resultado y solo recalcula si cambia alguna dependencia.

### 3. Update optimista

Cuando el back va a devolver el item actualizado (o un OK simple), no re-fetcheamos toda la lista: parcheamos el array local.

```ts
setAppointments(prev => prev.map(a => a.id === id ? { ...a, status: "CANCELLED" } : a));
```

Si el back falla, se muestra el error y opcionalmente se revierte.

### 4. Estado de carga + error + datos

Casi todas las páginas tienen:

```ts
const [loading, setLoading] = useState(true);
const [error, setError] = useState<string | null>(null);
const [data, setData] = useState<T | null>(null);
```

El render hace tres "guards": si `loading` → spinner; si `error` → mensaje; si no → contenido.

### 5. Servicios como única fuente de verdad para HTTP

Las páginas importan funciones tipadas: `await login(...)`, `await createAppointment(...)`. Nunca hacen `fetch` directo. Esto centraliza:

- el header `Authorization`,
- el parseo de errores del back,
- el tipo de retorno (TypeScript las valida).

### 6. Variables CSS para tematizar

`--primary`, `--secondary`, `--neutral` viven en [index.css](src/index.css). Todas las páginas las consumen vía `var(--primary)`. Cambiar el color del header del sistema = cambiar una sola línea.

---

## Glosario

- **SPA (Single Page Application):** la app es un solo `index.html` que monta React; las "rutas" no recargan la página, solo cambian el componente que se muestra.
- **JWT (JSON Web Token):** string firmado que el back emite al loguearse. Contiene el id y rol del usuario. El front lo guarda y lo manda en cada request protegida.
- **Bearer:** convención de header HTTP: `Authorization: Bearer <token>`.
- **Hook:** función especial de React que arranca con `use*` y solo se usa adentro de componentes. Ejemplos: `useState`, `useEffect`, `useMemo`, `useRef`.
- **Pure function:** función sin efectos secundarios (no muta estado, no hace fetch). Misma entrada → misma salida. Ideal para `useMemo`.
- **Render optimista:** actualizar la UI **antes** de que el back confirme, asumiendo que va a salir bien. Si falla, se revierte.
- **Guard de ruta:** componente que envuelve a otra ruta y decide si dejar entrar (ej. `ProtectedAdminRoute`).
- **`@PreAuthorize`:** anotación de Spring Security que ejecuta una expresión SpEL antes de entrar al método. Devuelve 403 si no se cumple.

---

## Preguntas frecuentes

**¿Por qué no usás Redux?**
Para esta app, la mayoría del estado es local a cada pantalla y el resto vive en `localStorage` (token). Sumar Redux/Zustand sería sobreingeniería. Si el estado compartido entre páginas creciera, se podría introducir Context o Zustand.

**¿Cómo se sabe en el front que un usuario es ADMIN?**
`getCurrentUser()` devuelve `{ ..., role: "USER" | "ADMIN" }`. El `Navbar.tsx` muestra el link "Panel de admin" solo si `user?.role === "ADMIN"`, y `ProtectedAdminRoute.tsx` lo verifica de nuevo antes de montar. Igual el back valida con `@PreAuthorize`: nunca se confía en el cliente.

**¿Qué pasa si el JWT vence?**
`isAuthenticated()` solo verifica que haya un string guardado, no si es válido. Si está vencido, la próxima request fallará con 401 y se mostrará el error. Para una mejora real habría que decodificar el `exp` o interceptar 401s globalmente.

**¿Por qué calcular los slots en el front y no en el back?**
El back ya sabe los horarios ocupados (los devuelve en `availability`); calcular los libres es derivación pura. Hacerlo en el front evita lógica duplicada de duración/intervalos en el server y baja la carga. Igualmente el back valida `@Future` y la no-superposición al crear el turno.

**¿Por qué no se confirma la contraseña al cambiar email?**
El back solo exige `currentPassword` cuando hay un nuevo `password` en el request. Cambiar email no requiere clave, alcanza con el JWT. Es una decisión del back; podríamos endurecerla si la cátedra lo pide.

**¿Por qué los formularios usan `<select>` y no un combobox custom?**
Accesibilidad por defecto y cero JS adicional. El `<select>` nativo ya viene con navegación por teclado, soporte mobile y lectores de pantalla.

**¿Cómo se manejan los errores del back?**
Cada función de `services/` hace `if (!response.ok) await throwApiError(response);`. `throwApiError` lee `{ message }` del JSON y lanza `Error(message)`. La página lo atrapa en su `try/catch` y lo muestra con `setError(...)`.

**¿Qué hace `--cancelled` (la flag de cleanup)?**
Es un patrón de React para evitar setear estado después de que el componente se desmontó (o el efecto se relanzó). Sin él, podríamos sobrescribir el estado nuevo con la respuesta de un request viejo.
