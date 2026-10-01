# Llegadas tarde, tamaño de equipo y refuerzos

Delta sobre `frontend-jornadas-v2-rotacion-tiempo-real.md` y
`frontend-estadisticas-manuales-y-eliminar-jornada.md`. Tres cosas nuevas:

1. **Llegadas tarde**: un jugador puede marcar que está ("Cheguei") o que estuvo ("Estive lá")
   aunque la convocatoria ya se haya cerrado. El admin lo ubica en un equipo con `PUT /teams`.
2. **Tamaño de equipo** (`playersPerTeam`): ahora lo guarda el backend.
3. **Refuerzos**: si el equipo que entra tiene menos jugadores que el tamaño de la jornada, el
   backend lo completa **para esa ronda** con jugadores del equipo que acaba de perder, sorteados.

Todo sigue envuelto en `{ success, data }` / `{ success: false, message, errors? }`, salvo el SSE.

Lo que **ya funcionaba** y no cambia: `POST /match-sessions/:id/guests` en cualquier estado, y
`PUT /match-sessions/:id/teams` para mover, sacar y sumar jugadores con la jornada en curso (los
cambios valen desde la próxima ronda).

---

## 1. Asistencia en cualquier estado

### 1.1. `POST /match-sessions/:id/attendance` (JWT)

Antes respondía `409 "La convocatoria ya está cerrada"` si la jornada había empezado. **Ahora vale
en cualquier estado** y sigue siendo idempotente (llamarlo dos veces no falla ni duplica).

| Estado | Botón | Qué pasa |
|---|---|---|
| `convocatoria` | confirmar (como hoy) | queda en `attendees` |
| `en_curso` | **"Cheguei"** | queda en `attendees` **sin equipo**; el admin lo ubica con `PUT /teams` y juega desde la próxima ronda |
| `finalizada` | **"Estive lá"** | queda registrado que fue. Después puede cargar sus números con `PUT /my-stats` si la jornada no tiene rondas (`allowsManualStats`) o, si tiene, cuando no jugó ninguna (`allowsLateManualStats`, ver `frontend-estadisticas-manuales-y-eliminar-jornada.md` 1.1.1) |

Responde el `MatchSessionDto` actualizado y emite `session.updated`.

Errores: `403` sin jugador vinculado (mismo mensaje de siempre), `404` `"Jornada no encontrada"`.

### 1.2. `DELETE /match-sessions/:id/attendance` (JWT)

- `convocatoria`: igual que hoy, sale de la lista.
- `en_curso` / `finalizada`: solo si **no está en ningún equipo** de la jornada y **no jugó ninguna
  ronda** (típico: marcó "Cheguei" por error). Si no:
  `409` `"Ya estás en un equipo de la jornada: pide al administrador que te saque"`.

Salir de la jornada **no** borra una carga manual: para eso sigue estando "No participé"
(`DELETE /my-stats`).

### 1.3. `DELETE /match-sessions/:id/attendees/:playerId` (admin)

Misma regla fuera de `convocatoria`. Si el jugador está en un equipo o jugó una ronda:
`409` `"Este jugador ya está en un equipo o jugó una ronda"`. Para sacarlo de un equipo, usá
`PUT /teams`. Si era un invitado sin nada más, se borra igual que antes.

### 1.4. Qué pintar

Helpers útiles (todo sale de `GET /match-sessions/:id` → `{ session, matches }`):

```ts
const teamOf = (playerId: string) =>
  session.teams.find((t) => t.players.some((p) => p.playerId === playerId));

const playedARound = (playerId: string) =>
  matches.some((m) => m.participants.some((p) => p.playerId === playerId));

// Admin: bloque "Sem time (N)"
const withoutTeam = session.attendees.filter((a) => !teamOf(a.playerId));

// Member: ¿puede deshacer su "Cheguei"?
const canLeave =
  session.status === 'convocatoria' ||
  (!teamOf(me.playerId) && !playedARound(me.playerId));
```

- **Member**: en `en_curso` mostrar **"Cheguei"** y en `finalizada` **"Estive lá"** si no está en
  `attendees`. Si ya está y `canLeave`, ofrecer deshacer.
- **Admin**: bloque **"Sem time (N)"** con `withoutTeam`, con acceso directo a **Editar times**
  (`PUT /teams`) y a **sumar invitado** (`POST /guests`). El botón "Quitar" solo si esa persona
  no jugó ninguna ronda (`!playedARound`); para los que están en un equipo, se saca desde el editor.

---

## 2. Tamaño de equipo: `playersPerTeam`

```ts
interface MatchSessionDto {
  // ...lo de hoy
  playersPerTeam: number | null; // NUEVO — "Jogadores por time"
}
```

| Endpoint | Campo | Comportamiento |
|---|---|---|
| `POST /match-sessions` (con equipos) | `playersPerTeam?: number` | se guarda |
| `POST /match-sessions/:id/start` | `playersPerTeam?: number` | si no viene, se mantiene el que tenía la jornada |
| `PUT /match-sessions/:id/teams` | `playersPerTeam?: number \| null` | **sin el campo no cambia**; `null` lo borra; un número lo cambia (ej. llegó gente y ahora se juega 6 contra 6) |

- Entero entre 1 y 20. Si no: `400` con `"Los jugadores por equipo deben ser un número entre 1 y 20"`
  en `errors`.
- `null` (jornadas viejas o si se borra): el backend toma como tamaño **el equipo con más
  jugadores**.
- El tamaño solo se usa para **completar** equipos: si un equipo tiene más, no se le saca a nadie.

El armador y el editor de equipos deberían mandar siempre el valor del selector "Jogadores por time".

---

## 3. Refuerzos

### 3.1. Cuándo pasa (automático, `winner_stays`)

Al terminar una ronda, cuando el backend arma la siguiente:

- **Solo si entra un equipo distinto al que perdió.** Con 2 equipos es revancha y no hay de dónde
  sacar, así que no hay refuerzos.
- El donante es **el equipo que acaba de perder** (que se va a la fila).
- Se completa **primero el que entra** y **después el ganador** (por si alguien se fue).

### 3.2. A quién elige

1. Primero, a los que **menos veces fueron refuerzo en esta jornada**.
2. Entre los empatados, **al azar**.

Así no le toca siempre al mismo: si ya salió sorteado alguien, la próxima vez le toca a otro.
Cuando todos ya fueron refuerzo la misma cantidad de veces, vuelve a ser al azar entre todos.

Si no alcanzan los donantes, se completa lo que se pueda y la ronda se crea igual.

### 3.3. Las plantillas no cambian

El refuerzo es **solo para esa ronda**: aparece en `participants` de esa ronda con
`isFillIn: true`, pero en `session.teams` **sigue en su equipo** (el que perdió, que está en la
fila). Vuelve a jugar con su equipo cuando le toque.

Ejemplo real (probado), 3 equipos con `playersPerTeam: 3` y C con 2:

```
Ronda 1: A (a1,a2,a3) vs B (b1,b2,b3)            → gana A
Ronda 2: A (a1,a2,a3) vs C (c1,c2 + b1*)         → B presta a b1. Gana C
Ronda 3: C (c1,c2 + a2*) vs B (b1,b2,b3)         → A presta a a2 (b1 vuelve a B)
Ronda 4: B vs A                                   → los dos completos, sin refuerzos
```

### 3.4. `MatchParticipantDto`

```ts
interface MatchParticipantDto {
  // ...lo de hoy
  isFillIn: boolean; // NUEVO — jugó esta ronda de refuerzo, prestado por otro equipo
}
```

- `team` (`"home"` / `"away"`) es el lado en el que **juega esa ronda**, no el de su plantilla.
- **Los goles de un refuerzo cuentan normal** y suman para el lado en que juega esa ronda. Al cargar
  un gol, el refuerzo tiene que aparecer en la lista de jugadores de ese lado (sale de
  `participants`, no de `session.teams`).
- Para mostrar "Reforço de B": buscar su equipo con `teamOf(participant.playerId)` (sección 1.4).

### 3.5. Ronda manual: `POST /match-sessions/:id/matches`

Campo nuevo opcional:

```json
{
  "homeSessionTeamId": "team-a-uuid",
  "awaySessionTeamId": "team-c-uuid",
  "fillFromSessionTeamId": "team-b-uuid"
}
```

- Completa a **los dos** equipos de la ronda (primero `away`, después `home`) con jugadores del
  equipo indicado, con la misma prioridad de 3.2.
- Sin el campo, la ronda se arma como siempre, sin refuerzos.
- El equipo donante tiene que ser de la jornada y **distinto de los dos que juegan**. Si no:
  `400` `"El equipo de refuerzos debe ser otro equipo de la jornada"`.
- Responde el `MatchDto` de la ronda creada, como hoy.

---

## 4. Qué pintar (resumen)

- **Jugador que llega tarde**: botón **"Cheguei"** (en curso) o **"Estive lá"** (finalizada).
- **Admin**: bloque **"Sem time (N)"** con acceso a **Editar times** y a sumar invitados.
- **Armador y editor de equipos**: mandar `playersPerTeam`.
- **Ronda en juego e historial**: badge **"Reforço"** en los participantes con `isFillIn`
  (opcional: "Reforço de B").
- **Ronda manual**: selector opcional **"Completar com jogadores de"** con los equipos de la
  jornada que no juegan esa ronda.

Tiempo real: no hay eventos nuevos. "Cheguei", "Estive lá", salir, quitar y las rondas con
refuerzos emiten `session.updated` como el resto.

---

## Resumen para tipar (TS)

```ts
interface MatchSessionDto {
  // ...lo de hoy
  playersPerTeam: number | null;
}

interface MatchParticipantDto {
  // ...lo de hoy
  isFillIn: boolean;
}

interface StartMatchSessionBody {
  // ...lo de hoy
  playersPerTeam?: number; // 1–20
}

interface UpdateSessionTeamsBody {
  teams: UpdateSessionTeamInput[];
  playersPerTeam?: number | null; // ausente = no cambia, null = borrar
}

interface CreateSessionRoundBody {
  homeSessionTeamId: string;
  awaySessionTeamId: string;
  durationMinutes?: number;
  goalLimit?: number;
  fillFromSessionTeamId?: string; // NUEVO
}

// POST   /match-sessions/:id/attendance            cualquier estado       -> ApiEnvelope<MatchSessionDto>
// DELETE /match-sessions/:id/attendance            409 si está en equipo o jugó (fuera de convocatoria)
// DELETE /match-sessions/:id/attendees/:playerId   (admin) misma regla
// POST   /match-sessions/:id/matches               + fillFromSessionTeamId -> ApiEnvelope<MatchDto>
```
