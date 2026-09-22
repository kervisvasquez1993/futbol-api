# Novedades de API para frontend — registro abierto, auto-inscripción, criterios de fin y jornadas

Todas las respuestas siguen envueltas en `{ "success": true, "data": ... }` (`TransformInterceptor`
global) y los errores en `{ "success": false, "message": "...", "errors"?: [...] }`
(`AllExceptionsFilter` global). Nada de esto cambió.

Este doc reemplaza / corrige la sección **7.1** de `api-contract-matches-goals.md` (el registro ya
**no** es de un solo uso) y la nota de la sección **3.3** de ese mismo doc sobre que el marcador es
"independiente" de los goles cargados (ya no lo es del todo, ver más abajo).

---

## 1. ⚠️ Breaking change: `POST /auth/register` ya no se bloquea después del primer usuario

Antes: el segundo intento de registro (y todos los siguientes) tiraban **403**
`"Ya existe una cuenta registrada..."`. **Eso ya no pasa.**

Comportamiento actual (`RegisterUseCase`):

- **Primer usuario del sistema** (tabla `users` vacía): se crea con `role: "admin"` y **sin**
  jugador vinculado (`playerId: null`). Igual que antes.
- **Cualquier registro siguiente**: se crea con `role: "member"` y se le crea automáticamente un
  `Player` (mismo `name` del registro), quedando vinculado en `playerId`. Antes esto no existía.
- Lo único que sigue bloqueando el registro es el **email duplicado** → `409 ConflictError`,
  `"Ya existe una cuenta registrada con ese email"`.

```json
// POST /auth/register  { "email": "juan@example.com", "password": "clave123", "name": "Juan" }
// segundo usuario del sistema en adelante:
{
  "success": true,
  "data": {
    "id": "u2-uuid",
    "email": "juan@example.com",
    "name": "Juan",
    "role": "member",
    "playerId": "p10-uuid",
    "createdAt": "2026-09-22T21:00:00.000Z"
  }
}
```

`POST /users` (admin logueado crea una cuenta a mano) **sigue existiendo igual que antes** y sigue
siendo la otra forma de dar de alta gente — pero **ojo**: ese flujo **no** crea/vincula un `Player`
automáticamente. Si el admin crea un `member` por ahí, su `playerId` queda en `null` hasta que
alguien lo vincule a mano en la base (no hay endpoint para eso todavía). Solo el
auto-registro por `POST /auth/register` genera el jugador automáticamente.

### `UserDto` tiene un campo nuevo: `playerId`

Aplica a **toda** respuesta que devuelva un usuario: `POST /auth/register`, `POST /auth/login`
(dentro de `user`), `GET /users/me`, `GET /users`, `POST /users`.

```ts
interface UserDto {
  id: string;
  email: string;
  name: string;
  role: 'admin' | 'member';
  playerId: string | null; // NUEVO — null si es admin o si un admin lo creó por POST /users
  createdAt: string;
}
```

---

## 2. Nuevo: auto-inscripción a un partido — `POST /matches/:id/join`

Antes solo el admin podía meter participantes (`POST /matches/:id/participants`, con `playerId` en
el body). Ahora **cualquier usuario logueado con jugador vinculado** puede anotarse solo:

```json
// POST /matches/:id/join   (requiere JWT)
{ "team": "home" }
```

No lleva `playerId` en el body — usa el `playerId` del usuario autenticado (del token). Devuelve el
`MatchParticipant` creado (mismo shape que `POST /matches/:id/participants`).

Errores:
- **403** `ForbiddenError` — `"Tu cuenta no tiene un jugador vinculado. Pide a un administrador que la vincule."`
  (pasa si el usuario es `admin`, o si es un `member` creado por `POST /users` sin jugador vinculado).
- **404** — el partido no existe.
- **409** — `"Ya estás inscrito en este partido"`.

En la UI: si `GET /users/me` trae `playerId: null`, no mostrar el botón de "anotarme al partido"
(mostrar en su lugar que falta vincular jugador, o dejarlo solo para admins que agregan gente por
`POST /matches/:id/participants`).

---

## 3. Nuevo: criterios de fin de partido (tiempo y/o goles) — aplica a **cualquier** partido

`POST /matches` acepta dos campos nuevos, **opcionales e independientes** (se puede mandar uno,
los dos, o ninguno):

```json
{
  "name": "Partido viernes",
  "date": "2026-08-21T20:00:00.000Z",
  "participants": [ /* igual que antes */ ],
  "durationMinutes": 10,
  "goalLimit": 3
}
```

- `durationMinutes` (entero ≥ 1, opcional): el partido se autofinaliza cuando pasan esos minutos
  desde que se creó (`createdAt`).
- `goalLimit` (entero ≥ 1, opcional): el partido se autofinaliza en cuanto **cualquiera** de los dos
  equipos llega a ese marcador (`homeScore`/`awayScore`).
- Si **no** se manda ninguno de los dos: el partido se comporta exactamente igual que hasta ahora —
  solo se finaliza a mano con `PATCH /matches/:id/finish`, sin límite de tiempo ni de goles.
- Si se mandan **ambos**: gana el que se cumpla primero.

`MatchDto` trae ambos campos siempre (pueden venir `null`):

```ts
interface MatchDto {
  // ...los campos que ya conocías...
  durationMinutes: number | null; // NUEVO
  goalLimit: number | null;       // NUEVO
  sessionId: string | null;             // NUEVO — ver sección 4 (jornadas)
  homeSessionTeamId: string | null;     // NUEVO — ver sección 4
  awaySessionTeamId: string | null;     // NUEVO — ver sección 4
}
```

### ⚠️ Importante: el auto-cierre es "perezoso", no hay cron ni websocket

No hay ningún proceso en el backend corriendo en segundo plano contando el tiempo. El chequeo de
"¿ya se cumplió el criterio, hay que cerrar el partido?" se dispara **solo cuando el front pega al
backend**: `GET /matches`, `GET /matches/:id`, después de `POST /matches/:matchId/goals`, o después
de `PATCH /matches/:id/score`. Si el front tiene una pantalla de partido abierta con un cronómetro
propio y no vuelve a pedir el partido, **no se va a enterar** de que ya venció hasta el próximo
`GET`. Recomendación: si hay `durationMinutes` seteado, poller `GET /matches/:id` cada cierto rato
(o al menos cuando el cronómetro local llega a cero) para refrescar el `status`.

### ⚠️ Cambio de comportamiento: `POST /matches/:matchId/goals` ahora SÍ mueve el marcador

El doc viejo (`api-contract-matches-goals.md`, sección 3.3) decía que cargar un gol con
`POST /matches/:matchId/goals` era independiente de `PATCH /matches/:id/score`. **Ya no es así**:
al cargar un gol, el backend identifica el equipo del goleador (según `participants`) y le suma
automáticamente 1 al `homeScore`/`awayScore` del partido (por eso puede disparar el auto-cierre por
`goalLimit`). Al borrar un gol (`DELETE /goals/:id`) se le resta 1 de vuelta a ese equipo (nunca
baja de `0`).

Esto significa que **ya no hace falta** llamar los dos endpoints por cada gol (antes se recomendaba
`PATCH /matches/:id/score` + `POST /matches/:matchId/goals` juntos). Con cargar el gol alcanza para
que el marcador quede al día. `PATCH /matches/:id/score` sigue existiendo para el caso de "sumar un
gol rápido sin saber quién anotó todavía" (o para corregir a mano), y sigue disparando el chequeo de
criterios igual que antes.

---

## 4. Nuevo: jornadas con rotación de equipos ("el que gana se queda") — `/match-sessions`

Pensado para cuando un mismo día se arma una "pichanga" con 2 o 3 equipos fijos y se van jugando
varios partidos seguidos, con un criterio para cortar cada ronda (tiempo y/o goles, igual que la
sección 3). Es un recurso nuevo, separado de `/matches`, pero **cada ronda es un `Match` normal** —
usa las mismas rutas de siempre (`GET/PATCH /matches/:id`, goles, `/join`, `/participants`, etc.).
Lo único que cambia es que ese `Match` trae `sessionId` + `homeSessionTeamId`/`awaySessionTeamId`
seteados, y que al finalizar dispara la siguiente ronda automáticamente (ver reglas abajo).

### 4.1. `POST /match-sessions` — crear la jornada (requiere JWT)

```json
{
  "name": "Jornada sábado",
  "date": "2026-09-27T20:00:00.000Z",
  "durationMinutes": 10,
  "goalLimit": 2,
  "teams": [
    { "name": "Equipo A", "playerIds": ["p1", "p2", "p3"] },
    { "name": "Equipo B", "playerIds": ["p4", "p5", "p6"] },
    { "name": "Equipo C", "playerIds": ["p7", "p8", "p9"] }
  ]
}
```

- `teams`: mínimo **2**, máximo **3**. Cada equipo necesita al menos 1 jugador.
- Un mismo jugador no puede estar en dos equipos de la misma jornada (`400 ValidationError`).
- Nombres de equipo repetidos dentro de la jornada → `400 ValidationError`.
- `durationMinutes` / `goalLimit`: igual que en `POST /matches` (opcionales, independientes) — son
  el criterio que se usa para **cada ronda** que se genere dentro de la jornada.
- Al crearla, se genera automáticamente la **ronda 1**: equipo `teams[0]` (home) vs `teams[1]`
  (away), con los jugadores de ambos como participantes. Si hay 3 equipos, el tercero arranca
  descansando.

Respuesta: `{ session, currentMatch }` — `session` trae los equipos con sus plantillas completas
(`teams[].players[].player`), `currentMatch` es el `MatchDto` de la ronda 1.

### 4.2. `GET /match-sessions/:id` — detalle + historial de rondas (público)

```json
{
  "success": true,
  "data": {
    "session": {
      "id": "s1-uuid",
      "name": "Jornada sábado",
      "date": "2026-09-27T20:00:00.000Z",
      "status": "en_curso",
      "durationMinutes": null,
      "goalLimit": 2,
      "teams": [
        { "id": "st1-uuid", "name": "Equipo A", "players": [{ "playerId": "p1", "player": { "...": "..." } }] }
      ],
      "createdAt": "2026-09-27T19:00:00.000Z"
    },
    "matches": [
      { "id": "m1-uuid", "homeTeamName": "Equipo A", "awayTeamName": "Equipo B", "homeScore": 2, "awayScore": 0, "status": "finalizado", "...": "resto de MatchDto" },
      { "id": "m2-uuid", "homeTeamName": "Equipo A", "awayTeamName": "Equipo C", "homeScore": 0, "awayScore": 0, "status": "en_curso", "...": "..." }
    ]
  }
}
```

`matches` viene ordenado por orden de juego (ronda 1 primero). El **último elemento** es siempre la
ronda actual/más reciente. Este endpoint también dispara el chequeo perezoso de criterios de la
ronda actual (ver nota de la sección 3) y, si corresponde, genera la siguiente ronda antes de
responder — por eso conviene refrescarlo periódicamente mientras la jornada está `en_curso`.

### 4.3. `GET /match-sessions` — listado (público)

Devuelve todas las jornadas (con equipos y plantillas, **sin** el array de `matches` — para eso
hay que pedir el detalle de cada una con 4.2), ordenadas por más reciente primero.

### 4.4. Reglas de rotación (qué pasa cuando termina una ronda)

Se dispara sola cuando la ronda actual pasa a `status: "finalizado"`, ya sea por criterio
automático (tiempo/goles) o porque alguien llama `PATCH /matches/:id/finish` a mano:

- **Jornada de 2 equipos**: se crea automáticamente la revancha entre los mismos dos equipos. Esto
  se repite indefinidamente — es responsabilidad del admin cerrar la jornada cuando quieran parar
  (ver 4.5).
- **Jornada de 3 equipos**:
  - Si hay un ganador claro (`homeScore` ≠ `awayScore`), ese equipo se queda y entra el equipo que
    estaba descansando. Se crea la siguiente ronda automáticamente.
  - Si la ronda termina **empatada**, **no se genera ninguna ronda automáticamente** — la jornada
    queda `en_curso` pero sin ningún partido activo. Para destrabarla, el admin tiene dos opciones:
    1. Corregir el resultado con `PATCH /matches/:id/result` (mandando un marcador no empatado) —
       esto sí dispara el avance con el resultado corregido.
    2. Cerrar la jornada directamente con `PATCH /match-sessions/:id/finish`.

### 4.5. `PATCH /match-sessions/:id/finish` — cerrar la jornada completa (requiere JWT)

Marca la jornada como `finalizada` y finaliza la ronda actual si estaba `en_curso` (sin generar una
ronda extra). Devuelve la `session` actualizada.

- `404` si no existe.
- `409` `"La jornada ya está finalizada"` si se llama dos veces.

---

## Resumen para tipar (TS) — solo lo nuevo/cambiado de esta entrega

```ts
type MatchSessionStatus = 'en_curso' | 'finalizada';

interface SessionTeamPlayerDto {
  id: string;
  sessionTeamId: string;
  playerId: string;
  player: PlayerDto;
  createdAt: string;
}

interface SessionTeamDto {
  id: string;
  sessionId: string;
  name: string;
  players: SessionTeamPlayerDto[];
  createdAt: string;
}

interface MatchSessionDto {
  id: string;
  name: string;
  date: string;
  status: MatchSessionStatus;
  durationMinutes: number | null;
  goalLimit: number | null;
  teams: SessionTeamDto[];
  createdAt: string;
}

interface MatchSessionDetailDto {
  session: MatchSessionDto;
  matches: MatchDto[]; // orden cronológico, el último es la ronda actual
}

// MatchDto (ya existente) — campos nuevos:
// durationMinutes: number | null
// goalLimit: number | null
// sessionId: string | null
// homeSessionTeamId: string | null
// awaySessionTeamId: string | null

// UserDto (ya existente) — campo nuevo:
// playerId: string | null

// POST /auth/register            -> ApiEnvelope<UserDto>  (YA NO se bloquea después del primer usuario)
// POST /matches/:id/join         -> ApiEnvelope<MatchParticipantDto>  (requiere JWT + playerId propio)
// POST /match-sessions           -> ApiEnvelope<{ session: MatchSessionDto; currentMatch: MatchDto }>
// GET  /match-sessions           -> ApiEnvelope<MatchSessionDto[]>
// GET  /match-sessions/:id       -> ApiEnvelope<MatchSessionDetailDto>
// PATCH /match-sessions/:id/finish -> ApiEnvelope<MatchSessionDto>
```

## Flujo recomendado en la UI para jornadas

1. Elegir 2 o 3 equipos con sus jugadores y, opcionalmente, tiempo/goles por ronda →
   `POST /match-sessions`. Mostrar de una la ronda 1 (`currentMatch`).
2. Mientras la jornada está activa: cargar goles de la ronda actual igual que en un partido normal
   (`POST /matches/:matchId/goals`, que ya mueve el marcador solo — ver sección 3).
3. Refrescar con `GET /match-sessions/:id` cada cierto tiempo (o después de cada gol) para detectar
   cuándo se cerró la ronda y arrancó la siguiente — comparar el `id` del último elemento de
   `matches` contra el que tenías pintado en pantalla.
4. Si la última ronda quedó `finalizado` pero **no aparece una ronda nueva** (mismo largo de
   `matches` que antes) y los equipos son 3: fue un empate, hay que resolverlo a mano (sección 4.4).
5. Para terminar la jornada del todo: `PATCH /match-sessions/:id/finish`.
