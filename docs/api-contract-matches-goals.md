# Contrato real — matches / goals / players / stats (futbol-tracker-api)

Verificado leyendo controllers, use-cases, repositorios TypeORM y entidades directamente
(no hay DTOs de respuesta ni `ClassSerializerInterceptor`: las entidades TypeORM se
devuelven tal cual y el `TransformInterceptor` global las envuelve en `{ success, data }`).

---

## 1. GET /matches

`ListMatchesUseCase` -> `matchRepository.findAll()` -> `repository.find({ relations: { participants: true } })`.

Los `participants` **SÍ vienen como objetos completos anidados** (`Player[]`), no como array de ids.

```json
{
  "success": true,
  "data": [
    {
      "id": "a1b2c3d4-1111-2222-3333-444455556666",
      "name": "Partido viernes",
      "date": "2026-08-21T20:00:00.000Z",
      "status": "en_curso",
      "participants": [
        {
          "id": "p1-uuid",
          "name": "Kervis",
          "imageUrl": "https://cdn.example.com/kervis.png",
          "createdAt": "2026-01-10T12:00:00.000Z"
        },
        {
          "id": "p2-uuid",
          "name": "Juan",
          "imageUrl": null,
          "createdAt": "2026-01-10T12:05:00.000Z"
        }
      ],
      "createdAt": "2026-08-20T15:30:00.000Z"
    }
  ]
}
```

### Enum `status` (`src/modules/matches/domain/enums/match-status.enum.ts`) — completo, tal cual está en el código:

```ts
enum MatchStatus {
  EN_CURSO = 'en_curso',
  FINALIZADO = 'finalizado',
}
```

Solo existen esos dos valores. No hay "pendiente", "cancelado", etc.

---

## 2. GET /matches/:id

`GetMatchUseCase` -> mismo repo, `findOne({ where: { id }, relations: { participants: true } })`.
404 (`NotFoundError` -> filtro global) si no existe.

Es **el mismo shape que un elemento del array de `/matches`** (mismo objeto `Match` con `participants` anidados).

```json
{
  "success": true,
  "data": {
    "id": "a1b2c3d4-1111-2222-3333-444455556666",
    "name": "Partido viernes",
    "date": "2026-08-21T20:00:00.000Z",
    "status": "finalizado",
    "participants": [
      { "id": "p1-uuid", "name": "Kervis", "imageUrl": "https://cdn.example.com/kervis.png", "createdAt": "2026-01-10T12:00:00.000Z" }
    ],
    "createdAt": "2026-08-20T15:30:00.000Z"
  }
}
```

**NO trae los goles anidados.** No hay relación `goals` en el `Match` entity ni se cargan en el use-case.
Hay que pedirlos aparte con `GET /matches/:matchId/goals`.

---

## 3. GET /matches/:matchId/goals

`ListGoalsByMatchUseCase` -> `goalRepository.findByMatchId(matchId)` -> TypeORM
`find({ where: { matchId }, relations: { scorer: true, assist: true } })`.

`scorerId`/`assistId` (los ids planos) **y** `scorer`/`assist` (objetos `Player` expandidos)
**vienen ambos a la vez** — el controller no los quita.

Nombres de campos exactos (entity `Goal`, `src/modules/goals/domain/entities/goal.entity.ts`):
camelCase en JSON (`matchId`, `scorerId`, `assistId`, `minute`, `createdAt`) — las columnas
`match_id`/`scorer_id`/`assist_id`/`created_at` son solo el nombre de columna en la BD (snake_case),
no lo que sale en el JSON.

```json
{
  "success": true,
  "data": [
    {
      "id": "goal-uuid-1",
      "matchId": "a1b2c3d4-1111-2222-3333-444455556666",
      "scorerId": "p1-uuid",
      "scorer": {
        "id": "p1-uuid",
        "name": "Kervis",
        "imageUrl": "https://cdn.example.com/kervis.png",
        "createdAt": "2026-01-10T12:00:00.000Z"
      },
      "assistId": "p2-uuid",
      "assist": {
        "id": "p2-uuid",
        "name": "Juan",
        "imageUrl": null,
        "createdAt": "2026-01-10T12:05:00.000Z"
      },
      "minute": 34,
      "createdAt": "2026-08-21T20:34:00.000Z"
    },
    {
      "id": "goal-uuid-2",
      "matchId": "a1b2c3d4-1111-2222-3333-444455556666",
      "scorerId": "p2-uuid",
      "scorer": { "id": "p2-uuid", "name": "Juan", "imageUrl": null, "createdAt": "2026-01-10T12:05:00.000Z" },
      "assistId": null,
      "assist": null,
      "minute": null,
      "createdAt": "2026-08-21T20:50:00.000Z"
    }
  ]
}
```

Nota: `match` (el objeto `Match` completo) NO se carga en esta relación (`relations: { scorer: true, assist: true }`
no incluye `match`), así que ese campo no viene en la respuesta aunque exista en la entidad.

`minute` puede ser `null` (es opcional en `CreateGoalDto`). `assistId`/`assist` también pueden ser `null`.

---

## 4. GET /players

`ListPlayersUseCase` -> `playerRepository.findAll()` -> `repository.find()` (sin relations).

Objeto plano, **sin stats embebidos** — solo `{ id, name, imageUrl, createdAt }`. Las stats están
en un endpoint separado: `GET /players/:id/stats`.

```json
{
  "success": true,
  "data": [
    {
      "id": "p1-uuid",
      "name": "Kervis",
      "imageUrl": "https://cdn.example.com/kervis.png",
      "createdAt": "2026-01-10T12:00:00.000Z"
    },
    {
      "id": "p2-uuid",
      "name": "Juan",
      "imageUrl": null,
      "createdAt": "2026-01-10T12:05:00.000Z"
    }
  ]
}
```

---

## 5. GET /stats/leaderboard

`StatsController` (`stats.controller.ts:8-11`) -> `GetLeaderboardUseCase` -> query SQL cruda
contra Postgres (`get-leaderboard.use-case.ts`), no pasa por TypeORM entities.

Ya viene **ordenado por el backend**: `ORDER BY "goals" DESC, "assists" DESC, p.name ASC`.
No hace falta ordenar en el front. Desempate: 1º goles, 2º asistencias, 3º nombre alfabético.

El `FROM` es la tabla `players` con `LEFT JOIN` + `COALESCE(..., 0)` hacia partidos/goles/asistencias,
así que **incluye a todos los jugadores registrados, incluso con 0 goles/asistencias/partidos**.

Objeto **plano** — NO viene un `player` anidado. Es `playerId` + `name` sueltos, y **`imageUrl` no
se trae** en este endpoint (existe en la entidad `Player` pero el SELECT no lo incluye). Si el
leaderboard necesita avatar, hay que agregarlo al SQL o pedirlo aparte vía `GET /players`.

Campos exactos: `playerId`, `name`, `matchesPlayed`, `goals`, `assists` — no es `totalGoals`/`totalAssists`.

```json
{
  "success": true,
  "data": [
    {
      "playerId": "3f2a1c9e-8b7d-4e21-9c4a-1a2b3c4d5e6f",
      "name": "Kervis Vasquez",
      "matchesPlayed": 12,
      "goals": 9,
      "assists": 4
    },
    {
      "playerId": "7d1e9f0a-2c3b-4a5d-8e6f-9b0c1d2e3f4a",
      "name": "Juan Pérez",
      "matchesPlayed": 10,
      "goals": 9,
      "assists": 2
    },
    {
      "playerId": "aa11bb22-cc33-dd44-ee55-ff6677889900",
      "name": "Carlos Nuevo",
      "matchesPlayed": 0,
      "goals": 0,
      "assists": 0
    }
  ]
}
```

---

## 6. GET /players/:id/stats

`PlayersController` (`players.controller.ts:37-40`) -> `GetPlayerStatsUseCase`
(`get-player-stats.use-case.ts`) -> tres `COUNT(*)` separados contra `goals`/`match_participants`.

Mismos nombres de campo que el leaderboard: `playerId`, `name`, `goals`, `assists`, `matchesPlayed`.

404 (`NotFoundError` -> `AllExceptionsFilter`) si el `playerId` no existe.

```json
{
  "success": true,
  "data": {
    "playerId": "3f2a1c9e-8b7d-4e21-9c4a-1a2b3c4d5e6f",
    "name": "Kervis Vasquez",
    "goals": 9,
    "assists": 4,
    "matchesPlayed": 12
  }
}
```

---

## 7. Cómo crear cuentas nuevas (auth / users)

Dos flujos distintos, **no confundirlos**:

### 7.1. POST /auth/register — SOLO sirve para crear el primer admin (bootstrap)

`RegisterUseCase` (`register.use-case.ts:14-21`) cuenta cuántos usuarios hay en la tabla `users`
(`userRepository.count()`). **Si ya hay al menos uno, tira 403** y no deja registrar a nadie más:

```json
{
  "success": false,
  "message": "Ya existe una cuenta registrada. Pide a un administrador que te cree un usuario."
}
```

(shape exacto del error sin confirmar — es lo que arma `AllExceptionsFilter` a partir de un
`ForbiddenError`; si necesitas el contrato exacto de errores dime y lo reviso aparte).

Cuando la tabla está vacía, sí funciona y **siempre crea el usuario con `role: "admin"`**
(hardcodeado en el use-case, línea 29 — el DTO `RegisterDto` ni siquiera acepta `role` en el body).

Body:
```json
{ "email": "admin@example.com", "password": "supersegura123", "name": "Admin Principal" }
```

Respuesta (sin `password`, se descarta con destructuring antes de devolver):
```json
{
  "success": true,
  "data": {
    "id": "u1-uuid",
    "email": "admin@example.com",
    "name": "Admin Principal",
    "role": "admin",
    "createdAt": "2026-08-25T10:00:00.000Z"
  }
}
```

Úsalo **una sola vez**, para crear la primera cuenta del sistema. Para todo lo demás (agregarle
cuenta a otra persona), usa 7.2.

### 7.2. POST /users — así se le crea la cuenta a una persona nueva

`UsersController` (`users.controller.ts:31-35`) -> `CreateUserUseCase`. Requiere
`@UseGuards(JwtAuthGuard, AdminGuard)`: **hay que estar logueado con un token de un usuario
`role: "admin"`** (si no, 401 sin token / 403 si el token es de un `member`).

Body (`CreateUserDto`, `create-user.dto.ts`):
- `email` (string, válido, único — si ya existe tira 409 `ConflictError`)
- `password` (string, mínimo 6 caracteres)
- `name` (string, obligatorio)
- `role` (opcional, `"admin" | "member"` — si se omite, default `"member"`)

```json
{
  "email": "juan@example.com",
  "password": "clave123",
  "name": "Juan Pérez",
  "role": "member"
}
```

Respuesta (mismo shape que 7.1, sin `password`):
```json
{
  "success": true,
  "data": {
    "id": "u2-uuid",
    "email": "juan@example.com",
    "name": "Juan Pérez",
    "role": "member",
    "createdAt": "2026-08-25T10:05:00.000Z"
  }
}
```

Con esa cuenta creada, la persona ya puede loguearse por su cuenta con 7.3 — el admin no genera
el token por ella, cada quien hace login con su propio email/password.

### 7.3. POST /auth/login — con eso la persona ya puede entrar

Body:
```json
{ "email": "juan@example.com", "password": "clave123" }
```

`LoginUseCase` devuelve el JWT **junto con** el usuario (sin password), no solo el token:

```json
{
  "success": true,
  "data": {
    "accessToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "user": {
      "id": "u2-uuid",
      "email": "juan@example.com",
      "name": "Juan Pérez",
      "role": "member",
      "createdAt": "2026-08-25T10:05:00.000Z"
    }
  }
}
```

Ese `accessToken` es el que va como `Authorization: Bearer <token>` en los endpoints protegidos
(`GET /users/me`, `GET /users`, `POST /users`, y los `POST/PATCH/DELETE` de `/players`).

### 7.4. GET /users/me y GET /users — para confirmar quién está logueado / listar cuentas

`GET /users/me` (requiere JWT, cualquier rol) devuelve el propio usuario, mismo shape que arriba.
`GET /users` (requiere JWT + admin) devuelve el array completo de usuarios, sin `password` en
ninguno (`list-users.use-case.ts:9-11` hace el mismo destructuring por cada uno):

```json
{
  "success": true,
  "data": [
    { "id": "u1-uuid", "email": "admin@example.com", "name": "Admin Principal", "role": "admin", "createdAt": "2026-08-25T10:00:00.000Z" },
    { "id": "u2-uuid", "email": "juan@example.com", "name": "Juan Pérez", "role": "member", "createdAt": "2026-08-25T10:05:00.000Z" }
  ]
}
```

No hay endpoint para actualizar (`PATCH`) ni borrar usuarios en `UsersController` — solo
`get me`, `list` y `create`.

---

## Resumen para tipar (TS)

```ts
type MatchStatus = 'en_curso' | 'finalizado';

interface PlayerDto {
  id: string;
  name: string;
  imageUrl: string | null;
  createdAt: string; // ISO
}

interface MatchDto {
  id: string;
  name: string;
  date: string; // ISO
  status: MatchStatus;
  participants: PlayerDto[]; // objetos completos, NO ids
  createdAt: string; // ISO
}

interface GoalDto {
  id: string;
  matchId: string;
  scorerId: string;
  scorer: PlayerDto;
  assistId: string | null;
  assist: PlayerDto | null;
  minute: number | null;
  createdAt: string; // ISO
}

interface LeaderboardEntryDto {
  playerId: string;
  name: string;
  matchesPlayed: number;
  goals: number;
  assists: number;
}

interface PlayerStatsDto {
  playerId: string;
  name: string;
  goals: number;
  assists: number;
  matchesPlayed: number;
}

type UserRole = 'admin' | 'member';

interface UserDto {
  id: string;
  email: string;
  name: string;
  role: UserRole;
  createdAt: string; // ISO
  // password NUNCA viene — se descarta con destructuring en cada use-case
}

interface LoginResponseDto {
  accessToken: string;
  user: UserDto;
}

interface ApiEnvelope<T> {
  success: true;
  data: T;
}

// GET /matches              -> ApiEnvelope<MatchDto[]>
// GET /matches/:id          -> ApiEnvelope<MatchDto>              (sin goles anidados)
// GET /matches/:id/goals    -> ApiEnvelope<GoalDto[]>
// GET /players              -> ApiEnvelope<PlayerDto[]>           (sin stats)
// GET /stats/leaderboard    -> ApiEnvelope<LeaderboardEntryDto[]> (ordenado por backend, sin imageUrl)
// GET /players/:id/stats    -> ApiEnvelope<PlayerStatsDto>        (404 si no existe el jugador)
// POST /auth/register       -> ApiEnvelope<UserDto>               (solo 1 vez, bootstrap, siempre role admin)
// POST /auth/login          -> ApiEnvelope<LoginResponseDto>
// GET /users/me             -> ApiEnvelope<UserDto>               (requiere JWT)
// GET /users                -> ApiEnvelope<UserDto[]>             (requiere JWT + admin)
// POST /users               -> ApiEnvelope<UserDto>               (requiere JWT + admin — así se crean cuentas nuevas)
```
