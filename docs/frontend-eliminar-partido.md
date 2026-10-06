# Eliminar partido / ronda

`DELETE /matches/:id` — **solo admin** (`JwtAuthGuard` + `AdminGuard`).

Sirve para los dos casos:

- **Partido suelto** (sin jornada).
- **Ronda de una jornada** (`match.sessionId != null`), en cualquier estado (`en_curso` o `finalizado`).

## Respuestas

| Código | Cuándo |
|---|---|
| `204` | Borrado. Sin body. |
| `404` | `"Partido no encontrado"` |
| `401` / `403` | Sin token / no es admin |

## Qué se borra

- El partido, sus **goles** y sus **participantes** (CASCADE).
- Las **estadísticas** (`/stats/leaderboard`, `/players/:id/stats`) se recalculan solas: salen de esas
  tablas, así que dejan de contar los goles, asistencias y partidos jugados de esa ronda.
- **Invitados** que solo existían por ese partido (sin jornada, equipo, goles ni otra cosa).
  Los jugadores registrados nunca se borran.

## Jornadas

- Si la jornada se queda **sin rondas**, vuelve a `allowsManualStats = true` (se pueden cargar
  estadísticas a mano otra vez).
- Si se borra la **ronda en curso** de una jornada `winner_stays`, sus dos equipos vuelven al **frente
  de la fila** (`queuePosition` 0 y 1; el resto se corre). No se crea una ronda nueva sola: el admin la
  arma con `POST /match-sessions/:id/matches`.
- Borrar una ronda **finalizada** no toca la fila.

## Tiempo real (SSE)

- `GET /matches/:id/events` emite `match.deleted` con `{ id }` y cierra el stream.
- `GET /match-sessions/:sessionId/events` emite `session.updated` con la jornada sin esa ronda.
