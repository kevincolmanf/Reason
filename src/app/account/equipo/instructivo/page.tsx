import { createClient } from '@/utils/supabase/server'
import { redirect } from 'next/navigation'
import PrintButton from './PrintButton'

export const metadata = { title: 'Instructivo del Equipo | Reason' }

const MEMBER_CAN = [
  { title: 'Acceso propio', desc: 'Cada integrante entra con su propio email y contraseña. No se comparten credenciales.' },
  { title: 'Pacientes compartidos', desc: 'Todos los integrantes ven y trabajan con los mismos pacientes del equipo.' },
  { title: 'Agregar pacientes', desc: 'Cualquier integrante puede crear nuevos pacientes para el equipo.' },
  { title: 'Planes de ejercicio', desc: 'Crear, editar y asignar planes de ejercicio a cualquier paciente del equipo.' },
  { title: 'Fichas clínicas', desc: 'Completar y revisar fichas clínicas y goniometría de cada paciente.' },
  { title: 'Monitoreo de carga', desc: 'Registrar y visualizar el monitoreo de carga de entrenamiento por paciente.' },
  { title: 'Cuestionarios validados', desc: 'Aplicar NDI, DASH, Oswestry, y más cuestionarios validados.' },
  { title: 'Dinamometría y RTS', desc: 'Registrar resultados de dinamometría HHD y seguir el protocolo de retorno al deporte.' },
  { title: 'Biblioteca clínica', desc: 'Acceso completo a la biblioteca de contenido clínico y +1.700 ejercicios.' },
]

export default async function InstructivoPage() {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: userData } = await supabase
    .from('users')
    .select('role, full_name')
    .eq('id', user.id)
    .single()

  if (userData?.role !== 'pro' && userData?.role !== 'admin') redirect('/paywall')

  const { data: org } = await supabase
    .from('organizations')
    .select('id, name')
    .eq('owner_id', user.id)
    .single()

  if (!org) redirect('/account/equipo')

  const { data: members } = await supabase
    .from('organization_members')
    .select('id, user_id, role, users(full_name, email)')
    .eq('org_id', org.id)
    .order('created_at', { ascending: true })

  const today = new Date().toLocaleDateString('es-AR', {
    year: 'numeric', month: 'long', day: 'numeric'
  })

  return (
    <div className="min-h-screen bg-white text-gray-900">

      {/* Toolbar — hidden when printing */}
      <div className="print:hidden bg-gray-50 border-b border-gray-200 px-8 py-4 flex justify-between items-center">
        <a href="/account/equipo" className="text-[13px] text-gray-500 hover:text-gray-800 transition-colors no-underline">
          ← Volver al equipo
        </a>
        <PrintButton />
      </div>

      {/* Document */}
      <div className="max-w-[720px] mx-auto px-10 py-12 print:py-8 print:px-0">

        {/* Header */}
        <div className="mb-10 pb-8 border-b border-gray-200">
          <p className="text-[11px] uppercase tracking-[0.1em] text-gray-400 mb-2">reason.</p>
          <h1 className="text-[28px] font-medium text-gray-900 mb-1">
            Instructivo para el equipo
          </h1>
          <p className="text-[17px] text-gray-600">{org.name}</p>
          <p className="text-[12px] text-gray-400 mt-3">{today}</p>
        </div>

        {/* Intro */}
        <div className="mb-10">
          <h2 className="text-[15px] font-semibold text-gray-900 mb-3">Qué es Reason</h2>
          <p className="text-[14px] text-gray-600 leading-[1.7]">
            Reason es una plataforma clínica pensada para kinesiólogos y equipos de salud. Permite gestionar pacientes,
            armar planes de ejercicio, completar fichas clínicas, aplicar cuestionarios validados y monitorear la carga de
            entrenamiento, todo en un solo lugar.
          </p>
          <p className="text-[14px] text-gray-600 leading-[1.7] mt-3">
            En <strong>{org.name}</strong> usamos el Plan Pro para equipos, lo que significa que todos los integrantes
            comparten acceso a los mismos pacientes, cada uno con su propio usuario.
          </p>
        </div>

        {/* How to access */}
        <div className="mb-10">
          <h2 className="text-[15px] font-semibold text-gray-900 mb-4">Cómo acceder</h2>
          <div className="bg-gray-50 border border-gray-200 rounded-xl p-6">
            <div className="grid grid-cols-2 gap-6">
              <div>
                <p className="text-[11px] uppercase tracking-[0.08em] text-gray-400 mb-1">Dirección web</p>
                <p className="text-[15px] font-medium text-gray-900">reason.com.ar</p>
              </div>
              <div>
                <p className="text-[11px] uppercase tracking-[0.08em] text-gray-400 mb-1">Sección de ingreso</p>
                <p className="text-[15px] font-medium text-gray-900">Iniciar sesión</p>
              </div>
              <div>
                <p className="text-[11px] uppercase tracking-[0.08em] text-gray-400 mb-1">Email</p>
                <p className="text-[14px] text-gray-500 italic">El que te compartió el administrador</p>
              </div>
              <div>
                <p className="text-[11px] uppercase tracking-[0.08em] text-gray-400 mb-1">Contraseña</p>
                <p className="text-[14px] text-gray-500 italic">La que te compartió el administrador</p>
              </div>
            </div>
            <p className="text-[12px] text-gray-400 mt-5 pt-5 border-t border-gray-200">
              Podés cambiar tu contraseña en cualquier momento desde Mi Cuenta → Actualizar Contraseña.
            </p>
          </div>
        </div>

        {/* What each member can do */}
        <div className="mb-10">
          <h2 className="text-[15px] font-semibold text-gray-900 mb-2">Qué podés hacer como integrante</h2>
          <p className="text-[13px] text-gray-500 mb-5">
            Todos los integrantes tienen acceso completo a las siguientes funcionalidades:
          </p>
          <div className="space-y-4">
            {MEMBER_CAN.map(item => (
              <div key={item.title} className="flex gap-4">
                <span className="text-gray-300 mt-0.5 shrink-0 text-[16px]">✓</span>
                <div>
                  <p className="text-[14px] font-medium text-gray-900 mb-0.5">{item.title}</p>
                  <p className="text-[13px] text-gray-500 leading-[1.6]">{item.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Team members */}
        {members && members.length > 0 && (
          <div className="mb-10">
            <h2 className="text-[15px] font-semibold text-gray-900 mb-4">Integrantes del equipo</h2>
            <div className="border border-gray-200 rounded-xl overflow-hidden">
              <div className="grid grid-cols-3 bg-gray-50 px-5 py-3 text-[11px] uppercase tracking-[0.08em] text-gray-400">
                <span>Nombre</span>
                <span>Email</span>
                <span>Rol</span>
              </div>
              {(members as unknown as { id: string; user_id: string; role: string; users: { full_name: string | null; email: string } }[]).map((m, i) => (
                <div key={m.id} className={`grid grid-cols-3 px-5 py-3.5 text-[13px] ${i !== 0 ? 'border-t border-gray-100' : ''}`}>
                  <span className="font-medium text-gray-900">{m.users?.full_name || '—'}</span>
                  <span className="text-gray-500">{m.users?.email}</span>
                  <span className="text-gray-400 capitalize">{m.role === 'admin' ? 'Administrador' : 'Integrante'}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Important notes */}
        <div className="mb-10">
          <h2 className="text-[15px] font-semibold text-gray-900 mb-4">Aspectos importantes</h2>
          <div className="space-y-3">
            {[
              'Los pacientes son compartidos: lo que carga un integrante lo ven todos.',
              'Cada integrante tiene su sesión propia. No compartas tu contraseña.',
              'Si un integrante deja el equipo, el administrador puede quitarlo desde Mi Equipo.',
              'Ante cualquier problema técnico, el administrador puede contactar a soporte.',
            ].map(note => (
              <div key={note} className="flex gap-3 text-[13px] text-gray-600">
                <span className="text-gray-300 shrink-0">—</span>
                <span>{note}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Footer */}
        <div className="pt-8 border-t border-gray-200 flex justify-between items-center">
          <p className="text-[12px] text-gray-400">reason. · Plan Pro · {org.name}</p>
          <p className="text-[12px] text-gray-400">{today}</p>
        </div>

      </div>
    </div>
  )
}
