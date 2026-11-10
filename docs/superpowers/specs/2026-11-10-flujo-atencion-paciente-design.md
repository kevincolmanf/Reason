# Simplificar el flujo de atención del paciente

## Problema

Entrar a atender a un paciente (el flujo que se repite 15+ veces por día) se siente engorroso:

- La ficha del paciente muestra 4 cards grandes (Ficha, Monitoreo de Carga, Plan/Bitácora, RTS) que llevan a páginas separadas, y "Atención de hoy" (que sí se usa en cada atención) las empuja bien abajo — para ir a la ficha hay que scrollear bastante.
- Existen **tres flujos distintos para registrar "qué pasó hoy"** que no se hablan entre sí:
  1. Botón "+ Registrar sesión" (header del paciente y menú de turno en agenda) → hoja con nota, RPE 0-10, duración, dolor opcional → tabla `load_sessions`.
  2. "Atención de hoy" → síntoma Peor/Igual/Mejor + modalidades + nota libre → tabla `patient_events`.
  3. Formulario largo dentro de Monitoreo de Carga ("Registrar sesión") → RPE + VAS pre/durante/post + duración + nota → también `load_sessions`.
- En la práctica, con pacientes no deportistas, solo se usa el #2 (rápido, sin pedirle números al paciente). Los flujos #1 y #3 quedan vacíos — el Monitoreo de Carga nunca recibe datos y su ACWR/alertas no sirven para ese grupo de pacientes.
- Para pacientes de alto rendimiento (deportistas en Build), el sistema de Monitoreo de Carga (RPE/VAS/ACWR) sí funciona bien y se quiere conservar intacto.

Confirmado con Kevin: el 99% de la atención es presencial (no remota/portal), y no quiere perder ni un dato existente — solo simplificar lo que ya funciona.

## Alcance

Incluye: la página de detalle del paciente (`/dashboard/pacientes/[id]`) y sus accesos directos (Ficha, Plan, RTS, Carga), el componente "Atención de hoy", y un nuevo interruptor por paciente para separar pacientes comunes de pacientes con seguimiento de carga avanzado.

Fuera de alcance (quedan para una siguiente vuelta, no se tocan acá):
- Navegación global del dashboard (header superior, no sidebar de toda la app).
- Contenido interno de la Ficha Kinésica, el editor de Plan, o RTS — no se achica ni se reordena nada dentro de esas páginas.
- El modelo de datos de `load_sessions` / `patient_events` — no se migra ni se unifica. Las tres tablas siguen existiendo tal cual.

## Diseño

### 1. Interruptor "Monitoreo de carga avanzado"

Nuevo campo booleano en `patients` (`advanced_load_mode`, default `false`), con el mismo patrón que el `kine_mode` existente: un botón en el header del paciente, al lado del botón "Modo kinesiología" (`PacienteDetail.tsx`).

- **Apagado (default, paciente común):**
  - La card "Monitoreo de Carga" desaparece de la barra de accesos (sección 2).
  - El botón "+ Registrar sesión" del header desaparece.
  - El botón "+Registrar sesión" / "Atención de hoy (kine)" del menú contextual del turno en la agenda (`AgendaClient.tsx` / `TurnoModal.tsx`) deja de ofrecer la hoja de registro de carga (`QuickSessionSheet`) para ese paciente — sigue ofreciendo "Atención de hoy (kine)".
  - La ruta `/dashboard/pacientes/[id]/carga` sigue existiendo (no se borra código ni se migra nada), pero no se linkea desde ningún lado para ese paciente. Si alguien entra por URL directa, ve la página vacía de siempre invitando a "Registrar sesión" — comportamiento sin cambios, solo deja de promocionarse.
- **Prendido (deportista / seguimiento de rendimiento):** todo sigue exactamente igual que hoy — card de Carga, botón "+ Registrar sesión", RPE/VAS/ACWR/alertas sin tocar.

No se migra ni se recalcula nada de `load_sessions` existente. El toggle solo controla visibilidad de UI.

### 2. Barra de accesos compacta ("cápsula flotante")

Reemplaza el grid de 3-4 cards grandes en `PacienteDetail.tsx` por una barra horizontal compacta, ubicada **antes** de "Atención de hoy" (entre el header del paciente y esa sección), para que nunca dependa de cuánto mida el bloque de arriba.

- Contenido: Ficha · Plan (o Bitácora, según `plan_mode`, como hoy) · RTS · Carga (solo si `advanced_load_mode` está prendido).
- Estilo validado con el usuario (mockup "opción A"): una cápsula con fondo elevado (`bg-tertiary`), bordes redondeados (14px contenedor / 10px ítems), el ítem activo no aplica en esta vista porque es navegación de salida (no hay "activo" real — son links a otras páginas, no tabs de una sola vista). Ícono (SVG inline, 15px, trazo 2px) + texto, usando los colores reales de Reason (`--accent #C25A2C` para hover/foco, `--bg-secondary/tertiary`, `--border`/`--border-strong`).
- Responsive: mismo diseño (ícono + texto, nunca solo ícono) en compu, tablet y celu. Contenedor con `overflow-x: auto` como salvavidas en pantallas muy angostas, en vez de recortar texto o forzar wrap. Área de toque por ítem ampliada respecto del mockup inicial (mínimo ~44px de alto) porque tablet es el dispositivo principal de uso.
- Las "Primeros pasos" / "Siguiente paso" (banners condicionales para pacientes sin ficha/plan) y "Hitos del tratamiento" no se tocan — siguen en su lugar actual, debajo de "Atención de hoy".

### 3. "Atención de hoy" más compacta

Sin agregar campos ni pasos nuevos — solo progressive disclosure sobre lo que ya existe en `AtencionDeHoy.tsx`:

- **Continuidad:** muestra 1 línea por defecto (la atención más reciente) en vez de 3. El botón "Ver las N atenciones" sigue existiendo para expandir.
- **Modalidades (Terapia manual / Reevaluación / Cuestionario) + "Manejo de síntomas":** pasan detrás de un toggle "+ opciones" (colapsado por defecto). Si el usuario ya tocó algo ahí en esta sesión de atención, queda expandido para que no "pierda" su selección.
- El resto del componente (símbolo Peor/Igual/Mejor, sugerencia, sesión de hoy con ajuste de carga, nota + registrar) no cambia.

## Consideraciones técnicas

- Migración: una columna nueva (`advanced_load_mode boolean not null default false`) en `patients`. Sin impacto en datos existentes, sin riesgo — va en rama según el flujo de trabajo del proyecto (cambios de base de datos).
- Archivos principales a tocar: `src/app/dashboard/pacientes/[id]/PacienteDetail.tsx` (toggle, barra de accesos, orden de secciones), `src/app/dashboard/pacientes/[id]/AtencionDeHoy.tsx` (continuidad 1 línea, "+ opciones"), `src/app/dashboard/agenda/AgendaClient.tsx` y/o `TurnoModal.tsx` (ocultar "+ Registrar sesión" cuando `advanced_load_mode` es falso).
- No se toca: `LoadMonitorClient.tsx`, el modelo de `load_sessions`/`patient_events`, la Ficha Kinésica, el editor de Plan, RTS.

## Criterio de éxito

- Entrar a un paciente común y llegar a Ficha/Plan/RTS en un click, sin scrollear.
- Ningún paso nuevo para registrar "Atención de hoy" — sigue siendo exactamente lo que ya hace Kevin con sus 15 pacientes.
- Un paciente deportista con `advanced_load_mode` prendido ve la experiencia de carga 100% igual a la actual.
