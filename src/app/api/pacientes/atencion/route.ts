import { createClient } from '@/utils/supabase/server'
import { createAdminClient } from '@/utils/supabase/admin'
import { NextResponse } from 'next/server'

// Registra una "atención de hoy" de un paciente en modo kine y arma la línea de
// continuidad (auto_summary) del lado del servidor, para que sea consistente sin
// depender de que el profesional escriba. El texto libre (note) es opcional.

const SYMPTOMS = ['mejor', 'igual', 'peor']
const MODALITIES: Record<string, string> = { manual: 'terapia manual', reeval: 'reevaluación', cuest: 'cuestionario' }

export async function POST(request: Request) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })

  let body: { patientId?: string; symptom?: string | null; manageSymptoms?: boolean; modalities?: string[]; note?: string; adjustedSession?: boolean }
  try { body = await request.json() } catch { return NextResponse.json({ error: 'Body inválido' }, { status: 400 }) }
  const { patientId } = body
  const symptom = body.symptom ?? null
  const manageSymptoms = body.manageSymptoms === true
  const modalities = Array.isArray(body.modalities) ? body.modalities.filter(m => m in MODALITIES) : []
  const note = (body.note ?? '').trim().slice(0, 1000)
  const adjustedSession = body.adjustedSession === true

  if (!patientId) return NextResponse.json({ error: 'Falta patientId' }, { status: 400 })
  if (symptom !== null && !SYMPTOMS.includes(symptom)) return NextResponse.json({ error: 'Síntoma inválido' }, { status: 400 })

  const admin = createAdminClient()

  const { data: patient } = await admin
    .from('patients')
    .select('user_id, org_id, kine_mode')
    .eq('id', patientId)
    .single()
  if (!patient) return NextResponse.json({ error: 'Paciente no encontrado' }, { status: 404 })
  if (!patient.kine_mode) return NextResponse.json({ error: 'El paciente no está en modo kinesiología' }, { status: 409 })

  // Acceso: creador del registro, o miembro/dueño de la organización del paciente.
  let allowed = patient.user_id === user.id
  if (!allowed && patient.org_id) {
    const { count } = await admin
      .from('organization_members')
      .select('*', { count: 'exact', head: true })
      .eq('org_id', patient.org_id)
      .eq('user_id', user.id)
    if ((count ?? 0) > 0) allowed = true
    if (!allowed) {
      const { data: org } = await admin
        .from('organizations').select('id').eq('id', patient.org_id).eq('owner_id', user.id).maybeSingle()
      if (org) allowed = true
    }
  }
  if (!allowed) return NextResponse.json({ error: 'Sin acceso a este paciente' }, { status: 403 })

  // Nombre del profesional (denormalizado, sobrevive al borrado del usuario).
  const { data: prof } = await admin.from('users').select('full_name, email').eq('id', user.id).maybeSingle()
  const professionalName = prof?.full_name || prof?.email || null

  // Línea de continuidad: síntoma + lo que se hizo. No inventa un "ajuste" que el
  // profesional no marcó; el diff fino de ejercicios se sumará al integrar el plan.
  const parts: string[] = []
  if (symptom) parts.push(`Síntoma: ${symptom}`)
  const actions: string[] = []
  if (manageSymptoms) actions.push('manejo de síntomas (sin carga)')
  for (const m of modalities) actions.push(MODALITIES[m])
  if (adjustedSession) actions.push('ajustó la sesión')
  if (actions.length) parts.push(actions.join(' · '))
  const autoSummary = parts.length ? parts.join(' · ') : 'Atención registrada'

  const { data: inserted, error } = await admin
    .from('kine_attentions')
    .insert({
      patient_id: patientId,
      user_id: user.id,
      professional_name: professionalName,
      symptom,
      manage_symptoms: manageSymptoms,
      modalities,
      auto_summary: autoSummary,
      note: note || null,
    })
    .select('id, attended_on, professional_name, symptom, manage_symptoms, modalities, auto_summary, note, created_at')
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true, attention: inserted })
}
