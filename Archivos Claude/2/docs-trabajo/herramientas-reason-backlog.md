# BACKLOG DE HERRAMIENTAS — REASON

> Documento vivo con las herramientas interactivas que vamos a sumar a Reason en Fase 1.5 (post-MVP) y siguientes.
>
> **Estado al momento del documento:** ninguna construida todavía. Esto es planificación.
>
> **Cómo se usa este documento:** Kevin va sumando herramientas que se le ocurren durante el trabajo cotidiano. Cuando llegue el momento de construir (después del MVP estable), agarramos las herramientas marcadas como prioridad alta y se las pasamos a Antigravity con prompts específicos.

---

## CRITERIOS DE INCLUSIÓN

Una herramienta entra al backlog si cumple **al menos dos** de estos criterios:

1. **Resuelve una decisión clínica concreta** que el suscriptor enfrenta seguido
2. **Reemplaza un cálculo manual** que hoy se hace con calculadora o app de terceros
3. **Estandariza un test o cuestionario** validado en literatura
4. **Aporta valor reutilizable**: el suscriptor la va a usar muchas veces, no una sola

Si una herramienta solo es "linda de tener" pero no cumple ninguno de los criterios, no entra. Disciplina.

---

## ESTRUCTURA DE CADA HERRAMIENTA EN EL BACKLOG

```
NOMBRE: [Nombre corto, sin marca registrada]
CATEGORÍA: [Calculadora | Cuestionario | Test interpretado | Algoritmo interactivo]
PRIORIDAD: [Alta | Media | Baja]
ESFUERZO ESTIMADO: [Bajo | Medio | Alto]
PARA QUÉ SIRVE: [Función clínica concreta]
INPUTS: [Qué datos toma]
OUTPUTS: [Qué devuelve]
LÓGICA: [Cómo calcula o interpreta]
INTERFAZ SUGERIDA: [Cómo se ve la herramienta]
DEPENDENCIAS / CUIDADOS: [Validación, copyright, normas, etc.]
```

---

## HERRAMIENTAS CONFIRMADAS

### 1. STarT Back Tool (estratificación de riesgo en lumbalgia)

**CATEGORÍA**: Cuestionario
**PRIORIDAD**: Alta
**ESFUERZO**: Bajo

**PARA QUÉ SIRVE**
Estratifica a pacientes con lumbalgia según riesgo de cronificación. Define si el paciente necesita abordaje estándar o psicológico-multidisciplinar. Es uno de los cuestionarios más utilizados internacionalmente y respaldado por evidencia.

**INPUTS**
9 ítems con respuesta sí/no o escala (acuerdo/desacuerdo). El cuestionario completo cubre dolor, irradiación, kinesiofobia, catastrofismo, depresión, ansiedad y limitación funcional.

**OUTPUTS**
- Score total
- Subscore psicosocial
- Categoría de riesgo: Bajo / Medio / Alto
- Sugerencia de abordaje según categoría

**LÓGICA**
Suma puntuada de los 9 ítems. Subscore psicosocial separado. Algoritmo público y validado.

**INTERFAZ SUGERIDA**
Cuestionario paso a paso (un ítem por pantalla en mobile, lista en desktop). Al final, card con resultado en formato Reason: titular del riesgo + bajada interpretativa + sugerencia de abordaje. Botón "imprimir" o "compartir resultado" para entregar al paciente.

**DEPENDENCIAS / CUIDADOS**
Verificar copyright de la versión española validada. La versión original es de Keele University. Usar la traducción validada al español si está disponible públicamente; si no, contactar para autorización.

---

### 2. Calculadora de carga progresiva

**CATEGORÍA**: Calculadora
**PRIORIDAD**: Alta
**ESFUERZO**: Bajo

**PARA QUÉ SIRVE**
Sugerir la próxima carga de un ejercicio según respuesta del paciente a la sesión previa. Aplica el principio de "progresar por respuesta, no por calendario" que es central en Reason.

**INPUTS**
- Carga actual del ejercicio (kg, reps, series)
- Dolor durante el ejercicio en escala 0-10
- Recuperación percibida en horas
- Tolerancia funcional al día siguiente (escala simple)

**OUTPUTS**
- Sugerencia de próxima carga (mantener / progresar / retroceder)
- Variable a modificar primero (siguiendo el principio de modificación antes de sustitución)
- Justificación clínica del cambio

**LÓGICA**
Reglas de decisión derivadas del marco clínico de Reason:
- Dolor < 3/10 + recuperación < 24h → progresar
- Dolor 3-5/10 + recuperación < 24h → mantener
- Dolor > 5/10 o recuperación > 24h → modificar variable
- Dolor > 7/10 o recuperación > 48h → retroceder o cambiar modalidad

**INTERFAZ SUGERIDA**
Formulario corto, una pantalla. Botón "calcular". Resultado en card con la sugerencia destacada y la justificación abajo.

**DEPENDENCIAS / CUIDADOS**
La lógica es propia, basada en los principios clínicos de Reason. No depende de copyright externo.

---

### 3. Algoritmo de banderas rojas (musculoesquelético)

**CATEGORÍA**: Algoritmo interactivo
**PRIORIDAD**: Alta
**ESFUERZO**: Medio

**PARA QUÉ SIRVE**
Guiar al clínico a través del descarte sistemático de patología grave en consulta inicial. No reemplaza el juicio clínico; lo estructura.

**INPUTS**
Selección por región anatómica (lumbar, cervical, hombro, etc.). Después, serie de preguntas sí/no específicas por región: trauma significativo, fiebre, déficit neurológico progresivo, síntomas constitucionales, antecedentes oncológicos, uso de corticoides, etc.

**OUTPUTS**
- Categoría de riesgo: sin banderas / banderas amarillas / banderas rojas
- Conducta sugerida: continuar evaluación / monitorear / derivar
- Listado de signos detectados que justifican la conducta

**LÓGICA**
Árbol de decisión por región, con criterios validados por guías internacionales (NICE, ACWPSA, etc.). Adaptación a contexto argentino.

**INTERFAZ SUGERIDA**
Wizard tipo cuestionario, con preguntas adaptativas según respuestas previas. Al final, card con resultado claro. Versión imprimible para historia clínica.

**DEPENDENCIAS / CUIDADOS**
Crítico que esté MUY bien validado clínicamente. Una falla acá tiene consecuencias serias. Conviene revisión por colega especialista antes de publicar.

---

### 4. Calculadora de 1RM estimado

**CATEGORÍA**: Calculadora
**PRIORIDAD**: Media
**ESFUERZO**: Bajo

**PARA QUÉ SIRVE**
Estimar la carga máxima (1 repetición máxima) a partir de cargas submáximas testeadas. Útil para prescribir intensidades relativas (% de 1RM) sin necesidad de hacer test de fuerza máxima.

**INPUTS**
- Peso levantado (kg)
- Repeticiones realizadas
- Fórmula a usar (Brzycki, Epley, Lander, Lombardi)

**OUTPUTS**
- 1RM estimado en kg
- Tabla de equivalencias para distintos % de 1RM (60%, 70%, 80%, 85%, 90%)

**LÓGICA**
Fórmulas matemáticas estándar de literatura. Ejemplo Brzycki: 1RM = peso × (36 / (37 - reps)).

**INTERFAZ SUGERIDA**
Formulario simple. Resultado en tabla, con la fila correspondiente al % objetivo destacada.

**DEPENDENCIAS / CUIDADOS**
Las fórmulas son de dominio público. Aclarar limitaciones: estimación válida para 2-10 repeticiones, no extrapolable a más.

---

### 5. Cuestionario Tampa de Kinesiofobia (TSK-11)

**CATEGORÍA**: Cuestionario
**PRIORIDAD**: Media
**ESFUERZO**: Bajo

**PARA QUÉ SIRVE**
Evaluar el miedo al movimiento en pacientes con dolor persistente. Clave para identificar pacientes que necesitan abordaje psicoeducativo además de físico.

**INPUTS**
11 ítems con escala Likert 1-4 (totalmente en desacuerdo / totalmente de acuerdo).

**OUTPUTS**
- Score total (rango 11-44)
- Categoría: kinesiofobia baja / moderada / alta
- Interpretación clínica con sugerencia de abordaje

**LÓGICA**
Suma puntuada con inversión de ítems específicos según escala validada.

**INTERFAZ SUGERIDA**
Cuestionario paso a paso. Resultado con interpretación en formato Reason.

**DEPENDENCIAS / CUIDADOS**
Verificar versión validada en español rioplatense. La TSK-11 es la versión corta validada y de uso libre en investigación, pero conviene chequear copyright para uso comercial.

---

### 6. Calculadora de carga aceptable según peso corporal (tendones)

**CATEGORÍA**: Calculadora
**PRIORIDAD**: Media
**ESFUERZO**: Medio

**PARA QUÉ SIRVE**
Sugerir carga inicial en rehabilitación de tendinopatías según peso corporal y tipo de tendón. Aplica los principios de progresión de Reason.

**INPUTS**
- Peso corporal (kg)
- Tendón afectado (rotuliano, aquileo, supraespinoso, etc.)
- Fase de rehabilitación (irritable, estable, progresión)

**OUTPUTS**
- Carga sugerida inicial (kg o % del peso corporal)
- Series, repeticiones, frecuencia semanal
- Criterios de progresión

**LÓGICA**
Tabla de referencia por tendón y fase, basada en literatura actualizada (Cook & Purdam, Silbernagel, Beyer, etc.). Reglas adicionales según los principios de Reason.

**INTERFAZ SUGERIDA**
Formulario corto. Resultado en card con todos los parámetros prescriptos.

**DEPENDENCIAS / CUIDADOS**
La tabla de referencia requiere construcción cuidadosa. Conviene basarla en consensos publicados, no en intuición.

---

### 7. Escala NPRS interactiva con seguimiento

**CATEGORÍA**: Cuestionario
**PRIORIDAD**: Media
**ESFUERZO**: Medio

**PARA QUÉ SIRVE**
Registrar dolor del paciente en cada sesión y graficar evolución. El kinesiólogo puede compartir el link con el paciente para que registre dolor en casa entre sesiones.

**INPUTS**
- Score 0-10 del paciente
- Fecha y hora del registro
- Contexto opcional (antes/durante/después de actividad, en reposo, etc.)
- Nota libre breve

**OUTPUTS**
- Gráfico de evolución temporal del dolor
- Promedio semanal/mensual
- Identificación de patrones (dolor matinal vs nocturno, asociación con actividad)

**LÓGICA**
Almacenamiento por paciente (requiere autenticación o link único). Visualización con gráficos de línea.

**INTERFAZ SUGERIDA**
Pantalla de registro simple (un slider 0-10) + pantalla de seguimiento (gráfico).

**DEPENDENCIAS / CUIDADOS**
Esta herramienta es más compleja porque requiere persistencia de datos por paciente. Conviene evaluar si entra en Fase 1.5 o se posterga a Fase 2.

---

### 8. Salto en contramovimiento (CMJ): interpretación

**CATEGORÍA**: Test interpretado
**PRIORIDAD**: Baja
**ESFUERZO**: Medio

**PARA QUÉ SIRVE**
Interpretar resultados de un test de salto vertical contextualizando con normativas según edad, género y nivel deportivo. Útil en rehabilitación deportiva para evaluar potencia y asimetrías.

**INPUTS**
- Altura del salto (cm)
- Edad
- Género
- Nivel deportivo (recreativo, amateur, semi-pro, pro)
- Pierna evaluada (bilateral, unilateral derecha, unilateral izquierda)

**OUTPUTS**
- Percentil esperado para la población de referencia
- Interpretación clínica (déficit, normal, óptimo)
- Si se ingresan datos bilaterales, índice de simetría
- Recomendaciones según resultado

**LÓGICA**
Tablas normativas por edad, género y nivel. Cálculo de percentil. Threshold de simetría aceptable < 10% de diferencia.

**INTERFAZ SUGERIDA**
Formulario completo. Resultado con visualización de campana de distribución y posición del paciente.

**DEPENDENCIAS / CUIDADOS**
Las normativas validadas requieren búsqueda en literatura. Aclarar limitaciones de la altura medida sin plataforma de fuerza.

---

### 9. Clasificador interactivo de cervicalgia

**CATEGORÍA**: Algoritmo interactivo
**PRIORIDAD**: Baja
**ESFUERZO**: Alto

**PARA QUÉ SIRVE**
Diferenciar entre cervicalgia mecánica, radicular y cefalea cervicogénica a partir de signos y síntomas clínicos. Guía la conducta diagnóstica.

**INPUTS**
Serie de preguntas adaptativas: localización del dolor, irradiación, signos neurológicos, factores agravantes/aliviadores, presencia de cefalea, etc.

**OUTPUTS**
- Hipótesis diagnóstica más probable
- Hipótesis diferenciales a considerar
- Sugerencia de evaluación complementaria
- Conducta inicial sugerida

**LÓGICA**
Árbol de decisión clínico con scoring por hipótesis. Basado en clasificaciones validadas de la IASP y guías de fisioterapia.

**INTERFAZ SUGERIDA**
Wizard adaptativo. Resultado tipo "diagnóstico diferencial visual" alineado con el sistema visual de Reason.

**DEPENDENCIAS / CUIDADOS**
Construcción clínicamente delicada. Requiere revisión exhaustiva antes de publicar. Considerarlo solo cuando Reason esté madura.

---

## SUGERENCIAS PARA SUMAR AL BACKLOG (a definir por Kevin)

Espacio para que Kevin vaya agregando ideas durante la semana mientras escribe contenido. Formato libre, después se estructuran:

- [ ] Idea pendiente 1
- [ ] Idea pendiente 2
- [ ] Idea pendiente 3

---

## ROADMAP DE CONSTRUCCIÓN

### Fase 1.5 (después de MVP estable, ~mes 2-3 post-lanzamiento)
**Construir las 3 herramientas de prioridad Alta:**
1. STarT Back Tool
2. Calculadora de carga progresiva
3. Algoritmo de banderas rojas

Tiempo estimado total: 2-3 semanas de trabajo con Antigravity.

### Fase 2 (mes 4-6 post-lanzamiento, junto con IA conversacional)
**Sumar las herramientas de prioridad Media:**
4. Calculadora de 1RM estimado
5. Cuestionario Tampa de Kinesiofobia
6. Calculadora de carga aceptable según peso corporal

### Fase 3 (mes 6+, según demanda)
**Evaluar herramientas de prioridad Baja según pedidos de suscriptores:**
7. Escala NPRS con seguimiento
8. CMJ interpretado
9. Clasificador de cervicalgia

---

## NOTAS GENERALES

- **Cada herramienta debe respetar el sistema visual de Reason** (Geist, terracota, formas, espaciados).
- **Los resultados se presentan siempre en formato Reason**: titular declarativo + interpretación clínica + sugerencia accionable.
- **Las herramientas no dan diagnósticos médicos**. Son apoyo a la decisión clínica del profesional. Esto debe quedar claro en cada una.
- **Cada herramienta entra al CMS con su propio módulo**: no son contenidos editoriales sino mini-aplicaciones embebidas.
