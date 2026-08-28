import type { GuideStep } from '@/components/GuideTour'

// Registro central de guías de primer uso por sección. Un solo "?" en el header
// abre la guía de la sección donde está el usuario (o el centro de ayuda si esa
// sección todavía no tiene guía). Los pasos se anclan a elementos con
// data-tour="..." que viven en cada página.

const EQUIPO_STEPS: GuideStep[] = [
  {
    target: 'equipo-header',
    title: 'Este es tu centro',
    body: 'Desde acá gestionás a todo tu equipo. Cada profesional entra con su propio email y contraseña, y todos comparten los mismos pacientes.',
  },
  {
    target: 'equipo-agregar',
    title: 'Sumá a un profesional',
    body: 'Tocá "Agregar integrante" y cargás su email y nombre. Si ya tiene cuenta en Reason, lo sumamos; si no, le creamos una con una clave temporal.',
  },
  {
    target: 'equipo-integrantes',
    title: 'Tu equipo',
    body: 'Acá ves a todos los integrantes y si ya ingresaron. Cuando alguien no pueda entrar, reenviás su acceso o restablecés su contraseña desde su fila.',
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
    body: 'Tocá "+ Nuevo turno" (o un espacio libre en la grilla) y cargás el paciente, el horario y el área. Reason lo ubica en la agenda automáticamente.',
  },
  {
    target: 'agenda-areas',
    title: 'Filtrá por área',
    body: 'Si tu centro trabaja varias especialidades, con estas pestañas ves solo el área que te interesa. El número es la cantidad de turnos de ese día.',
  },
  {
    target: 'agenda-recordatorios',
    title: 'Recordatorios por WhatsApp',
    body: 'Desde acá enviás los recordatorios del día, uno por uno, con un click. Es lo que más baja el ausentismo.',
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
    body: 'A medida que tu lista crece, buscás cualquier paciente por nombre o DNI desde acá. Tocá un paciente para abrir toda su historia clínica.',
  },
]

const DASHBOARD_STEPS: GuideStep[] = [
  {
    target: 'dash-pacientes',
    title: 'Tu punto de partida',
    body: 'Acá tenés acceso rápido a tus pacientes. Con "Ver todos" entrás a la lista completa y cargás nuevos — de cada paciente cuelga toda su historia clínica.',
  },
  {
    target: 'dash-explorar',
    title: 'Contenido clínico',
    body: 'Artículos con criterio clínico aplicado, para leer entre paciente y paciente. Y arriba, en el menú, están la agenda, los recursos y tu equipo.',
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
    body: 'Explorá la biblioteca de ejercicios por patrón, equipo o categoría. Los planes se arman dentro de cada paciente, en su plan de ejercicio.',
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
}

// Coincidencia por ruta exacta: así la guía de "pacientes" no se dispara en la
// ficha de un paciente (/dashboard/pacientes/[id]), que es otra pantalla.
const GUIDES: GuideDef[] = [
  { key: 'equipo', paths: ['/account/equipo'], steps: EQUIPO_STEPS },
  { key: 'agenda', paths: ['/dashboard/agenda'], steps: AGENDA_STEPS },
  { key: 'pacientes', paths: ['/dashboard/pacientes'], steps: PACIENTES_STEPS },
  { key: 'dashboard', paths: ['/dashboard'], steps: DASHBOARD_STEPS },
  { key: 'ejercicios', paths: ['/dashboard/ejercicios'], steps: EJERCICIOS_STEPS },
  { key: 'recursos', paths: ['/recursos'], steps: RECURSOS_STEPS },
  { key: 'biblioteca', paths: ['/library'], steps: BIBLIOTECA_STEPS },
]

export function guideForPath(pathname: string): GuideDef | null {
  return GUIDES.find(g => g.paths.includes(pathname)) ?? null
}
