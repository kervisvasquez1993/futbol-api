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
| POST   | `/matches`                   | JWT         | Crea un partido en curso                      |
| PATCH  | `/matches/:id/finish`         | JWT         | Finaliza un partido                           |
| GET    | `/matches/:matchId/goals`     | Público     | Goles de un partido                           |
| POST   | `/matches/:matchId/goals`     | JWT         | Registra un gol                               |
| DELETE | `/goals/:id`                  | JWT         | Elimina un gol (solo si el partido sigue en curso) |
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
  "playerIds": ["uuid-jugador-1", "uuid-jugador-2", "uuid-jugador-3"]
}
```

Mínimo 2 `playerIds`, todos deben existir como jugadores.

### POST /matches/:matchId/goals (JWT)

```json
{
  "scorerId": "uuid-jugador-1",
  "assistId": "uuid-jugador-2",
  "minute": 34
}
```

`assistId` y `minute` son opcionales. `scorerId`/`assistId` deben ser participantes
del partido, y el partido debe estar `en_curso`.

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
- `DELETE /goals/:id` — JWT
- `GET /stats/leaderboard` — público

### Flujo de prueba sugerido

1. `POST /auth/register` → crea el admin.
2. `POST /auth/login` → obtén el `accessToken`.
3. `POST /players` (x2 o x3) → crea jugadores.
4. `POST /matches` con los `playerIds` creados.
5. `POST /matches/:matchId/goals` → registra goles/asistencias.
6. `GET /stats/leaderboard` y `GET /players/:id/stats` → verifica los cálculos.
7. `PATCH /matches/:id/finish` → cierra el partido.
