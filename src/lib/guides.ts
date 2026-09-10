import type { GuideStep } from '@/components/GuideTour'

// Registro central de guías de primer uso por sección. Un solo "?" en el header
// abre la guía de la sección donde está el usuario (o el centro de ayuda si esa
// sección todavía no tiene guía). Los pasos se anclan a elementos con
// data-tour="..." que viven en cada página.
//
// Mantené este archivo al día cuando cambie una sección: es la ayuda que ve el
// usuario la primera vez y cada vez que toca el "?".

const EQUIPO_STEPS: GuideStep[] = [
  {
    target: 'equipo-header',
    title: 'Este es tu centro',
    body: 'Desde acá gestionás a todo tu equipo. Cada profesional entra con su propio email y contraseña, y todos comparten los mismos pacientes y su historial.',
  },
  {
    target: 'equipo-agregar',
    title: 'Sumá a un profesional',
    body: 'Tocá "Agregar integrante" y cargás su email y nombre. Si ya tiene cuenta en Reason lo sumamos; si no, le creamos una con una clave temporal que después cambia.',
  },
  {
    target: 'equipo-integrantes',
    title: 'Permisos de cada uno',
    body: 'Acá ves a todos y si ya ingresaron. Desde cada fila definís qué agenda ve, si puede editar turnos o registrar caja, y reenviás el acceso o restablecés su clave.',
  },
  {
    target: 'equipo-instructivo',
    title: 'Pasale la guía al equipo',
    body: 'Descargá el instructivo en PDF (o copiá el mensaje listo para enviar) para que cada profesional sepa cómo ingresar y empezar a usar Reason.',
  },
]

const AGENDA_STEPS: GuideStep[] = [
  {
    target: 'agenda-nuevo',
    title: 'Así das un turno',
    body: 'Tocá "+ Nuevo turno" (o un espacio libre en la grilla) y cargás el paciente, el horario y el área. Al dar "presente" podés, además, registrar el cobro en la caja.',
  },
  {
    target: 'agenda-areas',
    title: 'Filtrá por área',
    body: 'Si tu centro trabaja varias especialidades, con estas pestañas ves solo el área que te interesa. El número es la cantidad de turnos de ese día.',
  },
  {
    target: 'agenda-atencion',
    title: 'Atención de hoy (kinesiología)',
    body: 'Abre la vista del día para los pacientes en modo kinesiología: los ves agrupados por horario y registrás cómo llegó cada uno (mejor / igual / peor) en un par de toques.',
  },
  {
    target: 'agenda-recordatorios',
    title: 'Recordatorios por WhatsApp',
    body: 'Enviás los recordatorios del día uno por uno, con un click. Es lo que más baja el ausentismo.',
  },
  {
    target: 'agenda-config',
    title: 'Configurá tu agenda',
    body: 'Definís tus horarios, las áreas y la duración de cada turno. En un centro, también elegís qué agenda ve cada integrante.',
  },
]

const PACIENTES_STEPS: GuideStep[] = [
  {
    target: 'pacientes-nuevo',
    title: 'Cargá tu primer paciente',
    body: 'Es el punto de partida de todo: de cada paciente cuelgan su ficha kinésica, sus planes de ejercicio, el monitoreo de carga y las evaluaciones.',
  },
  {
    target: 'pacientes-buscar',
    title: 'Encontralos rápido',
    body: 'A medida que tu lista crece, buscás cualquier paciente por nombre o DNI. Tocá un paciente para abrir toda su historia clínica.',
  },
  {
    target: 'pacientes-activar-kine',
    title: 'Modo kinesiología en tanda',
    body: 'Si trabajás rehabilitación, desde acá pasás a "modo kine" a todos tus pacientes con turnos de una sola vez. Cada paciente también podés prenderlo a mano desde su ficha.',
  },
]

const FICHA_STEPS: GuideStep[] = [
  {
    target: 'ficha-header',
    title: 'La historia clínica del paciente',
    body: 'Todo lo del paciente vive acá: ficha kinésica, plan de ejercicio, monitoreo de carga, retorno al deporte, hitos del tratamiento e historial de turnos.',
  },
  {
    target: 'ficha-modo-kine',
    title: 'Modo kinesiología',
    body: 'Prendé el modo kine para sumarle a este paciente la capa "Atención de hoy": pensada para rehabilitación, donde el plan se ajusta sesión a sesión según el síntoma.',
  },
  {
    target: 'ficha-atencion',
    title: 'Atención de hoy',
    body: 'Marcás cómo llegó (mejor / igual / peor) y Reason te sugiere un ajuste. Podés retocar la carga en el momento, y queda una línea de continuidad que lee el próximo profesional. Si el síntoma empeora, te avisa para reevaluar.',
  },
]

const ATENCION_STEPS: GuideStep[] = [
  {
    target: 'atencion-bloques',
    title: 'El día, por bloques',
    body: 'Tus pacientes de kinesiología con turno hoy, agrupados por horario (los que atendés en simultáneo, juntos). Aparecen solo los que tienen el modo kine prendido.',
  },
  {
    target: 'atencion-bloques',
    title: 'Registrá en dos toques',
    body: 'En cada tarjeta marcás cómo llegó el paciente y tocás "Registrar". Para el detalle —sugerencia, ajuste de carga, continuidad— abrís su ficha desde la misma tarjeta.',
  },
]

const CAJA_STEPS: GuideStep[] = [
  {
    target: 'caja-header',
    title: 'La caja diaria del centro',
    body: 'Registrás ingresos y egresos del día. Los cobros también podés cargarlos desde la agenda al dar "presente" a un turno, y caen acá automáticamente.',
  },
  {
    target: 'caja-header',
    title: 'Cierre y control',
    body: 'Ves el total del día por medio de pago y por área. Cada integrante habilitado registra su caja; el dueño ve el consolidado del centro.',
  },
]

const PANEL_STEPS: GuideStep[] = [
  {
    target: 'panel-header',
    title: 'El panel de gestión',
    body: 'La foto del centro: pacientes activos, turnos, ausentismo, ingresos y actividad del equipo. Pensado para tomar decisiones, no para el día a día clínico.',
  },
]

const DASHBOARD_STEPS: GuideStep[] = [
  {
    target: 'dash-pacientes',
    title: 'Tu punto de partida',
    body: 'Acceso rápido a tus pacientes. Con "Ver todos" entrás a la lista completa y cargás nuevos — de cada paciente cuelga toda su historia clínica.',
  },
  {
    target: 'dash-explorar',
    title: 'Todo lo demás, en el menú',
    body: 'Arriba tenés la agenda, los ejercicios, los recursos clínicos, tu equipo, el panel de gestión y la caja. Y acá abajo, recordatorios de hitos y evaluaciones pendientes.',
  },
]

const RECURSOS_STEPS: GuideStep[] = [
  {
    target: 'recursos-grid',
    title: 'Tus herramientas clínicas',
    body: 'Cuestionarios con score automático, calculadoras (1RM, IMC, VO2máx), banderas rojas, el dinamómetro (HHD con cálculo de LSI) y el bodyboard. Tocá cualquiera para abrirla.',
  },
]

const EJERCICIOS_STEPS: GuideStep[] = [
  {
    target: 'ejercicios-grid',
    title: 'Base de +1.700 ejercicios',
    body: 'Explorá la biblioteca por patrón, equipo o categoría. Los planes se arman dentro de cada paciente, en su plan de ejercicio.',
  },
]

const BIBLIOTECA_STEPS: GuideStep[] = [
  {
    target: 'biblioteca-buscar',
    title: 'Buscá contenido',
    body: 'Encontrá artículos por tema o palabra clave. Son lecturas cortas con criterio clínico aplicado, pensadas para el consultorio.',
  },
]

export type GuideDef = {
  key: string
  paths: string[]
  steps: GuideStep[]
  // Matcher opcional para rutas dinámicas (ej. la ficha /dashboard/pacientes/[id]).
  match?: (pathname: string) => boolean
}

// Coincidencia por ruta exacta (o por matcher, para rutas dinámicas). Así la guía
// de "pacientes" no se dispara en la ficha de un paciente, que es otra pantalla.
const GUIDES: GuideDef[] = [
  { key: 'equipo', paths: ['/account/equipo'], steps: EQUIPO_STEPS },
  { key: 'panel', paths: ['/account/crm'], steps: PANEL_STEPS },
  { key: 'caja', paths: ['/dashboard/caja'], steps: CAJA_STEPS },
  // -v2: se refrescó el contenido (sep 2026); la key nueva reabre la guía
  // completa aunque el usuario ya hubiera visto la versión anterior.
  { key: 'agenda-v2', paths: ['/dashboard/agenda'], steps: AGENDA_STEPS },
  { key: 'atencion', paths: ['/dashboard/agenda/atencion'], steps: ATENCION_STEPS },
  { key: 'pacientes-v2', paths: ['/dashboard/pacientes'], steps: PACIENTES_STEPS },
  // Ficha del paciente: /dashboard/pacientes/<uuid> (no confundir con /activar-kine).
  { key: 'ficha', paths: [], steps: FICHA_STEPS, match: p => /^\/dashboard\/pacientes\/[0-9a-fA-F-]{8,}$/.test(p) },
  { key: 'dashboard', paths: ['/dashboard'], steps: DASHBOARD_STEPS },
  { key: 'ejercicios', paths: ['/dashboard/ejercicios/biblioteca'], steps: EJERCICIOS_STEPS },
  { key: 'recursos', paths: ['/recursos'], steps: RECURSOS_STEPS },
  { key: 'biblioteca', paths: ['/library'], steps: BIBLIOTECA_STEPS },
]

export function guideForPath(pathname: string): GuideDef | null {
  return GUIDES.find(g => g.paths.includes(pathname) || (g.match?.(pathname) ?? false)) ?? null
}
