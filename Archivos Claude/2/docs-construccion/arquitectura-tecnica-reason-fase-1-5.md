# ARQUITECTURA TÉCNICA — REASON FASE 1.5

> Documento de referencia técnica para construir la Fase 1.5 de Reason. Continúa directamente desde el MVP (Fase 1) ya deployado en https://reason-gamma.vercel.app/.
>
> **Cómo usar este documento:** Antigravity puede leer este documento entero como contexto de la fase. Las decisiones de producto están cerradas — no requieren confirmación antes de construir. Avanzar en orden de sprints es recomendado, pero si en un sprint podés adelantar el siguiente sin romper nada, hacelo.
>
> **Stack confirmado (sin cambios):** Next.js + Supabase + Vercel + Resend. No se agrega ninguna tecnología nueva en esta fase.

---

## CONTEXTO: QUÉ EXISTE HOY

Al iniciar esta fase, el sistema tiene:
- Landing pública funcionando
- Auth completo (registro, login, recuperación de contraseña)
- CMS interno para Kevin con carga de contenidos
- Biblioteca de contenidos con filtros y buscador
- Vista individual de cada contenido
- Pagos con Mercado Pago (suscripciones recurrentes)
- Row-level security implementada en Supabase
- +20 contenidos publicados

Lo que NO existe todavía y se construye en esta fase:
- Sección "Recursos" (cuestionarios, calculadoras, banderas rojas)
- Ficha Kinésica web nativa
- Página `/sobre-tus-datos`

---

## VISIÓN C+ (DECISIÓN ESTRATÉGICA QUE GOBIERNA TODA LA FASE)

**Reason no almacena datos del paciente.** Este principio define cómo se construye todo en esta fase.

La Ficha Kinésica es una herramienta de sesión: el kinesiólogo la completa durante o después de la consulta, la exporta como PDF, y Reason no retiene ningún dato identificatorio del paciente. No hay nombres, no hay historiales, no hay expedientes clínicos en la base de datos.

Lo que sí se guarda en base de datos: el estado de las herramientas del kinesiólogo (configuraciones, preferencias). Lo que no se guarda nunca: nada que identifique o caracterice a un paciente específico.

Esta decisión tiene una página editorial dedicada (`/sobre-tus-datos`) que se construye en esta fase.

---

## SECCIÓN 1 — NUEVAS PÁGINAS Y RUTAS

### Páginas públicas nuevas

| Ruta | Descripción |
|---|---|
| `/sobre-tus-datos` | Página editorial estática explicando la política de datos |

### Páginas de suscriptor nuevas

| Ruta | Descripción |
|---|---|
| `/recursos` | Hub de la sección Recursos con acceso a todas las herramientas |
| `/recursos/cuestionarios` | Listado de todos los cuestionarios disponibles |
| `/recursos/cuestionarios/[slug]` | Cuestionario individual interactivo con calculadora de interpretación |
| `/recursos/calculadoras` | Calculadora de 1RM |
| `/recursos/banderas-rojas` | Listado de checklists de banderas rojas |
| `/recursos/banderas-rojas/[slug]` | Checklist individual de banderas rojas |
| `/ficha` | Ficha Kinésica web nativa (herramienta principal de esta fase) |

### Nota sobre navegación
La sección "Recursos" y la "Ficha Kinésica" aparecen en el menú principal del dashboard del suscriptor, al mismo nivel que "Biblioteca". Son secciones hermanas, no subsecciones.

---

## SECCIÓN 2 — CAMBIOS EN BASE DE DATOS

Esta fase agrega tablas nuevas. No modifica tablas existentes.

### Tabla: `tool_sessions`
*Registro mínimo de cada vez que un kinesiólogo usa una herramienta. Solo para analytics internos de Kevin. Sin datos de pacientes.*

| Campo | Tipo | Descripción |
|---|---|---|
| `id` | uuid | Identificador único |
| `user_id` | uuid | Referencia al usuario kinesiólogo |
| `tool_type` | enum | `cuestionario`, `calculadora`, `ficha`, `bandera_roja` |
| `tool_slug` | text | Ej: `tampa`, `spadi`, `1rm` |
| `used_at` | timestamp | Cuándo se usó |

*Esta tabla no guarda ningún resultado ni dato clínico. Solo registra que el usuario X usó la herramienta Y en el momento Z. Kevin puede ver cuáles herramientas usan más sus suscriptores.*

### RLS para `tool_sessions`
- Cada usuario solo puede insertar y leer sus propias filas
- Admin lee todo

---

## SECCIÓN 3 — CUESTIONARIOS VALIDADOS

### Cuestionarios a implementar (en orden de prioridad)

| Nombre | Slug | Región | Ítems |
|---|---|---|---|
| Tampa Scale of Kinesiophobia | `tampa` | General | 17 ítems, escala Likert 1-4 |
| Pain Catastrophizing Scale | `catastrofismo` | General | 13 ítems, escala 0-4 |
| SPADI (Shoulder Pain and Disability Index) | `spadi` | Hombro | 13 ítems, EVA 0-10 |
| Roland-Morris Disability Questionnaire | `roland-morris` | Lumbar | 24 ítems, sí/no |
| NDI (Neck Disability Index) | `ndi` | Cervical | 10 ítems, escala 0-5 |
| STarT Back Screening Tool | `start-back` | Lumbar | 9 ítems, escala mixta |
| KOOS (Knee Injury and Osteoarthritis Outcome Score) — versión corta | `koos` | Rodilla | A definir con Kevin según versión preferida |

### Arquitectura de cada cuestionario

Cada cuestionario tiene tres componentes:

**1. Vista web interactiva** (`/recursos/cuestionarios/[slug]`)
- El kinesiólogo completa el cuestionario ítem por ítem directamente en la pantalla
- Diseño limpio, una pregunta bien visible a la vez o todas en scroll (a definir por cuestionario según cantidad de ítems)
- Al completar todos los ítems, el sistema calcula el score automáticamente
- Se muestra el resultado con su interpretación clínica (rangos, qué significa cada puntaje)
- Botón "Copiar resultado" (copia el score + interpretación en texto plano para pegar donde el kinesiólogo quiera)
- Botón "Exportar PDF" (genera PDF con el cuestionario completo y el resultado, sin nombre de paciente)
- Botón "Nueva sesión" (limpia todos los campos, no guarda nada)

**2. Calculadora de interpretación standalone**
- En la misma página, debajo del cuestionario interactivo, existe una calculadora simple: el kinesiólogo ingresa un score numérico (si ya lo tiene de una toma en papel) y obtiene la interpretación clínica
- Esto resuelve el caso de uso donde el paciente completó el cuestionario en papel y el kinesiólogo solo quiere saber qué significa el número

**3. PDF descargable del cuestionario en blanco**
- Versión imprimible del cuestionario para que el paciente complete en papel en sala de espera
- El PDF incluye: nombre del cuestionario, instrucciones, todos los ítems con opciones de respuesta, espacio para el score total al pie
- Sin marca de agua, sin datos, listo para imprimir
- Botón "Descargar PDF en blanco" siempre visible en la página del cuestionario

### Datos de cada cuestionario en el sistema

Los cuestionarios no se guardan en base de datos como entidades editables. Son componentes React con sus preguntas, opciones y fórmulas de scoring hardcodeadas. Esto simplifica enormemente la arquitectura: no hay tabla de cuestionarios, no hay CMS de herramientas, no hay riesgo de que Kevin edite algo y rompa el scoring validado.

Si en el futuro se necesita agregar o editar un cuestionario, se hace un cambio en el código.

### Fórmulas de scoring (referencia para Antigravity)

**Tampa Scale of Kinesiophobia**
- Ítems 1-17, escala Likert 1-4
- Ítems 4, 8, 12 y 16 se invierten (valor = 5 - valor_original)
- Score total = suma de todos los ítems (rango 17-68)
- Interpretación: < 37 = baja kinesiofobia / 37-44 = moderada / > 44 = alta

**Pain Catastrophizing Scale**
- 13 ítems, escala 0-4
- Sin inversión de ítems
- Score total = suma (rango 0-52)
- Subescalas: Rumiación (ítems 8,9,10,11), Magnificación (ítems 6,7,13), Desesperanza (ítems 1,2,3,4,5)
- Interpretación: > 30 = nivel clínicamente significativo

**SPADI**
- 13 ítems en EVA 0-10 (5 de dolor + 8 de discapacidad)
- Score dolor = (suma ítems dolor / 50) × 100
- Score discapacidad = (suma ítems discapacidad / 80) × 100
- Score total = (suma todos / 130) × 100
- Interpretación: 0-20 = mínimo / 21-40 = leve / 41-60 = moderado / 61-80 = severo / 81-100 = máximo

**Roland-Morris**
- 24 ítems sí/no (1 punto cada sí)
- Score total = cantidad de "sí" (rango 0-24)
- Interpretación: 0-8 = discapacidad leve / 9-16 = moderada / 17-24 = severa
- Cambio clínicamente significativo: ≥ 5 puntos

**NDI**
- 10 ítems, escala 0-5 cada uno
- Score total = suma (rango 0-50), también expresable en porcentaje × 2
- Interpretación: 0-4 = sin discapacidad / 5-14 = leve / 15-24 = moderada / 25-34 = severa / > 34 = completa

**STarT Back**
- 9 ítems (8 de acuerdo/desacuerdo + 1 de 5 opciones)
- Score total = suma ítems (rango 0-9)
- Subscore de malestar psicológico = ítems 5-9 (rango 0-5)
- Estratificación: Total ≤ 3 = bajo riesgo / Total > 3 y subscore ≤ 3 = riesgo medio / Total > 3 y subscore > 4 = alto riesgo

**KOOS versión corta**
- Definir ítems específicos con Kevin antes de codificar este cuestionario

---

## SECCIÓN 4 — CALCULADORA DE 1RM

### Página: `/recursos/calculadoras`

En MVP, esta sección tiene una única calculadora: 1RM. Si en el futuro se agregan más, el diseño de la página ya las contempla como grilla de cards.

### Calculadora 1RM

**Inputs del kinesiólogo:**
- Peso levantado (kg)
- Repeticiones realizadas (número entre 1 y 30)

**Fórmulas a calcular y mostrar (las tres juntas):**

| Fórmula | Ecuación |
|---|---|
| Brzycki | Peso × (36 / (37 - reps)) |
| Epley | Peso × (1 + 0.0333 × reps) |
| Lander | (100 × Peso) / (101.3 - 2.67123 × reps) |

*Se muestran las tres porque cada fórmula tiene distinto comportamiento según el rango de repeticiones. El kinesiólogo elige cuál usar según su criterio.*

**Output adicional — Tabla de porcentajes:**
Debajo del resultado, una tabla automática con los pesos correspondientes al 50%, 55%, 60%, 65%, 70%, 75%, 80%, 85%, 90%, 95% del 1RM calculado (basado en la fórmula de Brzycki como referencia). Esto es lo más útil en la práctica: "si tu 1RM es X, al 70% deberías usar Y kg".

**Comportamiento:**
- Cálculo en tiempo real mientras el kinesiólogo escribe (sin botón de enviar)
- Si reps = 1, el 1RM = el peso ingresado (no se aplica fórmula)
- Botón "Copiar resultados" que copia el 1RM y la tabla en texto plano

---

## SECCIÓN 5 — BANDERAS ROJAS (CONTENIDO DE REFERENCIA)

### Decisión de diseño

Las banderas rojas no son algoritmos interactivos. Son checklists visuales de referencia clínica que el kinesiólogo consulta y aplica con su criterio. Esta decisión evita que el sistema emita juicios clínicos automáticos, lo cual tiene implicancias legales y clínicas.

### Checklists a implementar (3 para MVP)

| Nombre | Slug | Descripción |
|---|---|---|
| Banderas rojas en dolor lumbar | `banderas-rojas-lumbar` | Señales de alarma que sugieren patología seria en columna lumbar |
| Banderas rojas en dolor cervical | `banderas-rojas-cervical` | Señales de alarma en columna cervical, incluyendo compromiso vascular |
| Banderas rojas generales en dolor musculoesquelético | `banderas-rojas-general` | Señales de alarma sistémicas aplicables a cualquier región |

### Estructura de cada checklist

- Título y descripción clínica breve (qué son las banderas rojas, cuándo aplicar este checklist)
- Lista visual de señales de alarma, agrupadas por categoría cuando aplica
- Nota clínica al pie: "La presencia de una o más de estas señales no confirma patología grave. Indica derivación o evaluación adicional."
- Botón "Descargar PDF" (versión imprimible del checklist para tener en consulta)
- Sin interactividad de checkboxes: es referencia, no formulario. El kinesiólogo marca mentalmente o en papel.

### Datos en el sistema

Igual que los cuestionarios: hardcodeados en componentes React. No hay tabla de banderas rojas en base de datos.

---

## SECCIÓN 6 — FICHA KINÉSICA WEB NATIVA

La Ficha Kinésica es la herramienta central de esta fase. Es el contenedor donde viven los cuestionarios y desde donde se accede a las calculadoras.

### Principio de diseño

**Una ficha = una sesión inicial de evaluación.** No hay historial de pacientes. No hay nombre del paciente. El kinesiólogo abre la ficha, completa lo que necesita, exporta el PDF, y la ficha se limpia.

El estado de la ficha vive en el navegador (estado React local). Nada se envía al servidor mientras el kinesiólogo trabaja. Solo al exportar se genera el PDF en el cliente.

### Secciones de la Ficha Kinésica

La ficha tiene 4 secciones navegables desde un menú lateral o tabs en la parte superior:

---

**SECCIÓN A — Datos de la sesión** *(no del paciente)*

Campos opcionales que contextualizan la sesión:
- Fecha (autocompletada con la fecha de hoy, editable)
- Motivo de consulta (textarea libre, máx. 200 caracteres)
- Diagnóstico presuntivo (input texto libre)
- Región anatómica principal (selector: cervical, hombro, codo, muñeca/mano, lumbar, cadera, rodilla, tobillo/pie, múltiple)
- Tiempo de evolución (selector: agudo < 6 semanas / subagudo 6-12 semanas / crónico > 12 semanas)

*Ninguno de estos campos es obligatorio. La ficha funciona aunque todos estén vacíos.*

---

**SECCIÓN B — Interrogatorio**

Campos de texto libre organizados por bloques clínicos:

- Localización del síntoma (texto + posibilidad de marcar en diagrama corporal simple — ver nota técnica abajo)
- Características del dolor: intensidad EVA (slider 0-10 con etiquetas), tipo (selector: sordo, punzante, quemante, eléctrico, presión, otro), comportamiento (selector: constante, intermitente, mecánico, inflamatorio)
- Factores que agravan (textarea libre)
- Factores que alivian (textarea libre)
- Síntomas asociados (textarea libre)
- Antecedentes relevantes (textarea libre)
- Medicación actual (textarea libre)
- Expectativas del paciente (textarea libre)

**Nota técnica — Diagrama corporal:**
Implementar como SVG simple (silueta humana anterior y posterior) donde el kinesiólogo puede hacer click para marcar zonas. Cada zona marcada se colorea. En el PDF exportado, el diagrama se incluye con las zonas marcadas. Si esto agrega complejidad desproporcionada al sprint, se deja para Fase 1.7 y se reemplaza por un campo de texto: "Descripción de localización".

---

**SECCIÓN C — Evaluación física**

Subsecciones colapsables (se despliegan con click):

*Postura y observación*
- Texto libre + campo para observaciones

*Rango de movimiento*
- Tabla editable con los movimientos principales según la región seleccionada en Sección A
- Si no se seleccionó región, se muestra columna vertebral completa + miembros como template genérico
- Columnas: Movimiento / Activo (grados) / Pasivo (grados) / Observaciones
- El kinesiólogo completa lo que es relevante para ese paciente

*Tests especiales*
- Lista de tests relevantes según región (hardcodeados por región)
- Para cada test: nombre del test, resultado (selector: positivo / negativo / no realizado), observaciones (texto libre)
- Si la región no está seleccionada, se muestra lista genérica reducida

*Palpación*
- Texto libre

*Evaluación neurológica* (colapsable, no siempre relevante)
- Sensibilidad (selector: normal / alterada) + observaciones
- Fuerza muscular (campo para registrar por grupos musculares)
- Reflejos (selector: normal / aumentado / disminuido / ausente por nivel)

---

**SECCIÓN D — Cuestionarios aplicados**

Esta sección conecta la ficha con los cuestionarios de la Sección 3.

- Lista de los cuestionarios disponibles (Tampa, Catastrofismo, SPADI, Roland-Morris, NDI, STarT Back, KOOS)
- Para cada cuestionario: botón "Aplicar" que abre el cuestionario en un modal o panel lateral
- El kinesiólogo completa el cuestionario, obtiene el score
- Al guardar desde el modal, el score y la interpretación quedan registrados en esta sección de la ficha
- El kinesiólogo puede aplicar cualquier combinación de cuestionarios que sea clínicamente relevante para ese paciente
- Los cuestionarios aplicados se muestran como cards en la sección con: nombre del cuestionario / score / interpretación / fecha y hora de aplicación

*Este es el punto de integración clave entre la Ficha y los Cuestionarios. El flujo es: Ficha → abre cuestionario → completa → score vuelve a la Ficha.*

---

### Exportación a PDF

Botón "Exportar Ficha" visible en todo momento (esquina superior derecha o al pie de cada sección).

**El PDF incluye:**
- Encabezado: logo de Reason + "Ficha Kinésica de Evaluación Inicial" + fecha
- Sección A completa (datos de sesión completados)
- Sección B completa (interrogatorio)
- Sección C completa (evaluación física con las tablas)
- Sección D: para cada cuestionario aplicado, muestra nombre / score / interpretación
- Pie de página: "Documento generado con Reason — reason.com.ar"

**El PDF NO incluye:**
- Nombre del paciente (no existe en el sistema)
- Datos del kinesiólogo (no es necesario para el documento clínico)

**Implementación técnica del PDF:**
Usar `react-pdf` o `jsPDF` en el cliente. El PDF se genera en el navegador del usuario sin pasar por el servidor. Esto garantiza que los datos nunca se transmiten.

*Decisión técnica a confirmar con Antigravity: `react-pdf` (más control sobre el layout) vs `jsPDF` (más simple de implementar). Recomendación: `react-pdf` si el layout del PDF necesita ser fiel al diseño de Reason; `jsPDF` si la prioridad es velocidad de implementación.*

---

### Persistencia de la ficha durante la sesión

El estado de la ficha se guarda automáticamente en `localStorage` del navegador cada vez que el kinesiólogo escribe algo. Esto evita pérdida de datos si el navegador se cierra accidentalmente.

Al abrir `/ficha`, si existe una sesión guardada en `localStorage`, se muestra un aviso: "Tenés una ficha en progreso del [fecha]. ¿Querés continuar o empezar una nueva?"

Cuando el kinesiólogo exporta el PDF o clickea "Nueva ficha", el `localStorage` se limpia.

**Importante:** `localStorage` es local al dispositivo y al navegador. Si el kinesiólogo cambia de computadora, no recupera la ficha. Esto está alineado con la Visión C+: los datos nunca salen del dispositivo del kinesiólogo a menos que él los exporte.

---

## SECCIÓN 7 — PÁGINA `/sobre-tus-datos`

Página pública estática (sin login requerido). El texto del contenido ya está redactado y disponible en el archivo `pieza-editorial-sobre-tus-datos.md`. Antigravity solo necesita renderizarlo con el sistema visual de Reason (tipografía Geist, paleta de colores existente).

La página tiene:
- El texto editorial completo
- Link en el footer del sitio (visible en todas las páginas)
- Link en la página de `/account` del suscriptor

No requiere ningún componente interactivo.

---

## SECCIÓN 8 — NAVEGACIÓN Y MENÚ PRINCIPAL

El dashboard del suscriptor actualiza su menú principal para incluir las secciones nuevas:

| Ítem | Ruta | Ícono sugerido |
|---|---|---|
| Inicio | `/dashboard` | Home |
| Biblioteca | `/library` | Libro / Colección |
| Recursos | `/recursos` | Herramientas / Caja de herramientas |
| Ficha Kinésica | `/ficha` | Formulario / Clipboard |
| Mi cuenta | `/account` | Usuario |

El menú de usuario (avatar o nombre en esquina superior) colapsa en un desplegable con: Mi cuenta / Gestionar suscripción / Cerrar sesión. Este es uno de los fixes de UI pendientes de la Fase 1 y se implementa en este sprint junto con el resto de la navegación.

---

## SECCIÓN 9 — FIXES DE UI PENDIENTES DE FASE 1

Estos fixes de UI que vienen de Fase 1 se resuelven en el Sprint 1 de esta fase, antes de construir funcionalidad nueva. Son cambios puntuales, no refactors.

1. **Menú de usuario:** reemplazar los botones individuales de "Cerrar sesión", "Mi cuenta", "Biblioteca" por un menú desplegable. El trigger es el avatar o nombre del usuario en el header.

2. **Modo claro eliminado:** se elimina el toggle de modo oscuro y el sistema queda en modo oscuro definitivo. El problema actual es que los SVG embebidos en los contenidos no se comportan correctamente en modo oscuro porque sus colores son heredados del tema. La corrección es que todos los SVG tengan colores explícitos hardcodeados (no variables CSS heredadas), optimizados para fondo oscuro. Una vez corregidos los SVG, el modo oscuro funciona sin excepciones.

3. **SVG en contenidos — superposición de texto y líneas:** revisar los SVG generados y aplicar correcciones de layout. Los problemas reportados son: texto superpuesto sobre líneas, texto que se sale de los contenedores, líneas de tablas que se cruzan. La corrección es en el renderizado: asegurarse de que el SVG tenga `viewBox` correcto, `overflow: visible` donde corresponda, y que los textos tengan suficiente espacio horizontal.

4. **Colores en tablas SVG:** unificar criterio de color. Los recuadros terracota (`#C25A2C`) y rosados aparecen en posiciones aleatorias. La regla debe ser: terracota solo para encabezados de tabla y elementos de énfasis primario; el resto del cuadro en el color neutro correspondiente al modo actual. Sin variaciones aleatorias de color dentro de un mismo elemento.

5. **Vista fullscreen de SVG:** agregar la posibilidad de hacer click en cualquier SVG para verlo en pantalla completa (modal con el SVG escalado al máximo del viewport). El SVG en pantalla completa debe tener un botón de cerrar visible y cerrarse también con Escape.

6. **Palabra "lumbar" en la landing:** agregar "lumbar" donde corresponde según la edición pendiente del copy de la landing. *Confirmar con Kevin exactamente dónde va antes de implementar.*

---

## SECCIÓN 10 — ROADMAP DE CONSTRUCCIÓN

### Sprint 1 — Fixes de UI + Navegación actualizada (2-3 días)
- Fixes 1 al 5 de la Sección 9
- Menú principal actualizado con los nuevos ítems (Recursos, Ficha Kinésica)
- Páginas de las rutas nuevas creadas como placeholders (estructura vacía, sin contenido)
- Página `/sobre-tus-datos` con el texto final renderizado

### Sprint 2 — Cuestionarios (3-5 días)
- Hub de Recursos (`/recursos`) con cards para cada subsección
- Página `/recursos/cuestionarios` con listado de todos los cuestionarios
- Implementación de los 6 cuestionarios completos (Tampa, Catastrofismo, SPADI, Roland-Morris, NDI, STarT Back)
- Calculadora de interpretación standalone en cada cuestionario
- PDF descargable del cuestionario en blanco para cada uno
- Registro en `tool_sessions` cada vez que se usa un cuestionario

*KOOS se implementa en este sprint solo si la versión a usar está confirmada por Kevin.*

### Sprint 3 — Calculadora 1RM + Banderas Rojas (2-3 días)
- Calculadora de 1RM completa con tabla de porcentajes
- Los 3 checklists de banderas rojas con sus PDFs descargables
- Completar el hub de Recursos con todas las subsecciones funcionales

### Sprint 4 — Ficha Kinésica (5-7 días — el sprint más complejo)
- Sección A (datos de sesión)
- Sección B (interrogatorio completo, sin diagrama corporal en primera iteración)
- Sección C (evaluación física con tablas de rango de movimiento y tests)
- Sección D (integración con cuestionarios: modal de aplicación + volcado de resultados a la ficha)
- Persistencia en `localStorage` con recuperación de sesión
- Exportación a PDF completa

*El diagrama corporal interactivo (marcado de zonas en silueta SVG) se evalúa al final de este sprint. Si la ficha está funcionando correctamente y el diagrama no agrega complejidad crítica, se implementa. Si no, pasa a Fase 1.7.*

### Sprint 5 — Testing y beta cerrada (3-5 días)
- Testing exhaustivo de todos los cuestionarios (verificar que los scores y la interpretación sean correctos)
- Testing de la ficha con casos clínicos reales (Kevin completa fichas de pacientes reales y valida que el PDF sea útil)
- Correcciones basadas en el testing
- **Beta cerrada con 5-10 colegas/estudiantes/lectores del libro**
- Ajustes basados en feedback de la beta antes del lanzamiento público

---

## SECCIÓN 11 — DECISIONES TÉCNICAS ABIERTAS

Hay dos decisiones técnicas que Antigravity puede tomar al momento de implementar, según lo que encuentre más conveniente dado el código existente:

**Decisión A — Generación del PDF de la Ficha Kinésica:**
`react-pdf` si se necesita control fino sobre el layout; `jsPDF` si se prioriza velocidad. Ambas son válidas. La restricción es que la generación tiene que ser 100% en el cliente (sin pasar por el servidor).

**Decisión B — Diagrama corporal en Sección B:**
Si la implementación de la silueta SVG interactiva (click para marcar zonas) toma más de medio sprint, se reemplaza por un campo de texto libre y se agenda para Fase 1.7. La ficha es más importante que el diagrama.

---

## NOTAS FINALES

**Sobre el KOOS:** antes del Sprint 2, Kevin confirma qué versión del KOOS usar (versión corta KOOS-12 de 12 ítems, o versión KOOS-PS de 7 ítems para dolor patelofemoral). Si no hay confirmación, se implementa KOOS-12 como default.

**Sobre el copy de `/sobre-tus-datos`:** el texto está redactado y disponible en `pieza-editorial-sobre-tus-datos.md`. Antigravity no necesita generarlo, solo renderizarlo.

**Sobre la palabra "lumbar" en la landing:** confirmar con Kevin el lugar exacto antes de tocar el copy de la landing. No implementar sin confirmación.

**Sobre lo que NO se construye en esta fase:**
- Planificación de ejercicio (Fase 1.7)
- Movement Dashboard (Fase 2)
- IA conversacional (Fase 2)
- Historial de pacientes (no se construye nunca, decisión estratégica)
- Modo oscuro (indefinido)
