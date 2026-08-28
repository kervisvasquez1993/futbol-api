# Futbol Tracker API

API para registrar partidos de fútbol entre amigos: jugadores, partidos, goles/asistencias y una tabla de estadísticas (leaderboard).

## Stack

- NestJS
- TypeORM + PostgreSQL
- class-validator / class-transformer
- JWT (`@nestjs/jwt`, sin Passport)

## Arquitectura

Cada módulo de `src/modules` sigue una arquitectura por bounded context:

```
modules/<feature>/
  domain/           entidades, ports (abstract class) y enums
  application/       dtos y use-cases
  infrastructure/     repositorios TypeORM que implementan los ports
  presentation/       controllers
```

Los errores de negocio se modelan como clases en `src/shared/errors/domain-errors.ts`
(`NotFoundError`, `ConflictError`, `UnauthorizedError`, `ForbiddenError`, `ValidationError`)
y son traducidos a respuestas HTTP por el `AllExceptionsFilter` global. Toda respuesta
exitosa se envuelve en `{ success: true, data }` mediante el `TransformInterceptor` global.

## Configuración

```bash
cp .env.example .env
npm install
```

Variables de entorno (validadas con Joi en `src/config/envs.ts`):

| Variable         | Descripción                              |
| ---------------- | ----------------------------------------- |
| `NODE_ENV`        | `development` \| `production` \| `test`  |
| `PORT`            | Puerto HTTP de la API                     |
| `DB_HOST`         | Host de PostgreSQL                        |
| `DB_PORT`         | Puerto de PostgreSQL                      |
| `DB_USER`         | Usuario de PostgreSQL                     |
| `DB_PASSWORD`     | Password de PostgreSQL                    |
| `DB_NAME`         | Nombre de la base de datos                |
| `JWT_SECRET`      | Secreto para firmar los JWT               |
| `JWT_EXPIRES_IN`  | Expiración del token (ej. `1d`)           |

## Base de datos local

```bash
docker compose up -d
```

## Correr el proyecto

```bash
npm run start:dev
```

## Autenticación

- El primer usuario se crea con `POST /auth/register` y queda como `admin` (bootstrap).
  Mientras exista al menos un usuario, este endpoint queda bloqueado.
- El resto de cuentas las crea un admin con `POST /users`.
- `POST /auth/login` devuelve `{ accessToken, user }`.
- Los endpoints protegidos requieren `Authorization: Bearer <accessToken>`.

## Endpoints principales

| Método | Ruta                        | Auth        | Descripción                                  |
| ------ | --------------------------- | ----------- | --------------------------------------------- |
| POST   | `/auth/register`            | Bootstrap   | Crea el primer usuario (admin)                |
| POST   | `/auth/login`                | Público     | Login, devuelve token                         |
| GET    | `/users/me`                  | JWT         | Perfil propio                                 |
| GET    | `/users`                     | JWT + Admin | Lista de cuentas                              |
| POST   | `/users`                     | JWT + Admin | Crea una cuenta                               |
| GET    | `/players`                   | Público     | Lista de jugadores                            |
| GET    | `/players/:id`               | Público     | Detalle de un jugador                         |
| GET    | `/players/:id/stats`         | Público     | Goles, asistencias y partidos jugados         |
| POST   | `/players`                   | JWT         | Crea un jugador                               |
| PATCH  | `/players/:id`                | JWT         | Actualiza un jugador                          |
| DELETE | `/players/:id`                | JWT         | Elimina un jugador                            |
| GET    | `/matches`                   | Público     | Lista de partidos                             |
| GET    | `/matches/:id`                | Público     | Detalle de un partido                         |
| POST   | `/matches`                   | JWT         | Crea un partido en curso, con jugadores repartidos en dos equipos |
| PATCH  | `/matches/:id/finish`         | JWT         | Finaliza un partido                           |
| POST   | `/matches/:id/participants`   | JWT         | Agrega un jugador a un partido existente (en cualquier estado) |
| PATCH  | `/matches/:id/result`         | JWT         | Sobreescribe el marcador con un valor absoluto |
| PATCH  | `/matches/:id/score`          | JWT         | Suma o resta 1 gol al marcador de un equipo (para corregir en vivo) |
| GET    | `/matches/:matchId/goals`     | Público     | Goles de un partido                           |
| GET    | `/matches/:matchId/summary`   | Público     | Jugadores agrupados por equipo + goles desglosados por equipo |
| POST   | `/matches/:matchId/goals`     | JWT         | Registra un gol (en cualquier estado del partido) |
| DELETE | `/goals/:id`                  | JWT         | Elimina un gol (en cualquier estado del partido) |
| GET    | `/stats/leaderboard`          | Público     | Tabla de goles/asistencias por jugador        |

## Payloads de ejemplo

Toda respuesta exitosa viene envuelta como `{ "success": true, "data": ... }`.

### POST /auth/register

```json
{
  "email": "admin@futbol.com",
  "password": "123456",
  "name": "Admin"
}
```

### POST /auth/login

```json
{
  "email": "admin@futbol.com",
  "password": "123456"
}
```

Devuelve `{ accessToken, user }`. Usa ese `accessToken` como `Authorization: Bearer <accessToken>`
en los endpoints marcados como JWT.

### POST /users (JWT + Admin)

```json
{
  "email": "jugador1@futbol.com",
  "password": "123456",
  "name": "Jugador Uno",
  "role": "member"
}
```

`role` es opcional (default `member`).

### POST /players (JWT)

```json
{
  "name": "Messi",
  "imageUrl": "https://example.com/messi.png"
}
```

`imageUrl` es opcional.

### PATCH /players/:id (JWT)

```json
{
  "name": "Lionel Messi"
}
```

Ambos campos (`name`, `imageUrl`) son opcionales.

### POST /matches (JWT)

```json
{
  "name": "Partido de los viernes",
  "date": "2026-08-21T20:00:00.000Z",
  "homeTeamName": "Equipo Rojo",
  "awayTeamName": "Equipo Azul",
  "participants": [
    { "playerId": "uuid-jugador-1", "team": "home" },
    { "playerId": "uuid-jugador-2", "team": "away" },
    { "playerId": "uuid-jugador-3", "team": "home" }
  ]
}
```

Mínimo 2 `participants`, todos con `playerId` de un jugador existente y `team` en `"home" | "away"`.
`homeTeamName`/`awayTeamName` son opcionales (por defecto `"Equipo A"`/`"Equipo B"`).

### POST /matches/:id/participants (JWT)

```json
{
  "playerId": "uuid-jugador-4",
  "team": "away"
}
```

Agrega un jugador a un partido ya creado, sin importar su `status` (incluso `finalizado`) —
pensado para cargar a alguien que quedó afuera al crear el partido, antes de registrarle un gol.
Falla con 409 si el jugador ya es participante de ese partido.

El marcador (`homeScore`/`awayScore`) arranca en `0` al crear el partido — no es `null`.

### PATCH /matches/:id/score (JWT) — botones +1/-1 del marcador en vivo

```json
{
  "team": "home",
  "delta": 1
}
```

`delta` solo acepta `1` (sumar un gol) o `-1` (restar, por si se cargó mal). Nunca baja de `0`
(un `-1` sobre `0` se queda en `0`). Pensado para el marcador en tiempo real durante el partido:
cada vez que alguien mete un gol se llama con `delta: 1` para el equipo correspondiente; si se
cargó al equipo equivocado, se corrige con `delta: -1` sobre ese equipo y `delta: 1` sobre el otro.
Es independiente de `POST /matches/:matchId/goals` (que registra el gol asociado a un jugador
específico, para las estadísticas) — se pueden usar juntos o por separado.

### PATCH /matches/:id/result (JWT) — corrección puntual con un valor absoluto

```json
{
  "homeScore": 3,
  "awayScore": 2
}
```

Sobreescribe el marcador con un número exacto, por si hace falta corregir de una todo el resultado
en vez de ir sumando de a uno. Es independiente de los goles registrados individualmente (no se
recalcula solo, y puede no coincidir con `GET /matches/:matchId/summary`). Se puede llamar sin
importar el `status` del partido.

### POST /matches/:matchId/goals (JWT)

```json
{
  "scorerId": "uuid-jugador-1",
  "assistId": "uuid-jugador-2",
  "minute": 34
}
```

`assistId` y `minute` son opcionales. `scorerId`/`assistId` deben ser participantes
del partido. Ya **no** requiere que el partido esté `en_curso`: se puede registrar un gol
aunque el partido esté `finalizado`.

### Endpoints sin body

- `GET /users/me` — JWT
- `GET /users` — JWT + Admin
- `GET /players` — público
- `GET /players/:id` — público
- `GET /players/:id/stats` — público
- `DELETE /players/:id` — JWT
- `GET /matches` — público
- `GET /matches/:id` — público
- `PATCH /matches/:id/finish` — JWT
- `GET /matches/:matchId/goals` — público
- `GET /matches/:matchId/summary` — público
- `DELETE /goals/:id` — JWT
- `GET /stats/leaderboard` — público

### Flujo de prueba sugerido

1. `POST /auth/register` → crea el admin.
2. `POST /auth/login` → obtén el `accessToken`.
3. `POST /players` (x4 o más) → crea jugadores.
4. `POST /matches` repartiendo los jugadores en `participants` (`team: "home" | "away"`) — el marcador arranca en 0-0.
5. Por cada gol en vivo: `PATCH /matches/:id/score` (`delta: 1` al equipo que anotó) + `POST /matches/:matchId/goals` (para saber quién anotó, de cara a las estadísticas).
6. Si alguien se equivoca de equipo al cargar el marcador: `PATCH /matches/:id/score` con `delta: -1` al equipo mal cargado y `delta: 1` al correcto.
7. `PATCH /matches/:id/finish` → cierra el partido.
8. `POST /matches/:id/participants` → agrega a un jugador olvidado, aun con el partido finalizado.
9. `POST /matches/:matchId/goals` → carga el gol de ese jugador (funciona igual, finalizado o no).
10. `PATCH /matches/:id/result` → si hace falta, corrige el marcador final con un valor absoluto.
11. `GET /matches/:matchId/summary` → revisa jugadores por equipo y goles desglosados por equipo.
12. `GET /stats/leaderboard` y `GET /players/:id/stats` → verifica los cálculos por jugador (se actualizan cuando el partido termina de cargarse).
