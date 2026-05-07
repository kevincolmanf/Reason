# SISTEMA VISUAL — REASON v1

> Documento de diseño que define las reglas comunes para todas las visualizaciones de Reason. Se aplica a los 6 tipos de visualización del catálogo: árboles de decisión, tablas comparativas, líneas de tiempo, algoritmos de progresión, diagnósticos diferenciales, esquemas anatómicos.
>
> **Este documento es referencia permanente.** Cada visualización producida para Reason se genera respetando estas reglas. Si en algún momento se quiere romper una regla, primero se actualiza el documento.

---

## FILOSOFÍA VISUAL

Reason es **minimalismo con jerarquía clara**. No minimalismo vacío. La pantalla tiene que respirar, pero también tiene que decir cosas precisas. Cada elemento visual existe porque comunica. Cada elemento que no comunica, sale.

Tres referentes de la estética buscada: **Apple** (tipografía dominante, espacio negativo generoso), **Notion** (densidad informativa elegante), **Linear** (precisión geométrica, acentos sutiles).

---

## PALETA DE COLOR

### Principios
- **Blanco/negro como base. Un acento. Nada más.**
- Los grises sirven para jerarquía, no para decorar.
- El acento aparece para marcar lo importante, no para "agregar color".
- Modo claro y modo oscuro deben funcionar bien con la misma paleta.

### Colores del sistema

**Modo claro:**
| Variable | Hex | Uso |
|---|---|---|
| `--color-bg-primary` | `#FFFFFF` | Fondo principal |
| `--color-bg-secondary` | `#F8F7F4` | Fondo de cards, contenedores |
| `--color-bg-tertiary` | `#EFEDE7` | Fondo de bloques destacados |
| `--color-text-primary` | `#1A1A1A` | Texto principal |
| `--color-text-secondary` | `#5C5B57` | Texto secundario, subtítulos |
| `--color-text-tertiary` | `#A6A49C` | Texto auxiliar, hints |
| `--color-border` | `#E5E3DD` | Bordes sutiles |
| `--color-border-strong` | `#C4C2BA` | Bordes con énfasis |
| `--color-accent` | *(decidir entre 3 opciones)* | Acento único |
| `--color-warning` | `#A33D2D` | Solo para alertas clínicas (banderas rojas) |

**Modo oscuro:**
| Variable | Hex | Uso |
|---|---|---|
| `--color-bg-primary` | `#0F0F0E` | Fondo principal |
| `--color-bg-secondary` | `#1A1A18` | Fondo de cards |
| `--color-bg-tertiary` | `#252522` | Fondo destacado |
| `--color-text-primary` | `#F5F4F0` | Texto principal |
| `--color-text-secondary` | `#A6A49C` | Texto secundario |
| `--color-text-tertiary` | `#6A6963` | Texto auxiliar |
| `--color-border` | `#2C2C2A` | Bordes |
| `--color-border-strong` | `#444441` | Bordes con énfasis |

### Las 3 opciones de acento (decisión pendiente)

Te muestro tres opciones de acento. Cada una le da una personalidad ligeramente distinta a Reason. Vas a elegir una al final del documento.

**Opción A — Naranja terracota** `#C25A2C`
Cálido, sofisticado, terroso. Le da a Reason aire de "criterio reposado, decisión madura". Diferencial respecto a la kinesiología tradicional que usa azules clínicos.

**Opción B — Azul tinta** `#1E3A5F`
Profesional, sereno, intelectual. Le da a Reason aire de "rigor, autoridad, evidencia". Más cercano a códigos académicos pero en versión moderna.

**Opción C — Verde oliva** `#5C7A3C`
Orgánico, calmo, de equilibrio. Le da a Reason aire de "salud, movimiento, vitalidad sin agresión". Diferencial frente a azules.

### Reglas de uso del color

- El acento aparece **máximo en el 5% de cualquier visualización**. Si tu visualización tiene mucho color de acento, está mal.
- El rojo (`--color-warning`) **solo se usa para banderas clínicas reales**. No para "esto es importante", no para "este nodo es la conclusión". Solo para alertar sobre derivación, urgencia clínica, contraindicación.
- Los nodos terminales o conclusiones se destacan con **el fondo del acento al 8% de opacidad** (no con el acento puro).
- Los grises hacen el 80% del trabajo visual. Si dudás entre dos grises, elegí el más claro.

---

## TIPOGRAFÍA

### Familia
**Inter** como única familia tipográfica. Disponible en Google Fonts, peso variable.
URL: `https://fonts.googleapis.com/css2?family=Inter:wght@400;500&display=swap`

### Pesos permitidos
Solo dos pesos. Ninguno más.
- **400 (Regular)**: cuerpo de texto, subtítulos, contenido general
- **500 (Medium)**: títulos, énfasis, etiquetas de nodos

**Nunca usar:** 300 (Light), 600 (Semibold), 700 (Bold), 800/900. Esos pesos rompen la sensación de elegancia minimal.

### Escala tipográfica para visualizaciones

| Uso | Tamaño | Peso | Tracking |
|---|---|---|---|
| Título de visualización | 18px | 500 | -0.01em |
| Etiqueta de nodo principal | 14px | 500 | 0 |
| Etiqueta de nodo secundario / subtítulo | 12px | 400 | 0 |
| Etiqueta de flecha / conector | 11px | 400 | 0.01em |
| Pie de gráfico | 11px | 400 | 0 |

### Reglas de tipografía
- **Sentence case siempre.** Nunca Title Case, nunca MAYÚSCULAS.
- **Sin itálicas.** Excepción: nombres de tests ortopédicos (Lachman, Hawkins, Spurling) cuando aparezcan textualmente.
- **Sin subrayados** salvo en links.
- **Numerales arábigos siempre.** "Fase 2", no "Fase II".

---

## FORMAS Y RADIOS

### Radios estándar
- **Radio sutil**: 4px (cajas pequeñas, etiquetas, chips)
- **Radio medio**: 8px (nodos de árbol, celdas de tabla)
- **Radio amplio**: 12px (cards de visualización completa)
- **Radio máximo**: 16px (contenedores externos)

### Reglas de forma
- **No usar círculos para nodos clínicos.** Los rectángulos redondeados comunican mejor decisión y menos "concepto abstracto".
- **Las flechas terminan en chevrón abierto**, no en triángulo lleno. Más limpio, más Linear.
- **No hay sombras.** Nada de drop-shadow. La jerarquía se logra con borde, no con sombra.
- **No hay gradientes.** Excepción única: una línea de tiempo puede usar un gradiente sutil entre dos colores del sistema para mostrar progresión temporal.

---

## ESPACIADO

### Sistema de spacing (basado en múltiplos de 4px)
- 4px (espacio mínimo entre elementos relacionados)
- 8px (espacio interno de nodos pequeños)
- 12px (espacio entre nodos en una tabla)
- 16px (espacio entre filas de información)
- 24px (espacio entre secciones de una visualización)
- 32px (margen externo de visualizaciones)
- 40px (separación entre visualización y texto que la rodea)

### Padding interno de nodos
- **Nodo de árbol pequeño**: 8px vertical, 12px horizontal
- **Nodo de árbol estándar**: 12px vertical, 16px horizontal
- **Celda de tabla**: 12px vertical, 16px horizontal
- **Bloque de fase de timeline**: 16px vertical, 20px horizontal

---

## LÍNEAS Y CONECTORES

### Grosor de líneas
- **Bordes de nodos**: 0.5px (no 1px, no 2px). Esto es lo que hace que se vea "premium" en lugar de "wireframe".
- **Conectores entre nodos**: 1px
- **Líneas de énfasis (frontera entre fases)**: 1.5px
- **Líneas decorativas o de fondo**: 0.5px con opacidad 0.5

### Color de líneas
- **Conectores normales**: `--color-text-secondary`
- **Conectores de "rama principal"**: `--color-text-primary`
- **Conectores de descarte o derivación**: `--color-text-tertiary` con línea punteada

### Estilo de flechas
- Solo flechas con **chevrón abierto** (V invertida). Nunca triángulos llenos, nunca cabezas decorativas.
- Tamaño de la flecha: 8px de ancho.
- Las flechas tocan el borde del nodo, no entran en él.

---

## REGLAS POR TIPO DE VISUALIZACIÓN

### Tipo 1 — Árbol de decisión clínica
- **Orientación**: vertical de arriba hacia abajo. La pregunta inicial arriba, las decisiones terminales abajo.
- **Nodo de pregunta** (decisión a tomar): borde estándar, fondo `--color-bg-secondary`.
- **Nodo de derivación / urgencia**: borde con `--color-warning`, fondo en `--color-bg-secondary` (no usar fondo rojo).
- **Nodo terminal de acción clínica**: fondo `--color-accent` al 8% de opacidad, texto en `--color-text-primary`.
- **Etiquetas de las ramas** (Sí / No): junto a la flecha, en `--color-text-secondary`, 11px.
- **Máximo 4 niveles de profundidad.** Si el árbol necesita más, se parte en dos visualizaciones.

### Tipo 2 — Tabla comparativa de criterio
- **Encabezado de columnas**: las opciones a comparar. Texto en `--color-text-primary`, 14px medium.
- **Encabezado de filas**: los criterios. Texto en `--color-text-secondary`, 12px regular.
- **Celdas**: texto en `--color-text-primary`, 12px regular.
- **Celda destacada** (la opción que gana en ese criterio): fondo `--color-accent` al 8%, no más.
- **Bordes**: solo entre filas, no entre columnas. Esto hace la tabla más limpia.
- **Máximo 4 columnas y 6 filas.** Más que eso, dejar de ser legible.

### Tipo 3 — Línea de tiempo / fases
- **Orientación**: horizontal de izquierda a derecha.
- **Cada fase**: un bloque rectangular con título arriba, contenido abajo. Bordes 0.5px, radio 8px.
- **Separación entre fases**: línea vertical 1.5px en `--color-border-strong`.
- **Indicador temporal**: pequeña etiqueta de tiempo en `--color-text-tertiary`, 11px, arriba de cada fase.
- **Fase actual o destacada**: borde en `--color-accent`, no fondo.
- **Máximo 5 fases.** Más, se parte en dos visualizaciones.

### Tipo 4 — Algoritmo de progresión de carga
- **Estructura**: híbrido entre línea de tiempo (orientación general) y árbol de decisión (bifurcaciones).
- **Niveles**: cada "escalón" de progresión es un bloque horizontal.
- **Criterios de progresión** entre niveles: texto en `--color-text-secondary`, 11px, junto a la flecha que sube.
- **Criterios de retroceso**: línea punteada en `--color-text-tertiary`, etiqueta debajo.
- **Variantes del ejercicio en el mismo nivel**: bloques pequeños conectados horizontalmente con líneas finas.

### Tipo 5 — Diagnóstico diferencial
- **Estructura**: el síntoma o signo principal arriba (un solo nodo), las hipótesis diagnósticas abajo (en fila horizontal o radial).
- **Cada hipótesis**: un bloque con título (la patología) y signos discriminatorios debajo en lista corta.
- **Hipótesis más probable** (si aplica): borde en `--color-accent`.
- **Máximo 4 hipótesis por visualización.** Si son más, se hace por descarte progresivo en árbol de decisión, no en diferencial frontal.

### Tipo 6 — Esquema anatómico simplificado
- **Reconocimiento**: las visualizaciones de este tipo van a ser **esquemáticas, no ilustrativas**. Líneas simples de la región anatómica relevante, sin detalle pictórico.
- **Anotaciones**: pequeños puntos o cruces en la zona, líneas de leyenda hacia el costado, texto en `--color-text-secondary`, 11px.
- **Estructuras destacadas**: trazo en `--color-text-primary` 1px. El resto, en `--color-text-tertiary` 0.5px.
- **Limitación honesta**: para esquemas anatómicos de calidad ilustrativa, este sistema no alcanza. Para esos casos puntuales, vamos a recurrir a Whimsical o Excalidraw exportado como SVG.

---

## PROPORCIONES DE LIENZO

Todas las visualizaciones de Reason se diseñan para renderizar dentro del ancho de la columna principal de contenido.

- **Ancho del lienzo SVG**: 680px (estándar)
- **Alto del lienzo**: variable según contenido, idealmente entre 300px y 700px
- **Si el alto excede 700px**, considerar partir en dos visualizaciones secuenciales
- **Margen interno mínimo**: 40px en todos los lados

---

## REGLAS DE INTEGRACIÓN CON EL TEXTO DEL CONTENIDO

Cuando una visualización aparece en una página de contenido de Reason, sigue estas reglas:

1. **Reemplaza al bloque "Aplicación práctica"** del formato editorial estándar. No se duplica el contenido en texto.
2. **Va precedida por un pequeño rótulo**: "Aplicación práctica" en mayúsculas iniciales pequeñas (12px medium, `--color-text-secondary`), seguido de un subtítulo descriptivo del tipo de visualización: "Árbol de decisión clínica", "Tabla comparativa", etc.
3. **Va contenida en un fondo destacado**: `--color-bg-secondary`, radio 12px, padding 24px.
4. **El texto que rodea la visualización mantiene el ritmo del contenido**: bloques estándar de Reason antes y después.

---

## DECISIONES PENDIENTES PARA APROBACIÓN

Antes de empezar a producir visualizaciones reales, necesito que confirmes:

1. **El acento de color**: A (naranja terracota), B (azul tinta) o C (verde oliva).
2. **¿Aceptás "Inter" como tipografía oficial?** Si querés probar otra (Geist, Söhne, Fraunces), me avisás.
3. **¿El sistema te queda lo suficientemente claro como para que produzcas confiando en él?** Si hay algo que falta o sobra, lo ajustamos antes de la primera visualización real.

---

## VERSIONADO

Este documento es **v1**. Si en algún momento se actualiza alguna regla por aprendizaje en producción real, se actualiza el documento y se versiona (v1.1, v2, etc.). Las visualizaciones existentes no se rehacen automáticamente, pero las nuevas siguen la versión más actual.
