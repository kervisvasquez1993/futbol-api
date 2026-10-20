# Goles con aprobación y total de la jornada que reemplaza

Delta sobre `frontend-estadisticas-manuales-y-eliminar-jornada.md` y `frontend-notificaciones.md`.
El backend ya implementa el contrato del pedido ("goles del atleta con aprobación y total de la
jornada que reemplaza"), sin cambios de forma. Esto es el resumen para confirmar contra lo que ya
hizo el front.

Todo sigue envuelto en `{ success, data }` / `{ success: false, message, errors? }`.

> **Requiere la migración** `AddGoalApprovalAndMatchNotifications`. Sin ella, `GET /notifications`
> y los endpoints de goles responden `500 "Ha ocurrido un error inesperado"` (falta la columna
> `notifications.match_id`). En local: `npm run migration:run` en el backend.

---

## 1. Goles con estado

### `GoalDto`

```ts
interface GoalDto {
  // ...lo de hoy
  status: 'pendiente' | 'aprobado';
  createdByUserId: string | null; // quien lo cargó (null en goles viejos o si se borró el usuario)
}
```

Viene en `GET /matches/:matchId/goals`, `GET /matches/:matchId/summary` y en la respuesta de
`POST /matches/:matchId/goals`. Los goles que ya existían quedaron `aprobado`.

### `POST /matches/:matchId/goals`

| Quién | Partido | `status` | Aviso |
|---|---|---|---|
| admin | cualquiera | `aprobado` | — |
| member | `en_curso` | `aprobado` (juego en vivo, mueve el marcador) | — |
| member | `finalizado` | **`pendiente`** | `goal_submitted` a los admins |

El resto de las validaciones no cambia: con el partido terminado el member solo carga goles o
asistencias propios y `addToScore` es `false`. Un gol `pendiente` **ocupa** un gol "sin autor" del
marcador, igual que uno aprobado.

### NUEVO `PATCH /goals/:id/approve` (admin)

- Sin body. Responde el `GoalDto` con `status: 'aprobado'`.
- Emite `match.updated` / `session.updated` y manda `goal_approved` a quien lo cargó.
- Ya aprobado → `200` sin cambios (no vuelve a avisar).
- `404 "Gol no encontrado"`, `403` si no es admin.

### Rechazar = `DELETE /goals/:id` (ya existía)

Si un **admin** borra un gol `pendiente` cargado por otro usuario, a ese usuario le llega
`goal_rejected`. Si el member borra su propio pendiente, no se avisa a nadie.

---

## 2. Total de la jornada ("Participei") para quien jugó rondas

- `PUT /match-sessions/:id/my-stats` y `PUT /match-sessions/:id/players/:playerId/stats`: **ya no
  existen** los `409` `"Ya jugaste rondas en esta jornada..."` / `"Este jugador jugó rondas..."`.
  Con la jornada `finalizada` carga cualquiera.
- `POST /matches/:id/participants` y `POST /matches/:id/join`: **ya no existe** el `409`
  `"Este jugador tiene estadísticas cargadas a mano..."`.
- Sigue igual: solo con la jornada `finalizada` (`409 "Las estadísticas se cargan cuando la jornada
  termina"`); pendiente si la carga el member, aprobada si la carga el admin; notificaciones
  `manual_stats_*` como hoy.
- `allowsLateManualStats` ahora vale para **todos** los jugadores de la jornada (no hace falta
  chequear si jugó rondas).

---

## 3. Ranking: nunca se suman

`GET /stats/leaderboard` y `GET /players/:id/stats`:

- Solo cuentan los goles **`aprobado`**.
- Si el jugador tiene el total de la jornada **aprobado**, ese total **reemplaza** sus goles y
  asistencias de las rondas de esa jornada.
- Mientras el total está **pendiente**, siguen contando los goles aprobados de las rondas.
- Los partidos sueltos (sin jornada) no cambian. `matchesPlayed` y `sessionsPlayed` tampoco.

Ejemplos (verificados contra la base):

| Caso | Cuenta |
|---|---|
| 1 gol en cada una de 3 rondas + total aprobado de 3 | **3** (no 6) |
| 2 goles en rondas + total **pendiente** de 5 | **2** |
| Solo un gol pendiente | **0** |
| Total aprobado 2 goles / 1 asist. + 1 asistencia en una ronda | **2 / 1** |
| Lo anterior + 1 gol en un partido suelto | +1 |

Invalidar el leaderboard al **aprobar** o **borrar** un gol, y al aprobar/borrar un total.

---

## 4. Notificaciones

`NotificationDto` gana `matchId`:

```ts
type NotificationType =
  | 'manual_stats_submitted' | 'manual_stats_approved'
  | 'manual_stats_rejected' | 'manual_stats_set_by_admin'
  | 'goal_submitted' | 'goal_approved' | 'goal_rejected'; // NUEVOS

interface NotificationDto {
  // ...lo de hoy
  matchId: string | null; // NUEVO: solo en goal_*; tocar la notificación abre esa rodada
}
```

| `type` | Para | Cuándo |
|---|---|---|
| `goal_submitted` | admins | un member carga un gol/asistencia en un partido terminado |
| `goal_approved` | quien lo cargó | un admin lo aprueba |
| `goal_rejected` | quien lo cargó | un admin borra el gol pendiente |

`data` en las tres:

```ts
{
  playerName: string;    // quien lo cargó
  matchName: string;
  isAssist: boolean;     // true si lo cargó como asistente, no como goleador
  sessionName?: string;  // solo si es ronda de jornada
  roundNumber?: number;  // 1, 2, ... (orden de la ronda en la jornada); solo en jornada
}
```

`sessionId` viene con la jornada (o `null` en partido suelto) y `playerId` es el jugador que lo
cargó. Igual que hoy: al admin que hizo la acción no se le avisa, y todo llega por el SSE de
notificaciones.

**Distinto a la carga manual:** al aprobar o rechazar un gol, el `goal_submitted` de los demás
admins **no** se marca como leído solo. Si molesta, se puede agregar después.

---

## Resumen para tipar (TS)

```ts
type GoalStatus = 'pendiente' | 'aprobado';

interface GoalDto {
  // ...lo de hoy
  status: GoalStatus;
  createdByUserId: string | null;
}

interface GoalNotificationData {
  playerName: string;
  matchName: string;
  isAssist: boolean;
  sessionName?: string;
  roundNumber?: number;
}

// POST   /matches/:matchId/goals      member + partido finalizado -> status 'pendiente'
// PATCH  /goals/:id/approve  (admin)  -> ApiEnvelope<GoalDto>
// DELETE /goals/:id                   admin sobre pendiente ajeno -> goal_rejected
// PUT    /match-sessions/:id/my-stats ya sin 409 por haber jugado rondas
// POST   /matches/:id/participants | /join  ya sin 409 por carga manual
```
