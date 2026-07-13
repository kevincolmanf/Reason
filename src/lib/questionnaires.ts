// ─────────────────────────────────────────────────────────────────────────────
// Definiciones compartidas de cuestionarios clínicos.
// Fuente única de verdad para los ítems, usada tanto por el formulario
// (QuestionariosClient) como por la ficha del paciente (getFlaggedItems).
// ─────────────────────────────────────────────────────────────────────────────

// ─── SPADI ─────────────────────────────────────────────────────────────────

export const SPADI_PAIN = [
  '¿Qué tan intenso es tu dolor cuando está en su peor momento?',
  '¿Qué tan intenso es el dolor cuando está acostado/a sobre el lado afectado?',
  '¿Qué tan intenso es el dolor al alcanzar objetos en un estante elevado?',
  '¿Qué tan intenso es el dolor al tocarte la parte trasera del cuello?',
  '¿Qué tan intenso es el dolor al empujarte hacia arriba con la mano afectada?',
]
export const SPADI_DISABILITY = [
  '¿Cuánta dificultad tenés para lavarte/secarte el cabello?',
  '¿Cuánta dificultad tenés para lavarte/secarte la espalda?',
  '¿Cuánta dificultad tenés para ponerte una remera o blusa?',
  '¿Cuánta dificultad tenés para ponerte una camisa con botones por detrás?',
  '¿Cuánta dificultad tenés para ponerte los pantalones?',
  '¿Cuánta dificultad tenés para colocar un objeto pesado en un estante por encima del hombro?',
  '¿Cuánta dificultad tenés para cargar 5 kg con el brazo extendido a tu costado?',
  '¿Cuánta dificultad tenés para sacar algo del bolsillo trasero?',
]

// ─── NDI ───────────────────────────────────────────────────────────────────

export const NDI_ITEMS = [
  {
    label: 'Intensidad del dolor de cuello',
    options: [
      'No tengo dolor en este momento',
      'El dolor es muy leve en este momento',
      'El dolor es moderado en este momento',
      'El dolor es bastante intenso en este momento',
      'El dolor es muy intenso en este momento',
      'El dolor es el peor imaginable en este momento',
    ],
  },
  {
    label: 'Cuidado personal (lavarse, vestirse, etc.)',
    options: [
      'Puedo cuidarme normalmente sin que esto me cause dolor extra',
      'Puedo cuidarme normalmente pero me duele',
      'Es doloroso cuidarme y soy lento/a y cuidadoso/a',
      'Necesito algo de ayuda pero me las arreglo con la mayoría de los cuidados',
      'Necesito ayuda todos los días para la mayoría de los cuidados',
      'No me visto, me lavo con dificultad y me quedo en cama',
    ],
  },
  {
    label: 'Levantamiento de peso',
    options: [
      'Puedo levantar objetos pesados sin dolor extra',
      'Puedo levantar objetos pesados pero me causa dolor extra',
      'El dolor me impide levantar objetos pesados del piso, pero puedo si están en posición conveniente',
      'El dolor me impide levantar objetos pesados pero puedo levantar objetos ligeros a moderados si están en posición conveniente',
      'Solo puedo levantar objetos muy livianos',
      'No puedo levantar ni cargar nada',
    ],
  },
  {
    label: 'Lectura',
    options: [
      'Puedo leer todo lo que quiero sin dolor en el cuello',
      'Puedo leer todo lo que quiero con leve dolor en el cuello',
      'Puedo leer todo lo que quiero con dolor moderado en el cuello',
      'No puedo leer todo lo que quiero por dolor moderado en el cuello',
      'Apenas puedo leer por dolor intenso en el cuello',
      'No puedo leer nada',
    ],
  },
  {
    label: 'Cefaleas (dolores de cabeza)',
    options: [
      'No tengo dolores de cabeza en absoluto',
      'Tengo leves dolores de cabeza que aparecen infrecuentemente',
      'Tengo dolores de cabeza moderados que aparecen infrecuentemente',
      'Tengo dolores de cabeza moderados que aparecen frecuentemente',
      'Tengo dolores de cabeza intensos que aparecen frecuentemente',
      'Tengo dolores de cabeza casi constantemente',
    ],
  },
  {
    label: 'Concentración',
    options: [
      'Puedo concentrarme completamente cuando quiero sin dificultad',
      'Puedo concentrarme completamente cuando quiero con leve dificultad',
      'Tengo una dificultad regular para concentrarme cuando quiero',
      'Tengo mucha dificultad para concentrarme cuando quiero',
      'Tengo muchísima dificultad para concentrarme cuando quiero',
      'No puedo concentrarme en absoluto',
    ],
  },
  {
    label: 'Trabajo',
    options: [
      'Puedo trabajar todo lo que quiero',
      'Solo puedo hacer mi trabajo habitual, pero nada más',
      'Puedo hacer la mayor parte de mi trabajo habitual pero nada más',
      'No puedo hacer mi trabajo habitual',
      'Apenas puedo hacer cualquier trabajo',
      'No puedo hacer ningún trabajo',
    ],
  },
  {
    label: 'Conducción (manejar)',
    options: [
      'Puedo conducir mi auto sin ningún dolor de cuello',
      'Puedo conducir mi auto todo lo que quiero con leve dolor de cuello',
      'Puedo conducir mi auto todo lo que quiero con dolor de cuello moderado',
      'No puedo conducir mi auto todo lo que quiero por dolor de cuello moderado',
      'Apenas puedo conducir por dolor de cuello intenso',
      'No puedo conducir mi auto en absoluto',
    ],
  },
  {
    label: 'Sueño',
    options: [
      'No tengo problemas para dormir',
      'Mi sueño se ve levemente perturbado (menos de 1 hora sin poder dormir)',
      'Mi sueño se ve levemente perturbado (1-2 horas sin poder dormir)',
      'Mi sueño se ve moderadamente perturbado (2-3 horas sin poder dormir)',
      'Mi sueño se ve muy perturbado (3-5 horas sin poder dormir)',
      'Mi sueño está completamente perturbado (5-7 horas sin poder dormir)',
    ],
  },
  {
    label: 'Recreación',
    options: [
      'Puedo participar en todas mis actividades recreativas sin dolor de cuello',
      'Puedo participar en todas mis actividades recreativas con algo de dolor de cuello',
      'Puedo participar en la mayoría pero no en todas mis actividades recreativas habituales por el dolor de cuello',
      'Solo puedo participar en algunas actividades recreativas habituales por el dolor de cuello',
      'Apenas puedo participar en actividades recreativas por el dolor de cuello',
      'No puedo participar en ninguna actividad recreativa',
    ],
  },
]

// ─── Roland Morris ─────────────────────────────────────────────────────────

export const ROLAND_MORRIS_ITEMS = [
  'Me quedo en casa la mayor parte del tiempo por mi dolor de espalda.',
  'Cambio de posición frecuentemente para que mi espalda sea más cómoda.',
  'Camino más lento de lo normal por mi dolor de espalda.',
  'A causa de mi dolor de espalda, no hago ninguna de las tareas que normalmente hago en casa.',
  'A causa de mi dolor de espalda, uso el pasamanos para subir escaleras.',
  'A causa de mi dolor de espalda, me acuesto a descansar más frecuentemente.',
  'A causa de mi dolor de espalda, tengo que sostenerme de algo para levantarme de una silla.',
  'A causa de mi dolor de espalda, trato de que otras personas hagan las cosas por mí.',
  'Me visto más lento de lo normal por mi dolor de espalda.',
  'Solo me quedo de pie un rato corto a causa de mi dolor de espalda.',
  'A causa de mi dolor de espalda, trato de no inclinarme ni arrodillarme.',
  'Me resulta difícil levantarme de una silla a causa de mi dolor de espalda.',
  'Mi espalda me duele casi todo el tiempo.',
  'Me resulta difícil darme vuelta en la cama a causa de mi dolor de espalda.',
  'No tengo muy buen apetito a causa de mi dolor de espalda.',
  'Tengo problemas para ponerme las medias a causa de mi dolor de espalda.',
  'Solo camino distancias cortas a causa de mi dolor de espalda.',
  'Duermo menos bien a causa de mi dolor de espalda.',
  'A causa de mi dolor de espalda, me visto con ayuda de otras personas.',
  'Me quedo sentado la mayor parte del día a causa de mi dolor de espalda.',
  'Evito trabajos pesados en casa a causa de mi dolor de espalda.',
  'A causa de mi dolor de espalda, estoy más irritable y de mal humor de lo normal.',
  'A causa de mi dolor de espalda, subo escaleras más despacio de lo normal.',
  'Me quedo en cama casi todo el día a causa de mi dolor de espalda.',
]

// ─── Start Back ────────────────────────────────────────────────────────────

export const START_BACK_ITEMS = [
  { text: 'En las últimas 2 semanas, ¿el dolor de espalda se irradió hacia las piernas?', psychosocial: false },
  { text: 'En las últimas 2 semanas, ¿tuvo dolor de hombros o cuello también?', psychosocial: false },
  { text: 'Solo caminé distancias cortas a causa del dolor de espalda.', psychosocial: false },
  { text: 'En las últimas 2 semanas, me vestí más lento a causa del dolor de espalda.', psychosocial: false },
  { text: 'No es realmente seguro para una persona con una condición como la mía ser físicamente activo.', psychosocial: true },
  { text: 'Los pensamientos preocupantes han rondado mi mente muchas veces.', psychosocial: true },
  { text: 'Siento que mi dolor de espalda es terrible y que nunca va a mejorar.', psychosocial: true },
  { text: 'En general, no he disfrutado de las cosas que normalmente disfruto.', psychosocial: true },
  { text: 'En general, ¿qué tan molesto ha sido el dolor de espalda en las últimas 2 semanas?', psychosocial: true, isLast: true },
]

// Ítem 9: escala de molestia (0-4). Puntúa positivo (1) solo si es "Muy" o "Extremadamente".
export const START_BACK_BOTHER = ['Nada en absoluto', 'Un poco', 'Moderadamente', 'Muy molesto', 'Extremadamente']
export const START_BACK_BOTHER_POSITIVE = 3 // índice a partir del cual el ítem 9 puntúa

// ─── Tampa Scale ──────────────────────────────────────────────────────────

export const TAMPA_ITEMS = [
  { text: 'Tengo miedo de lesionarme si hago ejercicio.', reverse: false },
  { text: 'Si no hubiera intentado superar el dolor, este hubiera aumentado.', reverse: false },
  { text: 'Mi cuerpo me está diciendo que tengo algo peligrosamente mal.', reverse: false },
  { text: 'Mi dolor probablemente disminuiría si hiciera ejercicio.', reverse: true },
  { text: 'Las personas no me toman en serio suficientemente cuando tengo este dolor.', reverse: false },
  { text: 'El accidente me puso en riesgo de lastimar más mi cuerpo.', reverse: false },
  { text: 'El dolor siempre significa que me he lastimado el cuerpo.', reverse: false },
  { text: 'Solo porque algo aumenta el dolor no significa que sea peligroso.', reverse: true },
  { text: 'Tengo miedo de lastimar accidentalmente mi cuerpo.', reverse: false },
  { text: 'Estar seguro/a de no hacer movimientos innecesarios es lo más seguro que puedo hacer para prevenir que mi dolor empeore.', reverse: false },
  { text: 'No estaría en tanto dolor si no hubiera algo peligrosamente mal en mi cuerpo.', reverse: false },
  { text: 'Aunque algo me causa bastante dolor, no creo que sea realmente peligroso.', reverse: true },
  { text: 'El dolor me permite saber cuándo parar el ejercicio para que no me lastime.', reverse: false },
  { text: 'No es realmente seguro para alguien con una condición como la mía ser físicamente activo.', reverse: false },
  { text: 'No puedo hacer todo lo que las personas normales hacen porque es muy fácil para mí lastimarme.', reverse: false },
  { text: 'A pesar de que algo me causa dolor, no necesariamente significa que sea peligroso.', reverse: true },
  { text: 'Nadie debería tener que hacer ejercicio cuando tiene dolor.', reverse: false },
]

// ─── PCS Catastrofismo ────────────────────────────────────────────────────

export const PCS_ITEMS = [
  { text: 'Pienso en qué medida me duele.', subscale: 'rumination' },
  { text: 'Me pregunto si algo grave puede pasar.', subscale: 'helplessness' },
  { text: 'Es terrible y creo que nunca va a mejorar.', subscale: 'helplessness' },
  { text: 'Es horrible y siento que el dolor me supera.', subscale: 'helplessness' },
  { text: 'Siento que no puedo soportar más el dolor.', subscale: 'helplessness' },
  { text: 'Temo que el dolor empeore.', subscale: 'magnification' },
  { text: 'Pienso en otros momentos de dolor.', subscale: 'magnification' },
  { text: 'Deseo con desesperación que el dolor se vaya.', subscale: 'rumination' },
  { text: 'No consigo apartarlo de mi mente.', subscale: 'rumination' },
  { text: 'Sigo pensando en lo mucho que me duele.', subscale: 'rumination' },
  { text: 'Sigo pensando en las ganas que tengo de que se me quite el dolor.', subscale: 'rumination' },
  { text: 'No hay nada que pueda hacer para reducir la intensidad de mi dolor.', subscale: 'helplessness' },
  { text: 'Me pregunto si me puede pasar algo grave.', subscale: 'magnification' },
]

export const PCS_LABELS = ['Nada en absoluto', 'Un poco', 'De manera moderada', 'Mucho', 'Todo el tiempo']

// ─── Oswestry ─────────────────────────────────────────────────────────────

export const OSWESTRY_SECTIONS = [
  {
    label: 'Intensidad del dolor',
    options: [
      'Puedo tolerar el dolor sin necesitar analgésicos.',
      'El dolor es intenso pero puedo manejarlo sin tomar analgésicos.',
      'Los analgésicos me alivian completamente el dolor.',
      'Los analgésicos me alivian moderadamente el dolor.',
      'Los analgésicos apenas alivian el dolor.',
      'Los analgésicos no tienen efecto en el dolor y no los tomo.',
    ],
  },
  {
    label: 'Cuidado personal (lavarse, vestirse, etc.)',
    options: [
      'Puedo cuidarme normalmente sin empeorar el dolor.',
      'Puedo cuidarme normalmente pero es muy doloroso.',
      'Es doloroso cuidarme y soy lento/a y cuidadoso/a.',
      'Necesito algo de ayuda pero puedo con la mayoría de los cuidados.',
      'Necesito ayuda diaria para la mayoría de los cuidados.',
      'No me visto, me lavo con dificultad y me quedo en cama.',
    ],
  },
  {
    label: 'Levantamiento de peso',
    options: [
      'Puedo levantar objetos pesados sin dolor extra.',
      'Puedo levantar objetos pesados pero me causa dolor extra.',
      'El dolor me impide levantar objetos pesados del piso.',
      'El dolor me impide levantar objetos pesados pero puedo levantarlos de lugares accesibles.',
      'Solo puedo levantar objetos muy livianos.',
      'No puedo levantar ni cargar nada.',
    ],
  },
  {
    label: 'Caminar',
    options: [
      'El dolor no me impide caminar cualquier distancia.',
      'El dolor me impide caminar más de 1.6 km.',
      'El dolor me impide caminar más de 800 m.',
      'El dolor me impide caminar más de 400 m.',
      'Solo puedo caminar con bastón o muletas.',
      'Estoy en cama la mayor parte del tiempo y tengo que arrastrarme para ir al baño.',
    ],
  },
  {
    label: 'Estar sentado/a',
    options: [
      'Puedo estar sentado/a en cualquier silla todo el tiempo que quiera.',
      'Puedo estar sentado/a en mi silla favorita todo el tiempo que quiera.',
      'El dolor me impide estar sentado/a más de 1 hora.',
      'El dolor me impide estar sentado/a más de media hora.',
      'El dolor me impide estar sentado/a más de 10 minutos.',
      'El dolor me impide estar sentado/a en absoluto.',
    ],
  },
  {
    label: 'Estar de pie',
    options: [
      'Puedo estar de pie todo el tiempo que quiera sin dolor extra.',
      'Puedo estar de pie todo el tiempo que quiera pero me da dolor extra.',
      'El dolor me impide estar de pie más de 1 hora.',
      'El dolor me impide estar de pie más de media hora.',
      'El dolor me impide estar de pie más de 10 minutos.',
      'El dolor me impide estar de pie en absoluto.',
    ],
  },
  {
    label: 'Dormir',
    options: [
      'El dolor no perturba mi sueño.',
      'El dolor perturba mi sueño de vez en cuando.',
      'El dolor me quita menos de 6 horas de sueño.',
      'El dolor me quita menos de 4 horas de sueño.',
      'El dolor me quita menos de 2 horas de sueño.',
      'El dolor me impide dormir en absoluto.',
    ],
  },
  {
    label: 'Vida sexual (si aplica)',
    options: [
      'Mi vida sexual es normal y no me causa dolor extra.',
      'Mi vida sexual es normal pero me causa algo de dolor extra.',
      'Mi vida sexual es casi normal pero es muy dolorosa.',
      'Mi vida sexual se ve muy limitada por el dolor.',
      'Mi vida sexual está casi ausente por el dolor.',
      'El dolor me impide tener vida sexual.',
    ],
  },
  {
    label: 'Vida social',
    options: [
      'Mi vida social es normal y no me aumenta el dolor.',
      'Mi vida social es normal pero me aumenta el dolor.',
      'El dolor tiene poco efecto sobre mi vida social, excepto limitar mis actividades más enérgicas.',
      'El dolor ha restringido mi vida social y no salgo tan frecuentemente.',
      'El dolor ha restringido mi vida social al hogar.',
      'No tengo vida social por el dolor.',
    ],
  },
  {
    label: 'Viajar / desplazarse',
    options: [
      'Puedo viajar a cualquier parte sin dolor.',
      'Puedo viajar a cualquier parte pero me da dolor extra.',
      'El dolor es intenso pero puedo realizar viajes de más de 2 horas.',
      'El dolor me restringe a viajes de menos de 1 hora.',
      'El dolor me restringe a viajes cortos de menos de 30 minutos.',
      'El dolor me impide viajar excepto para recibir tratamiento.',
    ],
  },
]

// ─── DASH ─────────────────────────────────────────────────────────────────

export const DASH_ITEMS = [
  'Abrir un frasco nuevo o aflojado.',
  'Escribir.',
  'Girar una llave.',
  'Preparar una comida.',
  'Empujar para abrir una puerta pesada.',
  'Colocar un objeto en un estante por encima de la cabeza.',
  'Tareas domésticas pesadas (limpiar pisos, lavar paredes).',
  'Jardinería o trabajo en el patio.',
  'Tender la cama.',
  'Cargar una bolsa de compras o un maletín.',
  'Cargar un objeto pesado (más de 5 kg).',
  'Cambiar una bombita de luz por encima de tu cabeza.',
  'Lavarte o secarte el cabello.',
  'Lavarte la espalda.',
  'Ponerte un pullover.',
  'Usar un cuchillo para cortar comida.',
  'Actividades recreativas que requieren poco esfuerzo (jugar a las cartas, tejer, etc.).',
  'Actividades recreativas que impliquen algo de fuerza o impacto en el brazo, hombro o mano (golf, martillar, tenis, etc.).',
  'Actividades recreativas en las que muevas libremente el brazo, hombro o mano (frisbee, bádminton, etc.).',
  'Transporte (movilizarte de un lugar a otro).',
  'Actividad sexual.',
  'En la última semana, ¿en qué medida tu problema de brazo, hombro o mano interfirió con tus actividades sociales normales con familia, amigos, vecinos o grupos?',
  'En la última semana, ¿estuviste limitado/a en tu trabajo u otras actividades cotidianas regulares como resultado de tu problema de brazo, hombro o mano?',
  'Dolor de brazo, hombro o mano.',
  'Hormigueo (punzadas) en el brazo, hombro o mano.',
  'En la última semana, ¿qué tan intenso fue el dolor de brazo, hombro o mano durante las actividades?',
  'En la última semana, ¿qué tan intenso fue el dolor de brazo, hombro o mano en reposo?',
  'En la última semana, ¿qué tan intenso fue la sensación de debilidad en el brazo, hombro o mano?',
  'En la última semana, ¿qué tan intenso fue la rigidez en el brazo, hombro o mano?',
  'En la última semana, ¿tuviste dificultad para dormir a causa de dolor en el brazo, hombro o mano?',
]

// ─── LEFS ─────────────────────────────────────────────────────────────────

export const LEFS_ITEMS = [
  'Cualquiera de sus actividades usuales de trabajo, tareas domésticas o escolares.',
  'Sus pasatiempos habituales, actividades recreativas o deportes.',
  'Entrar y salir de la bañera.',
  'Caminar de una habitación a otra.',
  'Ponerse sus zapatos y medias.',
  'Agacharse.',
  'Levantar un objeto del piso (por ejemplo, una bolsa de compras).',
  'Realizar actividades livianas en el hogar.',
  'Realizar actividades pesadas en el hogar.',
  'Entrar y salir de un auto.',
  'Caminar dos cuadras.',
  'Caminar una milla (aproximadamente 1,6 km).',
  'Subir o bajar 10 escalones (aproximadamente un piso de escaleras).',
  'Estar de pie durante una hora.',
  'Estar sentado/a durante una hora.',
  'Correr en terreno llano.',
  'Correr en terreno desparejo.',
  'Hacer giros bruscos mientras corre.',
  'Saltar.',
  'Rodar en la cama.',
]

export const LEFS_OPTIONS = [
  'Extrema dificultad o incapaz de realizar',
  'Dificultad bastante grande',
  'Dificultad moderada',
  'Un poco de dificultad',
  'Ninguna dificultad',
]

// ─── FABQ ─────────────────────────────────────────────────────────────────

export const FABQ_ITEMS = [
  { text: 'Mi dolor fue causado por actividad física.', subscale: null },
  { text: 'La actividad física hace que mi dolor empeore.', subscale: 'pa' },
  { text: 'La actividad física podría dañar mi espalda.', subscale: 'pa' },
  { text: 'No debería hacer actividad física que cause (o podría causar) dolor.', subscale: 'pa' },
  { text: 'No puedo hacer actividad física que cause (o podría causar) dolor.', subscale: 'pa' },
  { text: 'Mi dolor fue causado por mi trabajo o por un accidente en el trabajo.', subscale: 'work' },
  { text: 'Mi trabajo agravó mi dolor.', subscale: 'work' },
  { text: 'Tengo una reclamación de compensación por mi dolor.', subscale: null },
  { text: 'Mi trabajo es demasiado agotador físicamente para mí.', subscale: 'work' },
  { text: 'Mi trabajo hace que mi dolor empeore.', subscale: 'work' },
  { text: 'Mi trabajo podría dañar mi espalda.', subscale: 'work' },
  { text: 'Dado mi dolor actual, no debería hacer mi trabajo habitual.', subscale: 'work' },
  { text: 'No puedo hacer mi trabajo habitual con mi dolor actual.', subscale: 'work' },
  { text: 'Con mi dolor actual, hacer mi trabajo habitual me dañaría.', subscale: null },
  { text: 'No puedo hacer mi trabajo habitual hasta que mi dolor sea tratado.', subscale: 'work' },
  { text: 'No creo que vuelva a mi trabajo habitual en los próximos 3 meses.', subscale: 'work' },
  { text: 'No creo que alguna vez sea capaz de volver a mi trabajo habitual.', subscale: null },
]

// ─── Respuestas del paciente (para mostrar en la ficha) ─────────────────────

export interface ResponseItem {
  text: string
  detail?: string // opción elegida o puntaje del ítem
  tag?: string // etiqueta (Psicosocial, AF, Trabajo, Dolor, etc.)
  relevant: boolean // true si es un ítem clínicamente relevante (a trabajar)
}

// Devuelve TODAS las respuestas del paciente de un resultado guardado, marcando
// con `relevant` las que superan el umbral clínico (los ítems a trabajar).
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function getResponseItems(type: string, data: any): ResponseItem[] {
  if (!data) return []
  const items: ResponseItem[] = []

  switch (type) {
    case 'spadi': {
      ;(data.pain_items ?? []).forEach((v: number, i: number) => {
        if (SPADI_PAIN[i]) items.push({ text: SPADI_PAIN[i], detail: `${v}/10`, tag: 'Dolor', relevant: v >= 4 })
      })
      ;(data.disability_items ?? []).forEach((v: number, i: number) => {
        if (SPADI_DISABILITY[i]) items.push({ text: SPADI_DISABILITY[i], detail: `${v}/10`, tag: 'Discapacidad', relevant: v >= 4 })
      })
      break
    }
    case 'ndi': {
      ;(data.answers ?? []).forEach((v: number, i: number) => {
        if (NDI_ITEMS[i]) items.push({ text: NDI_ITEMS[i].label, detail: NDI_ITEMS[i].options[v], relevant: v >= 2 })
      })
      break
    }
    case 'roland_morris': {
      ;(data.answers ?? []).forEach((v: boolean, i: number) => {
        if (ROLAND_MORRIS_ITEMS[i]) items.push({ text: ROLAND_MORRIS_ITEMS[i], detail: v ? 'Sí' : 'No', relevant: !!v })
      })
      break
    }
    case 'start_back': {
      const answers = data.answers ?? []
      // Ítems 1-8 (booleanos): positivo = "Sí"
      answers.forEach((v: boolean, i: number) => {
        if (i < 8 && START_BACK_ITEMS[i]) {
          items.push({
            text: START_BACK_ITEMS[i].text,
            detail: v ? 'Sí' : 'No',
            tag: START_BACK_ITEMS[i].psychosocial ? 'Psicosocial' : undefined,
            relevant: !!v,
          })
        }
      })
      // Ítem 9 (molestia): registros nuevos guardan `bother` (0-4); los viejos, un booleano en answers[8]
      const bother = data.bother
      const hasBother = bother !== undefined && bother !== null
      const item9Positive = hasBother ? bother >= START_BACK_BOTHER_POSITIVE : !!answers[8]
      items.push({
        text: START_BACK_ITEMS[8].text,
        detail: hasBother ? START_BACK_BOTHER[bother] : answers[8] ? 'Sí' : 'No',
        tag: 'Psicosocial',
        relevant: item9Positive,
      })
      break
    }
    case 'tampa': {
      ;(data.answers ?? []).forEach((v: number, i: number) => {
        if (!TAMPA_ITEMS[i]) return
        const adjusted = TAMPA_ITEMS[i].reverse ? 5 - v : v
        items.push({ text: TAMPA_ITEMS[i].text, detail: `${v}/4`, relevant: adjusted >= 3 })
      })
      break
    }
    case 'catastrofismo': {
      ;(data.answers ?? []).forEach((v: number, i: number) => {
        if (PCS_ITEMS[i]) items.push({ text: PCS_ITEMS[i].text, detail: PCS_LABELS[v], relevant: v >= 2 })
      })
      break
    }
    case 'oswestry': {
      ;(data.answers ?? []).forEach((v: number, i: number) => {
        if (OSWESTRY_SECTIONS[i]) items.push({ text: OSWESTRY_SECTIONS[i].label, detail: OSWESTRY_SECTIONS[i].options[v], relevant: v >= 2 })
      })
      break
    }
    case 'dash': {
      ;(data.answers ?? []).forEach((v: number, i: number) => {
        if (DASH_ITEMS[i]) items.push({ text: DASH_ITEMS[i], detail: `${v}/5`, relevant: v >= 3 })
      })
      break
    }
    case 'lefs': {
      ;(data.answers ?? []).forEach((v: number, i: number) => {
        if (LEFS_ITEMS[i]) items.push({ text: LEFS_ITEMS[i], detail: LEFS_OPTIONS[v], relevant: v <= 2 })
      })
      break
    }
    case 'psfs': {
      ;(data.activities ?? []).forEach((a: { name: string; score: number }) => {
        if (a.name?.trim()) items.push({ text: a.name, detail: `${a.score}/10`, relevant: a.score < 7 })
      })
      break
    }
    case 'fabq': {
      ;(data.answers ?? []).forEach((v: number, i: number) => {
        if (!FABQ_ITEMS[i]) return
        const sub = FABQ_ITEMS[i].subscale
        items.push({ text: FABQ_ITEMS[i].text, detail: `${v}/6`, tag: sub === 'pa' ? 'AF' : sub === 'work' ? 'Trabajo' : undefined, relevant: v >= 4 })
      })
      break
    }
  }

  return items
}
