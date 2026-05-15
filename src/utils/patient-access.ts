import { redirect } from 'next/navigation'
import { createClient } from '@/utils/supabase/server'

/**
 * Verifies the current user can access a patient (owns it or is in its org).
 * Redirects to /dashboard/pacientes if not found or unauthorized.
 */
export async function verifyPatientAccess(patientId: string, userId: string): Promise<void> {
  const supabase = createClient()

  const { data: patient } = await supabase
    .from('patients')
    .select('user_id, org_id')
    .eq('id', patientId)
    .single()

  if (!patient) redirect('/dashboard/pacientes')
  if (patient.user_id === userId) return

  if (patient.org_id) {
    const { data: membership } = await supabase
      .from('organization_members')
      .select('user_id')
      .eq('org_id', patient.org_id)
      .eq('user_id', userId)
      .single()
    if (membership) return
  }

  redirect('/dashboard/pacientes')
}
