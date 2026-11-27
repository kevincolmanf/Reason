import Header from '@/components/Header'
import Link from 'next/link'
import { createClient } from '@/utils/supabase/server'
import { redirect } from 'next/navigation'
import FichaClient from './FichaClient'
import { verifyPatientAccess, logFichaAccess } from '@/utils/patient-access'
import { getOrgFeatureSetting } from '@/lib/featureSettings'
import { FEATURE_KEY_ESTANDARES_CALIDAD, withEstandaresCalidadDefaults } from '@/lib/qualityStandards/defaults'
import type { IntakeFieldDef } from '@/lib/qualityStandards/intakeFields'
import { DEFAULT_AREAS } from '@/lib/agendaAreas'

export const metadata = {
  title: 'Ficha Kinésica | Reason',
}

export default async function FichaPage({ params }: { params: { id: string } }) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  await verifyPatientAccess(params.id, user.id)

  const { data: patient } = await supabase
    .from('patients')
    .select('id, name, age, occupation, org_id, area, kine_mode')
    .eq('id', params.id)
    .single()

  if (!patient) redirect('/dashboard/pacientes')

  // Canonical ficha: oldest first (original always predates auto-created duplicates)
  let { data: ficha } = await supabase
    .from('patient_fichas')
    .select('*')
    .eq('patient_id', params.id)
    .order('created_at', { ascending: true })
    .limit(1)
    .maybeSingle()

  if (!ficha) {
    const { data: newFicha } = await supabase
      .from('patient_fichas')
      .insert({ patient_id: params.id, user_id: user.id, ficha_data: {} })
      .select()
      .single()
    if (!newFicha) redirect('/dashboard/pacientes')
    ficha = newFicha
  }

  logFichaAccess(ficha.id, patient.id, patient.org_id, user.id)

  // Estándares de calidad: apagado por defecto (espacio personal o centro sin
  // el feature prendido) — en ese caso ninguna de las 3 piezas nuevas se monta.
  const estandaresCalidad = patient.org_id
    ? await getOrgFeatureSetting(patient.org_id, FEATURE_KEY_ESTANDARES_CALIDAD, supabase)
    : { enabled: false, config: {} }
  const estandaresCalidadConfig = withEstandaresCalidadDefaults(estandaresCalidad.config)

  // Área efectiva del paciente para este feature: patients.area si el centro
  // ya la usa; si no, el viejo binario kine_mode (compatibilidad total con
  // centros que nunca tocaron el campo nuevo).
  const patientArea = patient.area ?? (patient.kine_mode ? 'Kinesiología' : 'Entrenamiento')
  const areaIntakeFields: Record<string, IntakeFieldDef[]> = {}
  for (const [area, cfg] of Object.entries(estandaresCalidadConfig.areas)) {
    areaIntakeFields[area] = cfg.campos_evaluacion_ingreso ?? []
  }

  // AttributionPicker (dentro de cada componente) resuelve "quién sos" solo
  // — no hace falta traer la lista de integrantes acá.
  let agendaAreas: string[] = DEFAULT_AREAS
  if (estandaresCalidad.enabled && patient.org_id) {
    const { data: orgData } = await supabase
      .from('organizations').select('agenda_areas').eq('id', patient.org_id).single()
    agendaAreas = (orgData?.agenda_areas as string[] | null) ?? DEFAULT_AREAS
  }

  const [{ data: questionnaireResults }, { data: dynamoResults }] = await Promise.all([
    supabase
      .from('questionnaire_results')
      .select('id, questionnaire_type, score, interpretation, created_at, result_data')
      .eq('patient_id', params.id)
      .order('created_at', { ascending: false }),
    supabase
      .from('dynamometer_results')
      .select('id, unit, muscle_results, notes, created_at')
      .eq('patient_id', params.id)
      .order('created_at', { ascending: false }),
  ])

  return (
    <div className="min-h-screen bg-bg-primary flex flex-col">
      <Header />
      <main className="flex-grow w-full max-w-[860px] mx-auto px-8 py-10">
        <div className="flex items-center gap-2 text-[13px] text-text-secondary mb-8">
          <Link href="/dashboard/pacientes" className="hover:text-text-primary no-underline">Pacientes</Link>
          <span>/</span>
          <Link href={`/dashboard/pacientes/${patient.id}`} className="hover:text-text-primary no-underline">{patient.name}</Link>
          <span>/</span>
          <span className="text-text-primary">Ficha Kinésica</span>
        </div>

        <FichaClient
          ficha={ficha!}
          patientId={patient.id}
          patientName={patient.name}
          orgId={patient.org_id}
          questionnaireResults={questionnaireResults ?? []}
          dynamoResults={dynamoResults ?? []}
          userId={user.id}
          estandaresCalidadEnabled={estandaresCalidad.enabled}
          patientArea={patientArea}
          areaIntakeFields={areaIntakeFields}
          agendaAreas={agendaAreas}
        />
      </main>
    </div>
  )
}
