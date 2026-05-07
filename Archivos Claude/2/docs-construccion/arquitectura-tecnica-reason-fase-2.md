# ARQUITECTURA TÉCNICA — REASON FASE 2
## Movement Dashboard

> Documento de referencia técnica para construir la Fase 2 de Reason. Continúa directamente desde la Fase 1.5 ya deployada.
>
> **Cómo usar este documento:** Antigravity puede leer este documento entero como contexto de la fase. Las decisiones de producto están cerradas — no requieren confirmación antes de construir. Avanzar en orden de sprints es recomendado, pero si en un sprint se puede adelantar el siguiente sin romper nada, hacerlo.
>
> **Stack confirmado (sin cambios):** Next.js + Supabase + Vercel. No se agrega ninguna tecnología nueva en esta fase. La IA conversacional está explícitamente fuera del scope de esta fase.

---

## CONTEXTO: QUÉ EXISTE HOY

Al iniciar esta fase, el sistema tiene:
- MVP completo (Fase 1): landing, auth, CMS, biblioteca de contenidos, pagos
- Recursos completos (Fase 1.5): cuestionarios validados, calculadora 1RM, banderas rojas, Ficha Kinésica exportable a PDF
- +20 contenidos publicados
- Beta cerrada en curso

Lo que se construye en esta fase:
- Base de datos unificada de ejercicios (Matriz + Build fusionados)
- Movement Dashboard: herramienta web nativa de planificación de ejercicio
- Modo Paciente: acceso restringido para que el paciente vea su plan

---

## VISIÓN C+ (SE MANTIENE IGUAL QUE FASE 1.5)

**Reason no almacena datos del paciente identificables.** En el Movement Dashboard esto significa:

- Los planes de ejercicio se generan en sesión y se exportan
- El "Modo Paciente" funciona con un link de acceso temporal, sin cuenta del paciente en el sistema
- Reason no retiene planes asociados a nombres de pacientes

---

## SECCIÓN 1 — PREPARACIÓN: UNIFICACIÓN DE LA BASE DE EJERCICIOS

Antes de construir el Dashboard, hay que tener la base de ejercicios lista en Supabase. Este es el Sprint 0 — sin esto no se puede construir nada de lo que sigue.

### Fuentes de datos

**Fuente A — Matriz de ejercicios** (`Matri_z_de_ejercicios.xlsx`)
La fuente de verdad con clasificación completa. 1.471 ejercicios distribuidos en 8 hojas:

| Hoja | Ejercicios | Categoría en el sistema |
|---|---|---|
| Lower Body | 548 | `lower_body` |
| Upper Body | 310 | `upper_body` |
| Trunk & Core | 136 | `trunk_core` |
| Jump | 237 | `jump` |
| Speed | 91 | `speed` |
| Mobility & Stretch | 74 | `mobility_stretch` |
| Conditioning | 26 | `conditioning` |
| Testing | 49 | `testing` |

Columnas disponibles por ejercicio (varían levemente por hoja):
- `name`: nombre del ejercicio
- `link`: URL de YouTube
- `type`: Grinding / Ballistic / Land / Warm Up / etc.
- `equipment`: BB, KB, DB, BW, Sled, etc.
- `pattern`: Squat-Double Leg, Push-Horizontal, etc. (donde aplica)
- `contraction`: Dynamic, Isometric, etc. (donde aplica)
- `body_part`: Lower Body, Upper Body, Core, etc.

**Fuente B — Planilla Build** (`_HACER_COPIAAA__Build_-_Planilla.xlsx`, hoja EJERCICIOS)
426 ejercicios de rehabilitación y movilidad, principalmente en español, sin categorización formal.
Columnas disponibles: `name`, `link` únicamente.
Categoría en el sistema: `adjuntos`

### Script de unificación (para Antigravity)

Antigravity debe escribir y ejecutar un script Python que:

1. Lee todas las hojas de la Matriz y las normaliza a un esquema común
2. Lee la hoja EJERCICIOS de la planilla Build
3. Deduplica por nombre de ejercicio (case-insensitive, ignorando espacios extra)
4. Exporta un CSV unificado con el esquema de la tabla `exercises` de Supabase
5. Reporta: total de ejercicios, cuántos venían de cada fuente, cuántos duplicados se eliminaron

**Esquema de salida del CSV:**

| Campo | Tipo | Origen |
|---|---|---|
| `name` | text | Nombre del ejercicio |
| `youtube_url` | text | URL del video |
| `category` | text | lower_body / upper_body / trunk_core / jump / speed / mobility_stretch / conditioning / testing / adjuntos |
| `equipment` | text | BB, KB, DB, BW, Sled, Machine, etc. (null para Adjuntos) |
| `pattern` | text | Squat-Double Leg, Push-Horizontal, etc. (null donde no aplica) |
| `contraction_type` | text | Dynamic, Isometric, Eccentric, etc. (null donde no aplica) |
| `exercise_type` | text | Grinding, Ballistic, Land, Warm Up, etc. (null para Adjuntos) |

### Tabla en Supabase: `exercises`

| Campo | Tipo | Descripción |
|---|---|---|
| `id` | uuid | Identificador único, generado por Supabase |
| `name` | text | Nombre del ejercicio |
| `youtube_url` | text | URL del video de YouTube |
| `category` | enum | lower_body, upper_body, trunk_core, jump, speed, mobility_stretch, conditioning, testing, adjuntos |
| `equipment` | text | Equipamiento principal (nullable) |
| `pattern` | text | Patrón de movimiento (nullable) |
| `contraction_type` | text | Tipo de contracción (nullable) |
| `exercise_type` | text | Tipo de ejercicio: grinding, ballistic, etc. (nullable) |
| `created_at` | timestamp | Fecha de creación |

### RLS para `exercises`
- Lectura permitida para cualquier usuario con `role = subscriber` o `role = admin`
- Escritura solo para `admin`
- Sin acceso para usuarios `free` (los ejercicios son parte del contenido de suscripción)

---

## SECCIÓN 2 — NUEVAS PÁGINAS Y RUTAS

### Páginas de suscriptor nuevas

| Ruta | Descripción |
|---|---|
| `/dashboard/ejercicios` | Movement Dashboard: biblioteca + planificador |
| `/dashboard/ejercicios/biblioteca` | Explorador de ejercicios con filtros y buscador |
| `/dashboard/ejercicios/plan` | Planificador de sesiones (4 sesiones × 4 semanas) |
| `/dashboard/ejercicios/plan/[id]` | Plan guardado específico |

### Páginas públicas nuevas (sin login)

| Ruta | Descripción |
|---|---|
| `/plan/[token]` | Modo Paciente: vista del plan compartido vía link |

### Nota sobre navegación
"Ejercicios" o "Movement" se agrega al menú principal del dashboard al mismo nivel que Biblioteca, Recursos y Ficha Kinésica.

---

## SECCIÓN 3 — MOVEMENT DASHBOARD: BIBLIOTECA DE EJERCICIOS

### Página: `/dashboard/ejercicios/biblioteca`

El kinesiólogo explora y busca ejercicios antes de armar el plan. Esta página es el punto de entrada al Dashboard.

### Filtros disponibles

- **Categoría** (selector único o múltiple): Lower Body / Upper Body / Trunk & Core / Jump / Speed / Mobility & Stretch / Conditioning / Testing / Adjuntos
- **Equipamiento** (selector múltiple): BB / KB / DB / BW / Machine / Sled / TRX / Landmine / otros
- **Tipo de ejercicio** (selector múltiple): Grinding / Ballistic / Land / Warm Up / etc.
- **Buscador por nombre**: búsqueda en tiempo real mientras el kinesiólogo escribe

### Vista de cada ejercicio en la biblioteca

Cada ejercicio se muestra como una card con:
- Nombre del ejercicio
- Categoría (badge de color)
- Equipamiento (texto pequeño)
- Botón "Ver video" → abre el video de YouTube embebido en un modal (sin salir de Reason)
- Botón "Agregar al plan" → agrega el ejercicio al plan activo (ver Sección 4)

### Vista del video

Al hacer click en "Ver video", se abre un modal con:
- El video de YouTube embebido (`youtube-nocookie.com` para mayor privacidad)
- Nombre del ejercicio
- Botón de cerrar (X y tecla Escape)
- El modal es grande: 80% del viewport en desktop, fullscreen en mobile

---

## SECCIÓN 4 — MOVEMENT DASHBOARD: PLANIFICADOR

### Página: `/dashboard/ejercicios/plan`

El planificador es donde el kinesiólogo construye el programa de ejercicio. La estructura replica la lógica del Excel original: 4 sesiones × 4 semanas, con bloques dentro de cada sesión.

### Estructura del plan

**Un plan tiene:**
- Nombre del plan (texto libre, ej: "Plan rodilla post-quirúrgico")
- Fecha de inicio (opcional)
- Observaciones generales (texto libre, opcional)
- 4 sesiones (siempre 4, aunque el kinesiólogo puede usar solo las que necesita)

**Cada sesión tiene:**
- Nombre de la sesión (ej: "Sesión 1", editable)
- 3 bloques fijos: Movilidad / Activación / Principal
- Cada bloque puede tener N ejercicios (sin límite fijo, pero en la práctica 2-4 por bloque)

**Cada ejercicio dentro de un bloque tiene, por semana (4 semanas):**
- Repeticiones
- Series
- Carga (kg o descripción libre)
- EAV (Escala de Apreciación del Volumen, 1-10)
- RPE de sesión (Rating of Perceived Exertion, 1-10)
- Pausa (segundos o descripción libre)

### Flujo de construcción del plan

1. El kinesiólogo va a `/dashboard/ejercicios/plan` y ve el planificador vacío (o su plan en progreso si hay uno guardado)
2. Hace click en cualquier celda de ejercicio dentro de un bloque
3. Se abre un panel lateral o modal de búsqueda: buscador + filtros de la biblioteca
4. El kinesiólogo busca y selecciona un ejercicio
5. El ejercicio aparece en esa posición del plan
6. Para cada semana, completa repeticiones, series, carga, EAV, RPE, pausa
7. Repite para todos los ejercicios que necesita
8. Cuando el plan está listo: exportar a PDF o compartir con el paciente

### Persistencia del plan

A diferencia de la Ficha Kinésica (que usa localStorage), los planes **sí se guardan en Supabase**. La razón: un plan de 4 semanas se construye en múltiples sesiones de trabajo y el kinesiólogo necesita poder retomarlo.

Lo que se guarda: la estructura del plan con los ejercicios y sus variables por semana.
Lo que NO se guarda: ningún dato del paciente. El plan no tiene nombre de paciente. Es un plan del kinesiólogo, no del paciente.

### Tabla en Supabase: `exercise_plans`

| Campo | Tipo | Descripción |
|---|---|---|
| `id` | uuid | Identificador único |
| `user_id` | uuid | Kinesiólogo dueño del plan |
| `name` | text | Nombre del plan (ej: "Plan rodilla") |
| `start_date` | date | Fecha de inicio (opcional) |
| `notes` | text | Observaciones generales (opcional) |
| `plan_data` | jsonb | Toda la estructura del plan (ver abajo) |
| `share_token` | text | Token único para el Modo Paciente (nullable hasta que se comparta) |
| `share_token_expires_at` | timestamp | Cuándo expira el link del paciente (nullable) |
| `created_at` | timestamp | Fecha de creación |
| `updated_at` | timestamp | Última modificación |

### Estructura del campo `plan_data` (JSONB)

```json
{
  "sessions": [
    {
      "id": "session_1",
      "name": "Sesión 1",
      "blocks": [
        {
          "id": "movilidad",
          "name": "Movilidad",
          "exercises": [
            {
              "exercise_id": "uuid-del-ejercicio",
              "exercise_name": "BB Back Squat",
              "youtube_url": "https://youtu.be/...",
              "weeks": [
                {
                  "week": 1,
                  "reps": "10",
                  "sets": 3,
                  "load": "60kg",
                  "eav": 7,
                  "rpe": 7,
                  "rest": "90s"
                },
                { "week": 2, ... },
                { "week": 3, ... },
                { "week": 4, ... }
              ]
            }
          ]
        },
        { "id": "activacion", "name": "Activación", "exercises": [...] },
        { "id": "principal", "name": "Principal", "exercises": [...] }
      ]
    },
    { "id": "session_2", ... },
    { "id": "session_3", ... },
    { "id": "session_4", ... }
  ]
}
```

*Guardar el plan completo como JSONB simplifica enormemente la arquitectura. No hay tablas de sesiones, bloques y ejercicios separadas — todo el plan es un documento único que se lee y escribe de una vez.*

### RLS para `exercise_plans`
- Cada kinesiólogo solo puede leer, crear y editar sus propios planes
- Admin lee todos
- El Modo Paciente accede vía `share_token`, no vía autenticación de Supabase (ver Sección 5)

### Autoguardado
El plan se guarda automáticamente en Supabase cada vez que el kinesiólogo hace un cambio, con un debounce de 2 segundos (para no hacer un request por cada tecla). Un indicador pequeño en el header muestra "Guardado" o "Guardando...".

---

## SECCIÓN 5 — MODO PACIENTE

El Modo Paciente es la funcionalidad que diferencia al Movement Dashboard de una planilla de Excel. El paciente puede ver su plan desde el celular, con los videos, sin necesidad de tener cuenta en Reason.

### Flujo para el kinesiólogo

1. El plan está listo
2. Hace click en "Compartir con paciente"
3. El sistema genera un `share_token` único (UUID aleatorio) y lo guarda en `exercise_plans`
4. Se muestra el link: `reason.com.ar/plan/[token]`
5. El kinesiólogo copia el link y se lo envía al paciente por WhatsApp, email, o como prefiera
6. El link expira automáticamente a los 90 días desde su generación (`share_token_expires_at = now() + 90 days`)
7. El kinesiólogo puede revocar el link manualmente en cualquier momento antes de los 90 días

### Página: `/plan/[token]`

**Esta página es pública** — no requiere login. Cualquiera con el link puede verla.

**Lo que ve el paciente:**
- Nombre del plan (ej: "Tu plan de ejercicios")
- Las 4 sesiones con sus bloques y ejercicios
- Para cada ejercicio: nombre, video embebido (YouTube nocookie), y las variables de la semana actual (repeticiones, series, carga, pausa)
- Navegación simple entre semanas: "Semana 1 / 2 / 3 / 4"
- Diseño mobile-first: el 100% de los pacientes lo van a ver desde el celular

**Lo que NO ve el paciente:**
- EAV y RPE (son variables que usa el kinesiólogo, no el paciente)
- Ninguna referencia a Reason como plataforma de suscripción (no queremos que el paciente piense que tiene que pagar)
- Datos de otros pacientes (imposible por diseño: el token solo da acceso a ese plan específico)

**Comportamiento si el token expiró:**
Página limpia que dice "Este link de ejercicios ya no está disponible. Consultá a tu kinesiólogo para obtener uno nuevo."

**Comportamiento si el token no existe:**
404 estándar.

### Seguridad del Modo Paciente

- El `share_token` es un UUID v4 aleatorio: imposible de adivinar por fuerza bruta
- El plan compartido solo expone `plan_data`, `name` y `start_date` — ningún dato del kinesiólogo
- El kinesiólogo puede revocar el acceso en cualquier momento desde `/dashboard/ejercicios/plan/[id]` (esto setea `share_token = null`)
- Los tokens expirados se pueden limpiar con un cron job semanal (opcional, no crítico para MVP)

---

## SECCIÓN 6 — EXPORTACIÓN A PDF DEL PLAN

El kinesiólogo puede exportar el plan completo a PDF para imprimirlo o enviarlo.

**El PDF incluye:**
- Encabezado: logo de Reason + nombre del plan + fecha de inicio (si existe) + observaciones
- Una sección por sesión
- Dentro de cada sesión, una tabla por bloque
- Cada fila de la tabla: ejercicio / semana 1 (reps, series, carga, pausa) / semana 2 / semana 3 / semana 4
- Para cada ejercicio, QR code que linkea al video de YouTube (para que el paciente pueda escanearlo desde el papel)
- Pie de página: "Generado con Reason — reason.com.ar"

**Implementación técnica:**
Igual que en la Ficha Kinésica: generación en el cliente con `react-pdf` o `jsPDF`. El PDF nunca pasa por el servidor.

**El QR del video:**
Usar la librería `qrcode` (o `qrcode.react`) para generar el QR en el cliente a partir de la URL de YouTube. Sin dependencias externas de servicios de QR.

---

## SECCIÓN 7 — GESTIÓN DE PLANES (LISTADO)

### Página: `/dashboard/ejercicios/plan` (vista de listado)

Cuando el kinesiólogo entra al planificador, ve primero el listado de sus planes guardados:

- Cards con: nombre del plan, fecha de creación, última modificación, indicador si está compartido con paciente
- Botón "Nuevo plan"
- Click en un plan → va a `/dashboard/ejercicios/plan/[id]` para editarlo
- Acción "Duplicar plan" (para reusar una estructura de plan para otro paciente)
- Acción "Eliminar plan" (con confirmación)

*No hay límite de planes guardados por kinesiólogo.*

---

## SECCIÓN 8 — CAMBIOS EN NAVEGACIÓN

El menú principal del dashboard del suscriptor se actualiza:

| Ítem | Ruta | Notas |
|---|---|---|
| Inicio | `/dashboard` | Sin cambios |
| Biblioteca | `/library` | Sin cambios |
| Recursos | `/recursos` | Sin cambios |
| Ficha Kinésica | `/ficha` | Sin cambios |
| Ejercicios | `/dashboard/ejercicios` | Nuevo en esta fase |
| Mi cuenta | `/account` | Sin cambios |

El ítem "Ejercicios" en el menú puede desplegarse en dos sub-ítems si el diseño lo permite: "Biblioteca" y "Mis planes".

---

## SECCIÓN 9 — ROADMAP DE CONSTRUCCIÓN

### Sprint 0 — Unificación de la base de ejercicios (1-2 días)

*Este sprint es prerequisito de todo lo demás. No se puede construir el Dashboard sin los datos.*

- Script Python que fusiona Matriz de ejercicios + planilla Build
- Deduplicación por nombre
- Exportación a CSV con el esquema de la tabla `exercises`
- Importación del CSV a Supabase
- Verificación: total de ejercicios importados, distribución por categoría
- Creación de la tabla `exercises` en Supabase con RLS

**Resultado esperado al final del Sprint 0:** tabla `exercises` en Supabase con todos los ejercicios disponibles, accesibles vía API desde Next.js.

### Sprint 1 — Biblioteca de ejercicios (3-4 días)

- Página `/dashboard/ejercicios/biblioteca`
- Grid de ejercicios con paginación o scroll infinito
- Filtros por categoría, equipamiento, tipo
- Buscador por nombre en tiempo real
- Modal de video embebido (YouTube nocookie)
- Navegación actualizada con el nuevo ítem "Ejercicios"

### Sprint 2 — Planificador (5-7 días — el sprint más complejo)

- Tabla `exercise_plans` en Supabase con RLS
- Página de listado de planes (`/dashboard/ejercicios/plan`)
- Planificador completo: estructura 4 sesiones × 4 semanas × 3 bloques
- Panel de búsqueda de ejercicios dentro del planificador
- Campos editables por ejercicio y por semana (reps, series, carga, EAV, RPE, pausa)
- Autoguardado con debounce e indicador de estado
- Acciones: duplicar plan, eliminar plan

### Sprint 3 — Modo Paciente (2-3 días)

- Generación de `share_token` y link compartible
- Página pública `/plan/[token]` con diseño mobile-first
- Vista del plan por semana para el paciente
- Video embebido en la vista del paciente
- Manejo de tokens expirados y no existentes
- Opción de revocar acceso desde el planificador

### Sprint 4 — Exportación PDF (2-3 días)

- PDF del plan completo con tabla de 4 semanas
- QR codes de los videos de YouTube en el PDF
- Generación en cliente (sin servidor)

### Sprint 5 — Testing y lanzamiento público (3-5 días)

- Testing completo del flujo: kinesiólogo arma plan → comparte → paciente ve el plan en el celular
- Testing de los QR codes en el PDF (que apunten a los videos correctos)
- Testing de expiración y revocación de tokens
- Ajustes basados en feedback de la beta cerrada
- **Lanzamiento público**

---

## SECCIÓN 10 — DECISIONES TÉCNICAS

**Sobre el scroll/paginación de la biblioteca:**
Con ~1.900 ejercicios, cargar todo de una vez en el cliente es inviable. Usar paginación del lado del servidor (Supabase soporta `.range()` nativamente) con scroll infinito o paginación tradicional. Recomendación: scroll infinito con páginas de 50 ejercicios.

**Sobre el JSONB del plan:**
Guardar el plan completo como un único campo JSONB es la decisión más simple y correcta para este caso. El plan no necesita ser consultado por campos individuales (nadie va a buscar "todos los planes que tienen BB Back Squat"). Se lee y escribe completo. Esto elimina la necesidad de tablas relacionales complejas para sesiones, bloques y ejercicios.

**Sobre el Modo Paciente y Supabase RLS:**
La página `/plan/[token]` no usa autenticación de Supabase. Usa una API Route de Next.js (`/api/plan/[token]`) que:
1. Recibe el token
2. Busca en `exercise_plans` donde `share_token = token` y `share_token_expires_at > now()`
3. Si existe y no expiró, devuelve los campos públicos del plan
4. Si no existe o expiró, devuelve 404

Esta API Route usa la clave de servicio de Supabase (service role key), no la clave pública. Nunca se expone la service role key al cliente.

---

## NOTAS FINALES

**Sobre la IA conversacional:**
Explícitamente fuera del scope de esta fase. Se agenda para Fase 3.

**Sobre el número de ejercicios:**
Al fusionar Matriz + Build y deduplicar, el número final de ejercicios va a estar entre 1.700 y 1.900. El script del Sprint 0 reporta el número exacto.

**Sobre los ejercicios "Adjuntos":**
Los 426 ejercicios de la planilla Build entran como categoría `adjuntos`. No tienen equipamiento, patrón ni tipo de contracción definidos — esos campos quedan en null. En la interfaz, el filtro "Adjuntos" los muestra todos juntos. En el futuro, si Kevin los quiere categorizar mejor, es una migración simple de datos.

**Sobre lo que NO se construye en esta fase:**
- IA conversacional (Fase 3)
- Historial de planes por paciente (no se construye nunca, decisión estratégica)
- Estadísticas de adherencia del paciente
- Notificaciones al paciente cuando el plan se actualiza
