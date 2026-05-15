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

/**
 * Verifies the current user can access an exercise plan.
 * Covers: plan owner, org member accessing owner's plan, owner accessing member's plan,
 * and two members of the same org.
 * Redirects to /dashboard/ejercicios/plan if unauthorized.
 */
export async function verifyPlanAccess(planUserId: string, planPatientId: string | null, userId: string): Promise<void> {
  if (planUserId === userId) return

  const supabase = createClient()

  // Strategy 1: plan creator owns an org → requester is a member of that org
  const { data: creatorOrgs } = await supabase
    .from('organizations')
    .select('id')
    .eq('owner_id', planUserId)

  if (creatorOrgs && creatorOrgs.length > 0) {
    const orgIds = creatorOrgs.map(o => o.id)
    const { data: m } = await supabase
      .from('organization_members')
      .select('user_id')
      .eq('user_id', userId)
      .in('org_id', orgIds)
      .maybeSingle()
    if (m) return
  }

  // Strategy 2: requester owns an org → plan creator is a member of that org
  const { data: requesterOrgs } = await supabase
    .from('organizations')
    .select('id')
    .eq('owner_id', userId)

  if (requesterOrgs && requesterOrgs.length > 0) {
    const orgIds = requesterOrgs.map(o => o.id)
    const { data: m } = await supabase
      .from('organization_members')
      .select('user_id')
      .eq('user_id', planUserId)
      .in('org_id', orgIds)
      .maybeSingle()
    if (m) return
  }

  // Strategy 3: both are members of the same org (via patient's org_id as tie-breaker)
  if (planPatientId) {
    const { data: patient } = await supabase
      .from('patients')
      .select('org_id')
      .eq('id', planPatientId)
      .single()

    if (patient?.org_id) {
      const { data: m } = await supabase
        .from('organization_members')
        .select('user_id')
        .eq('org_id', patient.org_id)
        .eq('user_id', userId)
        .maybeSingle()
      if (m) return
    }
  }

  redirect('/dashboard/ejercicios/plan')
}
