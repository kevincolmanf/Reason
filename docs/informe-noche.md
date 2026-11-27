# Informe de la noche — orden de UI (27→28 nov 2026)

Rama `orden-ui-nocturno`. Todo probado en vivo contra la org QA de
prueba ("QA — equipo de prueba (no borrar)"), nunca con datos reales de
Build. Nada se mergeó a `main` — lo revisás vos mañana y confirmás.

`npx tsc --noEmit` y `npx eslint` corridos después de cada cambio:
limpios (0 errores propios; hay ruido de `tsc` en 4-5 archivos con
nombres tipo "FichaClient 2.tsx"/"3.tsx" que son copias viejas sueltas
en el disco por un conflicto de sincronización de iCloud — no los toqué,
no están en git, no son míos, ver sección 3).

---

## 1. Qué cambié, pantalla por pantalla

### Mapa completo (Paso 1)
Recorrí las ~32 pantallas del área clínica/operativa de la app (Pacientes,
Agenda, Ejercicios, Dashboard/Estándares/Estadísticas, Mi Equipo/Panel de
gestión) y dejé el detalle completo en **`docs/auditoria-ui.md`**: para
qué sirve cada una, quién la usa, cuántos controles tiene y qué
problemas de claridad encontré. Confirma que **Ficha, Atención de hoy y
Agenda** son las 3 pantallas de uso diario, como supusiste.

### Agenda — vista principal + Configurar agenda
- **Antes**: "Restablecer" en Configurar agenda borraba todas las áreas
  y duraciones configuradas con un solo click, sin avisar nada.
  **Después**: pide confirmación explícita.
- **Antes**: "Intervalo por defecto" y "duración de turno" (arriba, por
  área) eran dos nombres para el mismo concepto en la misma pantalla.
  **Después**: ambos dicen "duración".
- **Antes**: el menú "Más" decía "Ausencias"; la pantalla a la que
  lleva se titula "Seguimiento de ausencias". **Después**: el link dice
  lo mismo que el título real.
- **Antes**: los badges `C`/`A`, el punto verde (recordatorio enviado),
  el check celeste (sesión registrada) y el "$" (pago cargado) sobre
  cada turno solo se explicaban al pasar el mouse — invisible en
  tablet/celular. **Después**: hay una leyenda visible debajo de la
  grilla con los 5.
- **Después**: separador visual en el menú "Más" entre lo ocasional
  (exportar, fin de semana) y lo de uso diario (Atención de hoy,
  Recordatorios, Seguimiento de ausencias).

### Ficha Kinésica
- **Antes**: una sola página de scroll continuo de ~60-90 controles,
  sin forma de saltar a un bloque puntual (a pesar de que el propio
  código ya la divide en 4 bloques numerados). **Después**: índice
  rápido arriba con 4 anclas (Anamnesis / Interrogatorio / Examen
  físico / Plan y seguimiento).
- **Antes**: los 4 selects nuevos (Mecanismo de lesión, Lateralidad,
  Duración de síntomas, Primer episodio/Recidiva) no decían si eran
  obligatorios ni para qué servían. **Después**: una línea aclara que
  son opcionales y alimentan Estadísticas.

### Atención de hoy (ficha individual del paciente)
- **Antes**: el "×" para sacar un ejercicio de la bitácora de hoy era
  el único ícono mudo de la pantalla (sin tooltip ni aria-label).
  **Después**: tiene ambos.
- **Antes**: el bloque de bitácora, cuando está vacío, no tenía ningún
  título (a diferencia de cada otro bloque del componente). **Después**:
  dice "Bitácora de hoy — ejercicios hechos, sin dosificación".
- **Antes**: el bloque de modalidades/manejo de síntomas, una vez
  abierto, tampoco tenía título. **Después**: "Modalidades aplicadas
  hoy (opcional)".
- **Antes**: "Reevaluación" se usaba con 2 sentidos distintos en la
  misma pantalla (un link que programa algo en el plan, y un chip que
  solo anota la nota de hoy). **Después**: el chip dice "Reevaluación
  hoy" para distinguirlo del link.

### Estándares de calidad
- **Antes**: todas las áreas configuradas se mostraban siempre
  expandidas (6 controles cada una, todo el tiempo — con 3 áreas, ~22
  controles simultáneos). **Después**: cada área es un `<details>`
  colapsable (mismo patrón que ya usa Caja); se abre sola si ya tiene
  algo configurado.
- **Antes**: dos de los 3 umbrales decían "Sin verificar" si quedaban
  vacíos (= no se calcula ese indicador) y el tercero decía "21
  (default)" (= usa 21 igual) — sin explicar la diferencia.
  **Después**: una línea lo aclara.
- **Antes**: el tipo de campo "Calidad" no decía qué producía en la
  ficha real. **Después**: el selector y su tooltip dicen "Buena /
  Aceptable / Deficiente".
- **Después**: tooltip en la columna "Desconocido" de la tabla, y aviso
  de que el toggle "Función activa" también oculta la tabla de abajo.

### Mi Equipo
- **Antes**: la fila "Categoría" juntaba Profesión + Especialidad +
  Vínculo + Área principal bajo un único label genérico, sin ninguna
  separación — dos inputs de texto libre idénticos (Profesión/
  Especialidad) sin pista de qué iba en cada uno. **Después**: 2 filas
  con su propio título — "Quién es" (Profesión + Especialidad, con
  tooltips que dicen qué va en cada una) y "Para reportes" (Vínculo +
  Área principal + link al Panel de gestión).
- (De la conversación de esta tarde, ya en `main`): sugerencias de
  "Profesión" ahora incluyen roles no clínicos (Secretario/a,
  Administrativo/a), y "Especialidad"/"Área principal" quedaron
  desambiguados en su label.

### Ejercicios
- **Antes**: el Editor de Planes mezclaba 5 tipos de marcador (hito,
  RTS, dinamometría, cuestionario, evaluación programada) en la misma
  celda diminuta del calendario, sin ninguna leyenda — solo se
  entendía pasando el mouse día por día. **Después**: leyenda compacta
  arriba de la grilla con los 5 tipos y sus colores.
- **Antes**: el botón "+ Plan" en la Biblioteca no agregaba nada —
  mostraba un aviso mandando a "el Planificador de Sesiones", una
  pantalla que no existe con ese nombre en ningún lado de la app.
  **Después**: el aviso dice el camino real ("entrá al paciente y abrí
  la pestaña Plan").

### Eventos
- **Antes**: el "×" de eliminar evento borraba sin ninguna
  confirmación, a diferencia del resto de borrados destructivos de la
  app. **Después**: confirma, con el nombre del evento.

### Perfil del paciente
- **Antes**: "Modo kinesiología" y "Carga avanzada" solo se explicaban
  al pasar el mouse — y el propio comentario del código dice que esta
  es la pantalla central del kine **en tablet**, donde no hay hover.
  **Después**: cada una tiene su explicación como texto visible, no
  solo tooltip.
- **Después**: "Modo de planificación" (Detallado/Simple) ahora tiene
  la misma leyenda acá que ya tenía en el alta de paciente (antes solo
  estaba en un lugar).

### Papelera y Panel de gestión (extra, después de escribir este informe por primera vez)
- **Antes**: "Eliminar" (definitivo, con confirmación) en Papelera tenía
  el mismo peso visual que cualquier botón, sin distinguirse como la
  acción más riesgosa de la fila hasta pasar el mouse. **Después**:
  tinte de alerta visible de entrada.
- **Antes**: en el Panel de gestión (pestaña Equipo), la leyenda de
  colores del semáforo estaba al FINAL de la tabla de 15 columnas — el
  usuario veía los colores antes de la explicación. **Después**: la
  leyenda se movió arriba de la tabla. Los badges "Terc."/"Hon." ahora
  tienen tooltip con el nombre completo.
- **Después**: "RTS" en el nav del paciente tiene tooltip con el
  nombre completo ("Protocolo de Retorno al Deporte"). El instructivo
  del equipo ya no referencia "Mi Cuenta → Actualizar Contraseña" (ruta
  que ya no existe como pantalla propia) sino el nombre real de la
  sección.

### Seguimiento de ausencias
- **Antes**: "Dar de alta", "Tratamiento abandonado" (cierran el
  tratamiento, no reversibles desde ahí) y "Pausar aviso" (reversible,
  solo pausa unos días) se veían como 3 textos idénticos en la misma
  línea. **Después**: las 2 de cierre quedan agrupadas con más peso a
  la izquierda; "Pausar aviso" pasa a la derecha, más liviana, con su
  duración a la vista.

---

## 2. Link al preview

Rama: `orden-ui-nocturno` — ya deployado:

**https://reason-mkwgeog73-kevincolmanf-3811s-projects.vercel.app**

(Vercel genera un link nuevo con cada push a la rama; si volvés a ver
esto más tarde y yo seguí commiteando, puede haber uno más nuevo —
fijate en tu dashboard de Vercel cuál es el último "Ready" de
`orden-ui-nocturno`.)

---

## 3. Lo que encontré y NO toqué, por importancia

**Esto es lo más importante de todo el informe — no son cosas que me
haya olvidado, son cosas que decidí no tocar por los límites de esta
noche (solo interfaz/texto, nada de lógica, "ante la duda no lo
cambio").**

1. **Dos pantallas "Ficha Kinésica" distintas.** `/dashboard/pacientes/[id]/ficha`
   (la nueva, completa) y `/dashboard/pacientes/[id]/fichas/[fichaId]`
   (una vieja, con 9 campos simples) **guardan en filas distintas de
   `patient_fichas`**. Si alguien llega a la vieja por un link
   guardado, ve una ficha incompleta y lo que cargue ahí no aparece en
   la ficha principal. Está en la sección 4 como error de
   funcionamiento — mi recomendación es decidir pronto si se
   redirige, se fusiona o se elimina la ruta vieja, porque el riesgo
   real es perder información clínica, no solo confundir.

2. **El Editor de Planes de ejercicios (`PlanEditor.tsx`) es, con
   diferencia, la pantalla más sobrecargada de toda la app** — más de
   150 controles con un día cargado, 7 modales distintos accesibles
   desde ahí. Solo le toqué la leyenda del calendario (arriba) porque
   era rápido y de alto impacto. El resto —un modal completo
   ("Importar ejercicios del plan") que ningún botón activa, la
   inconsistencia EVA/EAV, dos sistemas de guardado en paralelo sin
   relación visual, el selector de "superserie" sin etiqueta visible
   (inútil en tablet, que esta pantalla sí usa con drag táctil)— amerita
   su propia sesión dedicada, no algo para resolver de paso.

3. **`appointment_type` hardcodeado** (catálogo fijo en la UI y en el
   SQL del Panel de gestión) — ya lo había marcado en la auditoría de
   hardcoding de hace unas semanas. Sigue sin tocar. Es, de todo lo que
   sé de la app, el hardcoding más severo que queda (afecta la
   confiabilidad de métricas para cualquier centro que no sea Build).

4. **El dashboard home puede apilar hasta 6 bloques de aviso** antes de
   llegar a cualquier contenido real (guía de primeros pasos,
   novedades, trial, pendientes de cumplimiento, hitos de la semana,
   alerta de planificación), cada uno con su propio patrón de
   descarte. Es la pantalla que ve TODO usuario en cada sesión — la
   más urgente de simplificar según el propio informe de esa sección —
   pero no la toqué: son 4 componentes independientes con lógica de
   dismiss propia, y consolidarlos bien (sin que alguno deje de
   descartarse o reaparezca) es un cambio de comportamiento, no solo
   de texto. Mi recomendación: una sesión aparte para definir UN único
   patrón de "notificación descartable" y migrar los 4 ahí.

5. **`MODALITIES` fijo en Atención de hoy y `EVENT_TYPES` con valores
   deportivos** (`rtp`, `competencia`) — hardcoding ya conocido, sigue
   sin tocar.

6. **Navegación inconsistente entre subpantallas de un paciente**: hoy
   conviven 3 patrones distintos — pestañas con íconos en el Perfil,
   breadcrumb en la Ficha, "← Volver a {nombre}" simple en el resto
   (Bitácora, Carga, Historial, Hitos, Portal, RTS). No until nada por
   ser un cambio de estructura de navegación, no de texto.

7. **El selector EVA 0-10** (fila de 11 botones) está copiado 3 veces
   (Ficha, Goniometría, Hitos) sin un componente compartido — no es un
   bug hoy, pero es un riesgo de que alguno quede inconsistente a
   futuro. No lo toqué por ser un refactor de código (extraer
   componente, migrar 3 call-sites), no un cambio de texto/UI puro.

8. **Panel de gestión** (pestaña Equipo del CRM): tabla de 15 columnas
   con abreviaturas técnicas ("Pac/día", "% Aus.", etc.) con tooltip
   pero sin ningún texto visible, y la leyenda de colores está al
   FINAL de la tabla en vez de arriba. No lo toqué: es información
   densa pensada para vos como dueño, no para un profesional nuevo —
   menor urgencia que el resto.

9. **"Vínculo" (Propio/Honorarios/Terciarizado) es una lista fija en el
   código**, no configurable — es lo que me preguntaste hoy de tarde
   ("¿se pueden agregar categorías nuevas?"). Si te hace falta un
   vínculo distinto, es un cambio chico de código, no de esta noche.

10. Varios detalles menores ya en `docs/auditoria-ui.md` (botones
    "Eliminar" ocultos hasta hover/touch en Pacientes/Carga/Mis
    Planes, badges "Terc."/"Hon." sin tooltip en el CRM, "RTS" sin
    expandir en el nav del paciente, el instructivo del equipo
    referenciando una ruta de "Actualizar Contraseña" que ya es solo
    un redirect silencioso).

---

## 4. Errores de funcionamiento detectados (no arreglados — son lógica/datos)

### A. Dos fichas que no comparten datos (el más serio)
**Cómo reproducirlo**: andá a `/dashboard/pacientes/[id]/fichas/[fichaId]`
con un `fichaId` que no sea el primero creado para ese paciente (si el
paciente tiene más de una fila en `patient_fichas` — pasa, por ejemplo,
si alguien entró a la ficha en el mismo instante desde dos pestañas, o
hay una fila vieja de antes de que existiera la ficha nueva). Vas a ver
una ficha con solo 9 campos simples, sin diagnóstico estructurado ni
goniometría. Lo que cargues ahí **no aparece** en
`/dashboard/pacientes/[id]/ficha` (la ficha real que usa el resto de la
app), porque apuntan a filas distintas de `patient_fichas`. Esta ruta
vieja ya no está enlazada desde ningún lado del flujo actual, pero
sigue siendo alcanzable por una URL directa o un link/favorito viejo.

### B. Modal fantasma en el Editor de Planes
En `PlanEditor.tsx` existe un modal completo ("Importar ejercicios del
plan", estado `showImportModal`) que ningún botón de la UI activa —
`setShowImportModal(true)` no se llama desde ningún lado del código
actual. No es un bug que el usuario note (simplemente nunca lo ve),
pero es código muerto que puede confundir a quien mantenga esta
pantalla más adelante. No lo toqué porque conectarlo o borrarlo es un
cambio de lógica.

### C. Archivos sueltos duplicados (no es un bug de la app, es del disco)
`FichaClient 2.tsx`, `FichaClient 3.tsx`, `AltaPacienteControl 2.tsx`,
`DerivarAreaAction 2.tsx`, `patientDischarge 2.ts`, `featureSettings 2.ts`
y 3 archivos `.sql` con " 2" en el nombre están sueltos en el disco
(no están en git, aparecen como "untracked" en `git status`) —
parecen copias de conflicto de sincronización de iCloud. Uno de ellos
(`FichaClient 3.tsx`) tiene imports rotos y hace que `tsc --noEmit`
reporte 3 errores que NO son míos ni afectan a la app real (ningún
archivo de ruta real los importa). No los toqué ni los borré — no sé
si son algo que quisiste guardar — pero te conviene revisarlos y
decidir si los tirás, porque van a seguir ensuciando cualquier chequeo
de tipos que corras vos o yo.

---

## Resumen para mañana

8 commits en `orden-ui-nocturno` (varios agrupan más de un cambio
chico), todos con `tsc`/`eslint` limpios y
probados en vivo en la org QA. Nada se mergeó. El cambio más grande en
superficie es Mi Equipo (reagrupación de la fila Categoría) y
Estándares de calidad (áreas colapsables); el de mayor impacto
diario probablemente sea la leyenda de la Agenda y la del calendario
del Editor de Planes, porque son pantallas que se miran todo el día y
antes dependían 100% de tooltips invisibles en tablet.

Lo más urgente que quedó afuera, en orden: (1) decidir qué hacer con
la ficha vieja duplicada, (2) una sesión dedicada para el Editor de
Planes, (3) `appointment_type` hardcodeado, (4) consolidar los avisos
del dashboard home.
