import { NextResponse } from 'next/server'
import { createAdminClient } from '@/utils/supabase/admin'

// El paciente confirma o cancela su turno desde la página pública /turno/[token].
// No requiere autenticación: se valida por el confirm_token del turno.
export async function POST(request: Request, { params }: { params: { token: string } }) {
  try {
    const supabase = createAdminClient()
    const { token } = params
    const { action } = await request.json()

    if (action !== 'confirmar' && action !== 'cancelar') {
      return NextResponse.json({ error: 'Acción inválida' }, { status: 400 })
    }

    const { data: turno, error } = await supabase
      .from('turnos')
      .select('id, status, is_blocked')
      .eq('confirm_token', token)
      .single()

    if (error || !turno) {
      return NextResponse.json({ error: 'Turno no encontrado' }, { status: 404 })
    }

    if (turno.is_blocked) {
      return NextResponse.json({ error: 'Turno no válido' }, { status: 400 })
    }

    // Si el turno ya fue atendido, no permitir que el paciente lo modifique.
    if (turno.status === 'presente' || turno.status === 'ausente') {
      return NextResponse.json({ error: 'Este turno ya no se puede modificar' }, { status: 409 })
    }

    const newStatus = action === 'confirmar' ? 'confirmado' : 'cancelado'

    const { error: updateError } = await supabase
      .from('turnos')
      .update({ status: newStatus })
      .eq('confirm_token', token)

    if (updateError) {
      console.error('[turno/confirm]', updateError)
      return NextResponse.json({ error: 'No se pudo actualizar el turno' }, { status: 500 })
    }

    return NextResponse.json({ success: true, status: newStatus })
  } catch (err) {
    console.error('[turno/confirm]', err)
    return NextResponse.json({ error: 'Error interno' }, { status: 500 })
  }
}
