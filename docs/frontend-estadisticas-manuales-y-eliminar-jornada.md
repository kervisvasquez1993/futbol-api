# Estadísticas cargadas por el jugador y eliminar jornadas

Delta sobre `frontend-jornadas-v2-rotacion-tiempo-real.md`. Dos cosas nuevas:

1. **"Participei"**: en una jornada **sin rondas**, un jugador registrado carga cuántos goles y
   asistencias hizo, aunque no esté en ningún equipo. Esa carga queda **pendiente** hasta que un
   admin la aprueba; recién ahí suma al ranking.
2. **Eliminar jornada** (solo admin), con todo lo que cuelga de ella.

Todo sigue envuelto en `{ success, data }` / `{ success: false, message, errors? }`, salvo el SSE.

---

## 1. Estadísticas manuales

### 1.1. Un jugador tiene goles de rondas **o** carga manual, nunca las dos

| Jornada | Carga manual (`my-stats`, `players/:playerId/stats`) | Crear rondas (`POST /:id/start`, `POST /:id/matches`) |
|---|---|---|
| Sin rondas, sin cargas | ✅ todos | ✅ |
| Sin rondas, con cargas (pendientes o aprobadas) | ✅ todos | ❌ `409` |
| `en_curso` con rondas | ❌ `409` nadie: el que llega entra a un equipo y carga en la ronda | ✅ |
| `finalizada` con rondas | ✅ **solo quien no jugó ninguna ronda** ("Estive lá") — ver 1.1.1 | — (la jornada terminó) |

Mensajes de los `409`:

- Cargar en curso con rondas: `"Esta jornada tiene rodadas registradas: los gols se cargan en cada rodada"`
- Crear rondas con cargas: `"Esta jornada tiene estadísticas cargadas a mano: bórralas antes de crear rodadas"`

**No deduzcas la regla en el front**: usá `session.allowsManualStats` y
`session.allowsLateManualStats` (sección 1.3).

#### 1.1.1. Jornada finalizada con rondas: "Estive lá"

Alguien que jugó pero no quedó registrado en ninguna ronda marca **"Estive lá"**
(`POST /attendance`) y después carga sus números con `PUT /my-stats`, igual que en una jornada sin
rondas (queda `pendiente`, el admin aprueba). Quien **sí** jugó alguna ronda sigue cargando sus
goles en cada ronda:

- `409` `"Ya jugaste rondas en esta jornada: carga tus goles en cada ronda"` (en `my-stats`).
- `409` `"Este jugador jugó rondas en esta jornada: sus goles se cargan en cada ronda"` (en el
  endpoint de admin).

Y al revés: si alguien tiene carga manual en la jornada, no se lo puede sumar a una de sus rondas.
`POST /matches/:id/participants` (admin) y `POST /matches/:id/join` responden `409`
`"Este jugador tiene estadísticas cargadas a mano en la jornada: bórralas antes de sumarlo a una ronda"`.

Ojo: una carga **pendiente** también bloquea las rondas. Si el admin quiere armar equipos en una
jornada donde alguien ya marcó "Participei", primero tiene que borrar esas cargas.

La carga manual vale en **cualquier estado** de la jornada (`convocatoria`, `en_curso`,
`finalizada`): la jornada puede no haberse "empezado" nunca en la app.

### 1.2. Flujo de aprobación

```
member PUT /my-stats ──► pendiente ──(admin PATCH .../approve)──► aprobada  ← suma al ranking
                             ▲                                        │
                             └────── member vuelve a PUT /my-stats ───┘
admin PUT /players/:playerId/stats ──► aprobada (directo)
admin DELETE /players/:playerId/stats ──► se borra (= rechazar)
```

- Lo que carga el **jugador** siempre queda `pendiente`, también si edita una carga ya aprobada
  (vuelve a pendiente y deja de sumar hasta que la aprueben de nuevo).
- Lo que carga o corrige el **admin** queda `aprobada` directamente.
- **Rechazar** = el admin la borra, o la corrige con su `PUT` (queda aprobada con los valores del admin).
- Solo las `aprobada` suman en `GET /stats/leaderboard` y `GET /players/:id/stats`.

### 1.3. Cambios en `MatchSessionDto`

Vienen en **todos** los endpoints que devuelven la jornada (`GET /match-sessions`,
`GET /match-sessions/:id`, SSE, y las respuestas de los endpoints de la jornada).

```ts
type ManualStatStatus = 'pendiente' | 'aprobada';

interface SessionPlayerStatsDto {
  id: string;
  sessionId: string;
  playerId: string;
  player: PlayerDto;          // incluye isGuest
  goals: number;
  assists: number;
  status: ManualStatStatus;
  createdAt: string;
  updatedAt: string;
}

interface MatchSessionDto {
  // ...lo de hoy
  manualStats: SessionPlayerStatsDto[]; // NUEVO — ya viene ordenado: goals DESC, assists DESC, nombre
  allowsManualStats: boolean;           // NUEVO — true si la jornada no tiene rondas
  allowsLateManualStats: boolean;       // NUEVO — true si está finalizada y tiene rondas (ver 1.1.1)
}
```

A lo sumo uno de los dos es `true`. Si los dos son `false`, nadie carga a mano.

Una fila en `manualStats` = "participó en esta jornada", aunque tenga 0 goles y 0 asistencias.

### 1.4. Endpoints

Los cuatro de carga responden el **`MatchSessionDto` actualizado** (el objeto de la jornada, **no**
`{ session, matches }` como `GET /match-sessions/:id`), y emiten `session.updated` por SSE.

#### `PUT /match-sessions/:id/my-stats` — "Participei" (JWT)

```json
{ "goals": 2, "assists": 1 }
```

- Crea o actualiza la fila del jugador del **token** (nunca se manda `playerId`). Queda `pendiente`.
- Si no estaba en `attendees`, lo agrega.
- Se puede llamar las veces que quiera para corregir; cada vez vuelve a `pendiente`.

#### `DELETE /match-sessions/:id/my-stats` — "No participé" (JWT)

Borra su fila; la asistencia (`attendees`) queda como estaba. Si no tenía carga, responde la
jornada sin cambios (no es error).

#### `PUT /match-sessions/:id/players/:playerId/stats` — admin

Mismo body. Para cualquier jugador, **invitados incluidos**. Queda `aprobada`.

#### `DELETE /match-sessions/:id/players/:playerId/stats` — admin

Borra la carga de ese jugador (sirve para rechazar). Sin carga → responde sin cambios.

#### `PATCH /match-sessions/:id/players/:playerId/stats/approve` — admin

Sin body. Pasa la carga a `aprobada`.

### 1.5. Errores

| Código | Cuándo | `message` |
|---|---|---|
| `400` | `goals`/`assists` no enteros, negativos o > 50 | en `errors`, ej. `"Los goles no pueden ser más de 50"`, `"Las asistencias deben ser un número entero"` |
| `401` | sin token o token inválido | |
| `403` | usuario sin jugador vinculado (`my-stats`) | `"Tu cuenta no tiene un jugador vinculado. Pide a un administrador que la vincule."` |
| `403` | member en un endpoint de admin | `"Esta acción requiere permisos de administrador"` |
| `404` | jornada inexistente | `"Jornada no encontrada"` |
| `404` | admin carga a un jugador inexistente | `"Jugador no encontrado"` |
| `404` | aprobar a alguien sin carga | `"Este jugador no tiene estadísticas cargadas en la jornada"` |
| `409` | jornada en curso con rondas, o finalizada con rondas y el jugador jugó alguna | ver 1.1 y 1.1.1 |
| `409` | sumar a una ronda a alguien con carga manual en la jornada | ver 1.1.1 |

### 1.6. Qué pintar

**Member**, en la pantalla de la jornada:

- Si `session.allowsManualStats`, o si `session.allowsLateManualStats` **y no jugó ninguna ronda**
  (`!matches.some(m => m.participants.some(p => p.playerId === me.playerId))`):
  - Buscar su fila: `session.manualStats.find(s => s.playerId === me.playerId)`.
  - Sin fila → botón **"Participei"** que abre goles/asistencias (steppers 0–50) → `PUT /my-stats`.
  - Con fila → mostrar sus números con un badge **"Pendiente de aprobación"** o **"Aprobado"**,
    botón "Editar" (avisar que al editar vuelve a pendiente) y "No participé" → `DELETE /my-stats`.
  - Si `me.playerId` es `null`, no mostrar el botón (el backend responde `403`).
  - En `allowsLateManualStats`, si todavía no está en `attendees`, mostrar primero **"Estive lá"**
    (`POST /attendance`). Igual `PUT /my-stats` lo agrega solo a `attendees`.
- Si no se cumple nada de lo anterior: no mostrar nada de esto; los goles salen de las rondas.

Al cargar, aprobar, corregir o rechazar llegan notificaciones (admins / jugador): ver
`frontend-notificaciones.md`.

**Admin**, en la misma pantalla:

- Lista de `manualStats` con el badge de estado; en las `pendiente`, botones **Aprobar**
  (`PATCH .../approve`) y **Rechazar** (`DELETE .../players/:playerId/stats`).
- Botón para cargar/corregir a cualquier asistente o invitado → `PUT .../players/:playerId/stats`.
  En `allowsLateManualStats`, solo para quienes no jugaron ninguna ronda.
- Si `manualStats.length > 0`, deshabilitar "Empezar jornada" / "Nueva ronda" con el texto del `409`
  (o dejarlo habilitado y mostrar el `message` que vuelve).

**Ranking y perfil**: una carga recién hecha **no** cambia el leaderboard hasta que se aprueba.
No hace falta invalidar el leaderboard al cargar; sí al **aprobar**, al **borrar** una aprobada y
al **eliminar la jornada**.

---

## 2. Leaderboard y stats del jugador

`GET /stats/leaderboard` y `GET /players/:id/stats` suman goles de rondas + cargas manuales
**aprobadas**, y traen un campo nuevo:

```ts
interface LeaderboardEntryDto {
  playerId: string;
  name: string;
  matchesPlayed: number;  // rondas jugadas — las jornadas manuales NO suman acá
  goals: number;          // rondas + manuales aprobadas
  assists: number;        // rondas + manuales aprobadas
  sessionsPlayed: number; // NUEVO — jornadas jugadas (con alguna ronda o con carga manual aprobada)
}

// PlayerStatsDto tiene exactamente los mismos campos
type PlayerStatsDto = LeaderboardEntryDto;
```

Para el perfil conviene mostrar **"Jornadas"** (`sessionsPlayed`) además de "Partidos"
(`matchesPlayed`), porque un jugador que solo tiene cargas manuales va a tener 0 partidos.

Cuando alguien reclama un invitado al registrarse, se queda también con sus cargas manuales. No hay
que hacer nada en el front.

---

## 3. Eliminar jornada

### `DELETE /match-sessions/:id` — admin

- `204` sin body.
- `403` `"Esta acción requiere permisos de administrador"` si es member. `404` si no existe.
- Vale en **cualquier estado**, aunque haya una ronda `en_curso`.

Se borra todo: rondas, goles, participantes, equipos, asistentes y cargas manuales. Los
**invitados** que quedaron sin nada en ninguna otra jornada también se borran. Los jugadores
registrados nunca se borran: solo pierden las estadísticas de esa jornada. El ranking y los
perfiles se recalculan solos.

**Qué hacer en el front:**

- Confirmación fuerte antes de llamar (ej. "Se van a borrar N rondas y los goles de esta jornada
  del ranking. No se puede deshacer").
- Al recibir `204`: volver a la lista e invalidar `GET /match-sessions`, `GET /stats/leaderboard`
  y los `GET /players/:id/stats` que tengas en caché.

---

## 4. Tiempo real

El SSE de la jornada (`GET /match-sessions/:id/events`) tiene un evento nuevo:

| Evento | `data` | Cuándo |
|---|---|---|
| `session.updated` | `{ session, matches }` (como antes) | también al cargar, aprobar o borrar estadísticas manuales |
| `session.deleted` | `{ id }` | la jornada se eliminó. El backend **cierra el stream** después |

**Importante:** `EventSource` se reconecta solo cuando el servidor cierra el stream. Si no lo
cerrás a mano, reconecta y recibe `error` con `"Jornada no encontrada"`. Cerralo al recibir el
evento:

```js
const es = new EventSource(`${API_URL}/match-sessions/${sessionId}/events`);

es.addEventListener('session.updated', (e) => {
  const { session, matches } = JSON.parse(e.data);
  // repintar; session.manualStats y session.allowsManualStats ya vienen
});

es.addEventListener('session.deleted', () => {
  es.close(); // si no, EventSource reconecta y recibe "Jornada no encontrada"
  toast('Esta jornada fue eliminada');
  queryClient.invalidateQueries(['match-sessions']);
  queryClient.invalidateQueries(['leaderboard']);
  navigate('/jornadas');
});
```

---

## 5. Permisos

| Acción | admin | member |
|---|---|---|
| Marcar "Participei" y cargar sus goles/asistencias (jornada sin rondas) | ✅ (queda aprobada si usa el endpoint de admin) | ✅ solo los suyos, quedan pendientes |
| Borrar su carga ("No participé") | ✅ | ✅ solo la suya |
| Aprobar una carga | ✅ | ❌ |
| Cargar / corregir / borrar la carga de otro jugador o invitado | ✅ | ❌ |
| Eliminar jornada | ✅ | ❌ |

## Resumen para tipar (TS)

```ts
type ManualStatStatus = 'pendiente' | 'aprobada';

interface SessionPlayerStatsDto {
  id: string;
  sessionId: string;
  playerId: string;
  player: PlayerDto;
  goals: number;
  assists: number;
  status: ManualStatStatus;
  createdAt: string;
  updatedAt: string;
}

interface MatchSessionDto {
  // ...lo de hoy
  manualStats: SessionPlayerStatsDto[];
  allowsManualStats: boolean;
  allowsLateManualStats: boolean;
}

interface SetSessionPlayerStatsBody {
  goals: number;   // entero 0–50
  assists: number; // entero 0–50
}

interface LeaderboardEntryDto {
  playerId: string;
  name: string;
  matchesPlayed: number;
  goals: number;
  assists: number;
  sessionsPlayed: number;
}
type PlayerStatsDto = LeaderboardEntryDto;

// PUT    /match-sessions/:id/my-stats                         body SetSessionPlayerStatsBody -> ApiEnvelope<MatchSessionDto>
// DELETE /match-sessions/:id/my-stats                                                        -> ApiEnvelope<MatchSessionDto>
// PUT    /match-sessions/:id/players/:playerId/stats (admin)  body SetSessionPlayerStatsBody -> ApiEnvelope<MatchSessionDto>
// DELETE /match-sessions/:id/players/:playerId/stats (admin)                                 -> ApiEnvelope<MatchSessionDto>
// PATCH  /match-sessions/:id/players/:playerId/stats/approve (admin)                         -> ApiEnvelope<MatchSessionDto>
// DELETE /match-sessions/:id (admin)                                                         -> 204
// SSE    /match-sessions/:id/events   nuevo evento 'session.deleted' { id }
```
