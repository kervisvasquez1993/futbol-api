# Notificaciones

Delta sobre `frontend-estadisticas-manuales-y-eliminar-jornada.md`. Notificaciones **dentro de la
app** (campanita + lista), con contador de no leídas y tiempo real por SSE. Por ahora cubren el
flujo de carga manual de estadísticas:

- Un jugador marca sus goles/asistencias → **les llega a los admins** para que aprueben.
- El admin aprueba, corrige o rechaza → **le llega al jugador**.

Cada notificación trae `sessionId` para llevar directo a la jornada.

Todo sigue envuelto en `{ success, data }` / `{ success: false, message, errors? }`, salvo el SSE.

> No son push del sistema: llegan con la app abierta (SSE) o se ven al entrar (`GET`). Las push con
> la app cerrada quedan para un paso siguiente sobre esta misma base.

---

## 1. Qué notificación llega y cuándo

| Acción | Endpoint que la dispara | Le llega a | `type` |
|---|---|---|---|
| El jugador carga o edita sus números | `PUT /match-sessions/:id/my-stats` | **todos los admins** | `manual_stats_submitted` |
| El admin aprueba | `PATCH /match-sessions/:id/players/:playerId/stats/approve` | el jugador | `manual_stats_approved` |
| El admin carga o corrige sus números (quedan aprobados) | `PUT /match-sessions/:id/players/:playerId/stats` | el jugador | `manual_stats_set_by_admin` |
| El admin borra su carga (rechazo) | `DELETE /match-sessions/:id/players/:playerId/stats` | el jugador | `manual_stats_rejected` |

Reglas que ya resuelve el backend (no hace falta replicarlas):

- **Nadie se notifica a sí mismo.** Un admin que carga sus propios números con `my-stats` avisa a
  los demás admins, pero no a él.
- **Sin duplicados al editar.** Si el jugador edita su carga antes de que la aprueben, el aviso
  viejo a los admins queda leído y llega uno nuevo con los números actuales. El contador no sube
  de a dos.
- **Se resuelve sola para todos los admins.** Cuando un admin aprueba, corrige o rechaza, el aviso
  `manual_stats_submitted` de esa carga pasa a leído **para todos los admins**: el segundo admin ya
  no ve algo pendiente que ya se resolvió.
- **"No participé"** (`DELETE /my-stats`): el aviso pendiente a los admins queda leído y no llega
  nada nuevo.
- Aprobar algo que **ya estaba aprobado** no vuelve a avisar.
- Los **invitados sin cuenta** no reciben nada (no tienen usuario).
- Si se **elimina la jornada**, se borran sus notificaciones.

---

## 2. `NotificationDto`

```ts
type NotificationType =
  | 'manual_stats_submitted'
  | 'manual_stats_approved'
  | 'manual_stats_rejected'
  | 'manual_stats_set_by_admin';

interface NotificationDto {
  id: string;
  userId: string;             // destinatario (siempre el usuario del token)
  type: NotificationType;
  sessionId: string | null;   // a dónde lleva: /jornadas/:sessionId
  playerId: string | null;    // el jugador de la carga
  data: {
    sessionName?: string;
    playerName?: string;
    goals?: number;
    assists?: number;
  };
  readAt: string | null;      // null = no leída
  createdAt: string;
}
```

`data` es una **foto del momento**: si después renombran la jornada, la notificación conserva el
nombre viejo. Con eso alcanza para pintar el texto sin pedir nada más.

### 2.1. Textos sugeridos

El backend no manda texto: lo arma el front con `type` + `data`, en el idioma de la app.

| `type` | Para | Texto sugerido |
|---|---|---|
| `manual_stats_submitted` | admin | **{playerName}** marcou {goals} gols e {assists} assistências em **{sessionName}**. Toque para aprovar. |
| `manual_stats_approved` | jugador | Suas estatísticas em **{sessionName}** foram aprovadas: {goals} gols e {assists} assistências. |
| `manual_stats_set_by_admin` | jugador | Um administrador registrou {goals} gols e {assists} assistências para você em **{sessionName}**. |
| `manual_stats_rejected` | jugador | Suas estatísticas em **{sessionName}** foram recusadas. Confira e envie de novo. |

En `manual_stats_rejected`, `goals`/`assists` son los que tenía la carga que se borró.

---

## 3. Endpoints

Todos con JWT en `Authorization: Bearer`, salvo el SSE (sección 4). Cada usuario solo ve **sus**
notificaciones.

### 3.1. `GET /notifications`

| Query | Tipo | Default | |
|---|---|---|---|
| `limit` | entero 1–100 | 30 | |
| `before` | fecha ISO | — | para paginar: mandar el `nextCursor` de la página anterior |
| `unread` | `true` | — | solo las no leídas |

```json
{
  "success": true,
  "data": {
    "items": [ /* NotificationDto[], más nuevas primero */ ],
    "unreadCount": 3,
    "nextCursor": "2026-09-30T22:05:51.247Z"
  }
}
```

- `unreadCount` es el total de no leídas del usuario (no solo de esta página). Es el número de la
  campanita.
- `nextCursor` es `null` cuando no hay más páginas. Si viene, la siguiente página se pide con
  `?before=<nextCursor>`.
- `400` si `limit` o `before` no son válidos (ej. `"limit no puede ser más de 100"` en `errors`).

### 3.2. `PATCH /notifications/:id/read`

Sin body. Responde el `NotificationDto` con `readAt`. Es idempotente (marcar dos veces no falla).

- `404` `"Notificación no encontrada"` si no existe **o es de otro usuario**.

### 3.3. `PATCH /notifications/read-all`

Sin body. Responde `{ "unreadCount": 0 }`.

---

## 4. Tiempo real: `GET /notifications/events?token=<jwt>`

`EventSource` no puede mandar headers, así que el JWT va en la query. Sin token o con un token
inválido o vencido responde `401` y no abre el stream.

| Evento | `data` | Cuándo |
|---|---|---|
| `notifications.count` | `{ unreadCount }` | **al conectar** (estado inicial) y cada vez que cambia el contador sin que haya una nueva (se leyó algo, en este u otro dispositivo, o se resolvió un aviso) |
| `notification.created` | `{ notification: NotificationDto, unreadCount }` | llegó una nueva |
| `ping` | `{}` | cada ~25 s, anti-timeout de proxies; se ignora |

```js
let es;

function connectNotifications(token) {
  es?.close();
  es = new EventSource(`${API_URL}/notifications/events?token=${encodeURIComponent(token)}`);

  es.addEventListener('notifications.count', (e) => {
    const { unreadCount } = JSON.parse(e.data);
    setBadge(unreadCount);
  });

  es.addEventListener('notification.created', (e) => {
    const { notification, unreadCount } = JSON.parse(e.data);
    setBadge(unreadCount);
    prependToList(notification);          // o invalidateQueries(['notifications'])
    toast(renderText(notification), () => openNotification(notification));
  });
}

// Al hacer logout: es.close(). Al renovar el token: volver a llamar a connectNotifications.
```

Notas:

- Si el token vence con el stream abierto, el stream sigue vivo hasta que se corte la conexión. Al
  reconectar con el token vencido llega `401` y `EventSource` deja de reintentar
  (`es.readyState === EventSource.CLOSED`): reconectar con el token nuevo.
- Abrir el stream **una sola vez** por sesión de la app (por ejemplo en el layout principal), no
  por pantalla.

---

## 5. Qué pintar

### 5.1. Campanita

- Badge con `unreadCount` (del primer `notifications.count` del SSE o de `GET /notifications`).
- Al abrir el panel: `GET /notifications` y, si se quiere, un botón **"Marcar todas como lidas"**
  → `PATCH /notifications/read-all`.
- No leídas resaltadas (`readAt === null`).
- Scroll infinito con `nextCursor`.

### 5.2. Al tocar una notificación

1. `PATCH /notifications/:id/read` (si `readAt` es `null`).
2. Navegar a la jornada: `/jornadas/${notification.sessionId}`.
3. Según el `type`:
   - `manual_stats_submitted` (admin): abrir la jornada con el bloque de cargas manuales a la vista
     y resaltar la fila de `notification.playerId` con los botones **Aprobar** / **Rechazar**.
     Si esa carga ya no está pendiente (otro admin la resolvió), la jornada ya la muestra
     aprobada o ya no aparece: no hay que hacer nada especial.
   - `manual_stats_approved` / `manual_stats_set_by_admin` (jugador): mostrar su fila con el badge
     **"Aprovado"**.
   - `manual_stats_rejected` (jugador): mostrar el botón **"Participei"** para que vuelva a cargar.

Si la jornada se eliminó, sus notificaciones ya no están en la lista; si el usuario tenía una
abierta y la jornada responde `404`, volver a la lista de jornadas.

### 5.3. Toast

Con `notification.created`, mostrar un toast con el texto de 2.1 que al tocarlo haga lo de 5.2.

---

## Resumen para tipar (TS)

```ts
type NotificationType =
  | 'manual_stats_submitted'
  | 'manual_stats_approved'
  | 'manual_stats_rejected'
  | 'manual_stats_set_by_admin';

interface NotificationDto {
  id: string;
  userId: string;
  type: NotificationType;
  sessionId: string | null;
  playerId: string | null;
  data: { sessionName?: string; playerName?: string; goals?: number; assists?: number };
  readAt: string | null;
  createdAt: string;
}

interface NotificationsPage {
  items: NotificationDto[];
  unreadCount: number;
  nextCursor: string | null;
}

// GET   /notifications?limit=&before=&unread=true   -> ApiEnvelope<NotificationsPage>
// PATCH /notifications/:id/read                     -> ApiEnvelope<NotificationDto>   (404 si no es tuya)
// PATCH /notifications/read-all                     -> ApiEnvelope<{ unreadCount: 0 }>
// SSE   /notifications/events?token=<jwt>           eventos 'notifications.count' | 'notification.created' | 'ping'
```
