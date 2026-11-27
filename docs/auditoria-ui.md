# Auditoría de claridad de interfaz — Reason

Hecho en la noche del 27/11 → 28/11/2026, rama `orden-ui-nocturno`, sin tocar
datos reales (todo lo que se probó en vivo fue contra la org QA de prueba).

Objetivo de esta auditoría: no es sacar funciones, es identificar dónde la
jerarquía visual, los nombres y la falta de explicación hacen que una pantalla
sea difícil de usar o de explicarle a alguien nuevo. Cada pantalla se mapea
con: para qué sirve, quién la usa, cuántos controles tiene a la vista, y qué
problemas de claridad encontré.

_(Este documento se completa a medida que avanza la auditoría — ver
`docs/informe-noche.md` para el resumen de qué se cambió realmente.)_

---

## Cluster: Mi cuenta / Mi Equipo / Panel de gestión

### Mi cuenta / Mi perfil (`src/app/account/page.tsx`)
- **Para qué sirve**: Página hub de la cuenta: editar datos personales y contraseña propios, y enlazar a suscripción, equipo, panel de gestión y auditoría. También exportar datos y cerrar sesión.
- **Quién la usa**: dueño / profesional / recepción (cualquier usuario logueado; las secciones de equipo/panel/auditoría solo se ven si corresponde al rol).
- **Controles visibles (aprox.)**: ~10-12.
- **Problemas de claridad encontrados**:
  - "Rol actual" (`ProfileEditor.tsx` línea 89) muestra el valor crudo del enum (`pro`, `admin`, `subscriber`, `free`) sin traducir.
  - "Mi Equipo", "Panel de gestión" y "Auditoría de accesos" aparecen como tres bloques separados, visualmente indistinguibles, sin jerarquía que indique cuál es más frecuente de usar.
  - "Exportar mis datos" convive al mismo nivel visual que "Cerrar sesión en todos los dispositivos" — acciones de frecuencia y riesgo muy distintos, mismo peso.
  - No hay texto que explique la diferencia entre "Panel de gestión" / "Mi Equipo" / "Auditoría" más allá de un subtítulo corto.

### Mi Equipo (`src/app/account/equipo/page.tsx` + `EquipoClient.tsx`)
- **Para qué sirve**: Crear/administrar el centro: agregar y quitar integrantes, permisos de agenda y caja, categoría profesional, reenviar accesos, QR de reseñas de Google, eliminar el centro.
- **Quién la usa**: dueño (admin/owner del centro) exclusivamente.
- **Controles visibles (aprox.)**: **~7-10 por cada fila de integrante** (badge de estado, select Agenda, botón Caja, botón Reenviar/Restablecer, Editar nombre, Quitar, input Profesión, input Especialidad, select Vínculo, select Área principal, link "Ver en panel de gestión"). Con 3-4 integrantes ya son 30-40+ controles solo en la lista; sumando el resto de la pantalla, ronda 50-60. **Es la pantalla más cargada de toda la auditoría.**
- **Problemas de claridad encontrados**:
  - **El mismo patrón que ya se corrigió una vez ("Especialidad" vs. "Área principal") se repite sin resolver entre "Profesión" y "Especialidad"** (líneas 681-694): dos inputs de texto libre, mismo tamaño, uno al lado del otro, sin ninguna pista de qué va en cada uno. "Kinesiólogo/a" podría ir en cualquiera de los dos.
  - "Vínculo" (línea 695-702, `propio/honorarios/terciarizado`) solo le importa al Panel de gestión, pero está mezclado sin separación con datos clínicos/operativos (Profesión, Área principal).
  - "Área principal" (línea 703-713) tiene un tooltip técnico y largo que nadie va a leer sin contexto previo.
  - Toda la fila "Categoría" junta 4 campos de naturaleza distinta (identidad profesional, vínculo contractual, reporting) bajo un único label genérico, sin subtítulos.
  - El select de Agenda (línea 630-642) depende de leer una leyenda aparte más arriba para distinguir "ve" de "modifica".
  - El botón de Caja (línea 643-654) es un toggle pero cambia de texto completo según el estado ("Habilitar caja" ↔ "Caja ✓") — no se lee como un switch a primera vista.
  - "Reenviar acceso"/"Restablecer contraseña" (línea 655-662) es el mismo botón cambiando de texto/color según si el integrante ya ingresó — fácil de no notar.
  - "Editar nombre" y "Quitar" están al mismo nivel visual que los toggles de permisos de uso diario.
  - "Reseñas de Google" (marketing, uso ocasional) y "Eliminar centro" (destructivo) comparten tarjeta visual con el resto — "Eliminar centro" al menos tiene borde rojo, "Reseñas de Google" no tiene ninguna señal de ser secundaria/opcional.
  - Inconsistencia de nombres con el Panel de gestión: acá "Vínculo" tiene etiquetas largas ("Propio (staff)"); en el Panel de gestión se muestra abreviado ("Terc.", "Hon.") sin tooltip propio.
  - Punto positivo ya resuelto bien: el estado vacío ("Todavía no hay integrantes…") sí tiene texto de ayuda.

### Instructivo del Equipo (`src/app/account/equipo/instructivo/page.tsx`)
- **Para qué sirve**: Genera un documento imprimible con instrucciones de acceso para el equipo.
- **Quién la usa**: dueño (lo genera) / profesional (lo recibe en papel).
- **Controles visibles**: 2. Sin problemas relevantes. Nota menor: el texto todavía dice "Mi Cuenta → Actualizar Contraseña", una ruta que ya no existe como pantalla propia (ver más abajo).

### Panel de gestión (`src/app/account/crm/page.tsx` + `CRMPageClient.tsx` + `crm/EquipoClient.tsx` + `AnalyticsClient.tsx`)
- **Para qué sirve**: 3 pestañas — listado/filtro de pacientes (CRM), métricas por profesional (desempeño/retención), analítica agregada del centro.
- **Quién la usa**: dueño exclusivamente.
- **Controles visibles (aprox.)**: ~11 al cargar (pestaña default), pero contando las 3 pestañas supera los 40.
- **Problemas de claridad encontrados**:
  - La tabla de la pestaña "Equipo" tiene 15 columnas con abreviaturas técnicas ("Pac/día", "% Aus.", "% Aband.", etc.) — tienen tooltip al hover, pero nada es visible sin pasar el mouse columna por columna. Pared de números para alguien nuevo.
  - Badges "Terc."/"Hon." sin tooltip propio (dependen de conocer el término desde Mi Equipo).
  - Ícono ⚑ junto al nombre de un profesional solo tiene `title="A conversar"`, sin texto visible.
  - La leyenda de colores del semáforo está al FINAL de la tabla — el usuario ve los colores antes de la explicación.
  - Filtros de mes/área y gráficos tipo dona interactiva en "Analítica" no están explicados en ningún lado.
  - Mi Equipo y Panel de gestión se citan mutuamente para editar/ver lo mismo (categoría de un profesional) en dos pantallas distintas — confuso por qué no se edita donde se analiza.
  - Punto positivo: el estado vacío de la pestaña Pacientes ("No hay pacientes que coincidan con los filtros") está bien resuelto.

### Centro de ayuda (`src/app/account/ayuda/page.tsx`)
- **Para qué sirve**: Documentación in-app paso a paso de cada módulo.
- **Quién la usa**: cualquier usuario.
- **Controles visibles**: 1 (mailto). Contenido estático.
- **Problemas de claridad encontrados**:
  - Sin buscador ni tabla de contenidos para 18 secciones largas.
  - Términos técnicos sin explicar la primera vez que aparecen: "ACWR", "RPE", "EVA 0-10", "RTS" — justo en la pantalla pensada para quien recién empieza.
  - Alguna descripción de permisos usa palabras distintas a los literales reales de la UI de Mi Equipo.

### Auditoría de accesos (`src/app/account/auditoria/page.tsx`)
- **Para qué sirve**: Trazabilidad — quién abrió la ficha de qué paciente y cuándo.
- **Quién la usa**: dueño exclusivamente.
- **Controles visibles**: 2. Maneja bien los estados vacíos ("Todavía no hay accesos registrados" / "sin resultados"). Sin problemas relevantes, salvo que no explica PARA QUÉ existe esta pantalla (cumplimiento/trazabilidad).

### Suscripción (`src/app/account/subscription/page.tsx`)
- **Para qué sirve**: Estado del plan, cancelar/suscribirse, gestionar "pacientes extra" (overage).
- **Quién la usa**: dueño / profesional individual.
- **Controles visibles (aprox.)**: 2-4 base, hasta 7-8 con el panel de overage abierto.
- **Problemas de claridad encontrados**:
  - "Plan contratado" concatena "Pro" de forma no evidente para el usuario (deriva de un rol interno).
  - El texto de riesgo del recargo de "pacientes extra" (precio atado al tipo de cambio del día, sin reembolso parcial) solo aparece DESPUÉS de tocar "Sumar 10 pacientes más" — información de pricing crítica que debería anticiparse antes del click.

### Actualizar contraseña (`src/app/account/update-password/page.tsx`)
- Ya no es una pantalla real: es un redirect silencioso a `/reset-password` (ruta vieja mantenida por links de emails ya enviados). 0 controles, sin problema de UI propiamente — pero el instructivo del equipo (ver arriba) todavía referencia esta ruta como si fuera una pantalla con menú propio.

### Resumen del cluster
**Pantalla más cargada**: Mi Equipo, sin comparación — 30-40+ controles simultáneos con solo 2-3 integrantes, todos con el mismo peso visual.
**Más urgente de simplificar**: la fila "Categoría" de Mi Equipo (Profesión + Especialidad + Vínculo + Área principal, sin títulos de sección). Confirma exactamente el patrón que ya había aparecido una vez con "Especialidad"/"Área principal" — ahora aparece de nuevo entre "Profesión" y "Especialidad".

---

## Cluster: Agenda

### Agenda — vista principal (`src/app/dashboard/agenda/AgendaClient.tsx`, 1441 líneas)
- **Para qué sirve**: Ver y gestionar los turnos del día/semana — crear, editar, marcar presente/ausente, enviar recordatorios, filtrar por profesional/área. Pantalla de uso diario, muchas veces por día.
- **Quién la usa**: dueño, profesional, recepción.
- **Controles visibles (aprox.)**: ~9 fijos en la barra superior + 1 tab por área + por cada turno visible: 1 click principal + hasta 4 íconos de acción al hover (✓ ✗ ST WA) + hasta 3 badges superpuestos (C/A, check azul, "$"). Con 15-20 turnos en pantalla, 60-80 elementos clickeables/interpretables.
- **Problemas de claridad encontrados**:
  - Badges de una letra `C`/`A` sobre el turno (líneas 709-716) explicados SOLO con `title` (tooltip) — en tablet/celular (sin hover) quedan sin explicación visible. Importante: Build usa tablets.
  - Tres indicadores sin texto amontonados en la esquina de cada turno ("$" = pago cargado, check azul = sesión registrada, punto verde = recordatorio enviado) — la leyenda visible de la pantalla (líneas 1208-1224) explica colores por tipo de turno y "ausente"/"cancelado", pero **no explica ninguno de estos 3 indicadores**.
  - Botones de hover `✓ ✗ ST WA` (líneas 765-800) — "ST" = "sobreturno", término no explicado en pantalla, solo en el tooltip.
  - El menú "Más" (líneas 902-980) mezcla sin jerarquía visual real acciones de uso diario (Atención de hoy, Recordatorios, Ausencias) con uso raro (Exportar CSV/PDF, Configurar agenda) — un solo separador antes de "Configurar agenda".
  - **Inconsistencia de nombres**: el menú dice "Ausencias" pero la pantalla se llama "Seguimiento de ausencias".
  - La vista desktop no muestra ningún mensaje cuando el día está vacío (solo la vista móvil/tablet lo hace).
  - El tab "Todas" (ver todas las áreas juntas) solo existe en vista Día, no en vista Semana.
  - El menú contextual de un turno apila hasta 7 ítems condicionales sin agrupar lo diario (editar, presente/ausente) de lo ocasional (cargar caja, registrar sesión kine).

### Configurar agenda — modal (`src/app/dashboard/agenda/AgendaSettings.tsx`, 498 líneas)
- **Para qué sirve**: Áreas/especialidades, duración de turnos, horario visible, WhatsApp de contacto, link de agenda compartida, permisos de acceso por integrante.
- **Quién la usa**: solo dueño.
- **Controles visibles (aprox.)**: la más cargada del cluster — ~20-30 controles en un único modal con 6 secciones heterogéneas en un solo scroll largo, sin pestañas.
- **Problemas de claridad encontrados**:
  - El botón **"Restablecer"** (línea 232) borra TODAS las áreas y duraciones configuradas con un solo click — **sin ningún diálogo de confirmación**. Es una acción destructiva disfrazada de link de texto subrayado, fácil de tocar por error.
  - "Intervalo por defecto" (línea 288) y "duración de turno" (arriba, por área) son dos nombres distintos para el mismo concepto en la misma pantalla.
  - La sección de acceso por integrante tiene revelación progresiva (aparece/desaparece "Áreas que puede ver" según el nivel elegido) que puede sentirse inconsistente.
  - "Compartir agenda" desaparece sin aviso si el usuario no es dueño de organización — no hay nota de por qué falta.

### Atención de hoy — bloque de agenda (`src/app/dashboard/agenda/atencion/page.tsx` + `BloqueAtencion.tsx`)
- **Para qué sirve**: Listar pacientes con turno hoy (modo kine) agrupados por horario, para un check rápido de síntoma sin entrar a la ficha completa.
- **Quién la usa**: profesional, uso diario.
- **Problemas de claridad encontrados**:
  - **"+ Modo kine"** (línea 75-81) usa jerga interna sin ninguna explicación en pantalla de qué activa — un paciente sin el modo prendido no da ninguna pista de qué implica activarlo.
  - Buen manejo del estado vacío (líneas 169-176).
  - Layouts completamente distintos entre tarjeta con/sin "modo kine" — puede no quedar claro por qué dos pacientes del mismo horario se ven tan distintos.

### Recordatorios (`src/app/dashboard/agenda/recordatorios/page.tsx`)
- La pantalla **más clara y consistente** de las cinco del cluster: textos explícitos, estados vacíos diferenciados, botones con texto + ícono. Único punto menor: "X turnos sin teléfono cargado" no tiene ninguna acción asociada para resolverlo desde ahí.

### Seguimiento de ausencias (`src/app/dashboard/agenda/seguimiento/page.tsx`)
- **Problemas de claridad encontrados**:
  - "Dar de alta" (cierre positivo), "Tratamiento abandonado" (cierre negativo, afecta métricas) y "Pausar aviso" (reversible) se muestran como texto plano del mismo tamaño/color — sin jerarquía entre una decisión clínica permanente y una pausa temporal.
  - Confirma la inconsistencia de nombre: título "Seguimiento de ausencias" vs. link "Ausencias" en el menú de Agenda.
  - Buen manejo de vacío y de la config de áreas.

### Resumen del cluster Agenda
**Pantalla "más cargada"**: `AgendaSettings.tsx`, pero de uso infrecuente (solo el dueño, rara vez) — su costo de confusión es acotado.
**Urgencia real** (uso diario de todos): (a) los badges/íconos sin texto de la grilla principal de Agenda (C/A, $, check azul, ST) — lo primero que ve cualquiera todos los días y no puede descifrar sin preguntar; (b) `TurnoModal.tsx` (1362 líneas, el modal de "+ Nuevo turno"/editar) mezcla en un solo formulario "dar un turno común" (20 veces/día) con "bloquear un horario" (tarea ocasional de configuración) — sin separación de pantalla entre ambos flujos.

---

## Cluster: Ejercicios

### Hub de Ejercicios (`src/app/dashboard/ejercicios/page.tsx`)
Redirect inmediato a Biblioteca — no es una pantalla real, sin problemas.

### Biblioteca de Ejercicios (`src/app/dashboard/ejercicios/biblioteca/page.tsx` + `BibliotecaInteractive.tsx`)
- **Para qué sirve**: Explorar +1.700 ejercicios (buscar/filtrar/ver video) y gestionar los ejercicios propios del centro.
- **Quién la usa**: profesional.
- **Controles visibles (aprox.)**: ~20-25 en la pestaña Biblioteca, ~15-20 más en "Mis Ejercicios".
- **Problemas de claridad encontrados**:
  - **Botón "+ Plan" roto en la práctica** (líneas 377-382): no agrega nada, solo dispara un toast "Para agregar al plan, abrí el Planificador de Sesiones" — una pantalla que **no existe con ese nombre** en ningún otro lugar de la app (las reales se llaman "Mis Planes"/"Editor de Planes"). Usuario hace click esperando una acción y lo mandan a buscar algo que no va a encontrar.
  - "Carpetas" (configuración ocasional) y "Agregar ejercicio propio" (uso diario) tienen el mismo peso visual, sin jerarquía.
  - El ícono "×" para cerrar el modal de video es el único ícono de toda la pantalla sin `title` ni texto.
  - Las tarjetas de "Mis Ejercicios" que matchean la búsqueda se mezclan con las del catálogo general, distinguibles solo por un borde de color sin ninguna explicación textual.

### Mis Planes (`src/app/dashboard/ejercicios/plan/page.tsx` + `PlanList.tsx`)
- **Problemas de claridad encontrados**:
  - "Copiar" y "Eliminar" de cada plan son invisibles en desktop hasta pasar el mouse por encima (`opacity-0 group-hover:opacity-100`) — nadie "descubre" que existen sin hacer hover por accidente.
  - 3-4 nombres distintos para lo mismo en una pantalla chica: "Planes asignados" / "Tus Planes Guardados" / "Mis Planes" / "Planes de {nombre}".
  - El ícono de "compartido con paciente" solo tiene tooltip, sin texto visible.

### Editor de Planes / Calendario (`src/app/dashboard/ejercicios/plan/[id]/page.tsx` + `PlanEditor.tsx`)
**La pantalla más sobrecargada de TODA la auditoría, por lejos**: con un día cargado (caso típico), **más de 150 elementos clicables/editables simultáneos**, más 7 modales distintos accesibles desde ahí. Es el ejemplo más directo de la queja original ("demasiados botones, checks y opciones a la vista... alguien nuevo se pierde").
- **Problemas de claridad encontrados** (los más graves de todo el informe):
  - El calendario mezcla **5 tipos de marcador** (hito/RTS/dinamometría/cuestionario/evaluación programada) en la misma celda diminuta, cada uno con su color/ícono propio, **sin ninguna leyenda visible en la pantalla** — solo se entiende pasando el mouse, celda por celda.
  - **Inconsistencia EVA vs. EAV**: el mismo concepto clínico (Escala Visual Analógica) se llama "EAV obj." en los campos de dosificación y "EVA" en los logs/tooltips del semáforo — dos siglas para lo mismo en la misma pantalla.
  - El selector de "superserie" no tiene etiqueta visible, solo valores crípticos ("1A", "2C") explicados por tooltip — inútil en tablet (sin hover), y esta pantalla SÍ se usa con drag táctil.
  - El ícono "Reelegir" (cambiar ejercicio) no tiene texto, solo tooltip, con un término no estándar.
  - El menú "Más" mezcla "Copiar/Pegar sesión" (diario) con "+Hito/+RTS/+Dinamo/+Cuest" (ocasional, navegan a herramientas completamente distintas) y "Eliminar sesión" (destructivo), todo con el mismo peso visual.
  - **Dos sistemas de guardado en paralelo sin relación visual entre sí**: autoguardado del plan ("✓ Guardado") y guardado manual de la sesión del día — nada explica que son cosas distintas.
  - El semáforo (punto de color por ejercicio) no tiene texto visible, solo tooltip con "RPE"/"EVA" sin explicar qué significan.
  - El panel "Planilla imprimible" (uso ocasional) tiene la misma jerarquía visual que la cabecera principal del plan — puede abrumar antes de cargar un solo ejercicio.
  - "Agregar RTS/dinamometría/cuestionario" desde el día vacío navegan a herramientas completamente distintas de la app sin avisar que sacan al usuario del editor.
  - Hay un modal completo ("Importar ejercicios del plan") que ningún botón de la UI activa — código fantasma, no afecta al usuario pero confunde a quien mantenga la pantalla.

### Resumen del cluster Ejercicios
**Pantalla más cargada de TODO el informe**: el Editor de Planes. **Recomendación**: no es para resolver en una noche — amerita su propia sesión dedicada. Dos focos puntuales y acotados que si se alcanzan a tocar tendrían alto impacto: (1) agregar una leyenda visible para los 5 marcadores del calendario; (2) arreglar o quitar el botón "+ Plan" roto de la Biblioteca.

---

## Cluster: Dashboard home / Estadísticas / Estándares / Eventos / Caja / Chat / Papelera

_(Nota: todas comparten el Header global — logo, Pacientes, Estadísticas, Agenda, Ejercicios, menú "Más" con 6 destinos ocultos, chat, badge de workspace, menú de usuario. Se cuenta una vez acá.)_

### Dashboard home (`src/app/dashboard/page.tsx`)
- **Para qué sirve**: Punto de entrada de la app — saludo, pacientes recientes, pendientes de cumplimiento, hitos de la semana, alertas de planificación, contenido editorial.
- **Quién la usa**: todos.
- **Controles visibles (aprox.)**: ~35-40 en una cuenta nueva con trial.
- **Problemas de claridad encontrados**:
  - **Hasta 6 bloques de aviso apilados antes de cualquier contenido real** (OnboardingGuide, WhatsNewBanner, banner de trial, Pendientes de cumplimiento, Hitos de la semana, Alerta de planificación) — un usuario nuevo con trial y pendientes puede ver 5-6 cajas de color antes del primer paciente. Es el síntoma más directo de la queja original.
  - Los 4 componentes de aviso usan patrones de descarte DISTINTOS entre sí (uno colapsa + "No mostrar", otro solo "×", otro tiene "Descartar todos" + individual) — sin lenguaje visual único para "esto se puede cerrar".
  - `PendientesCumplimientoBanner` usa jerga sin explicar ("sesión sin registro completo", "paciente abierto hace tiempo", "pase sin informe") y no linkea a dónde se configuran esos umbrales (Estándares de calidad).
  - El ítem "Agenda" bloqueado en el header muestra su explicación solo por tooltip — no descubrible en mobile/touch.
  - El menú "Más" mezcla contenido educativo (Recursos, Biblioteca) con gestión de negocio (Equipo, Panel de gestión, Caja, Estándares de calidad) sin separador.
  - "Panel de gestión" y "Estándares de calidad" son dos pantallas distintas de métricas de centro, mismo menú, sin que nada aclare la diferencia entre una y otra.

### Estadísticas (`src/app/dashboard/estadisticas/page.tsx`)
- **Problemas de claridad encontrados**:
  - El select "Diagnóstico" aparece deshabilitado hasta elegir "Categoría corporal" sin ningún texto que lo explique (solo opacidad reducida).
  - "EVA" sin desarrollar en ningún lado de la pantalla.
  - El botón de export dice "todos los casos, sin identificar" pero por tooltip aclara que **ignora los filtros activos arriba** — contraintuitivo, y solo se entiende leyendo el tooltip.
  - "Revisar pacientes cargados" (herramienta de auditoría importante) vive colapsada al final, después de todos los gráficos — fácil de no descubrir nunca.

### Estándares de calidad (`src/app/dashboard/estandares/page.tsx` + `EstandaresCalidadClient.tsx`)
**Con diferencia, el candidato más sobrecargado del cluster** (sin contar Ficha/PlanEditor de otros clusters).
- **Controles visibles (aprox.)**: 1 toggle general + **6 controles por cada área de agenda** (todas expandidas SIEMPRE, sin acordeón) + botón Guardar + 2 export + tabla de 13 columnas. Con 3 áreas, ~22 controles simultáneos.
- **Problemas de claridad encontrados**:
  - **Todas las áreas se muestran expandidas a la vez** — contrasta directamente con Caja, donde la configuración equivalente SÍ está en un acordeón cerrado por defecto. Inconsistencia de patrón dentro de la misma app.
  - Los 3 inputs de umbral por área tienen placeholders inconsistentes: dos dicen "Sin verificar" (vacío = no se verifica) y uno dice "21 (default)" (vacío = usa 21) — mismo aspecto visual, comportamiento distinto, sin aclararlo.
  - El tipo de campo "Calidad" (de los 3 tipos: Texto/Número/Calidad) no tiene ninguna explicación de qué produce en la ficha real.
  - El toggle "Función activa" no aclara que también oculta la tabla/export de abajo — se descubre recién al desactivarlo.
  - La tabla final tiene 13 columnas de conteos crudos sin jerarquía (ni color, ni orden, ni tooltip) de cuál es "malo" — la columna "Desconocido" no tiene ninguna explicación.
  - El link "¿Falta un área? Agregala en Agenda →" saca de la pantalla sin avisar que se pueden perder cambios no guardados en los umbrales.
  - Nombre cruzado con "Panel de gestión" (métrica "hermana" de negocio) sin ningún link entre ambas.

### Eventos (`src/app/dashboard/eventos/page.tsx`)
- **Problemas de claridad encontrados**:
  - El botón "×" de eliminar evento borra **sin ningún diálogo de confirmación** — inconsistente con Papelera, que sí confirma antes de un borrado definitivo.
  - El campo "Cómo se paga" aparece/desaparece dinámicamente según el precio cargado, cambiando el alto del formulario mientras se completa.
  - El emoji de "Portada" no explica dónde se usa esa portada (la página pública del evento).

### Caja (`src/app/dashboard/caja/page.tsx`)
- **Problemas de claridad encontrados**:
  - Los presets de "Cobro / obra social" requieren bajar hasta el final de la página y abrir "Configurar caja" — nada en el formulario de carga indica que esa configuración existe ahí abajo.
  - "Concepto" y "Nota" son dos campos de texto libre con propósito parecido, mal diferenciado.
  - El campo "Área" no explica que viene de la configuración de Agenda — aparece suelto.

### Chat (`src/app/dashboard/chat/page.tsx`)
Pantalla más simple del cluster — 2 controles, buen estado vacío. Sin problemas relevantes.

### Papelera (`src/app/dashboard/papelera/page.tsx`)
- El botón "Eliminar" (definitivo, con confirmación) tiene el mismo peso visual secundario que cualquier botón (texto gris) — no se distingue como la acción más riesgosa de la fila hasta pasar el mouse. "Restaurar" en cambio usa el color de acento.

### Banner de pendientes (`src/components/PendientesCumplimientoBanner.tsx`)
- Usa 6 etiquetas de jerga clínica/operativa sin ninguna explicación en pantalla ("sesión sin registro completo", "pase sin informe", etc.) y sin link hacia Estándares de calidad, que es donde se configuran esos criterios. Las 6 categorías se ven todas igual de "urgentes" (mismo color ámbar, sin distinción).

### Resumen del cluster
**Pantalla individualmente más densa**: Estándares de calidad — pero acotada a dueños (audiencia chica).
**Más urgente de simplificar**: el **dashboard home**, porque lo ve TODO usuario en cada sesión, y hoy puede apilar hasta 6 bloques de aviso con 4 patrones de descarte distintos antes de llegar a la lista de pacientes. Es el punto de entrada que más define la primera impresión.

---

## Cluster: Pacientes

### Lista de Pacientes (`src/app/dashboard/pacientes/page.tsx`)
- El botón "Eliminar" de cada tarjeta solo aparece al hover/touch, sin ninguna pista previa de que existe.
- El formulario de alta tiene 9 campos sueltos sin agrupar visualmente (a diferencia de la Ficha, que sí tiene bloques numerados).

### Perfil del paciente (`src/app/dashboard/pacientes/[id]/page.tsx` + `PacienteDetail.tsx`)
- **Problemas de claridad encontrados**:
  - El botón "Configuración" es un rótulo genérico — recién al abrirlo aparecen 3 configuraciones muy distintas mezcladas ("Modo kinesiología", "Carga avanzada", "Modo de planificación").
  - **Las explicaciones de "Modo kinesiología" y "Carga avanzada" existen SOLO como tooltip hover — y el propio comentario del código dice que esta pantalla es la página central del kine EN TABLET.** En touch no hay hover: la única explicación de qué hace cada toggle no se ve nunca en el dispositivo principal de uso.
  - "Modo de planificación" tiene leyenda explicativa en el alta de paciente pero NO la tiene en este menú de Configuración — inconsistencia de cuánto se explica la misma opción según dónde aparece.
  - La barra de accesos (nav de pestañas) no indica en qué pestaña está parado el usuario, y **solo existe en esta pantalla** — al entrar a Ficha/Bitácora/Hitos/Historial/Portal/RTS esa barra desaparece.
  - El ítem de nav cambia de nombre según el paciente ("Bitácora" vs. "Plan") en el mismo lugar de la barra.
  - "RTS" aparece como sigla sin desarrollar en el nav, mientras la pantalla de destino se llama "Protocolo de Retorno al Deporte".

### Ficha Kinésica (`src/app/dashboard/pacientes/[id]/ficha/page.tsx` + `FichaClient.tsx`, 1610 líneas)
**La pantalla más cargada del cluster Pacientes** — entre 60 y 90 elementos interactivos en una sola página de scroll continuo, sin tabla de contenidos ni anclas, a pesar de que el propio código ya la divide en 4 bloques numerados.
- **Problemas de claridad encontrados**:
  - Sin navegación interna a los 4 bloques (Anamnesis, Interrogatorio, Examen físico, Plan).
  - El selector de EVA (0-10, fila de 11 botones) se repite igual en al menos 3 lugares de la app (Ficha, Goniometría, Hitos) sin un componente único — más fácil que alguno quede inconsistente.
  - 4 selects nuevos (Mecanismo de lesión, Lateralidad, Duración de síntomas, Primer episodio/Recidiva) sin ninguna frase que diga por qué están ahí o si son opcionales.
  - El botón "+ Adjuntar PDF" es un label estilizado como botón envolviendo un input file oculto — indistinguible de un botón real salvo por el comportamiento.

### ⚠️ Ficha Kinésica — versión antigua (`src/app/dashboard/pacientes/[id]/fichas/[fichaId]/page.tsx` + `PatientFichaEditor.tsx`) — HALLAZGO GRAVE, FUNCIONAL
**Esta es la inconsistencia más seria de toda la auditoría.** Esta pantalla se titula igual que la Ficha "nueva" (mismo breadcrumb "Pacientes / {nombre} / Ficha Kinésica") pero:
- Muestra solo 9 campos simples (sin diagnóstico estructurado, sin goniometría, sin cuestionarios).
- **Guarda en una fila de `patient_fichas` identificada por `fichaId`, DISTINTA de la fila "canónica" (la más antigua) que usa `/ficha`.**
- Si un profesional llega a esta ruta por un link viejo, vería una ficha incompleta y con menos funciones, y **lo que edite ahí no aparecería en la ficha principal del paciente**.
- No está enlazada desde la barra de accesos actual (`PacienteDetail.tsx` solo linkea a `/ficha`) — es código heredado todavía alcanzable pero no integrado al flujo actual.
- **No se toca esta noche** (es lógica/datos, fuera de los límites) — queda listado también en `informe-noche.md` como error de funcionamiento a revisar.

### Bitácora (`src/app/dashboard/pacientes/[id]/bitacora/page.tsx`)
- El input de "semanas de seguimiento simple" está suelto sin agrupar con el resto del formulario.
- Dos "×" distintos (borrar chip de ejercicio / borrar registro) con estilos distintos para la misma función.
- Dos banners de acción pueden aparecer juntos y competir por atención antes del formulario de carga diaria.

### Calendario del paciente (`.../calendario/page.tsx`)
Redirect permanente a Ejercicios/Plan — no es una pantalla real. Su sola presencia en el listado de rutas puede sugerir que existe un "Calendario" propio del paciente cuando en realidad vive en otra sección.

### Monitoreo de Carga (`.../carga/page.tsx` + `LoadMonitorClient.tsx`)
- La pantalla con más jerga clínica sin explicar del cluster: "ACWR (EWMA)", "Monotonía", "Strain", "UA", "z-score" — difícil de interpretar sin formación previa en ciencias del deporte. Mitigado porque está gateada detrás de "Carga avanzada" (no la ve un paciente común).
- Mismo patrón de botones "Eliminar" ocultos hasta hover/touch.

### Historial (`.../historial/page.tsx`)
Una de las pantallas más claras del cluster — pocos controles, íconos siempre acompañados de texto. Sin problemas relevantes.

### Hitos del tratamiento (`.../hitos/page.tsx`)
- Los 8 tipos de hito se presentan como chips de igual tamaño, sin distinguir uso frecuente (Control, Evaluación) de uso raro (Competencia, Otro).

### Portal del paciente (`.../portal/page.tsx`)
Una de las pantallas más claras del cluster — cada modalidad trae su propia descripción en texto plano. Único detalle: el botón de revocar es literalmente "X", apoyado solo en tooltip.

### RTS / Retorno al Deporte (`.../rts/page.tsx`)
- La sigla "RTS" no se expande en el nav del paciente (sí en esta pantalla).
- Los 6 protocolos se listan solo por nombre de patología, sin ayuda para elegir cuál corresponde.

### Activar modo kine en tanda (`.../activar-kine/page.tsx`)
El párrafo explicativo más claro de todo el cluster. Sin problemas relevantes.

### Resumen del cluster Pacientes
**Pantalla más cargada**: Ficha Kinésica (60-90 controles en una sola página de scroll).
**Prioridad de impacto** (en orden):
1. **Unificar la navegación entre subpantallas del paciente** — hoy conviven 3 patrones distintos (pestañas con íconos en Perfil, breadcrumb en Ficha, "← Volver" simple en el resto).
2. **Resolver la duplicación de "Ficha Kinésica"** (ver hallazgo grave arriba) — no solo confuso, puede hacer perder información clínica real.
3. **Sacar del tooltip-only las explicaciones de "Modo kinesiología" / "Carga avanzada"** en el Perfil del paciente — pantalla pensada explícitamente para tablet, donde el hover no existe.
4. Partir la Ficha Kinésica en navegación por secciones (anclas internas).

---

## Atención de hoy — ficha individual (`src/app/dashboard/pacientes/[id]/AtencionDeHoy.tsx`)

- **Para qué sirve**: panel de registro rápido de la visita del día — marcar cómo llegó el paciente, ver una sugerencia no vinculante, ajustar la sesión/bitácora de hoy, y registrar la atención.
- **Quién la usa**: profesional que atiende. El dueño u otro profesional son lectores pasivos de "Continuidad".
- **Controles visibles (aprox.)**: ~18-20 en el recorrido completo; 6-8 de entrada antes de tocar un síntoma.
- **Problemas de claridad encontrados**:
  - De 14 `<button>`, solo 1 tiene `title=` ("Borrar atención", bien resuelto). El "×" de sacar un ejercicio de la bitácora (línea 593) es el único ícono realmente mudo (sin `title` ni `aria-label`). El resto ya tiene texto visible, no necesita tooltip.
  - El `AttributionPicker` (selector de "Atendiendo") está suelto sin encabezado de sección, a diferencia de todos los demás bloques del componente que sí tienen título.
  - "Reevaluación" se usa con DOS significados distintos en la misma pantalla: como link que programa algo en el plan, y como chip de modalidad que solo anota la nota de hoy — sin ninguna distinción visual entre ambos usos.
  - El bloque de modalidades/manejo de síntomas, una vez expandido, no tiene título de sección (a diferencia del resto del componente).
  - "Bitácora" y "Manejo de síntomas" se repiten varias veces sin explicarse nunca para alguien nuevo — se asume que ya se conoce el vocabulario interno.
  - El badge "AUTO" no tiene tooltip ni aclaración de qué significa.
  - Cuando no hay bitácora de hoy ni previa (paciente nuevo en modo simple), el bloque no tiene ningún encabezado — aparece un input suelto con placeholder como único indicio. Los demás estados vacíos del componente sí están bien resueltos con texto explicativo.
  - Dos botones distintos comparten el texto "Traer a hoy" para dos datos distintos (sesión del plan vs. bitácora).

### Resumen
3 cambios de más impacto para esta pantalla: (1) título/encabezado al bloque de bitácora vacío y al de modalidades; (2) tooltip/aria-label al "×" de bitácora; (3) distinguir visualmente los dos usos de "Reevaluación".

---

## Síntesis — confirmación de las 3 pantallas de uso diario

Kevin hipotetizó "Atención de hoy, ficha del paciente y agenda" como las 3 pantallas más usadas día a día. **Confirmado por los 6 informes**: las tres aparecen independientemente como las de mayor densidad de controles Y mayor frecuencia de uso (a diferencia de Mi Equipo o Estándares de calidad, que son densas pero de uso raro/solo-dueño). Paso 2 arranca por estas tres.

Hallazgo transversal que aparece en los 3 informes de estas pantallas, de forma independiente: **las explicaciones viven casi siempre en `title=` (tooltip hover)**, y varias de estas pantallas están pensadas explícitamente para tablet (Perfil del paciente, PlanEditor con drag táctil) — donde el hover no existe. Es el patrón de causa raíz más repetido de toda la auditoría.

Segundo hallazgo transversal: **acciones destructivas sin confirmación** — "Restablecer" en Configurar Agenda (borra todas las áreas) y "×" de eliminar evento en Eventos, ambas sin diálogo, mientras que Papelera y la ficha sí confirman. Se corrigen esta noche por ser rápidas y de alto valor de seguridad, aunque están fuera de las 3 pantallas principales.

Tercer hallazgo transversal: **nombres que no coinciden entre el lugar donde se linkea algo y el título real de la pantalla** — "Ausencias" (menú) vs. "Seguimiento de ausencias" (título real); referencias a "Planificador de Sesiones", una pantalla que no existe con ese nombre.


