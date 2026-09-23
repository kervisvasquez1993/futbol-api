# Recuperar contraseña — código por email en 3 pasos

Todo sigue con el mismo sobre de siempre: `{ success: true, data }` /
`{ success: false, message, errors? }`. Los tres endpoints son **públicos** (no llevan
`Authorization`).

Flujo pensado para 3 pantallas: **email → código → nueva contraseña**.

---

## 1. `POST /auth/forgot-password` — pantalla 1 (pedir el email)

```json
{ "email": "juan@example.com" }
```

Valida que exista una cuenta con ese email. Si existe, genera un código de 6 dígitos, lo guarda
(hasheado) con **15 minutos** de vencimiento, y lo manda por correo.

```json
{ "success": true, "data": { "message": "Te enviamos un código de verificación a tu correo" } }
```

Errores:
- **404** — `"No existe una cuenta con ese email"` (sí, este endpoint confirma si el email está
  registrado o no — es una decisión a propósito para esta app, no es el comportamiento típico de
  "nunca reveles si el email existe" que se usa en apps públicas).
- **400** — `"El email debe ser válido"` si el formato está mal.

Cada llamada **pisa el código anterior** (no se acumulan códigos viejos) — si el usuario pide
reenviar, simplemente se llama de nuevo a este mismo endpoint.

## 2. `POST /auth/reset-password/verify-code` — pantalla 2 (validar el código)

```json
{ "email": "juan@example.com", "code": "123456" }
```

Valida el código **sin gastarlo todavía** — pensado para que la UI pueda confirmar "sí, este
código es correcto" antes de pasar a la pantalla de nueva contraseña, sin obligar a que el usuario
la escriba dos veces si se equivoca.

```json
{ "success": true, "data": { "valid": true } }
```

Errores:
- **404** — `"No existe una cuenta con ese email"`.
- **400** — `"El código es inválido o ya expiró"` — mismo mensaje tanto si el código está mal, como
  si venció, como si nunca se pidió uno. No hay forma de distinguir esos casos desde la respuesta
  (a propósito, para no dar pistas).
- **400** — `"El código debe tener 6 dígitos"` si no mandás exactamente 6 caracteres.

## 3. `POST /auth/reset-password` — pantalla 3 (nueva contraseña, con confirmación)

```json
{
  "email": "juan@example.com",
  "code": "123456",
  "newPassword": "unaClaveNueva123",
  "confirmPassword": "unaClaveNueva123"
}
```

Dos campos nuevos en esta pantalla (`newPassword` + `confirmPassword`) — revalida el código de
nuevo (por si pasó tiempo entre la pantalla 2 y esta) y valida que las dos contraseñas coincidan.
Si todo sale bien, actualiza la contraseña **y el código queda invalidado** — no se puede volver a
usar para otro reseteo (ni siquiera si todavía no venció el plazo de 15 minutos).

```json
{ "success": true, "data": { "message": "Contraseña actualizada correctamente" } }
```

Errores:
- **404** — `"No existe una cuenta con ese email"`.
- **400** — `"El código es inválido o ya expiró"` (mismo caso que el paso 2 — puede pasar si el
  usuario tardó mucho entre pantallas y el código venció justo ahí).
- **400** — `"Las contraseñas no coinciden"` — si `newPassword` ≠ `confirmPassword`. Conviene
  además validar esto en el cliente antes de mandar la request, para feedback inmediato.
- **400** — `"La contraseña debe tener al menos 6 caracteres"` / `"La confirmación debe tener al
  menos 6 caracteres"` si alguno de los dos campos es muy corto.

Después de un reseteo exitoso, la persona **no queda logueada automáticamente** — la respuesta no
trae `accessToken`. Hay que mandarla a la pantalla de login normal (`POST /auth/login`) con su
nueva contraseña.

---

## Dev: cómo se prueba esto localmente

El backend usa un inbox de **Mailtrap** (sandbox SMTP) para las pruebas — los correos no salen a
direcciones reales, quedan atrapados ahí para poder verlos. Si en desarrollo no ves llegar nada al
mail real, es esperado: hay que revisar el inbox de Mailtrap, no la bandeja de entrada real.

## Resumen para tipar (TS)

```ts
interface ForgotPasswordBody { email: string }
interface ForgotPasswordResponse { message: string }
// POST /auth/forgot-password -> ApiEnvelope<ForgotPasswordResponse>

interface VerifyResetCodeBody { email: string; code: string } // code: 6 dígitos, string
interface VerifyResetCodeResponse { valid: true }
// POST /auth/reset-password/verify-code -> ApiEnvelope<VerifyResetCodeResponse>

interface ResetPasswordBody {
  email: string;
  code: string;
  newPassword: string;
  confirmPassword: string;
}
interface ResetPasswordResponse { message: string }
// POST /auth/reset-password -> ApiEnvelope<ResetPasswordResponse>
```
