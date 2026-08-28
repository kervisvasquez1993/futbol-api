# Contrato real — matches / goals / players / stats (futbol-tracker-api)

Verificado leyendo controllers, use-cases, repositorios TypeORM y entidades directamente
(no hay DTOs de respuesta ni `ClassSerializerInterceptor`: las entidades TypeORM se
devuelven tal cual y el `TransformInterceptor` global las envuelve en `{ success, data }`).

---

## 1. GET /matches

`ListMatchesUseCase` -> `matchRepository.findAll()` -> `repository.find({ relations: { participants: { player: true } } })`.

**Cambio de contrato (antes `participants` era `Player[]` directo):** ahora `participants` es un
array de `MatchParticipant` — cada uno con `playerId` + `player` (objeto `Player` anidado) + `team`
(`"home" | "away"`). Además el `Match` ahora trae `homeTeamName`, `awayTeamName`, `homeScore` y
`awayScore` (ambos `number`, **arrancan en `0`** al crear el partido, nunca son `null`).

```json
{
  "success": true,
  "data": [
    {
      "id": "a1b2c3d4-1111-2222-3333-444455556666",
      "name": "Partido viernes",
      "date": "2026-08-21T20:00:00.000Z",
      "status": "en_curso",
      "homeTeamName": "Equipo A",
      "awayTeamName": "Equipo B",
      "homeScore": 0,
      "awayScore": 0,
      "participants": [
        {
          "id": "mp1-uuid",
          "matchId": "a1b2c3d4-1111-2222-3333-444455556666",
          "playerId": "p1-uuid",
          "team": "home",
          "player": {
            "id": "p1-uuid",
            "name": "Kervis",
            "imageUrl": "https://cdn.example.com/kervis.png",
            "createdAt": "2026-01-10T12:00:00.000Z"
          },
          "createdAt": "2026-08-20T15:30:00.000Z"
        },
        {
          "id": "mp2-uuid",
          "matchId": "a1b2c3d4-1111-2222-3333-444455556666",
          "playerId": "p2-uuid",
          "team": "away",
          "player": {
            "id": "p2-uuid",
            "name": "Juan",
            "imageUrl": null,
            "createdAt": "2026-01-10T12:05:00.000Z"
          },
          "createdAt": "2026-08-20T15:30:00.000Z"
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

Solo existen esos dos valores. No hay "pendiente", "cancelado", etc. `homeScore`/`awayScore` no
dependen de este estado: se pueden ajustar en cualquier `status` (ver secciones 3.3 y 3.3b).

### Enum `team` (`src/modules/matches/domain/enums/match-team-side.enum.ts`):

```ts
enum MatchTeamSide {
  HOME = 'home',
  AWAY = 'away',
}
```

Solo existe dentro de cada partido — no hay una entidad `Team` reutilizable entre partidos.
`homeTeamName`/`awayTeamName` son solo un nombre de display por partido (default `"Equipo A"`/`"Equipo B"`).

---

## 2. GET /matches/:id

`GetMatchUseCase` -> mismo repo, `findOne({ where: { id }, relations: { participants: { player: true } } })`.
404 (`NotFoundError` -> filtro global) si no existe.

Es **el mismo shape que un elemento del array de `/matches`** (mismo objeto `Match`, ver sección 1).

**NO trae los goles anidados.** No hay relación `goals` en el `Match` entity ni se cargan en el use-case.
Hay que pedirlos aparte con `GET /matches/:matchId/goals`, o usar `GET /matches/:matchId/summary`
(sección 3.4) si además se necesita el desglose por equipo.

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

**`POST /matches/:matchId/goals` y `DELETE /goals/:id` ya no dependen del `status` del partido.**
Antes ambos tiraban `ConflictError` (409) si el partido estaba `finalizado`; ese chequeo se quitó
de `AddGoalUseCase` y `DeleteGoalUseCase` — se puede registrar o borrar un gol sin importar el
estado del partido, justamente para poder cargar goles olvidados después de finalizar.

---

## 3.1. POST /matches (body actualizado — reemplaza `playerIds`)

`CreateMatchUseCase` ya no recibe `playerIds: string[]`, recibe `participants` con el equipo de
cada jugador (`CreateMatchDto`, `src/modules/matches/application/dtos/create-match.dto.ts`):

```json
{
  "name": "Partido viernes",
  "date": "2026-08-21T20:00:00.000Z",
  "homeTeamName": "Equipo Rojo",
  "awayTeamName": "Equipo Azul",
  "participants": [
    { "playerId": "p1-uuid", "team": "home" },
    { "playerId": "p2-uuid", "team": "away" }
  ]
}
```

`participants` requiere mínimo 2 elementos; cada `playerId` debe existir como jugador y no puede
repetirse dentro del mismo body (`ValidationError` 400 si se repite o si algún jugador no existe).
`homeTeamName`/`awayTeamName` son opcionales.

---

## 3.2. POST /matches/:id/participants (nuevo)

`AddParticipantUseCase`. Agrega un jugador a un partido ya existente, **sin restricción de `status`**
(funciona igual con el partido `en_curso` o `finalizado`).

```json
{ "playerId": "p3-uuid", "team": "away" }
```

- 404 (`NotFoundError`) si el partido no existe.
- 400 (`ValidationError`) si el jugador no existe.
- 409 (`ConflictError`) si el jugador ya es participante de ese partido.

Devuelve el `MatchParticipant` creado (mismo shape que cada elemento de `participants` en la sección 1).

---

## 3.3. PATCH /matches/:id/score (nuevo) — marcador en vivo, +1/-1

`AdjustMatchScoreUseCase`. Pensado para el uso durante el partido: cada gol se refleja al toque
con un botón +1 (y -1 para corregir si se cargó al equipo equivocado). Es un ajuste **relativo**,
no reemplaza el valor — hace `home_score/away_score = GREATEST(valor_actual + delta, 0)` a nivel
SQL (`TypeOrmMatchRepository.adjustScore`), así que nunca baja de `0` aunque se mande `-1` de más.

```json
{ "team": "home", "delta": 1 }
```

`delta` solo acepta `1` o `-1` (`AdjustMatchScoreDto`, `IsIn([1, -1])`). 404 (`NotFoundError`) si
el partido no existe. Devuelve el `Match` actualizado (shape de la sección 1). Se puede llamar sin
importar el `status` del partido, y es independiente de `POST /matches/:matchId/goals` — este
endpoint solo mueve el marcador, no crea un registro de "quién anotó" (eso lo sigue haciendo el
endpoint de goles, necesario para las estadísticas por jugador).

---

## 3.3b. PATCH /matches/:id/result — corrección con valor absoluto

`SetMatchResultUseCase`. Sobreescribe el marcador con un número exacto, para cuando hace falta
corregir todo de una en vez de ir sumando de a uno. Sigue siendo independiente de los goles
registrados individualmente (no se recalcula solo, y puede no coincidir con `goalsByTeam` en
`GET /matches/:matchId/summary` si faltó cargar algún gol). Se puede llamar sin importar el
`status` del partido.

```json
{ "homeScore": 3, "awayScore": 2 }
```

404 (`NotFoundError`) si el partido no existe. Devuelve el `Match` actualizado (shape de la sección 1).

---

## 3.4. GET /matches/:matchId/summary (nuevo)

`GetMatchSummaryUseCase` (vive en el módulo `goals` porque necesita cruzar `MatchRepository` +
`GoalRepository`). Junta: los datos del partido, los participantes agrupados por equipo, y cada
gol con el `team` de quien lo anotó (cruzando `scorerId` contra los `participants` del partido) más
un conteo `goalsByTeam` calculado a partir de los goles — pensado para comparar contra el
`homeScore`/`awayScore` del marcador (secciones 3.3 y 3.3b), que puede no coincidir si faltó
cargar algún gol individual aunque el marcador en vivo esté al día.

```json
{
  "success": true,
  "data": {
    "match": {
      "id": "a1b2c3d4-1111-2222-3333-444455556666",
      "name": "Partido viernes",
      "date": "2026-08-21T20:00:00.000Z",
      "status": "finalizado",
      "homeTeamName": "Equipo Rojo",
      "awayTeamName": "Equipo Azul",
      "homeScore": 3,
      "awayScore": 2
    },
    "participants": {
      "home": [
        { "id": "p1-uuid", "name": "Kervis", "imageUrl": null, "createdAt": "2026-01-10T12:00:00.000Z" }
      ],
      "away": [
        { "id": "p2-uuid", "name": "Juan", "imageUrl": null, "createdAt": "2026-01-10T12:05:00.000Z" }
      ]
    },
    "goals": [
      {
        "id": "goal-uuid-1",
        "matchId": "a1b2c3d4-1111-2222-3333-444455556666",
        "scorerId": "p1-uuid",
        "scorer": { "id": "p1-uuid", "name": "Kervis", "imageUrl": null, "createdAt": "2026-01-10T12:00:00.000Z" },
        "assistId": null,
        "assist": null,
        "minute": 34,
        "createdAt": "2026-08-21T20:34:00.000Z",
        "team": "home"
      }
    ],
    "goalsByTeam": { "home": 2, "away": 1 }
  }
}
```

`goal.team` sale `null` si el `scorerId` del gol ya no figura en `participants` (caso raro, no
debería pasar en operación normal). 404 (`NotFoundError`) si el partido no existe.

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
type MatchTeamSide = 'home' | 'away';

interface PlayerDto {
  id: string;
  name: string;
  imageUrl: string | null;
  createdAt: string; // ISO
}

interface MatchParticipantDto {
  id: string;
  matchId: string;
  playerId: string;
  team: MatchTeamSide;
  player: PlayerDto;
  createdAt: string; // ISO
}

interface MatchDto {
  id: string;
  name: string;
  date: string; // ISO
  status: MatchStatus;
  homeTeamName: string;
  awayTeamName: string;
  homeScore: number; // arranca en 0, se ajusta con PATCH /matches/:id/score o /result
  awayScore: number;
  participants: MatchParticipantDto[]; // ya NO es Player[] directo
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

interface GoalWithTeamDto extends GoalDto {
  team: MatchTeamSide | null; // solo en GET /matches/:matchId/summary
}

interface MatchSummaryDto {
  match: Pick<
    MatchDto,
    'id' | 'name' | 'date' | 'status' | 'homeTeamName' | 'awayTeamName' | 'homeScore' | 'awayScore'
  >;
  participants: { home: PlayerDto[]; away: PlayerDto[] };
  goals: GoalWithTeamDto[];
  goalsByTeam: { home: number; away: number };
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

// GET /matches                    -> ApiEnvelope<MatchDto[]>
// GET /matches/:id                -> ApiEnvelope<MatchDto>              (sin goles anidados)
// POST /matches                   -> ApiEnvelope<MatchDto>              (body: participants[], no playerIds)
// POST /matches/:id/participants  -> ApiEnvelope<MatchParticipantDto>   (funciona con el partido finalizado)
// PATCH /matches/:id/score        -> ApiEnvelope<MatchDto>              (+1/-1 en vivo, delta: 1 | -1)
// PATCH /matches/:id/result       -> ApiEnvelope<MatchDto>              (sobreescribe con valor absoluto)
// GET /matches/:id/goals          -> ApiEnvelope<GoalDto[]>
// GET /matches/:id/summary        -> ApiEnvelope<MatchSummaryDto>       (equipos + goles desglosados)
// GET /players              -> ApiEnvelope<PlayerDto[]>           (sin stats)
// GET /stats/leaderboard    -> ApiEnvelope<LeaderboardEntryDto[]> (ordenado por backend, sin imageUrl)
// GET /players/:id/stats    -> ApiEnvelope<PlayerStatsDto>        (404 si no existe el jugador)
// POST /auth/register       -> ApiEnvelope<UserDto>               (solo 1 vez, bootstrap, siempre role admin)
// POST /auth/login          -> ApiEnvelope<LoginResponseDto>
// GET /users/me             -> ApiEnvelope<UserDto>               (requiere JWT)
// GET /users                -> ApiEnvelope<UserDto[]>             (requiere JWT + admin)
// POST /users               -> ApiEnvelope<UserDto>               (requiere JWT + admin — así se crean cuentas nuevas)
```
