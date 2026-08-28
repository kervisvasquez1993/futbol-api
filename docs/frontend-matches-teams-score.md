# Novedades de API para frontend — equipos, marcador en vivo y edición post-partido

Todas las respuestas siguen viniendo envueltas como `{ "success": true, "data": ... }`.

## ⚠️ Breaking change: `POST /matches`

El body cambió. Ya no se manda `playerIds`, ahora cada jugador va con su equipo:

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

- Mínimo 2 `participants`. `team` es `"home"` o `"away"`.
- `homeTeamName` / `awayTeamName` son opcionales (default `"Equipo A"` / `"Equipo B"`).

## ⚠️ Breaking change: forma del objeto `Match`

`GET /matches`, `GET /matches/:id` y cualquier respuesta que devuelva un `Match` ahora traen:

```json
{
  "id": "match-uuid",
  "name": "Partido viernes",
  "status": "en_curso",
  "homeTeamName": "Equipo Rojo",
  "awayTeamName": "Equipo Azul",
  "homeScore": 0,
  "awayScore": 0,
  "participants": [
    {
      "id": "mp-uuid",
      "playerId": "p1-uuid",
      "team": "home",
      "player": { "id": "p1-uuid", "name": "Kervis", "imageUrl": null }
    }
  ]
}
```

- `participants` **ya no es una lista de jugadores directa** — cada item trae `team` y el jugador anidado en `player`.
- `homeScore` / `awayScore` arrancan en `0` (nunca `null`).

## Endpoints nuevos

| Método | Ruta | Auth | Para qué |
| --- | --- | --- | --- |
| `POST` | `/matches/:id/participants` | JWT | Agregar un jugador a un partido ya creado |
| `PATCH` | `/matches/:id/score` | JWT | Sumar/restar 1 gol al marcador (botón +1/-1 en vivo) |
| `PATCH` | `/matches/:id/result` | JWT | Corregir el marcador con un valor exacto |
| `GET` | `/matches/:matchId/summary` | Público | Jugadores por equipo + goles desglosados |

### `POST /matches/:id/participants`
```json
{ "playerId": "p3-uuid", "team": "away" }
```
Funciona con el partido en cualquier estado (incluso `finalizado`) — para cargar a alguien que quedó afuera antes de registrarle un gol. 409 si ya es participante.

### `PATCH /matches/:id/score` — el botón +1 / -1 del marcador en vivo
```json
{ "team": "home", "delta": 1 }
```
- `delta` solo `1` (sumar) o `-1` (restar, para corregir).
- Nunca baja de `0`.
- Es la acción a llamar cada vez que alguien mete un gol. Es independiente de cargar el gol en sí (ver abajo).

### `PATCH /matches/:id/result` — corrección manual de golpe
```json
{ "homeScore": 3, "awayScore": 2 }
```
Sobreescribe el marcador completo (por si hay que corregirlo todo en vez de ir de a uno).

### `GET /matches/:matchId/summary`
```json
{
  "match": { "id": "...", "status": "finalizado", "homeTeamName": "Equipo Rojo", "awayTeamName": "Equipo Azul", "homeScore": 3, "awayScore": 2 },
  "participants": { "home": [ /* jugadores */ ], "away": [ /* jugadores */ ] },
  "goals": [ { "scorerId": "p1-uuid", "scorer": { }, "team": "home", "minute": 34 } ],
  "goalsByTeam": { "home": 2, "away": 1 }
}
```
`goalsByTeam` se calcula sumando los goles cargados individualmente — puede no coincidir con `homeScore`/`awayScore` si falta cargar algún gol con `POST /matches/:matchId/goals`.

## Cambio de comportamiento: goles ya no dependen del estado del partido

`POST /matches/:matchId/goals` y `DELETE /goals/:id` antes fallaban (409) si el partido estaba `finalizado`. Ahora funcionan sin importar el `status` — se puede cargar o borrar un gol de un partido ya cerrado.

## Flujo recomendado en la UI

1. Crear el partido con jugadores repartidos en `home`/`away`.
2. Por cada gol en vivo: `PATCH /matches/:id/score` (`delta: 1`) **y** `POST /matches/:matchId/goals` (para que quede quién anotó, de cara a las estadísticas del jugador).
3. Si se cargó al equipo equivocado: `-1` al que estaba mal, `+1` al correcto.
4. Al terminar: `PATCH /matches/:id/finish`.
5. Si falta cargar el gol de alguien que no estaba en el partido: `POST /matches/:id/participants` + `POST /matches/:matchId/goals` (funciona aunque ya esté `finalizado`).
6. `GET /matches/:matchId/summary` para la pantalla de resumen del partido.
7. Las estadísticas por jugador (`GET /players/:id/stats`, `GET /stats/leaderboard`) se actualizan solas a partir de los goles cargados — no hace falta ningún paso extra.
