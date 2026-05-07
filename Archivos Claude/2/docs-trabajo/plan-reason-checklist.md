# PLAN REASON — CHECKLIST OPERATIVO

> Plan completo desde hoy hasta Fase 2. Tildá a medida que avanzás. Lo que vale es la próxima casilla, no el panorama completo.

---

## FASE 0 — ORGANIZACIÓN DE ARCHIVOS (15 minutos, hacelo ahora)

### Crear estructura de carpetas

- [ ] Crear carpeta principal `Reason` (en Drive, Notion o escritorio, donde guardes archivos)
- [ ] Crear subcarpeta `docs-construccion/`
- [ ] Crear subcarpeta `docs-trabajo/`
- [ ] Crear subcarpeta `docs-trabajo/contenidos-producidos/`
- [ ] Crear subcarpeta `_versiones-anteriores/`
- [ ] Crear subcarpeta `referencias-visuales/`

### Ubicar archivos en `docs-construccion/`

- [ ] Mover `arquitectura-tecnica-reason-v1.md`
- [ ] Mover `arquitectura-tecnica-adenda-fase-1-5.md`
- [ ] Mover `sistema-visual-reason-v1-1.md`
- [ ] Mover `copy-landing-reason-v1.md`
- [ ] Mover `landing-reason-v1.html`
- [ ] Mover `prompt-antigravity-reason-v1.md`
- [ ] Mover `pieza-editorial-sobre-tus-datos.md`

### Ubicar archivos en `docs-trabajo/`

- [ ] Mover `prompt-maestro-reason-v2-2.md`
- [ ] Mover `herramientas-reason-backlog-v2.md`
- [ ] Crear archivo vacío `ideas-pendientes.md`

### Ubicar archivos en `referencias-visuales/`

- [ ] Mover `tabla-comparativa-tendinopatia-rotuliana.html`
- [ ] Mover `linea-tiempo-cicatrizacion-tisular.html`

### Ubicar archivos en `_versiones-anteriores/`

- [ ] Mover `prompt-maestro-reason-v1.md`
- [ ] Mover `prompt-maestro-reason-v2.md`
- [ ] Mover `prompt-maestro-reason-v2-1.md`
- [ ] Mover `herramientas-reason-backlog.md` (versión vieja)
- [ ] Mover `sistema-visual-reason-v1.md` (versión vieja, sin el -1)

---

## FASE 1 — HASTA EL 5/5 (esta semana)

### Foco único: producir contenido

- [ ] Sesión de producción 1 — *Educación en neurociencia del dolor en primera consulta* (Aplicación clínica)
- [ ] Sesión de producción 2 — *Paciente con dolor lumbar y resonancia con protrusión* (Caso real)
- [ ] Sesión de producción 3 — Tema a definir (Aplicación clínica o Protocolo)
- [ ] Sesión de producción 4 — Tema a definir
- [ ] (Bonus) Sesión 5 — Tema a definir

### Para cada sesión de producción

- [ ] Abrir Claude (claude.ai) en sesión nueva
- [ ] Pegar `prompt-maestro-reason-v2-2.md` completo como primer mensaje
- [ ] Esperar la confirmación de Claude
- [ ] Pegar el material en bruto + categoría deseada + apertura preferida (opcional)
- [ ] Revisar el borrador generado
- [ ] Editar lo que haga falta para que suene completamente tuyo
- [ ] Guardar el contenido editado en `docs-trabajo/contenidos-producidos/` con nombre claro (ej: `02-educacion-dolor-primera-consulta.md`)

### Tarea paralela durante la semana

- [ ] Anotar en `ideas-pendientes.md` cualquier idea que aparezca:
  - Temas para próximos contenidos
  - Herramientas nuevas para el backlog
  - Mejoras al sistema visual
  - Comentarios sobre el prompt v2.2

### Lo que NO hacés esta semana

- ❌ NO tocar Antigravity (no se puede hasta el 5)
- ❌ NO tocar el código del repo
- ❌ NO empezar a construir herramientas mentalmente
- ❌ NO revisar documentos viejos para "ordenar"

---

## FASE 2 — DESPUÉS DEL 5/5 (próxima semana)

### Día 1 con Antigravity de vuelta — Cerrar pendientes del MVP

- [ ] Pedirle: cambio de color en árbol de decisión clínica para que no choque con texto
- [ ] Pedirle: agregar palabra "dolor" en conclusión accionable de la landing → *"En **dolor** lumbar inespecífico..."*
- [ ] Validar visualmente que todo quedó bien
- [ ] Hacer commit a Git

### Días siguientes — Cargar contenidos al CMS (vos solo, sin Antigravity)

- [ ] Entrar a `/admin/content/new`
- [ ] Cargar contenido 1 producido la semana anterior
- [ ] Cargar contenido 2
- [ ] Cargar contenido 3
- [ ] Cargar contenido 4
- [ ] (Bonus) Cargar contenido 5
- [ ] Verificar que todos se ven bien renderizados en `/content/[slug]`
- [ ] Anotar en `ideas-pendientes.md` cualquier problema que detectes en el CMS

---

## FASE 3 — LLEGAR A 15-20 CONTENIDOS (próximas 3-4 semanas)

### Producción semanal sostenida

Objetivo: 2-3 contenidos nuevos por semana, hasta tener 15-20 cargados.

- [ ] Semana 1: producir 2-3 contenidos + cargar
- [ ] Semana 2: producir 2-3 contenidos + cargar
- [ ] Semana 3: producir 2-3 contenidos + cargar
- [ ] Semana 4: producir 2-3 contenidos + cargar
- [ ] Llegado a 15-20 contenidos cargados → preparar beta cerrada

### Mientras producís, anotar en `ideas-pendientes.md`

- [ ] Patrones que detectás en tu propia escritura
- [ ] Principios clínicos nuevos para sumar al prompt v2.3
- [ ] Temas que aparecen recurrentemente y serían buenas secciones monográficas futuras
- [ ] Herramientas que se te ocurren mientras escribís sobre cada tema

---

## FASE 4 — BETA CERRADA (cuando tengas 15-20 contenidos)

### Preparación

- [ ] Hacer lista de 5-10 colegas/estudiantes/lectores del libro que querés invitar
- [ ] Crear cuentas para ellos manualmente desde `/admin` (con role = subscriber temporal)
- [ ] Mensajearlos personalmente, no mensaje genérico

### Durante la beta (2 semanas)

- [ ] Pedir feedback específico:
  - ¿Pudieron registrarse sin problemas?
  - ¿La landing convence de pagar?
  - ¿Los contenidos se leen bien en celular?
  - ¿Encontrás lo que buscás en biblioteca?
  - ¿Algo te pareció confuso?
- [ ] Anotar todo el feedback en un documento aparte
- [ ] No hacer cambios mientras dura la beta — esperar a tener todo el feedback junto

### Post-beta

- [ ] Procesar el feedback
- [ ] Pedirle a Antigravity los ajustes derivados (uno por sesión, validando)
- [ ] Cuando esté todo ajustado → lanzamiento público

---

## FASE 5 — LANZAMIENTO PÚBLICO

### Pre-lanzamiento

- [ ] Verificar que el sistema de pagos está en producción (no test)
- [ ] Hacer una suscripción real con tu propia tarjeta para validar end-to-end
- [ ] Verificar que el flujo de cancelación funciona
- [ ] Preparar copy de los anuncios (redes, mensajes directos)

### Día de lanzamiento

- [ ] Anuncio en Instagram personal
- [ ] Anuncio en cuenta de Build
- [ ] Mensaje directo a lectores del libro (lista que tengas)
- [ ] Comunicación a estudiantes que pasan por Build
- [ ] Considerar descuento de "early bird" para los primeros 50 suscriptores

### Primeras 2 semanas post-lanzamiento

- [ ] Monitorear conversiones (cuántos visitan, cuántos se suscriben)
- [ ] Anotar feedback que aparece de suscriptores reales
- [ ] Resolver cualquier bug crítico rápido

---

## FASE 1.5 — PRIMERA SECCIÓN MONOGRÁFICA (mes 2-3 post-lanzamiento)

### Tema: Lumbalgia inespecífica

### Antes de empezar a construir, asegurate de tener

- [ ] MVP estable (sin bugs reportados)
- [ ] 20+ suscriptores activos pagando
- [ ] 15-20 contenidos cargados
- [ ] Feedback inicial procesado

### Producir contenido específico para la sección

- [ ] Contenido sobre lumbalgia 1 (si todavía no lo tenés)
- [ ] Contenido sobre lumbalgia 2
- [ ] Contenido sobre lumbalgia 3
- [ ] Contenido sobre lumbalgia 4
- [ ] (Hasta 6-8 contenidos del tema)
- [ ] Caso real de lumbalgia
- [ ] Ya tenés: árbol de decisión de dolor lumbar inespecífico

### Construcción técnica con Antigravity

#### Sesión 1 — Estructura base

- [ ] Pegar contexto: 4 docs de construcción originales
- [ ] Pegar la adenda Fase 1.5
- [ ] Pegar la pieza editorial sobre datos
- [ ] Pedir: construir la página `/sobre-tus-datos` usando el texto provisto
- [ ] Validar
- [ ] Commit

#### Sesión 2 — Componente reutilizable de exportación

- [ ] Pedir: construir el componente `ResultExport` con generación de PDF (react-pdf/renderer) y copia de texto
- [ ] Probar que el PDF se genera bien
- [ ] Verificar que el footer del PDF lleva la leyenda legal
- [ ] Commit

#### Sesión 3 — Tablas y rutas nuevas

- [ ] Pedir: crear tabla `monographic_sections` y `tools` en Supabase
- [ ] Pedir: crear ruta `/temas` y `/temas/[slug]` (placeholder por ahora)
- [ ] Pedir: cambiar el menú principal del dashboard para incluir "Temas"
- [ ] Validar
- [ ] Commit

#### Sesión 4 — Primera herramienta: STarT Back Tool

- [ ] Pegar la entrada completa de STarT Back del backlog
- [ ] Usar el prompt específico de construcción de herramientas (está en `prompt-antigravity-reason-v1.md`)
- [ ] Validar entendimiento de Antigravity antes de codear
- [ ] Construir
- [ ] Probar el cuestionario completo
- [ ] Probar exportación a PDF
- [ ] Commit

#### Sesión 5 — Segunda herramienta: Calculadora de carga progresiva

- [ ] Pegar entrada del backlog
- [ ] Construir
- [ ] Probar
- [ ] Commit

#### Sesión 6 — Tercera herramienta: Algoritmo de banderas rojas lumbares

- [ ] Pegar entrada del backlog
- [ ] Construir
- [ ] Probar (con cuidado clínico, validar todos los caminos del wizard)
- [ ] Commit

#### Sesión 7 — Página de la sección monográfica

- [ ] Pedir: construir la vista `/temas/lumbalgia-inespecifica` integrando:
  - Intro editorial breve (el autor presente)
  - Listado de contenidos editoriales del tema
  - Listado de las 3 herramientas
  - Casos reales del tema
- [ ] Validar
- [ ] Commit

#### Cierre de Fase 1.5

- [ ] Comunicar a suscriptores actuales: "Sumamos primera sección monográfica de Reason"
- [ ] Anotar en `ideas-pendientes.md` qué herramientas queremos para la próxima sección

---

## FASE 2 — SEGUNDA Y TERCERA SECCIÓN + IA (mes 4-6)

### Segunda sección: Tendinopatía rotuliana

- [ ] Producir contenidos del tema (si no los tenés)
- [ ] Construir herramientas asociadas: 1RM, calculadora de carga por peso corporal
- [ ] Construir página de la sección

### Tercera sección: Dolor de hombro

- [ ] Producir contenidos del tema
- [ ] Construir herramientas: diagnóstico diferencial de dolor lateral, banderas rojas hombro
- [ ] Construir página de la sección

### IA conversacional (cuando ya tengas 30+ contenidos)

- [ ] Diseñar arquitectura de IA conversacional (volvé a Claude para esto)
- [ ] Implementar buscador conversacional desde dashboard
- [ ] Implementar asistente desde cada contenido individual

---

## REGLAS DE ORO PARA TODA LA EJECUCIÓN

- ✅ Una tarea por sesión con Antigravity. No mezclar.
- ✅ Validar visualmente antes de avanzar a la siguiente tarea.
- ✅ Commit a Git después de cada sesión exitosa.
- ✅ Si algo no anda, copiar el error completo y pasárselo a Antigravity.
- ✅ Si Antigravity se desvía del pedido, frenarlo y volverlo al carril.
- ❌ No cambiar el stack a mitad de camino.
- ❌ No agregar funcionalidades no planeadas durante la construcción.
- ❌ No subestimar el tiempo de testing en las herramientas con datos clínicos.

---

## CUÁNDO VOLVER A CONSULTARME

- Cuando termines la Fase 1 (esta semana de producción)
- Cuando algo te trabe más de 1 hora con Antigravity
- Cuando aparezca una decisión de producto que no estaba en el plan
- Cuando estés por arrancar una nueva fase grande
- Cuando tengas feedback real de la beta cerrada y necesites procesarlo

---

## ESTADO ACTUAL DEL PROYECTO

- ✅ Marca, dominio, identidad, sistema visual
- ✅ Prompt maestro v2.2 con visualización integrada
- ✅ Landing deployada en Vercel
- ✅ Auth funcionando
- ✅ CMS construido
- ⏳ 1 contenido producido (lenguaje en consulta)
- ⏳ 2 detalles visuales pendientes (color árbol, palabra "dolor")
- ⏳ Antigravity bloqueado hasta el 5/5
- ⏳ Backlog de herramientas v2 listo para Fase 1.5
- ⏳ Pieza editorial sobre datos lista para Fase 1.5

---

## PRÓXIMA TAREA CONCRETA

👉 **Producir tu primer contenido nuevo de la semana** usando el prompt v2.2.

Tema sugerido: *Educación en neurociencia del dolor en primera consulta* (Aplicación clínica).

Eso es lo único que importa hoy. Lo demás puede esperar.
