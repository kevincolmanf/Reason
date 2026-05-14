'use client'

import { useState, useTransition } from 'react'
import { createOrganization, addMember, removeMember } from './actions'
import { useRouter } from 'next/navigation'
import Link from 'next/link'

interface Member {
  id: string
  user_id: string
  role: string
  users: { full_name: string | null; email: string }
}

interface Org {
  id: string
  name: string
}

interface Props {
  userId: string
  org: Org | null
  members: Member[]
}

const ADMIN_CAN = [
  'Pagás el plan Pro y gestionás quién tiene acceso',
  'Agregás y quitás integrantes cuando quieras',
  'Cada integrante entra con su propio email y contraseña',
]

const MEMBER_CAN = [
  'Ver todos los pacientes del equipo',
  'Agregar pacientes nuevos al equipo',
  'Crear y editar planes de ejercicio',
  'Completar fichas clínicas y goniometría',
  'Registrar monitoreo de carga',
  'Aplicar cuestionarios validados (NDI, DASH, Oswestry y más)',
  'Dinamometría HHD y protocolo RTS',
  'Acceder a la biblioteca clínica completa',
]

export default function EquipoClient({ userId, org: initialOrg, members: initialMembers }: Props) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [org] = useState(initialOrg)
  const [members, setMembers] = useState(initialMembers)

  const [orgName, setOrgName] = useState('')
  const [orgError, setOrgError] = useState('')

  const [showAddForm, setShowAddForm] = useState(false)
  const [memberEmail, setMemberEmail] = useState('')
  const [memberName, setMemberName] = useState('')
  const [addError, setAddError] = useState('')
  const [newCredentials, setNewCredentials] = useState<{ email: string; tempPassword?: string } | null>(null)

  const [removing, setRemoving] = useState<string | null>(null)
  const [copied, setCopied] = useState(false)

  const handleCreateOrg = () => {
    if (!orgName.trim()) return
    setOrgError('')
    const fd = new FormData()
    fd.set('name', orgName)
    startTransition(async () => {
      const res = await createOrganization(fd)
      if (res?.error) {
        setOrgError(res.error)
      } else {
        router.refresh()
      }
    })
  }

  const handleAddMember = () => {
    if (!org || !memberEmail.trim() || !memberName.trim()) return
    setAddError('')
    const fd = new FormData()
    fd.set('email', memberEmail)
    fd.set('full_name', memberName)
    startTransition(async () => {
      const res = await addMember(org.id, fd)
      if (res?.error) {
        setAddError(res.error)
      } else {
        setNewCredentials({ email: res.email!, tempPassword: res.tempPassword })
        setMemberEmail('')
        setMemberName('')
        setShowAddForm(false)
        router.refresh()
      }
    })
  }

  const handleRemoveMember = async (memberId: string, memberUserId: string) => {
    if (!org || memberUserId === userId) return
    setRemoving(memberId)
    await removeMember(org.id, memberUserId)
    setMembers(prev => prev.filter(m => m.id !== memberId))
    setRemoving(null)
  }

  const buildShareMessage = (email?: string, password?: string) => {
    const credBlock = email
      ? `\nEmail: ${email}\nContraseña: ${password || '(la que te compartí)'}`
      : ''
    return `Hola! A partir de ahora usamos Reason para gestionar los pacientes en ${org?.name || 'el centro'}.

Accedé en: ${window.location.origin}/login${credBlock}

Desde Reason vas a poder:
- Ver y crear pacientes del equipo
- Armar planes de ejercicio
- Completar fichas clínicas, cuestionarios y más

Cualquier duda, avisame.`
  }

  const handleCopyMessage = async () => {
    await navigator.clipboard.writeText(buildShareMessage(
      newCredentials?.email,
      newCredentials?.tempPassword
    ))
    setCopied(true)
    setTimeout(() => setCopied(false), 2500)
  }

  // ─── No org yet ──────────────────────────────────────────────────────────────
  if (!org) {
    return (
      <div className="space-y-6">
        {/* How it works — preview */}
        <div className="bg-bg-secondary rounded-xl border-[0.5px] border-border p-6">
          <h2 className="text-[16px] font-medium mb-4">Cómo funciona el Plan Pro para equipos</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
            <div>
              <p className="text-[11px] uppercase tracking-[0.05em] text-text-secondary mb-3">Vos como administrador</p>
              <ul className="space-y-2">
                {ADMIN_CAN.map(item => (
                  <li key={item} className="flex items-start gap-2 text-[13px] text-text-secondary">
                    <span className="text-accent mt-0.5 shrink-0">✓</span>{item}
                  </li>
                ))}
              </ul>
            </div>
            <div>
              <p className="text-[11px] uppercase tracking-[0.05em] text-text-secondary mb-3">Cada integrante puede</p>
              <ul className="space-y-2">
                {MEMBER_CAN.slice(0, 4).map(item => (
                  <li key={item} className="flex items-start gap-2 text-[13px] text-text-secondary">
                    <span className="text-accent mt-0.5 shrink-0">✓</span>{item}
                  </li>
                ))}
                <li className="text-[12px] text-text-tertiary pl-4">y más...</li>
              </ul>
            </div>
          </div>
        </div>

        {/* Create org */}
        <div className="bg-bg-secondary rounded-xl border-[0.5px] border-border p-8">
          <h2 className="text-[18px] font-medium mb-2">Creá tu centro</h2>
          <p className="text-[14px] text-text-secondary mb-6">
            Dale un nombre a tu equipo o centro. Después podés agregar a cada integrante.
          </p>
          <div className="flex gap-3">
            <input
              type="text"
              value={orgName}
              onChange={e => setOrgName(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && handleCreateOrg()}
              placeholder="Ej: Centro de Kinesiología Norte"
              className="flex-grow bg-bg-primary border-[0.5px] border-border-strong rounded-lg px-4 py-3 text-[14px] focus:outline-none focus:border-accent"
            />
            <button
              onClick={handleCreateOrg}
              disabled={isPending || !orgName.trim()}
              className="bg-accent text-bg-primary px-5 py-3 rounded-lg text-[13px] font-medium hover:opacity-90 disabled:opacity-40 transition-opacity"
            >
              {isPending ? 'Creando...' : 'Crear'}
            </button>
          </div>
          {orgError && <p className="text-[13px] text-red-400 mt-3">{orgError}</p>}
        </div>
      </div>
    )
  }

  // ─── Org exists ───────────────────────────────────────────────────────────────
  return (
    <div className="space-y-6">

      {/* Header card */}
      <div className="bg-bg-secondary rounded-xl border-[0.5px] border-border p-6 flex flex-col sm:flex-row justify-between gap-4">
        <div>
          <div className="text-[11px] text-text-secondary uppercase tracking-[0.05em] mb-1">Centro</div>
          <div className="text-[20px] font-medium">{org.name}</div>
          <div className="text-[12px] text-text-secondary mt-1">{members.length} integrante{members.length !== 1 ? 's' : ''}</div>
        </div>
        <div className="flex flex-col sm:flex-row gap-2 sm:items-start">
          <Link
            href={`/account/equipo/instructivo`}
            target="_blank"
            className="text-center bg-bg-primary border-[0.5px] border-border text-text-secondary px-4 py-2 rounded-lg text-[13px] font-medium no-underline hover:border-accent hover:text-accent transition-colors"
          >
            Descargar instructivo PDF
          </Link>
          <button
            onClick={handleCopyMessage}
            className="bg-bg-primary border-[0.5px] border-border text-text-secondary px-4 py-2 rounded-lg text-[13px] font-medium hover:border-accent hover:text-accent transition-colors"
          >
            {copied ? 'Copiado!' : 'Copiar mensaje para compartir'}
          </button>
        </div>
      </div>

      {/* How it works */}
      <div className="bg-bg-secondary rounded-xl border-[0.5px] border-border p-6">
        <h2 className="text-[15px] font-medium mb-5">Qué puede hacer cada uno</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
          <div>
            <p className="text-[11px] uppercase tracking-[0.05em] text-text-secondary mb-3">Vos como administrador</p>
            <ul className="space-y-2.5">
              {ADMIN_CAN.map(item => (
                <li key={item} className="flex items-start gap-2 text-[13px] text-text-secondary">
                  <span className="text-accent mt-0.5 shrink-0">✓</span>{item}
                </li>
              ))}
            </ul>
          </div>
          <div>
            <p className="text-[11px] uppercase tracking-[0.05em] text-text-secondary mb-3">Cada integrante puede</p>
            <ul className="space-y-2.5">
              {MEMBER_CAN.map(item => (
                <li key={item} className="flex items-start gap-2 text-[13px] text-text-secondary">
                  <span className="text-accent mt-0.5 shrink-0">✓</span>{item}
                </li>
              ))}
            </ul>
          </div>
        </div>
      </div>

      {/* New credentials banner */}
      {newCredentials && (
        <div className="bg-[#1a2e1a] border-[0.5px] border-[#2E7D32]/40 rounded-xl p-6">
          <p className="text-[13px] font-medium text-[#66BB6A] mb-4">
            Integrante agregado. Compartí estos datos de acceso:
          </p>
          <div className="space-y-2 font-mono text-[13px] mb-4">
            <div className="flex justify-between items-center bg-black/20 rounded-lg px-4 py-2.5">
              <span className="text-text-secondary">Email</span>
              <span className="text-text-primary">{newCredentials.email}</span>
            </div>
            {newCredentials.tempPassword && (
              <div className="flex justify-between items-center bg-black/20 rounded-lg px-4 py-2.5">
                <span className="text-text-secondary">Contraseña temporal</span>
                <span className="text-text-primary">{newCredentials.tempPassword}</span>
              </div>
            )}
          </div>
          <div className="flex gap-3">
            <button
              onClick={handleCopyMessage}
              className="bg-[#2E7D32]/30 text-[#66BB6A] border-[0.5px] border-[#2E7D32]/50 px-4 py-2 rounded-lg text-[13px] font-medium hover:bg-[#2E7D32]/50 transition-colors"
            >
              {copied ? 'Copiado!' : 'Copiar mensaje listo para enviar'}
            </button>
            <button
              onClick={() => setNewCredentials(null)}
              className="text-[12px] text-text-secondary hover:text-text-primary px-2"
            >
              Cerrar
            </button>
          </div>
          {newCredentials.tempPassword && (
            <p className="text-[12px] text-text-secondary mt-3">
              El integrante puede cambiar su contraseña desde Mi Perfil.
            </p>
          )}
        </div>
      )}

      {/* Members list */}
      <div className="bg-bg-secondary rounded-xl border-[0.5px] border-border overflow-hidden">
        <div className="p-6 border-b-[0.5px] border-border flex justify-between items-center">
          <h2 className="text-[16px] font-medium">Integrantes</h2>
          {!showAddForm && (
            <button
              onClick={() => setShowAddForm(true)}
              className="bg-accent text-bg-primary px-4 py-2 rounded-lg text-[13px] font-medium hover:opacity-90 transition-opacity"
            >
              + Agregar integrante
            </button>
          )}
        </div>

        {showAddForm && (
          <div className="p-6 border-b-[0.5px] border-border bg-bg-primary/40">
            <p className="text-[13px] text-text-secondary mb-4">
              Si el profesional ya tiene cuenta en Reason, ingresá su email y lo sumamos al equipo. Si no tiene, le creamos una cuenta nueva.
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-4">
              <div>
                <label className="block text-[11px] uppercase tracking-[0.05em] text-text-secondary mb-1">Email *</label>
                <input
                  type="email"
                  value={memberEmail}
                  onChange={e => setMemberEmail(e.target.value)}
                  placeholder="profesional@ejemplo.com"
                  className="w-full bg-bg-primary border-[0.5px] border-border-strong rounded-lg px-3 py-2.5 text-[14px] focus:outline-none focus:border-accent"
                />
              </div>
              <div>
                <label className="block text-[11px] uppercase tracking-[0.05em] text-text-secondary mb-1">Nombre completo *</label>
                <input
                  type="text"
                  value={memberName}
                  onChange={e => setMemberName(e.target.value)}
                  placeholder="Ej: Laura Gómez"
                  className="w-full bg-bg-primary border-[0.5px] border-border-strong rounded-lg px-3 py-2.5 text-[14px] focus:outline-none focus:border-accent"
                />
              </div>
            </div>
            <div className="flex gap-3">
              <button
                onClick={handleAddMember}
                disabled={isPending || !memberEmail.trim() || !memberName.trim()}
                className="bg-accent text-bg-primary px-4 py-2 rounded-lg text-[13px] font-medium hover:opacity-90 disabled:opacity-40 transition-opacity"
              >
                {isPending ? 'Agregando...' : 'Agregar'}
              </button>
              <button
                onClick={() => { setShowAddForm(false); setAddError('') }}
                className="text-text-secondary px-3 py-2 text-[13px] hover:text-text-primary"
              >
                Cancelar
              </button>
            </div>
            {addError && <p className="text-[13px] text-red-400 mt-3">{addError}</p>}
          </div>
        )}

        {members.length === 0 ? (
          <div className="p-10 text-center text-[14px] text-text-secondary">
            Todavía no hay integrantes. Usá el botón de arriba para agregar el primero.
          </div>
        ) : (
          <div className="divide-y-[0.5px] divide-border">
            {members.map(m => {
              const isCurrentUser = m.user_id === userId
              return (
                <div key={m.id} className="px-6 py-4 flex items-center justify-between">
                  <div>
                    <p className="text-[14px] font-medium">{m.users?.full_name || m.users?.email}</p>
                    <p className="text-[12px] text-text-secondary">{m.users?.email}</p>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="text-[11px] text-text-secondary bg-bg-primary border-[0.5px] border-border rounded-full px-2.5 py-0.5 capitalize">
                      {isCurrentUser ? 'Vos · Admin' : 'Integrante'}
                    </span>
                    {!isCurrentUser && (
                      <button
                        onClick={() => handleRemoveMember(m.id, m.user_id)}
                        disabled={removing === m.id}
                        className="text-[12px] text-text-secondary hover:text-red-400 transition-colors disabled:opacity-40"
                      >
                        {removing === m.id ? '...' : 'Quitar'}
                      </button>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>

      <p className="text-[12px] text-text-tertiary">
        Podés agregar o quitar integrantes en cualquier momento desde esta página.
      </p>
    </div>
  )
}
