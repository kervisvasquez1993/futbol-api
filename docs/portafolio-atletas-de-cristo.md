# Atletas de Cristo: resumen para portafolio

> Documento para la descripción del proyecto en el portafolio. Incluye frontend y backend
> (`futbol-tracker-api`), más un bloque resumido al final para pasarle el contexto a otro modelo.

---

## Versión corta (tarjeta del portafolio)

App web full-stack para organizar el fútbol semanal de un grupo: jugadores, partidos, jornadas con
varios equipos que rotan, goles y asistencias con marcador en tiempo real, y ranking de goleadores.
Frontend en React 19 y backend en NestJS con PostgreSQL, ambos con Clean Architecture.

## Versión larga (página del proyecto)

Atletas de Cristo es una plataforma para gestionar las jornadas de fútbol de un grupo de amigos.
Permite registrar jugadores con su perfil (foto, edad, altura y peso, mostrado como una carta
estilo FIFA), crear partidos y jornadas con varios equipos que se sortean al azar de forma
balanceada, y cargar goles y asistencias mientras se juega. El marcador se actualiza en vivo en
todos los dispositivos mediante Server-Sent Events (SSE).

Los partidos se cierran solos al terminar el tiempo o al llegar a un límite de goles. En las
jornadas con modo **"ganador se queda"**, el backend genera la siguiente ronda automáticamente: el
equipo que gana sigue en cancha, el que pierde pasa al final de la fila y entra el siguiente que
estaba esperando. Hay un ranking de goleadores y asistidores que se comparte por WhatsApp con un
clic.

El sistema maneja roles: el **admin** gestiona todo, y el **member** ve la información en modo
lectura y solo puede editar su propio perfil y los partidos en los que juega. Incluye
autenticación completa: login, registro y recuperación de contraseña con un código que llega por
correo.

---

## Frontend

**Funcionalidades:**

- Gestión de jugadores con subida de foto y perfil físico (fecha de nacimiento, altura, peso)
- Partidos y jornadas con varios equipos y rondas
- Sorteo aleatorio y balanceado de equipos (ej. 10 jugadores de a 4 → 4, 3, 3)
- Marcador y goles en tiempo real con SSE y reconexión automática
- Cronómetro con cierre automático por tiempo o por límite de goles
- Ranking de goles y asistencias que se comparte por WhatsApp
- Permisos por rol (admin / member) con rutas protegidas
- Login, registro y recuperación de contraseña en varios pasos
- Interfaz en portugués, responsive (pensada para usarse desde el celular en la cancha)

**Stack:** React 19 · TypeScript · Vite · TanStack Query · Zustand · React Hook Form + Zod ·
Tailwind CSS v4 · shadcn/ui (Radix) · Axios · React Router 7 · Server-Sent Events · Vercel

**Arquitectura:** Clean Architecture en capas:

- `domain`: entidades y errores del negocio
- `aplication`: casos de uso, más queries y mutations de TanStack Query
- `infrastructure`: cliente HTTP, repositorios, mappers de DTO a entidad y stream en tiempo real
- `presentation`: páginas, componentes y stores de Zustand

---

## Backend

**Funcionalidades:**

- API REST con unos 38 endpoints, organizada en módulos: auth, users, players, matches,
  match-sessions (jornadas), goals y stats
- Autenticación con JWT y contraseñas hasheadas con bcrypt; guards propios para usuarios logueados
  y para admin
- Permisos a nivel de recurso: un member solo puede editar su propio jugador o unirse a un partido
  si su cuenta tiene un jugador vinculado
- Tiempo real con SSE (`/matches/:id/events` y `/match-sessions/:id/events`): envía el estado
  completo al conectarse, lo vuelve a enviar con cada cambio y manda un heartbeat cada 25 s para
  que la conexión no se corte
- Cierre automático de partidos: un proceso en segundo plano revisa cada 12 s los partidos en curso
  y los finaliza por tiempo o por límite de goles
- Jornadas con rotación en dos modos: **manual** (el admin arma cada ronda) o **ganador se queda**
  (el backend crea la siguiente ronda y maneja la fila de equipos solo; si hay empate no rota)
- Subida de fotos de perfil a AWS S3 (acepta JPEG, PNG y WebP; también funciona con servicios
  compatibles con S3 como MinIO)
- Ranking de goles, asistencias y partidos jugados calculado con una sola consulta SQL agregada
- Recuperación de contraseña en 3 pasos (pedir código, verificarlo, cambiar la contraseña). El
  código es de 6 dígitos, se guarda hasheado y vence a los 15 minutos. Se envía por SMTP con una
  plantilla HTML (Mailtrap en desarrollo, Resend en producción)

**Stack:** NestJS 11 · TypeScript · PostgreSQL 16 · TypeORM (con migraciones) · JWT · bcrypt ·
class-validator · Joi · RxJS · AWS S3 SDK v3 · Nodemailer · Docker

**Arquitectura:** Clean Architecture por módulo (bounded context):

- `domain`: entidades, enums y ports (clases abstractas de repositorio)
- `application`: casos de uso, DTOs validados y servicios (ciclo de vida del partido, streams de
  eventos)
- `infrastructure`: repositorios TypeORM que implementan los ports
- `presentation`: controllers

En `shared` están los errores de dominio (`NotFoundError`, `ConflictError`, `ForbiddenError`…),
que un filtro global convierte en respuestas HTTP. Todas las respuestas usan el mismo formato
`{ success, data }` gracias a un interceptor global, que deja pasar sin cambios los streams SSE.

**Puntos destacados:**

- **Ciclo de vida del partido en un solo lugar:** `MatchLifecycleService` concentra la lógica de
  finalizar un partido, revisar los criterios de cierre, avisar a los clientes SSE y, si el partido
  es parte de una jornada, disparar la rotación. El resultado es el mismo tanto si el partido lo
  cierra un gol, el temporizador o el admin.
- **Tiempo real sin infraestructura extra:** los eventos usan `Subject` de RxJS filtrados por
  partido o jornada, sin Redis ni WebSockets. Alcanza para el tamaño del grupo y mantiene el
  deploy simple.
- **Esquema solo por migraciones:** `synchronize` está apagado en todos los entornos. La base
  cambia únicamente con migraciones versionadas, que se corren solas al levantar el contenedor de
  producción.
- **Configuración validada al arrancar:** todas las variables de entorno se validan con Joi. Si
  falta algo obligatorio, la app no inicia, en lugar de fallar más tarde.
- **Imagen Docker multi-stage** con Node 20 Alpine y solo las dependencias de producción.

---

## Links

- Demo: _Pendiente_
- Repo frontend: _Pendiente_
- Repo backend: _Pendiente_

---

## Pendientes antes de publicar

- **Hosting del backend:** en el repo solo está el Dockerfile; agregar dónde está desplegado
  (Railway, Render, EC2, etc.) al stack.
- **Tests:** el backend no tiene tests (`*.spec.ts`); no mencionarlos a menos que se agreguen.
- **Resend:** confirmar que ya se usa en producción; si no, dejar solo "SMTP con Nodemailer".

---

## Bloque resumido (para pasar a otro modelo)

```
Proyecto: Atletas de Cristo
Tipo: Aplicación web full-stack (frontend SPA + API REST)
Descripción corta: App para organizar el fútbol semanal de un grupo: jugadores, partidos, jornadas con varios equipos que rotan, goles/asistencias con marcador en tiempo real y ranking.
Frontend: React 19, TypeScript, Vite, TanStack Query, Zustand, React Hook Form, Zod, Tailwind CSS v4, shadcn/ui, Axios, React Router 7, SSE, Vercel
Backend: NestJS 11, TypeScript, PostgreSQL 16, TypeORM (migraciones), JWT, bcrypt, class-validator, Joi, RxJS, AWS S3, Nodemailer (Mailtrap/Resend), Docker
Arquitectura: Clean Architecture en front y back (domain/application/infrastructure/presentation), casos de uso, repositorios con ports, mappers
Features: tiempo real con SSE y heartbeat, cierre automático por tiempo o goles (proceso en segundo plano), jornadas con rotación "ganador se queda", sorteo balanceado de equipos, ranking con SQL agregado que se comparte por WhatsApp, roles admin/member con permisos por recurso, recuperación de contraseña con código por email, fotos en S3, perfil estilo carta FIFA
Idioma de la UI: portugués
```
