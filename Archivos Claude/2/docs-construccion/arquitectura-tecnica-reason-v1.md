# ARQUITECTURA TÉCNICA — REASON MVP v1

> Documento de referencia técnica para construir el MVP de Reason. Está escrito en lenguaje accesible para que Kevin pueda revisarlo, ajustarlo y pasarlo a Antigravity como input principal de construcción.
>
> **Cómo usar este documento:** Antigravity (o cualquier asistente de codificación) puede leer este documento entero como contexto inicial del proyecto, junto con el sistema visual v1.1 y el copy de la landing. Las decisiones acá listadas son punto de partida; pueden ajustarse antes de construir.
>
> **Stack confirmado:** Next.js (frontend + backend) + Supabase (base de datos, auth, storage) + Mercado Pago (pagos) + Vercel (deploy) + Resend (emails transaccionales).

---

## SECCIÓN 1 — VISIÓN GENERAL DEL SISTEMA

Reason es una aplicación web de suscripción donde:
1. **Usuarios no registrados** ven la landing pública con preview de un contenido completo.
2. **Usuarios registrados free** pueden crear cuenta pero no acceder a la biblioteca completa.
3. **Usuarios suscriptores activos** acceden a todos los contenidos, navegan el catálogo, leen, buscan.
4. **Kevin (admin único)** carga, edita y publica contenidos desde un CMS interno.

El sistema no tiene niveles de suscripción. Solo dos estados: suscriptor activo o no. La diferenciación entre quien pagó mensual y quien pagó anual es solo administrativa, no de acceso.

---

## SECCIÓN 2 — SCHEMA DE BASE DE DATOS

Las tablas principales del sistema. Supabase usa PostgreSQL, así que estas son tablas SQL estándar.

### Tabla: `users`
*Gestionada automáticamente por Supabase Auth, pero con campos extendidos.*

| Campo | Tipo | Descripción |
|---|---|---|
| `id` | uuid | Identificador único, generado por Supabase |
| `email` | text | Email del usuario, único |
| `created_at` | timestamp | Fecha de creación |
| `full_name` | text | Nombre completo (opcional) |
| `role` | enum | `free` o `subscriber` o `admin` |
| `mp_customer_id` | text | ID del cliente en Mercado Pago (cuando se suscribe) |

### Tabla: `subscriptions`
*Una entrada por cada suscripción activa o histórica.*

| Campo | Tipo | Descripción |
|---|---|---|
| `id` | uuid | Identificador único |
| `user_id` | uuid | Referencia al usuario |
| `mp_subscription_id` | text | ID de la suscripción en Mercado Pago |
| `plan` | enum | `monthly` o `annual` |
| `status` | enum | `active`, `pending`, `cancelled`, `expired` |
| `started_at` | timestamp | Cuando comenzó |
| `expires_at` | timestamp | Cuando expira (relevante para anuales y cancelaciones) |
| `cancelled_at` | timestamp | Cuando se canceló (si aplica) |

### Tabla: `content`
*Cada pieza de contenido publicada en Reason.*

| Campo | Tipo | Descripción |
|---|---|---|
| `id` | uuid | Identificador único |
| `slug` | text | URL amigable, ej: "dolor-lumbar-inespecifico" |
| `title` | text | Título principal |
| `subtitle` | text | Subtítulo (opcional) |
| `category` | enum | `resumen_comentado`, `aplicacion_clinica`, `protocolo`, `caso_real` |
| `body_que_saber` | jsonb | Array de bullets del bloque "Qué tenés que saber" |
| `body_interpretacion` | text | Bloque "Interpretación clínica" |
| `body_aplicacion` | text | Bloque "Aplicación práctica" (si es texto) |
| `body_aplicacion_visual` | text | Código SVG embebido del bloque visual (si aplica) |
| `body_aplicacion_visual_type` | enum | `arbol`, `tabla`, `linea_tiempo`, `algoritmo`, `diagnostico_diferencial`, `esquema_anatomico`, `null` (si solo texto) |
| `body_que_evitar` | jsonb | Array de bullets del bloque "Qué evitar" |
| `body_conclusion` | text | Bloque "Conclusión accionable" |
| `metadata_region` | jsonb | Array: cervical, hombro, lumbar, etc. |
| `metadata_tema` | jsonb | Array: dolor, ejercicio terapéutico, etc. |
| `metadata_nivel` | enum | `fundamentos`, `aplicado`, `avanzado` |
| `metadata_tags` | jsonb | Array de tags libres |
| `referencia` | text | Referencia bibliográfica (opcional) |
| `tiempo_lectura_min` | integer | Calculado: palabras / 200 |
| `published` | boolean | True si está publicado, false si es borrador |
| `published_at` | timestamp | Fecha de publicación |
| `created_at` | timestamp | Fecha de creación |
| `updated_at` | timestamp | Última actualización |

### Tabla: `caso_real_extension`
*Extensión específica para contenidos tipo "caso real" que tienen estructura distinta.*

| Campo | Tipo | Descripción |
|---|---|---|
| `content_id` | uuid | Referencia al `content` |
| `body_presentacion` | text | Bloque "Presentación" |
| `body_razonamiento` | text | Bloque "Razonamiento clínico" |
| `body_decisiones` | text | Bloque "Decisiones tomadas" |
| `body_resultado` | text | Bloque "Resultado y aprendizaje" |

*Cuando `category = caso_real`, los campos estándar de `content` (interpretacion, aplicacion, etc.) quedan null y los datos van acá.*

### Tabla: `content_views` *(opcional, para analytics futuros)*

| Campo | Tipo | Descripción |
|---|---|---|
| `id` | uuid | Identificador único |
| `content_id` | uuid | Contenido visto |
| `user_id` | uuid | Usuario que vio (puede ser null si es preview público) |
| `viewed_at` | timestamp | Cuándo |

*Esta tabla la sumamos en MVP solo si querés analytics simple. Decisión pendiente.*

---

## SECCIÓN 3 — PÁGINAS Y RUTAS

Estructura completa de la aplicación.

### Páginas públicas (sin login)

| Ruta | Descripción |
|---|---|
| `/` | Landing principal (la que ya diseñamos) |
| `/login` | Formulario de login |
| `/signup` | Formulario de registro |
| `/forgot-password` | Recuperación de contraseña |
| `/preview/dolor-lumbar-inespecifico` | El contenido preview, accesible directamente por URL |
| `/terms` | Términos y condiciones |
| `/privacy` | Política de privacidad |

### Páginas de usuario suscriptor (requieren login + suscripción activa)

| Ruta | Descripción |
|---|---|
| `/dashboard` | Member zone: home con últimos contenidos, navegación principal |
| `/library` | Biblioteca completa con filtros y buscador |
| `/library?category=protocolo` | Biblioteca filtrada por categoría |
| `/library?region=lumbar` | Biblioteca filtrada por región |
| `/content/[slug]` | Vista individual de un contenido |
| `/account` | Gestión de cuenta del usuario |
| `/account/subscription` | Estado de suscripción, cancelar, renovar |

### Páginas de admin (solo Kevin)

| Ruta | Descripción |
|---|---|
| `/admin` | Panel principal del CMS |
| `/admin/content` | Lista de todos los contenidos (publicados y borradores) |
| `/admin/content/new` | Crear contenido nuevo |
| `/admin/content/[id]/edit` | Editar contenido existente |
| `/admin/users` | Lista de usuarios y suscriptores |

### Páginas de error y estado

| Ruta | Descripción |
|---|---|
| `/paywall` | Pantalla que se muestra cuando un usuario free intenta acceder a contenido pago |
| `/404` | Página no encontrada |
| `/error` | Error genérico |

---

## SECCIÓN 4 — FLUJO DE AUTENTICACIÓN

Supabase Auth maneja la autenticación nativamente. Estas son las decisiones específicas para Reason:

### Métodos de login disponibles en MVP
- **Email + contraseña**: método principal
- **Google OAuth**: opcional, recomendado para reducir fricción

*Decisión sugerida: arrancar solo con email + contraseña, sumar Google después si vemos fricción en conversión.*

### Flujo de registro
1. Usuario llega a `/signup`
2. Ingresa email, contraseña, nombre
3. Supabase crea usuario con `role = free`
4. Se envía email de bienvenida (vía Resend)
5. Redirige a `/dashboard` que muestra el paywall (porque todavía no es suscriptor)

### Flujo de login
1. Usuario llega a `/login`
2. Ingresa credenciales
3. Si todo ok, redirige según rol:
   - `subscriber` → `/dashboard`
   - `free` → `/paywall`
   - `admin` → `/admin`

### Sesiones
- Tokens JWT con duración de 7 días
- Renovación automática mientras el usuario navega
- Logout limpia tokens

### Recuperación de contraseña
- Usuario ingresa email en `/forgot-password`
- Recibe email con link único (expira en 1 hora)
- Click en link lleva a página para crear nueva contraseña
- Después de cambiar, login automático

---

## SECCIÓN 5 — FLUJO DE PAGO (LO MÁS DELICADO DEL MVP)

Esta sección es donde más cuidado hay que tener. Errores acá significan usuarios que pagaron y no acceden, o usuarios que cancelaron y siguen accediendo.

### Mercado Pago: producto a usar
**Suscripciones (preapproval)**, no pagos únicos. Esto es importante: Mercado Pago tiene un producto específico para suscripciones recurrentes que se llama "preapproval", y es el que necesitamos.

### Flujo de suscripción inicial
1. Usuario logueado clickea "Suscribirse" en la landing o en `/paywall`
2. Selecciona plan (mensual o anual)
3. Se crea un `preapproval` en Mercado Pago con los datos del plan
4. Mercado Pago redirige al usuario a su página de pago
5. Usuario completa el pago
6. Mercado Pago redirige al usuario a `/account/subscription?status=success`
7. **Webhook de Mercado Pago** notifica a Reason que el pago fue exitoso
8. Reason actualiza `users.role = subscriber` y crea entrada en `subscriptions`
9. Usuario puede acceder al catálogo

### Flujo de renovación automática
1. Mercado Pago intenta cobrar automáticamente cada mes/año según el plan
2. Si el cobro es exitoso, **webhook** notifica a Reason
3. Reason actualiza `subscriptions.expires_at`
4. Si el cobro falla:
   - Mercado Pago reintenta hasta 3 veces en los próximos días
   - Si sigue fallando, **webhook** notifica que la suscripción quedó en estado `pending`
   - Si después de un período (definido por nosotros, sugerido: 7 días) sigue sin pagarse, la suscripción pasa a `expired`
   - Reason actualiza `users.role = free`

### Flujo de cancelación
1. Usuario va a `/account/subscription` y clickea "Cancelar suscripción"
2. Sistema le muestra hasta cuándo conserva el acceso (hasta `expires_at`)
3. Si confirma, se llama a la API de Mercado Pago para cancelar el `preapproval`
4. **Webhook** confirma la cancelación
5. Reason actualiza `subscriptions.status = cancelled` y guarda `cancelled_at`
6. **Importante**: el usuario mantiene acceso hasta `expires_at`, no se le corta inmediatamente

### Webhooks de Mercado Pago
Esto es lo más crítico técnicamente. El webhook es una URL en Reason (ej: `/api/webhooks/mercadopago`) que Mercado Pago llama cada vez que pasa algo con un pago o suscripción. Eventos que tenemos que manejar:

- `subscription_authorized`: nueva suscripción confirmada
- `subscription_payment`: pago exitoso de renovación
- `subscription_payment_failed`: pago fallido
- `subscription_cancelled`: suscripción cancelada
- `subscription_paused`: suscripción pausada (no creo que la usemos, pero hay que recibirla por las dudas)

**Cada webhook debe**:
1. Verificar firma de Mercado Pago (seguridad)
2. Buscar el usuario asociado
3. Actualizar el estado correspondiente en `subscriptions` y `users.role`
4. Loggear el evento (para debugging futuro)

### Recomendación crítica: testing exhaustivo
Mercado Pago tiene **tarjetas de prueba** que permiten simular pagos exitosos, rechazados, pendientes. Antes de activar producción, hay que probar:
- Pago exitoso completo
- Pago rechazado
- Cancelación voluntaria del usuario
- Falta de pago en renovación
- Reactivación después de cancelación

Cualquier escenario no testeado va a fallar en producción y va a costar caro.

---

## SECCIÓN 6 — PERMISOS Y ROW-LEVEL SECURITY

Supabase tiene una funcionalidad llamada **Row-Level Security (RLS)** que permite definir reglas de acceso a nivel de base de datos. Esto es muy importante porque garantiza que aunque alguien manipule el frontend, no pueda acceder a contenido al que no tiene derecho.

### Reglas para tabla `content`

**Lectura completa de un contenido**:
- Permitido si el usuario tiene `role = subscriber` o `role = admin`
- Si el usuario es `free` o no está logueado, solo se pueden ver los contenidos con `slug = "dolor-lumbar-inespecifico"` (el preview público)
- Si el contenido tiene `published = false`, solo el admin lo ve

**Escritura**:
- Solo permitida si `role = admin`

**Lectura de campos parciales para preview en biblioteca**:
- Cualquier usuario logueado (incluso free) puede ver título, subtítulo, categoría, región, tema, nivel, tiempo de lectura
- El cuerpo (`body_*`) solo se entrega si es suscriptor

### Reglas para tabla `users`
- Cada usuario solo ve sus propios datos
- Admin ve todos los usuarios

### Reglas para tabla `subscriptions`
- Cada usuario solo ve sus propias suscripciones
- Admin ve todas

---

## SECCIÓN 7 — CMS INTERNO (PARA KEVIN)

El CMS es la herramienta que usa Kevin para cargar contenido. No es un editor genérico estilo WordPress: está diseñado específicamente para forzar la estructura editorial de Reason.

### Pantalla de creación de contenido (`/admin/content/new`)

**Formulario con campos exactos según la estructura editorial**:

1. Selector de categoría (resumen comentado / aplicación clínica / protocolo / caso real)
2. Si la categoría no es "caso real":
   - Título (input texto, máx. 70 caracteres, contador visible)
   - Subtítulo (input texto, opcional)
   - "Qué tenés que saber" (3-4 inputs separados, máx. 30 palabras cada uno, contador visible por bullet)
   - "Interpretación clínica" (textarea, máx. 150 palabras, contador visible)
   - "Aplicación práctica" — selector: ¿texto o visualización?
     - Si texto: textarea de máx. 150 palabras
     - Si visualización: selector del tipo (árbol/tabla/línea/etc) + campo para pegar el SVG
   - "Qué evitar" (2-3 inputs, máx. 25 palabras cada uno)
   - "Conclusión accionable" (input, máx. 30 palabras)
3. Si la categoría es "caso real":
   - Título
   - Presentación (textarea máx. 100 palabras)
   - Razonamiento clínico (textarea máx. 180 palabras)
   - Decisiones tomadas (textarea máx. 130 palabras)
   - Resultado y aprendizaje (textarea máx. 100 palabras)
4. Metadata:
   - Región anatómica (selector múltiple)
   - Tema clínico (selector múltiple)
   - Nivel (selector único)
   - Tags (input libre, máx. 5)
   - Referencia (input texto, opcional)

**Botones**:
- Guardar como borrador (`published = false`)
- Publicar ahora (`published = true`, `published_at = now()`)
- Vista previa (renderiza el contenido como lo verá el suscriptor, sin guardar)

**Validaciones críticas**:
- No deja publicar si algún bloque excede el límite de palabras
- No deja publicar si falta algún bloque obligatorio
- Genera el slug automáticamente a partir del título (editable)

### Pantalla de listado (`/admin/content`)
- Tabla con todos los contenidos
- Filtros: publicados / borradores / por categoría
- Acciones rápidas: editar, despublicar, duplicar, eliminar
- Buscador por título

### Pantalla de edición (`/admin/content/[id]/edit`)
- Mismo formulario que creación, pre-cargado con los datos
- Botones: Guardar cambios, Despublicar, Eliminar

---

## SECCIÓN 8 — DECISIONES DE PRODUCTO PENDIENTES

Acá listo las decisiones que mencioné al inicio, donde tu criterio importa más. Cada una afecta lo que vamos a construir.

### Decisión 1: ¿Cómo se renderizan las visualizaciones en el producto?

**Opción A — SVG embebido directamente en el contenido.**
Cargás el SVG como código en el campo `body_aplicacion_visual` y se renderiza directo. Ventaja: sin dependencias, peso bajo, performance ideal. Desventaja: editar visualizaciones requiere editar SVG manualmente.

**Opción B — Imágenes PNG/JPG generadas externamente.**
Subís imágenes generadas en Figma/Whimsical/Canva como archivos al storage de Supabase. Ventaja: editás en herramientas visuales conocidas. Desventaja: peso mayor, no escalable, no responsive.

**Opción C — Componentes React con datos JSON.**
Definís cada visualización como datos estructurados (ej: para un árbol, lista de nodos y conexiones) y un componente React renderiza el SVG. Ventaja: muy mantenible, escalable, se pueden tener variantes. Desventaja: más complejo de construir al inicio.

*Mi recomendación: Opción A para MVP. Es lo más simple. Si más adelante el catálogo crece y querés mantenibilidad, migrás a C.*

### Decisión 2: ¿Diferenciación visual entre las 4 categorías de contenido?

**Opción A — Todas iguales.** Mismo layout para resumen, aplicación, protocolo y caso real.

**Opción B — Diferenciación sutil.** Mismo layout pero con un acento visual chico que identifica la categoría (ej: ícono pequeño, color de borde lateral del card).

**Opción C — Layouts distintos.** Cada categoría tiene su propio layout: caso real más narrativo, protocolo más estructurado, etc.

*Mi recomendación: Opción B para MVP. Suficiente diferenciación sin complejidad de mantener 4 layouts. C la dejamos para post-lanzamiento si vemos necesidad.*

### Decisión 3: ¿El preview de la landing es siempre el mismo o rota?

**Opción A — Siempre el mismo (dolor lumbar inespecífico).**
Visitantes recurrentes ven siempre el mismo contenido. Conversión más predecible.

**Opción B — Rota entre 3-5 contenidos elegidos.**
Visitantes recurrentes ven distintos contenidos. Sensación de catálogo vivo.

*Mi recomendación: Opción A para MVP. La rotación es complejidad técnica adicional sin beneficio claro al inicio. Cuando tengas datos de conversión podemos evaluarlo.*

### Decisión 4: ¿Notificación de contenido nuevo?

**Opción A — Sin notificación.** El usuario entra a Reason y descubre los contenidos nuevos.

**Opción B — Email semanal con los contenidos nuevos.**
Un email los lunes con los contenidos que se publicaron en la semana.

**Opción C — Email inmediato cada vez que se publica un contenido.**

*Mi recomendación: Opción A para MVP. Email es complejidad adicional y muchos suscriptores prefieren no recibir mails. Si vemos baja recurrencia de uso, sumamos email semanal en versión 2.*

### Decisión 5: ¿Modo oscuro al lanzamiento?

**Opción A — Solo modo claro.** Más simple, menos testing.
**Opción B — Modo claro + oscuro.** Más profesional, más trabajo.

*Mi recomendación: Opción A para MVP. Sumamos modo oscuro en versión 2 si los suscriptores lo piden.*

### Decisión 6: ¿Buscador desde el inicio?

**Opción A — Sin buscador, solo filtros por categoría/región/tema.**
**Opción B — Buscador básico por título.**
**Opción C — Buscador full-text (busca en todo el cuerpo del contenido).**

*Mi recomendación: Opción B para MVP. Con 20-40 contenidos al inicio, el buscador full-text es overkill. Filtros + búsqueda por título alcanza. C la sumamos en Fase 2 (cuando arrime la IA conversacional).*

---

## SECCIÓN 9 — STACK Y DEPENDENCIAS RESUMIDO

| Componente | Tecnología | Costo mensual estimado |
|---|---|---|
| Frontend + backend | Next.js 14+ (App Router) | $0 |
| Hosting | Vercel (plan free) | $0 hasta cierto tráfico |
| Base de datos | Supabase (plan free) | $0 hasta ~500 usuarios activos |
| Autenticación | Supabase Auth | incluido |
| Storage de archivos | Supabase Storage | incluido |
| Pagos | Mercado Pago | comisión por transacción (~5%) |
| Emails transaccionales | Resend (plan free) | $0 hasta 3000 emails/mes |
| Dominio | reason.com.ar | ~ARS 8.000/año |

**Costo fijo mensual al lanzamiento: ~$0.**
**Primer gasto significativo: cuando superes el plan free de Supabase (~500 usuarios activos), aproximadamente USD 25/mes.**

---

## SECCIÓN 10 — ROADMAP DE CONSTRUCCIÓN SUGERIDO

Orden recomendado para construir con Antigravity, en sprints semanales.

### Sprint 1 — Fundaciones (semana 1)
- Setup del proyecto en Next.js + Supabase + Vercel
- Schema de base de datos creado
- Landing pública renderizada con el copy aprobado
- Páginas de login/signup/forgot-password funcionando (sin paywall todavía)

### Sprint 2 — CMS y contenidos (semana 2)
- Panel de admin completo
- Formulario de creación/edición de contenido con validaciones
- Carga de los primeros 5-10 contenidos como prueba
- Vista individual de contenido (`/content/[slug]`) renderizada

### Sprint 3 — Member zone (semana 3)
- Dashboard del suscriptor
- Biblioteca con filtros básicos
- Buscador por título
- Row-level security implementada

### Sprint 4 — Pagos (semana 4) — la más delicada
- Integración con Mercado Pago
- Webhooks funcionando
- Flujos de suscripción, renovación, cancelación
- Testing exhaustivo con tarjetas de prueba

### Sprint 5 — Polish y soft launch (semana 5-6)
- Pulido de microinteracciones, estados vacíos, mensajes de error
- Carga de los 20 contenidos completos
- Testing con 5-10 usuarios reales (beta cerrada)
- Ajustes basados en feedback
- Lanzamiento

---

## NOTAS FINALES

**Sobre Antigravity y este documento:**
Antigravity puede leer este documento como contexto inicial pero no va a poder construir todo de una vez. Vas a tener que pedirle pieza por pieza. Mi recomendación: cuando vayas a Antigravity, empezás pegando este documento y diciéndole "vamos a construir Reason. Empezamos por la landing pública. Generá el código de la página `/` siguiendo el copy que te paso a continuación".

**Sobre lo que falta:**
Este documento cubre el MVP. Lo que NO incluye y se deja explícitamente para después:
- IA conversacional sobre el catálogo (Fase 2)
- Pipeline de ingestión automática de PDFs (Fase 2)
- Analytics avanzados de uso
- Sistema de comunidad o foro
- Aplicación móvil nativa
- Modo oscuro
- Notificaciones push

**Sobre versionado:**
Este es **v1**. Cualquier cambio significativo bumea la versión. Las decisiones que vayas tomando durante la construcción se documentan acá para que el sistema crezca de manera ordenada.
