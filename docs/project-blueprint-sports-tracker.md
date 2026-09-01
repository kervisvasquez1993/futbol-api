# Blueprint — apps de tracking deportivo (base para el proyecto de vóley)

Extraído de `futbol-tracker-api`. Pensado para copiar/adaptar al arrancar un proyecto nuevo del
mismo estilo (ej. tracker de vóley: equipos, sets, puntos, jugadores).

---

## 1. Stack base

- **NestJS** (framework HTTP + inyección de dependencias)
- **TypeORM + PostgreSQL**
- **class-validator / class-transformer** para DTOs
- **JWT** (`@nestjs/jwt`, sin Passport) para auth
- **Joi** para validar variables de entorno al bootear

## 2. Arquitectura por módulo (hexagonal liviana)

Cada feature vive en `src/modules/<feature>/` con 4 carpetas fijas:

```
modules/<feature>/
  domain/
    entities/    -> entidades TypeORM (@Entity)
    enums/       -> enums de dominio (status, roles, lados, etc.)
    ports/       -> "interfaces" de repositorio, como abstract class
  application/
    dtos/        -> DTOs de entrada con class-validator
    use-cases/   -> un caso de uso = una clase con .execute()
  infrastructure/
    repositories/ -> implementación TypeORM de cada port
  presentation/
    <feature>.controller.ts
  <feature>.module.ts
```

Reglas del patrón:
- **Un use-case = una acción** (`CreateMatchUseCase`, `AddGoalUseCase`, `FinishMatchUseCase`...). No use-cases gigantes con múltiples responsabilidades.
- El **controller no tiene lógica** — solo recibe el DTO y llama al use-case.
- El **port** (`abstract class XRepository`) es lo único que el use-case conoce del storage; nunca se inyecta `Repository<Entity>` de TypeORM directo en un use-case.
- Un módulo **exporta su repository port** (no sus use-cases) si otro módulo necesita leer/escribir esa entidad — así se evita import circular. Ejemplo real: `GoalsModule` importa `MatchesModule` y usa `MatchRepository` para no duplicar lógica de partidos.

## 3. Convenciones de dominio (las que más valen la pena repetir)

### 3.1. Errores de negocio como clases, no excepciones genéricas

`src/shared/errors/domain-errors.ts`: `NotFoundError`, `ConflictError`, `ValidationError`,
`UnauthorizedError`, `ForbiddenError` — todas extienden una `DomainError` base. Un
`AllExceptionsFilter` global las traduce a status HTTP. Los use-cases **nunca** lanzan
`HttpException` de Nest directamente, solo estos errores de dominio.

### 3.2. Envoltorio de respuesta uniforme

Un `TransformInterceptor` global envuelve toda respuesta exitosa en `{ success: true, data }`.
No hay que hacerlo a mano en cada controller.

### 3.3. Enums para estados y "lados" (equipo A/B, local/visitante, etc.)

Cualquier concepto cerrado de opciones (estado de partido, lado de equipo, rol de usuario) es un
`enum` de TypeScript + `type: 'enum'` en la columna de Postgres — nunca un string libre. Ejemplo:
`MatchStatus` (`en_curso` | `finalizado`), `MatchTeamSide` (`home` | `away`).

### 3.4. Relación "de unión" con datos propios → entidad explícita, no `@ManyToMany` simple

Si necesitás una relación muchos-a-muchos que además carga un dato propio (en fútbol: a qué
equipo pertenece un jugador *dentro de ese partido*), **no uses `@ManyToMany` con `@JoinTable`**.
Usá una entidad intermedia explícita con `@ManyToOne` a cada lado + la columna extra:

```ts
@Entity('match_participants')
@Unique(['matchId', 'playerId'])
export class MatchParticipant {
  @PrimaryGeneratedColumn('uuid') id: string;
  @ManyToOne(() => Match) match: Match;
  @ManyToOne(() => Player) player: Player;
  @Column({ type: 'enum', enum: MatchTeamSide }) team: MatchTeamSide;
}
```

En vóley esto aplica igual: `MatchParticipant` con `team` (`home`/`away`), o incluso con
`position` si hace falta (armador, opuesto, etc.).

### 3.5. Decidir explícitamente: ¿el número se calcula o se carga a mano?

Nos pasó con el marcador de fútbol: hay que decidir **antes de programar** si un valor (resultado,
sets ganados, puntos) es:
- **Calculado en tiempo real** a partir de eventos individuales (ej. cada gol/punto registrado), o
- **Un contador independiente** que se ajusta con +1/-1 o se sobreescribe a mano.

Terminamos con ambos para fútbol: un contador en vivo (`PATCH /matches/:id/score` con `delta: 1|-1`,
clamped a `>= 0`) **y** una corrección absoluta (`PATCH /matches/:id/result`), separados del
registro detallado de goles por jugador (que alimenta las estadísticas). Para vóley, pensar lo
mismo pero por **set**: puntos por set (contador en vivo, resetea al ganar el set) vs. sets ganados
(se calcula solo cuando un set llega al puntaje de victoria) vs. quién anotó cada punto (si se va a
trackear a ese nivel de detalle para stats por jugador).

### 3.6. Repositorio con métodos de dominio, no solo CRUD genérico

El port de un agregado (`MatchRepository`) tiene métodos con nombre de negocio
(`addParticipant`, `setResult`, `adjustScore`, `finish`) además de `findById`/`create`/`save`.
Evita que la lógica de "cómo se actualiza esto" se filtre al use-case o al controller.

## 4. Auth (patrón bootstrap + admin)

- El **primer usuario** se crea con un endpoint público (`POST /auth/register`) que se
  autobloquea apenas existe 1 usuario en la tabla (`ForbiddenError` si ya hay alguno). Siempre
  se crea como `admin`.
- Todas las cuentas siguientes las crea un admin logueado vía `POST /users` (`JwtAuthGuard` +
  `AdminGuard`).
- `POST /auth/login` devuelve `{ accessToken, user }`. El `accessToken` va como
  `Authorization: Bearer <token>`.
- El `password` **nunca** sale en ninguna respuesta — se descarta con destructuring en cada
  use-case que devuelve un `User` (no hay `ClassSerializerInterceptor`, es manual).

## 5. Validación de DTOs

- `ValidationPipe` global con `{ whitelist: true, transform: true, forbidNonWhitelisted: true }`
  en `main.ts`.
- Con `transform: true`, cualquier DTO con un array de objetos anidados necesita
  `@ValidateNested({ each: true })` + `@Type(() => SubDto)` (de `class-transformer`) o la
  validación anidada no corre.
- Mensajes de error de cada validador en español, explícitos (`{ message: '...' }`), porque el
  filtro global los devuelve tal cual al cliente.

## 6. Base de datos y migraciones (flujo obligatorio, no `synchronize`)

Decisión clave tomada en este proyecto: **`synchronize: false` siempre**, dev y producción.
El esquema se arma únicamente con migraciones versionadas en `src/migrations/`.

Flujo por cada cambio de entity:
1. Editar la entity.
2. `npm run migration:generate -- src/migrations/NombreDescriptivo` (necesita conexión a una DB
   real para diffear — si la DB local ya tiene el cambio aplicado de otra forma, el diff sale
   vacío; para una migración "desde cero" real, generar contra una DB **vacía** temporal).
3. Revisar a mano el archivo generado (TypeORM a veces mete de más).
4. `npm run migration:run`.
5. Commitear la migración en el mismo PR que el cambio de entity.

Gotchas ya pisados en este proyecto, útiles para no repetir:
- Agregar una columna `NOT NULL` sin `default` sobre una tabla con filas existentes **rompe** el
  `ALTER TABLE`. Si hace falta, poner un `default` explícito o migrar los datos primero.
- `uuid_generate_v4()` como default de PK requiere la extensión `uuid-ossp` — agregar
  `CREATE EXTENSION IF NOT EXISTS "uuid-ossp"` al principio de la primera migración; no asumir
  que va a estar habilitada en una DB de producción nueva.
- Si el proyecto ya venía usando `synchronize` sin migraciones (como pasó acá) y se quiere migrar
  al flujo formal: generar la migración baseline contra una DB **vacía**, no contra la de
  desarrollo (que ya tiene todo aplicado y da un diff vacío) — y después insertar manualmente esa
  migración como "ya corrida" en las DBs que ya tienen el esquema (evita que intente crear tablas
  que ya existen).
- El puerto `create(data: DeepPartial<Match>)` — usar `DeepPartial` de TypeORM, no `Partial`,
  si el `create()` va a recibir relaciones anidadas parciales (ej. crear un `Match` con sus
  `MatchParticipant[]` en el mismo `save` gracias a `cascade: true`).

## 7. Configuración de entorno

`src/config/envs.ts`: `dotenv.config()` + validación con `Joi.object(...).unknown(true)`. Falla
rápido (`throw`) si falta una variable requerida. Variables típicas: `NODE_ENV`, `PORT`,
`DB_HOST/PORT/USER/PASSWORD/NAME`, `JWT_SECRET`, `JWT_EXPIRES_IN`.

## 8. Documentación — mantener 2 documentos separados, no 1

Nos sirvió mucho tener dos niveles distintos de documentación, con audiencias distintas:

1. **Contrato de API verificado contra el código** (`docs/api-contract-*.md`): shapes exactos de
   respuesta, con nombres de archivo/línea citados, edge cases (`null` vs no viene, qué relaciones
   se cargan y cuáles no). Para cuando alguien (vos mismo en 3 meses, u otro dev) necesita
   confirmar el comportamiento real sin leer todo el código.
2. **Resumen para frontend** (`docs/frontend-*.md`): solo lo que un consumidor de la API necesita
   — breaking changes, endpoints nuevos, body/response de ejemplo, flujo recomendado. Sin jerga
   interna (nombres de use-cases, TypeORM, etc.).

Mantener el `README.md` como punto de entrada (stack, cómo levantar el proyecto, tabla de
endpoints, flujo de prueba sugerido) y dejar el detalle fino en `docs/`.

## 9. Checklist para arrancar el proyecto de vóley con esta base

- [ ] `nest new` + reproducir la estructura de carpetas de la sección 2.
- [ ] `src/shared/errors/domain-errors.ts`, `AllExceptionsFilter`, `TransformInterceptor` (se
      pueden copiar casi tal cual).
- [ ] Módulo `auth` + `users` con el patrón bootstrap-admin (sección 4) — también copiable casi
      entero.
- [ ] Decidir el modelo de dominio de vóley antes de programar, aplicando 3.4 y 3.5:
  - `Player`, `Match`, `MatchParticipant` (con `team`, y position si aplica).
  - ¿Se trackea punto por punto (quién anotó, tipo de punto: ataque/saque/bloqueo/error rival) o
    solo el marcador por set? Si es lo primero, un `Point` (equivalente a `Goal`) por jugador.
  - Sets: normalmente hace falta una entidad `Set` (o `MatchSet`) con `setNumber`, `homePoints`,
    `awayPoints`, `winner` — el "resultado" del partido en vóley es *cuántos sets ganó cada uto*,
    no un marcador único, así que el diseño de 3.5 se repite **una vez por set** en vez de una vez
    por partido.
- [ ] `synchronize: false` desde el día 1 + primera migración generada contra una DB vacía apenas
      esté el modelo inicial (no esperar a acumular deuda como acá).
- [ ] `ValidationPipe` global igual que en 5.
- [ ] Los mismos dos niveles de documentación de la sección 8, actualizados desde el primer
      endpoint.

## 10. Comandos de referencia (idénticos entre proyectos de este stack)

```bash
npm run start:dev                 # levantar en dev
npm run build                     # compilar (chequeo de tipos real)
npm run lint                      # eslint --fix
npm run migration:generate -- src/migrations/Nombre
npm run migration:run
npm run migration:run:prod        # contra el build de dist/
```
