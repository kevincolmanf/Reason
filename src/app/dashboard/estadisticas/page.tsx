import type { SupabaseClient } from '@supabase/supabase-js'
import { createClient } from '@/utils/supabase/server'
import { createAdminClient } from '@/utils/supabase/admin'
import { redirect } from 'next/navigation'
import Header from '@/components/Header'
import { getActiveContext } from '@/lib/context'
import EstadisticasClient, { type DiagnosisOption, type BodyRegion } from './EstadisticasClient'
import { ageBucket, type CaseRow } from './stats'

export const dynamic = 'force-dynamic'
export const metadata = { title: 'Estadísticas | Reason' }

type PatientRow = { id: string; birth_date: string | null; age: number | null }
type FichaRow = {
  patient_id: string
  fecha: string | null
  diagnosis_id: string | null
  mecanismo_lesion: CaseRow['mecanismoLesion']
  lateralidad: CaseRow['lateralidad']
}
type ProfileRow = {
  patient_id: string
  sexo: CaseRow['sexo']
  nivel_actividad_fisica: CaseRow['nivelActividadFisica']
  tabaquismo: CaseRow['tabaquismo']
  consumo_alcohol: CaseRow['consumoAlcohol']
  diabetes: boolean | null
  hipertension: boolean | null
  obesidad: boolean | null
  enf_cardiovascular: boolean | null
  osteoporosis: boolean | null
  cirugia_previa: boolean | null
  nivel_socioeconomico: CaseRow['nivelSocioeconomico']
  occupation_id: string | null
}
type DiagnosisRow = { id: string; nombre: string; codigo_cie10: string | null; body_region_id: string }
type OccupationRow = { id: string; nivel_esfuerzo: 'sedentaria' | 'de_pie' | 'esfuerzo_fisico' }

function calcAge(birth_date: string | null, fallback: number | null): number | null {
  if (birth_date) {
    const today = new Date(); const dob = new Date(birth_date)
    let a = today.getFullYear() - dob.getFullYear()
    if (today.getMonth() < dob.getMonth() || (today.getMonth() === dob.getMonth() && today.getDate() < dob.getDate())) a--
    return a
  }
  return fallback
}

// Supabase corta las respuestas en 1000 filas por defecto — paginamos en
// bloques para traer todo (mismo patrón que src/app/account/crm/page.tsx).
const PAGE_SIZE = 1000
type PagedQuery<T> = { range: (from: number, to: number) => PromiseLike<{ data: T[] | null; error: unknown }> }
async function fetchAllRows<T>(buildQuery: () => PagedQuery<T>): Promise<T[]> {
  const all: T[] = []
  for (let from = 0; ; from += PAGE_SIZE) {
    const { data, error } = await buildQuery().range(from, from + PAGE_SIZE - 1)
    if (error) throw error
    if (!data || data.length === 0) break
    all.push(...(data as T[]))
    if (data.length < PAGE_SIZE) break
  }
  return all
}

export default async function EstadisticasPage() {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const ctx = await getActiveContext(user.id, supabase)
  const isOrgCtx = ctx.type === 'org' && !!ctx.orgId

  // Acceso: contexto personal siempre permitido (datos propios). Contexto de
  // equipo: solo el dueño de la organización ve el agregado — un integrante
  // no-dueño no tiene acceso a esta pantalla, ni vacía.
  let scopedClient: SupabaseClient = supabase
  if (isOrgCtx) {
    const { data: org } = await supabase
      .from('organizations')
      .select('id')
      .eq('id', ctx.orgId!)
      .eq('owner_id', user.id)
      .maybeSingle()
    if (!org) redirect('/dashboard/pacientes')
    // El dueño no siempre tiene fila en organization_members — un cliente
    // admin (bypassa RLS) evita que eso deje casos afuera del agregado.
    scopedClient = createAdminClient()
  }

  const patients = await fetchAllRows<PatientRow>(() =>
    isOrgCtx
      ? scopedClient.from('patients').select('id, birth_date, age').eq('org_id', ctx.orgId!)
      : scopedClient.from('patients').select('id, birth_date, age').eq('user_id', user.id).is('org_id', null)
  )
  const patientIds = patients.map(p => p.id)
  const ageById = new Map(patients.map(p => [p.id, calcAge(p.birth_date, p.age)]))

  const [fichas, profiles, diagnosisGlobal, diagnosisCustom, occupationGlobal, occupationCustom, bodyRegions] = await Promise.all([
    patientIds.length === 0 ? Promise.resolve([]) : fetchAllRows<FichaRow>(() =>
      scopedClient.from('patient_fichas')
        .select('patient_id, fecha, diagnosis_id, mecanismo_lesion, lateralidad')
        .in('patient_id', patientIds)
        .not('diagnosis_id', 'is', null)),
    patientIds.length === 0 ? Promise.resolve([]) : fetchAllRows<ProfileRow>(() =>
      scopedClient.from('patient_clinical_profile').select('*').in('patient_id', patientIds)),
    fetchAllRows<DiagnosisRow>(() =>
      scopedClient.from('diagnosis_catalog').select('id, nombre, codigo_cie10, body_region_id')),
    isOrgCtx
      ? fetchAllRows<DiagnosisRow>(() =>
          scopedClient.from('diagnosis_catalog_custom').select('id, nombre, codigo_cie10, body_region_id').eq('org_id', ctx.orgId!))
      : fetchAllRows<DiagnosisRow>(() =>
          scopedClient.from('diagnosis_catalog_custom').select('id, nombre, codigo_cie10, body_region_id').eq('user_id', user.id)),
    fetchAllRows<OccupationRow>(() =>
      scopedClient.from('occupation_catalog').select('id, nivel_esfuerzo')),
    isOrgCtx
      ? fetchAllRows<OccupationRow>(() =>
          scopedClient.from('occupation_catalog_custom').select('id, nivel_esfuerzo').eq('org_id', ctx.orgId!))
      : fetchAllRows<OccupationRow>(() =>
          scopedClient.from('occupation_catalog_custom').select('id, nivel_esfuerzo').eq('user_id', user.id)),
    fetchAllRows<BodyRegion>(() =>
      scopedClient.from('body_region_catalog').select('id, nombre')),
  ])

  const diagnosisById = new Map([...diagnosisGlobal, ...diagnosisCustom].map(d => [d.id, d]))
  const occupationEsfuerzoById = new Map([...occupationGlobal, ...occupationCustom].map(o => [o.id, o.nivel_esfuerzo]))
  const profileByPatient = new Map(profiles.map(p => [p.patient_id, p]))

  const cases: CaseRow[] = fichas.map(f => {
    const profile = profileByPatient.get(f.patient_id)
    return {
      patientId: f.patient_id,
      fichaFecha: f.fecha,
      diagnosisId: f.diagnosis_id,
      bodyRegionId: f.diagnosis_id ? diagnosisById.get(f.diagnosis_id)?.body_region_id ?? null : null,
      mecanismoLesion: f.mecanismo_lesion,
      lateralidad: f.lateralidad,
      sexo: profile?.sexo ?? null,
      nivelActividadFisica: profile?.nivel_actividad_fisica ?? null,
      tabaquismo: profile?.tabaquismo ?? null,
      consumoAlcohol: profile?.consumo_alcohol ?? null,
      diabetes: profile?.diabetes ?? null,
      hipertension: profile?.hipertension ?? null,
      obesidad: profile?.obesidad ?? null,
      enfCardiovascular: profile?.enf_cardiovascular ?? null,
      osteoporosis: profile?.osteoporosis ?? null,
      cirugiaPrevia: profile?.cirugia_previa ?? null,
      nivelSocioeconomico: profile?.nivel_socioeconomico ?? null,
      occupationNivelEsfuerzo: profile?.occupation_id ? occupationEsfuerzoById.get(profile.occupation_id) ?? null : null,
      ageBucket: ageBucket(ageById.get(f.patient_id) ?? null),
    }
  })

  const diagnosisOptions: DiagnosisOption[] = Array.from(diagnosisById.values()).map(d => ({
    id: d.id, nombre: d.nombre, codigoCie10: d.codigo_cie10, bodyRegionId: d.body_region_id,
  }))

  return (
    <div className="min-h-screen bg-bg-primary flex flex-col">
      <Header />
      <main className="flex-grow w-full max-w-[1080px] mx-auto px-4 md:px-8 py-10">
        <h1 className="text-[28px] font-medium tracking-[-0.01em] mb-2">Estadísticas</h1>
        <p className="text-[14px] text-text-secondary mb-8">
          {isOrgCtx ? 'Agregado de todos los casos del equipo.' : 'Agregado de tus casos.'} Solo conteos y porcentajes — nunca lista de pacientes.
        </p>
        <EstadisticasClient cases={cases} diagnosisOptions={diagnosisOptions} bodyRegions={bodyRegions} />
      </main>
    </div>
  )
}
