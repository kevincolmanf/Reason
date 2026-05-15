import { createClient } from '@/utils/supabase/server'
import { clearActiveContext } from '@/lib/context'
import { NextResponse } from 'next/server'

export async function POST(request: Request) {
  const supabase = createClient()
  await supabase.auth.signOut()
  clearActiveContext()

  return NextResponse.redirect(new URL('/', request.url), {
    status: 302,
  })
}
