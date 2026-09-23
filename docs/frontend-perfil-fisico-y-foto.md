# Perfil del jugador — fecha de nacimiento/altura/peso, permisos y foto real a S3

Todo sigue con el mismo sobre de siempre: `{ success: true, data }` /
`{ success: false, message, errors? }`.

---

## 1. `PlayerDto` — campos nuevos (ya implementados tal cual se pidieron)

Aplica a toda respuesta que devuelva un jugador (`GET /players`, `GET /players/:id`,
`POST /players`, `PATCH /players/:id`, `PATCH /players/:id/photo`, y los `player`/`scorer`/`assist`
anidados en partidos, goles y jornadas):

```ts
interface PlayerDto {
  id: string;
  name: string;
  imageUrl: string | null;
  birthDate: string | null; // "YYYY-MM-DD", sin hora ni zona horaria
  heightCm: number | null;  // entero, centímetros
  weightKg: number | null;  // hasta 1 decimal, kilogramos
  createdAt: string;
}
```

Ya podés apagar el mock (`VITE_MOCK_PLAYER_PHYSICAL_PROFILE=false`) — el `PATCH /players/:id` que
ya usás acepta los tres campos exactamente como los pediste: opcionales, independientes, y `null`
borra el dato. Las validaciones son las que sugeriste (mismos mensajes):

| Campo | Regla | Mensaje (`400`) |
|---|---|---|
| `birthDate` | `YYYY-MM-DD`, no futura, edad 5–100 años | `"La fecha de nacimiento no es válida"` |
| `heightCm` | entero, 100–230 | `"La altura debe estar entre 100 y 230 cm"` |
| `weightKg` | número, 30–200, hasta 1 decimal | `"El peso debe estar entre 30 y 200 kg"` |

## 2. ⚠️ Cambio de permisos en `PATCH /players/:id` (nuevo, no existía antes)

Antes **cualquier usuario logueado podía editar cualquier jugador**. Eso ya no es así:

- **Admin**: puede editar cualquier jugador.
- **Member**: solo puede editar **su propio** jugador (`:id` tiene que ser igual al `playerId` de
  su cuenta, el mismo que devuelve `GET /users/me`).
- Cualquier otro caso → **403** `"No podés editar el perfil de otro jugador"`.

Esto también aplica al endpoint de foto (sección 3). Si tu UI deja editar el perfil de otro
jugador (por ejemplo desde una lista de jugadores), hay que ocultar/deshabilitar esa opción para
`member` cuando no sea su propio jugador — el backend la va a rechazar igual, pero mejor no
mostrarla.

`playerId` ahora también viaja **dentro del JWT** (antes el token solo tenía `id/email/role`). No
cambia nada del lado del front salvo que si decodificás el token vas a ver ese campo nuevo.

## 3. Nuevo: `PATCH /players/:id/photo` — subida real a S3

Reemplaza cualquier mock de subida de imagen. Es `multipart/form-data`, no JSON:

```js
const formData = new FormData();
formData.append('file', fileFromInputOrDragAndDrop); // el nombre del campo TIENE que ser "file"

fetch(`${API_URL}/players/${playerId}/photo`, {
  method: 'PATCH',
  headers: { Authorization: `Bearer ${token}` }, // NO pongas Content-Type a mano, el browser arma el boundary solo
  body: formData,
});
```

- **Permisos**: los mismos de la sección 2 (admin o dueño).
- **Tipos aceptados**: `image/jpeg`, `image/png`, `image/webp`. Se valida por el contenido real del
  archivo (magic bytes), no solo por la extensión o el `Content-Type` que mande el navegador — o
  sea que no se puede colar un `.txt` renombrado a `.png`.
- **Tamaño máximo**: 5 MB.
- Responde el **`PlayerDto` completo actualizado**, con el `imageUrl` nuevo ya seteado (URL pública
  directa de S3, tipo `https://backend-imagen-br.s3.us-east-2.amazonaws.com/player-photos/...`).

### Errores (`400`, mensajes exactos)

```
"Validation failed (current file type is text/plain, expected type is /^image\\/(jpeg|png|webp)$/)"
"Validation failed (current file size is 6291524, expected size is less than 5242880)"
```

Son los mensajes que arma Nest automáticamente — no son traducibles/lindos, así que conviene que el
front los intercepte y muestre algo propio (ej. "La imagen no puede pesar más de 5 MB" /
"Formato de imagen no soportado") en vez de mostrar ese texto tal cual al usuario.

Otros errores: `401` sin token, `403` (sección 2), `404` `"Jugador no encontrado"`.

### Flujo recomendado para el drag & drop

1. En el drop/selección de archivo, validar en el cliente ANTES de mandar (tipo + tamaño) para dar
   feedback rápido — pero no confiar solo en eso, el backend valida igual por su cuenta.
2. Mostrar una previsualización local (`URL.createObjectURL(file)`) mientras se sube.
3. `PATCH /players/:id/photo` con el `FormData`.
4. Reemplazar la preview por el `imageUrl` real que viene en la respuesta (o revocar el
   `objectURL` con `URL.revokeObjectURL` para no perder memoria).
5. Si tira `400` de tipo/tamaño, mostrar el mensaje propio de la sección anterior.

## Resumen para tipar (TS)

```ts
interface PlayerDto {
  id: string;
  name: string;
  imageUrl: string | null;
  birthDate: string | null;
  heightCm: number | null;
  weightKg: number | null;
  createdAt: string;
}

// PATCH /players/:id          -> ApiEnvelope<PlayerDto>  (admin o dueño; acepta birthDate/heightCm/weightKg)
// PATCH /players/:id/photo    -> ApiEnvelope<PlayerDto>  (multipart, campo "file"; admin o dueño)
```
