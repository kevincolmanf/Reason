# Historial del paciente — línea de tiempo unificada

## Problema

Hoy "lo que pasó con un paciente" vive repartido en cinco tablas que no se hablan entre sí: `scheduled_sessions` (plan detallado), `simple_activity_log` (bitácora), `patient_events` (hitos del tratamiento), `kine_attentions` (continuidad de "Atención de hoy") y `load_sessions` (carga avanzada). Cada una se construyó quando resolvía un problema puntual, y el resultado se siente como vías separadas en vez de una sola historia del paciente — el ejemplo concreto que lo disparó: cargar hitos en el calendario del plan y cargar una entrada de bitácora se sienten completamente desconectados, aunque sea el mismo tratamiento.

Un segundo problema, descubierto charlando esto: en equipos como Build, los kines **no tienen login individual** — todos entran desde una tablet con una cuenta compartida (`preoconsultabuild@...`). Eso significa que hoy, cuando Kevin, Seba o Simón registran una atención o una entrada de bitácora, el sistema guarda como autor el nombre de la cuenta compartida, no el del profesional real que estuvo con el paciente — rompe el propósito mismo de la "continuidad" (saber quién atendió antes). Las secretarías sí entran con cuenta propia, así que esto es específico del rol kine en equipos con tablet compartida.

## Alcance

Incluye:
1. Una vista unificada de solo lectura ("Historial") que mezcla las cinco fuentes por fecha, con diseño validado (mockup aprobado).
2. Corrección de atribución: para los tipos de entrada que hoy guardan el autor según la sesión logueada (`kine_attentions`, `simple_activity_log`, `patient_events`), usar en cambio el profesional asignado en el turno de agenda de ese paciente ese día, con una forma rápida de corregirlo si hubo un cambio de último momento.
3. Ampliar la barra de accesos del paciente (la que armamos en la vuelta anterior) de 4 a 7 ítems: Ficha · Atención · Plan · Hitos · Historial · Portal · RTS.

Fuera de alcance:
- Migrar datos de las cinco tablas a una tabla única — se decidió explícitamente NO hacerlo (ver "Diseño → Por qué vista y no migración").
- Tocar `load_sessions`/Monitoreo de Carga más allá de sumarlo como una fuente más del Historial.
- Resolver la atribución de `turnos` (ya tiene su propio profesional asignado, no tiene el problema) ni de `load_sessions` (se revisa en la implementación si aplica el mismo patrón).
- Rediseñar Ficha, Plan o RTS por dentro.

## Diseño

### 1. Historial — vista unificada, no migración

**Por qué vista y no migración:** cada tabla guarda campos estructurados que su función necesita (el plan necesita series/reps tipados, la carga necesita RPE/VAS numéricos para el ACWR). Migrar a una tabla única significaría perder esa estructura o esconderla en un JSON genérico, y es la operación más riesgosa posible (toca datos existentes, difícil de revertir) sin ganar nada en performance al volumen que maneja Reason. En cambio, una vista de Postgres (`patient_timeline`) que arma por `UNION ALL` una fila por evento (patient_id, fecha, tipo, resumen, autor, link) no migra nada, se arma sola, y se puede borrar sin consecuencias si no sirve.

**Para que rinda:** cada tabla fuente necesita un índice por `(patient_id, fecha)` si no lo tiene ya — ahí es donde se nota la velocidad, no en la estructura de la vista.

**Paginación:** el Historial no trae todo de una. Cada tramo viejo sin hitos relevantes se condensa ("24 turnos y 6 atenciones más — ver todo"), y existe un corte de carga por tandas para pacientes con muchas sesiones.

**Condensado de repetición:** si la bitácora trae la misma rutina de ejercicios varios días seguidos (hoy cada "Traer a hoy" copia la lista completa), el Historial lo muestra como una sola entrada condensada ("misma rutina 3 días seguidos (8 ejercicios)"), expandible para ver cada día.

**Diseño visual (mockup aprobado):** línea vertical con un punto por evento, agrupado por día, más reciente arriba. Cada entrada: tipo (etiqueta chica, color solo en Hito/Plan para no saturar), resumen de una línea, nota opcional en cursiva. Al final (scrolleando hacia atrás en el tiempo), un ancla de "Ingreso" con fecha y **diagnóstico kinésico** (pedido explícito — ayuda-memoria clave para antes de entrar a tratar).

**Atribución por entrada:** avatar chico (iniciales, 17px, anillo de color por persona) + nombre corto, mismo formato en todas las entradas sin importar quién las generó — así se siente "una" historia aunque la escriban varias personas, sin perder trazabilidad de quién hizo qué.

### 2. Atribución por turno (no por sesión logueada)

Para `kine_attentions`, `simple_activity_log` y `patient_events`: en vez de guardar como autor el `user_id`/nombre de la sesión logueada, buscar el turno de `turnos` para ese `patient_id` con fecha de hoy y usar su `professional_id`/`professional_name` como autor.

- **Si hay un turno hoy para ese paciente:** se usa su profesional asignado, sin pedir nada — cero toques nuevos.
- **Si no hay turno hoy** (paciente atendido sin turno cargado, caso excepcional) o **si hubo un cambio de último momento que la agenda no refleja:** mostrar un selector chico y discreto ("Atendiendo: Simón ▾") antes de registrar, con la lista de integrantes del equipo, pre-seleccionado con la mejor inferencia disponible (el turno si existe, o la sesión logueada si no hay turno). Un toque lo corrige; si está bien, no hace falta tocarlo.
- Esto NO aplica a secretarías (entran con cuenta propia, su atribución ya es correcta) ni a `turnos` (ya tiene profesional propio). Se revisa en la implementación si `load_sessions` tiene el mismo problema y necesita el mismo arreglo.

### 3. Barra de accesos — de 4 a 7 ítems

Orden acordado: **Ficha · Atención · Plan · Hitos · Historial · Portal · RTS**.

- "Atención" lleva al mismo bloque de "Atención de hoy" que ya vive arriba en el hub (sigue visible por defecto, achicado — ver punto siguiente) — el ítem de la barra es para volver rápido desde otra sección sin hacer scroll, no para destapar algo oculto.
- "Hitos" y "Portal" pasan de ser bloques/acciones sueltas en el hub a accesos de la barra.
- Con 7 ítems el diseño de "cápsula flotante" validado para 4 necesita revisión (probablemente agrupar o un tamaño más chico) — se resuelve en la implementación, no bloquea el resto del diseño.
- Acceso: Historial sigue las mismas reglas que Ficha/Atención de hoy (dato clínico), no las reglas más estrictas de acciones de agenda (cobrar, marcar presente) — así un kine con cuenta compartida/invitado puede verlo igual que hoy ve Ficha.

### 4. "Atención de hoy" — un paso más de achique (acordado, pendiente de construir)

Acordado en la misma conversación, todavía no implementado: el bloque colapsa después de "¿Cómo llegó hoy?" (symptom tap) — todo lo de abajo (sesión de hoy, modalidades, nota, registrar) se expande solo **al tocar Peor/Igual/Mejor**, sin un "ver más" manual separado. La hoja de agenda (`QuickAtencionSheet`) no cambia. Es independiente del resto (no depende de Historial ni de la atribución), se incluye en el mismo plan por venir de la misma conversación.

## Consideraciones técnicas

- Nueva vista SQL `patient_timeline` (UNION ALL de las 5 tablas), más índices `(patient_id, fecha)` donde falten.
- Nueva función/helper de atribución (`resolveAttributedProfessional(patientId, date)` o similar) que busca el turno del día y devuelve `{professional_id, professional_name}`, usada por los tres endpoints que hoy escriben `user_id`/nombre desde la sesión logueada.
- Nuevo componente de línea de tiempo (consume la vista, pagina, condensa repeticiones).
- Ampliar la barra de accesos existente (`PacienteDetail.tsx`) de 4 a 7 ítems.
- No se toca el modelo de datos de ninguna tabla fuente (más allá de los índices nuevos, que son aditivos).

## Criterio de éxito

- Entrar a "Historial" muestra una sola línea de tiempo legible, desde el ingreso (con diagnóstico) hasta hoy, sin traer miles de filas de una.
- Un paciente con rotación de profesionales (Kevin lunes, Seba miércoles, Simón viernes cubriendo) muestra el nombre correcto de quien lo atendió cada día, aunque todos entren desde la misma tablet.
- La barra de accesos sigue siendo un click, sin scroll, con los 7 destinos.
