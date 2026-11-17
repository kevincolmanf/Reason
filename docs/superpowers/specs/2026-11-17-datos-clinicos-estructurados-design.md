# Recolección de datos clínicos estructurados

## Problema

Hoy la ficha kinésica ([FichaClient.tsx](src/app/dashboard/pacientes/[id]/ficha/FichaClient.tsx)) guarda todo en texto libre dentro de `patient_fichas.ficha_data` (jsonb), incluido el diagnóstico. Eso significa que "DHAMR", "tendinitis de supraespinoso" y "dolor de hombro por manguito rotador" quedan como tres cosas distintas, aunque sean el mismo cuadro — no hay forma de agregarlas ni compararlas. Tampoco existe ningún dato estructurado sobre hábitos (sedentarismo, tabaquismo, alcohol), comorbilidades (diabetes, hipertensión, etc.) o datos sociodemográficos (nivel socioeconómico, ocupación) — se confirmó por búsqueda en todo el repo que esto es terreno nuevo.

El disparador: Kevin quiere que Reason sirva para juntar datos propios con calidad de publicación — por ejemplo, poder dar una charla sobre dolor lumbar mostrando tanto las estadísticas internacionales como los datos reales y exactos de sus propios pacientes con esa condición, cruzados con factores de riesgo. Eso exige que el diagnóstico sea una elección de catálogo (nunca texto tipeado), y que los factores de riesgo/sociodemográficos se capturen de forma estructurada y comparable.

## Alcance

Incluye:
1. Catálogo de diagnósticos (global precargado + extensión privada por cuenta) con categoría corporal, y catálogo de ocupaciones con el mismo patrón.
2. Perfil clínico del paciente: hábitos, comorbilidades, antropometría, nivel socioeconómico y ocupación — estructurado, no texto libre.
3. Estructurar el diagnóstico y los datos propios del episodio (mecanismo de lesión, lateralidad) en cada ficha.
4. Pantalla de reportes/estadísticas básica dentro de Reason, filtrando por diagnóstico/categoría y período, cruzado contra los factores de riesgo.

Fuera de alcance (decidido explícitamente):
- Compartir o cruzar el catálogo o las estadísticas entre distintas cuentas/clínicas — cada cuenta ve solo lo suyo, sin excepción. El catálogo global precargado es de solo lectura para todos, pero las extensiones que agregue cada cuenta son privadas.
- Exportación de datos crudos o agregados (CSV/Excel) — los reportes solo muestran agregados (conteos/porcentajes) dentro de la app, nunca fila por fila.
- Migración automática de los diagnósticos en texto libre ya cargados en fichas viejas — no es confiable mapear texto libre a catálogo sin intervención humana.
- Actualizar o tocar el editor viejo en `fichas/[fichaId]/PatientFichaEditor.tsx` — confirmado que no está en uso (no está enlazado desde `PacienteDetail.tsx`); se deja tal como está.
- Deep hierarchy de diagnósticos (sub-categorías dentro de categorías, árboles de varios niveles) — alcanza con un solo nivel de categoría corporal por diagnóstico.

## Diseño

### 1. Catálogos (diagnósticos, ocupaciones, categoría corporal)

**Categoría corporal** — catálogo fijo y chico, mantenido por el equipo de Reason, no editable por cuentas:

```
body_region_catalog
  id, nombre   -- Columna cervical, Columna dorsal, Columna lumbar, Hombro,
               -- Codo, Muñeca/Mano, Cadera, Rodilla, Tobillo/Pie, Otro
```

**Diagnósticos** — dos tablas con la misma forma, una global (de solo lectura para todas las cuentas) y una privada por cuenta:

```
diagnosis_catalog            -- precargado y mantenido por el equipo de Reason
  id, codigo_cie10 (nullable), nombre, body_region_id (FK), activo (bool)

diagnosis_catalog_custom     -- lo que agrega cada cuenta cuando no encuentra algo
  id, user_id (dueño de cuenta/equipo), codigo_cie10 (nullable),
  nombre, body_region_id (FK)
```

**Ocupaciones** — mismo patrón, sin categoría corporal:

```
occupation_catalog
  id, nombre, nivel_esfuerzo ('sedentaria' | 'de_pie' | 'esfuerzo_fisico'), activo (bool)

occupation_catalog_custom
  id, user_id, nombre, nivel_esfuerzo
```

**Regla dura:** la UI nunca guarda un string suelto como diagnóstico u ocupación. El selector busca en la tabla global + la `_custom` del usuario logueado a la vez; si no hay match, ofrece "+ Crear '<texto>'" como última opción de la lista, que inserta en la tabla `_custom` del usuario y la deja seleccionada. No existe un campo de texto libre que reemplace esta elección.

**Por qué dos tablas en vez de un flag `is_global`/`owner_id` en una sola:** separar global de custom evita que un RLS mal escrito filtre o mezcle entradas de otra cuenta por accidente, y deja clarísimo en el código de dónde viene cada fila sin tener que leer una condición. El costo es un `UNION` al buscar, que es liviano y poco frecuente.

### 2. Perfil clínico del paciente (vive mientras el paciente exista, no por consulta)

```
patient_clinical_profile
  patient_id (FK, único — una fila por paciente)
  sexo ('masculino' | 'femenino' | 'otro', nullable)
  nivel_actividad_fisica ('sedentario' | 'activo' | 'muy_activo', nullable)
  tabaquismo ('no_fuma' | 'fuma' | 'ex_fumador', nullable)
  consumo_alcohol ('no' | 'ocasional' | 'habitual', nullable)
  diabetes bool, hipertension bool, obesidad bool,
  enf_cardiovascular bool, osteoporosis bool, cirugia_previa bool
  peso_kg numeric (nullable), talla_cm numeric (nullable)   -- IMC se calcula al vuelo
  nivel_socioeconomico ('bajo' | 'medio' | 'alto', nullable)
  occupation_id (FK a occupation_catalog o _custom, nullable)
  updated_at
```

Todo nullable: nada de esto es obligatorio para guardar una ficha, y conviven pacientes completos con pacientes sin ningún dato cargado todavía. `null` en una comorbilidad significa "no se preguntó", distinto de `false` ("se preguntó, no la tiene") — esa distinción importa para no contar "no preguntado" como "no tiene" en los reportes.

### 3. Datos del episodio (en `patient_fichas`, que ya existe)

```
patient_fichas +=
  diagnosis_id (FK a diagnosis_catalog o diagnosis_catalog_custom, nullable)
  mecanismo_lesion ('traumatico' | 'sobreuso' | 'degenerativo', nullable)
  lateralidad ('derecha' | 'izquierda' | 'bilateral' | 'no_aplica', nullable)
```

El campo `diagnostico` (texto libre) que ya existe en `ficha_data` se mantiene, pero cambia de rol: pasa a ser una aclaración clínica opcional (ej. "Lasègue positivo, compresión radicular L5 probable"), ya no es el diagnóstico en sí — eso ahora lo define `diagnosis_id`, estructurado.

**Por qué separado del perfil del paciente:** el diagnóstico, el mecanismo de lesión y la lateralidad describen el episodio de hoy, no al paciente en general — si vuelve en un año con otra lesión distinta, necesita poder quedar registrado como un diagnóstico distinto sin pisar ni duplicar el anterior. El perfil (hábitos, comorbilidades) en cambio es relativamente estable y no tiene sentido re-tipear en cada ficha.

### 4. UI en la ficha

**Perfil clínico del paciente** — panel colapsable al principio de la ficha, antes de "1. Motivo de Consulta", rotulado *"Perfil del paciente — no cambia por consulta"*:
- Colapsado por defecto cuando ya está completo, mostrando un resumen de una línea en chips (`Masculino · 34 años · Sedentario · Fumador · Diabetes`).
- Expandido por defecto cuando está vacío, con una invitación suave ("Completar una vez, ayuda a las estadísticas") — nunca bloqueante.
- Controles: selects para actividad física / tabaquismo / alcohol / nivel socioeconómico; comorbilidades como pills clickeables (toggle visual, no checkboxes tradicionales); dos inputs numéricos chicos para peso/talla con el IMC calculado al lado en gris; combobox con autocompletar para ocupación.
- Autoguardado con el mismo patrón de debounce que ya usa la ficha, pero escribiendo en `patient_clinical_profile`, no en `ficha_data`.

**Diagnóstico del episodio** — reemplaza la sección actual "5. Evaluación y Diagnóstico Kinésico":
- Combobox buscable (nombre + código CIE-10 tenue al lado de cada opción) para `diagnosis_id`, con "+ Crear diagnóstico '<texto>'" como opción final si no hay match.
- Dos selects chicos al lado: Mecanismo de lesión, Lateralidad.
- Debajo, el textarea libre que ya existía, achicado, con placeholder "Detalle clínico adicional (opcional)".

### 5. Pantalla de reportes (`/dashboard/estadisticas`)

- **Filtro primario:** categoría corporal o diagnóstico puntual dentro de esa categoría (mismo combobox de la ficha).
- **Filtro de período:** presets fijos — 1 mes, 3 meses, 6 meses, 1 año, 2 años, 5 años, todo.
- **Resultado:** cantidad de casos que matchean el filtro, y debajo el cruce contra cada factor: nivel de actividad física, tabaquismo, alcohol, cada comorbilidad, nivel socioeconómico, rango de edad, sexo, nivel de esfuerzo ocupacional, mecanismo de lesión, lateralidad. Formato simple (barras de porcentaje o lista de números), sin gráficos pesados.
- **Aviso de muestra chica:** si el filtro elegido trae menos de ~5-10 casos, se muestra una advertencia ("Muestra chica — no representativa") para que no se use sin ese contexto en una presentación.
- **Acceso:** plan individual ve el agregado de sus propios pacientes. Plan Equipo/Pro: solo el dueño de la cuenta ve el agregado de todo el equipo — el resto de los integrantes no tiene acceso a esta pantalla.
- Nunca se expone una lista de pacientes ni datos fila por fila — todo lo que se muestra es agregado.

### 6. Fichas viejas y fecha de corte

Las fichas ya cargadas con `diagnostico` en texto libre quedan tal cual, sin migración automática. En los reportes simplemente no matchean ningún filtro de diagnóstico estructurado (porque `diagnosis_id` es `null`) — no hace falta ningún flag ni lógica especial para "separarlas", el `null` ya las deja afuera de las estadísticas por diseño. Si un kinesiólogo abre una ficha vieja y quiere, puede elegir el diagnóstico equivalente del catálogo en ese momento — es una oportunidad, no un paso obligatorio.

El objetivo de calendario es tener esto en producción con margen antes de que termine 2026, para que quien lo use a partir de 2027 ya tenga datos estructurados desde el primer paciente nuevo que carga.

### 7. Contenido inicial de los catálogos

Antes de poder usar esto, el catálogo global necesita contenido real:
- `diagnosis_catalog`: ~150-250 diagnósticos frecuentes en kinesiología/fisioterapia, repartidos en las categorías de `body_region_catalog`, con código CIE-10 cuando exista uno claro y específico (muchos cuadros kinésicos no tienen un código CIE-10 limpio 1:1 — en esos casos el campo queda `null`, no se fuerza un código aproximado).
- `occupation_catalog`: ~40-60 ocupaciones comunes en Argentina, categorizadas por nivel de esfuerzo.

Este contenido se redacta como parte de la implementación (trabajo de investigación/curación, no solo de código) y se carga como seed/migración.

## Consideraciones técnicas

- 6 tablas nuevas (`body_region_catalog`, `diagnosis_catalog`, `diagnosis_catalog_custom`, `occupation_catalog`, `occupation_catalog_custom`, `patient_clinical_profile`) + 3 columnas nuevas en `patient_fichas`.
- RLS: los catálogos `_catalog` (sin `_custom`) son de lectura pública para cualquier usuario autenticado, sin escritura desde el cliente. Los `_custom` siguen el mismo patrón ya usado en `patient_fichas` (`auth.uid() = user_id`). `patient_clinical_profile` sigue el patrón de `patients` (acceso solo al dueño de la cuenta/equipo del paciente).
- El combobox de diagnóstico/ocupación hace una sola consulta que trae candidatos de catálogo global + custom del usuario (hasta cierto límite, con filtro por texto en servidor o cliente según volumen real del catálogo).
- La pantalla de reportes necesita queries de agregación (`GROUP BY` / `COUNT` / `COUNT FILTER`) contra `patient_fichas` + `patient_clinical_profile` + `patients`, filtradas por `user_id` (o por todos los `user_id` del equipo, si quien pide es el dueño de una cuenta Pro) y por rango de fecha derivado del preset de período elegido.
- No se toca el modelo de datos de `ficha_data` (jsonb) más allá de redefinir el rol del campo `diagnostico` existente — sigue siendo texto libre, solo cambia su etiqueta/placeholder en la UI.

## Criterio de éxito

- Cargar una ficha nueva obliga a elegir diagnóstico de una lista buscable (nunca tipear uno a mano), y el perfil del paciente se completa una sola vez y se reutiliza en consultas futuras.
- Entrar a "Estadísticas", elegir "Columna lumbar" (o un diagnóstico puntual dentro de esa categoría) y un período, y ver cuántos casos hay y qué porcentaje de ellos fuma, es sedentario, tiene diabetes, etc. — sin tocar SQL ni exportar nada.
- Dos kinesiólogos que cargan el mismo cuadro con nombres distintos ("tendinitis de supraespinoso" / "dolor de hombro por manguito rotador") terminan eligiendo la misma entrada del catálogo, no dos entradas separadas.
- Ninguna cuenta ve el catálogo custom ni las estadísticas de otra cuenta.
