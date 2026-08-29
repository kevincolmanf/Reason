'use client'

import { useState, useEffect } from 'react'
import { createOrganization, addMember, removeMember, updateMemberName, resetMemberAccess, setMemberCashAccess, setMemberAgendaAccess, deleteOrganization } from './actions'
import { useRouter } from 'next/navigation'
import Link from 'next/link'

interface Member {
  id: string
  user_id: string
  role: string
  can_register_cash: boolean
  agenda_access: boolean
  hasLoggedIn: boolean
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
  const [org] = useState(initialOrg)
  const [members, setMembers] = useState(initialMembers)

  useEffect(() => {
    setMembers(initialMembers)
  }, [initialMembers])

  const [orgName, setOrgName] = useState('')
  const [orgError, setOrgError] = useState('')
  const [orgLoading, setOrgLoading] = useState(false)

  const [showAddForm, setShowAddForm] = useState(false)
  const [memberEmail, setMemberEmail] = useState('')
  const [memberName, setMemberName] = useState('')
  const [addError, setAddError] = useState('')
  const [addLoading, setAddLoading] = useState(false)
  const [newCredentials, setNewCredentials] = useState<{ email: string; tempPassword?: string; fullName?: string } | null>(null)

  const [removing, setRemoving] = useState<string | null>(null)
  const [cashToggling, setCashToggling] = useState<string | null>(null)
  const [agendaToggling, setAgendaToggling] = useState<string | null>(null)
  const [copied, setCopied] = useState(false)

  const [resettingId, setResettingId] = useState<string | null>(null)
  const [resetError, setResetError] = useState('')
  // Cuando el integrante ya ingresó alguna vez, pedimos confirmación antes de
  // pisarle la contraseña (guardamos su user_id acá para el diálogo de confirm).
  const [confirmResetMember, setConfirmResetMember] = useState<Member | null>(null)

  const [editingId, setEditingId] = useState<string | null>(null)
  const [editName, setEditName] = useState('')
  const [editLoading, setEditLoading] = useState(false)
  const [editError, setEditError] = useState('')

  // Eliminar centro (destructivo): pide escribir el nombre exacto para confirmar.
  const [showDeleteOrg, setShowDeleteOrg] = useState(false)
  const [deleteConfirmName, setDeleteConfirmName] = useState('')
  const [deletingOrg, setDeletingOrg] = useState(false)
  const [deleteOrgError, setDeleteOrgError] = useState('')

  const handleDeleteOrg = async () => {
    if (!org || deletingOrg) return
    setDeletingOrg(true)
    setDeleteOrgError('')
    const res = await deleteOrganization(org.id, deleteConfirmName)
    if (res?.error) {
      setDeleteOrgError(res.error)
      setDeletingOrg(false)
    } else {
      window.location.href = '/dashboard'
    }
  }

  const handleCreateOrg = async () => {
    if (!orgName.trim() || orgLoading) return
    setOrgError('')
    setOrgLoading(true)
    try {
      const fd = new FormData()
      fd.set('name', orgName)
      const res = await createOrganization(fd)
      if (res?.error) {
        setOrgError(res.error)
      } else {
        window.location.href = '/account/equipo'
      }
    } catch (e) {
      setOrgError(`Error inesperado: ${(e as Error).message}`)
    } finally {
      setOrgLoading(false)
    }
  }

  const handleAddMember = async () => {
    if (!org || !memberEmail.trim() || !memberName.trim() || addLoading) return
    setAddError('')
    setAddLoading(true)
    try {
      const fd = new FormData()
      fd.set('email', memberEmail)
      fd.set('full_name', memberName)
      const res = await addMember(org.id, fd)
      if (res?.error) {
        setAddError(res.error)
      } else {
        setNewCredentials({ email: res.email!, tempPassword: res.tempPassword, fullName: memberName.trim() })
        setMemberEmail('')
        setMemberName('')
        setShowAddForm(false)
        router.refresh()
      }
    } catch (e) {
      setAddError(`Error inesperado: ${(e as Error).message}`)
    } finally {
      setAddLoading(false)
    }
  }

  const handleStartEdit = (m: Member) => {
    setEditingId(m.id)
    setEditName(m.users?.full_name || '')
    setEditError('')
  }

  const handleSaveEdit = async (memberUserId: string) => {
    if (!org || !editName.trim() || editLoading) return
    setEditLoading(true)
    setEditError('')
    try {
      const res = await updateMemberName(org.id, memberUserId, editName)
      if (res?.error) {
        setEditError(res.error)
      } else {
        setMembers(prev => prev.map(m =>
          m.user_id === memberUserId
            ? { ...m, users: { ...m.users, full_name: editName.trim() } }
            : m
        ))
        setEditingId(null)
      }
    } catch (e) {
      setEditError(`Error inesperado: ${(e as Error).message}`)
    } finally {
      setEditLoading(false)
    }
  }

  const handleRemoveMember = async (memberId: string, memberUserId: string) => {
    if (!org || memberUserId === userId) return
    setRemoving(memberId)
    await removeMember(org.id, memberUserId)
    setMembers(prev => prev.filter(m => m.id !== memberId))
    setRemoving(null)
  }

  const handleToggleCash = async (member: Member) => {
    if (!org || cashToggling) return
    const next = !member.can_register_cash
    setCashToggling(member.id)
    // Optimista: reflejamos el cambio ya y revertimos si falla.
    setMembers(prev => prev.map(m => m.id === member.id ? { ...m, can_register_cash: next } : m))
    const res = await setMemberCashAccess(org.id, member.user_id, next)
    if (res.error) {
      setMembers(prev => prev.map(m => m.id === member.id ? { ...m, can_register_cash: !next } : m))
    }
    setCashToggling(null)
  }

  const handleToggleAgenda = async (member: Member) => {
    if (!org || agendaToggling) return
    const next = !member.agenda_access
    setAgendaToggling(member.id)
    setMembers(prev => prev.map(m => m.id === member.id ? { ...m, agenda_access: next } : m))
    const res = await setMemberAgendaAccess(org.id, member.user_id, next)
    if (res.error) {
      setMembers(prev => prev.map(m => m.id === member.id ? { ...m, agenda_access: !next } : m))
    }
    setAgendaToggling(null)
  }

  const handleResetAccess = async (member: Member, force = false) => {
    if (!org || resettingId) return
    setResetError('')
    setResettingId(member.id)
    try {
      const res = await resetMemberAccess(org.id, member.user_id, force)
      if (res?.error) {
        setResetError(res.error)
      } else if (res?.alreadyLoggedIn) {
        // Ya ingresó: pedimos confirmación explícita antes de pisar su contraseña.
        setConfirmResetMember(member)
      } else if (res?.tempPassword) {
        setConfirmResetMember(null)
        setNewCredentials({ email: res.email!, tempPassword: res.tempPassword, fullName: member.users?.full_name || undefined })
        setCopied(false)
        // Llevamos el banner de credenciales a la vista.
        window.scrollTo({ top: 0, behavior: 'smooth' })
      }
    } catch (e) {
      setResetError(`Error inesperado: ${(e as Error).message}`)
    } finally {
      setResettingId(null)
    }
  }

  const buildShareMessage = (email?: string, password?: string, fullName?: string) => {
    const origin = typeof window !== 'undefined' ? window.location.origin : ''
    const saludo = fullName ? `¡Hola ${fullName.split(' ')[0]}! 👋` : '¡Hola! 👋'

    // Sin contraseña (p. ej. el integrante ya tenía cuenta) mandamos solo el link
    // y el email, sin inventar una clave.
    const accesoBlock = password
      ? `Tus datos de acceso:
🔗 Entrá en: ${origin}/login
📧 Email: ${email}
🔑 Contraseña temporal: ${password}

Apenas entres, cambiá la contraseña por una tuya (así solo vos la sabés):
👉 Abrí ${origin}/reset-password, elegí tu nueva contraseña y listo.`
      : `Entrá en: ${origin}/login${email ? `\n📧 Email: ${email}` : ''}
(Usás la contraseña que ya tenés en Reason.)`

    return `${saludo} A partir de ahora usamos Reason para gestionar los pacientes en ${org?.name || 'el centro'}.

${accesoBlock}

Desde Reason vas a poder ver y crear pacientes del equipo, armar planes de ejercicio y completar fichas clínicas, cuestionarios y más.

Cualquier duda, avisame.`
  }

  const handleCopyMessage = async () => {
    await navigator.clipboard.writeText(buildShareMessage(
      newCredentials?.email,
      newCredentials?.tempPassword,
      newCredentials?.fullName
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
              disabled={orgLoading || !orgName.trim()}
              className="bg-accent text-bg-primary px-5 py-3 rounded-lg text-[13px] font-medium hover:opacity-90 disabled:opacity-40 transition-opacity"
            >
              {orgLoading ? 'Creando...' : 'Crear'}
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
      <div data-tour="equipo-header" className="bg-bg-secondary rounded-xl border-[0.5px] border-border p-6 flex flex-col sm:flex-row justify-between gap-4">
        <div>
          <div className="text-[11px] text-text-secondary uppercase tracking-[0.05em] mb-1">Centro</div>
          <div className="text-[20px] font-medium">{org.name}</div>
          <div className="text-[12px] text-text-secondary mt-1">{members.length} integrante{members.length !== 1 ? 's' : ''}</div>
        </div>
        <div className="flex flex-col sm:flex-row gap-2 sm:items-start">
          <Link
            data-tour="equipo-instructivo"
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
            Datos de acceso listos. Compartilos con el integrante (por WhatsApp, mail, etc.):
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
              El mensaje ya incluye cómo cambiar la contraseña: apenas ingresa, el integrante abre
              {' '}<span className="font-mono">/reset-password</span> y elige la suya.
            </p>
          )}
        </div>
      )}

      {/* Members list */}
      <div data-tour="equipo-integrantes" className="bg-bg-secondary rounded-xl border-[0.5px] border-border overflow-hidden">
        <div className="p-6 border-b-[0.5px] border-border flex justify-between items-center">
          <h2 className="text-[16px] font-medium">Integrantes</h2>
          {!showAddForm && (
            <button
              data-tour="equipo-agregar"
              onClick={() => setShowAddForm(true)}
              className="bg-accent text-bg-primary px-4 py-2 rounded-lg text-[13px] font-medium hover:opacity-90 transition-opacity"
            >
              + Agregar integrante
            </button>
          )}
        </div>

        {resetError && (
          <div className="px-6 py-3 border-b-[0.5px] border-border bg-red-500/5">
            <p className="text-[13px] text-red-400">{resetError}</p>
          </div>
        )}

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
                disabled={addLoading || !memberEmail.trim() || !memberName.trim()}
                className="bg-accent text-bg-primary px-4 py-2 rounded-lg text-[13px] font-medium hover:opacity-90 disabled:opacity-40 transition-opacity"
              >
                {addLoading ? 'Agregando...' : 'Agregar'}
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
              const isEditing = editingId === m.id
              return (
                <div key={m.id} className="px-6 py-4">
                  {isEditing ? (
                    <div className="flex items-center gap-3">
                      <input
                        autoFocus
                        type="text"
                        value={editName}
                        onChange={e => setEditName(e.target.value)}
                        onKeyDown={e => {
                          if (e.key === 'Enter') handleSaveEdit(m.user_id)
                          if (e.key === 'Escape') { setEditingId(null); setEditError('') }
                        }}
                        className="flex-grow bg-bg-primary border-[0.5px] border-accent rounded-lg px-3 py-2 text-[14px] focus:outline-none"
                        placeholder="Nombre completo"
                      />
                      <button
                        onClick={() => handleSaveEdit(m.user_id)}
                        disabled={editLoading || !editName.trim()}
                        className="bg-accent text-bg-primary px-3 py-2 rounded-lg text-[13px] font-medium hover:opacity-90 disabled:opacity-40 transition-opacity"
                      >
                        {editLoading ? '...' : 'Guardar'}
                      </button>
                      <button
                        onClick={() => { setEditingId(null); setEditError('') }}
                        className="text-[13px] text-text-secondary hover:text-text-primary px-1"
                      >
                        Cancelar
                      </button>
                    </div>
                  ) : (
                    <div className="flex items-center justify-between gap-3 flex-wrap">
                      <div>
                        <p className="text-[14px] font-medium">{m.users?.full_name || m.users?.email || '(sin nombre)'}</p>
                        <p className="text-[12px] text-text-secondary">{m.users?.email || '—'}</p>
                      </div>
                      <div className="flex items-center gap-3 flex-wrap">
                        {isCurrentUser ? (
                          <span className="text-[11px] text-text-secondary bg-bg-primary border-[0.5px] border-border rounded-full px-2.5 py-0.5">
                            Vos · Admin
                          </span>
                        ) : m.hasLoggedIn ? (
                          <span className="text-[11px] text-emerald-400 bg-emerald-500/10 border-[0.5px] border-emerald-500/20 rounded-full px-2.5 py-0.5">
                            Ya ingresó
                          </span>
                        ) : (
                          <span className="text-[11px] text-amber-400 bg-amber-500/10 border-[0.5px] border-amber-500/20 rounded-full px-2.5 py-0.5">
                            Todavía no ingresó
                          </span>
                        )}
                        {!isCurrentUser && (
                          <>
                            <button
                              onClick={() => handleToggleAgenda(m)}
                              disabled={agendaToggling === m.id}
                              title="Permite ver y operar la agenda del centro"
                              className={`text-[12px] px-2.5 py-0.5 rounded-full border-[0.5px] transition-colors disabled:opacity-40 ${
                                m.agenda_access
                                  ? 'text-accent border-accent/30 bg-accent/10 hover:opacity-80'
                                  : 'text-text-secondary border-border hover:text-text-primary'
                              }`}
                            >
                              {agendaToggling === m.id ? '...' : m.agenda_access ? 'Agenda ✓' : 'Habilitar agenda'}
                            </button>
                            <button
                              onClick={() => handleToggleCash(m)}
                              disabled={cashToggling === m.id}
                              title="Permite registrar la caja y ver el arqueo del día (no el mes ni el historial)"
                              className={`text-[12px] px-2.5 py-0.5 rounded-full border-[0.5px] transition-colors disabled:opacity-40 ${
                                m.can_register_cash
                                  ? 'text-[#6FAE7E] border-[#6FAE7E]/30 bg-[#6FAE7E]/10 hover:opacity-80'
                                  : 'text-text-secondary border-border hover:text-text-primary'
                              }`}
                            >
                              {cashToggling === m.id ? '...' : m.can_register_cash ? 'Caja ✓' : 'Habilitar caja'}
                            </button>
                            <button
                              onClick={() => handleResetAccess(m)}
                              disabled={resettingId === m.id}
                              className={`text-[12px] transition-colors disabled:opacity-40 ${m.hasLoggedIn ? 'text-text-secondary hover:text-accent' : 'text-accent hover:opacity-80 font-medium'}`}
                              title={m.hasLoggedIn ? 'Generar una nueva contraseña temporal' : 'Generar y compartir los datos de acceso'}
                            >
                              {resettingId === m.id ? '...' : m.hasLoggedIn ? 'Restablecer contraseña' : 'Reenviar acceso'}
                            </button>
                            <button
                              onClick={() => handleStartEdit(m)}
                              className="text-[12px] text-text-secondary hover:text-accent transition-colors"
                            >
                              Editar nombre
                            </button>
                            <button
                              onClick={() => handleRemoveMember(m.id, m.user_id)}
                              disabled={removing === m.id}
                              className="text-[12px] text-text-secondary hover:text-red-400 transition-colors disabled:opacity-40"
                            >
                              {removing === m.id ? '...' : 'Quitar'}
                            </button>
                          </>
                        )}
                      </div>
                    </div>
                  )}
                  {isEditing && editError && (
                    <p className="text-[12px] text-red-400 mt-2">{editError}</p>
                  )}
                </div>
              )
            })}
          </div>
        )}
      </div>

      <div className="text-[12px] text-text-tertiary space-y-1">
        <p>Podés agregar o quitar integrantes en cualquier momento desde esta página.</p>
        <p>
          ¿Un integrante no puede entrar o perdió sus datos? Usá <span className="text-text-secondary">Reenviar acceso</span> para
          generar una contraseña nueva y compartírsela.
        </p>
      </div>

      {/* Zona de riesgo: eliminar el centro */}
      <div className="bg-bg-secondary rounded-xl border-[0.5px] border-[#A33D2D]/40 p-6">
        <h2 className="text-[15px] font-medium mb-1 text-[#c47c5a]">Eliminar centro</h2>
        <p className="text-[13px] text-text-secondary mb-4 leading-[1.6] max-w-[560px]">
          Elimina el centro <span className="text-text-primary font-medium">{org.name}</span> de forma permanente:
          se quitan todos los integrantes y se borran sus turnos. Los pacientes NO se borran — pasan al espacio
          personal de quien los creó. Es irreversible.
        </p>
        <button
          onClick={() => { setDeleteConfirmName(''); setDeleteOrgError(''); setShowDeleteOrg(true) }}
          className="bg-transparent border-[0.5px] border-[#A33D2D]/60 text-[#c47c5a] px-4 py-2 rounded-lg text-[13px] font-medium hover:bg-[#A33D2D]/15 transition-colors"
        >
          Eliminar este centro
        </button>
      </div>

      {/* Confirmación destructiva: eliminar centro */}
      {showDeleteOrg && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4" onClick={() => !deletingOrg && setShowDeleteOrg(false)}>
          <div className="bg-bg-secondary border-[0.5px] border-border rounded-xl p-6 max-w-[440px] w-full" onClick={e => e.stopPropagation()}>
            <h3 className="text-[16px] font-medium mb-2">Eliminar &quot;{org.name}&quot;</h3>
            <p className="text-[13px] text-text-secondary mb-1 leading-[1.6]">
              Esto es <span className="text-text-primary font-medium">irreversible</span>. Se quitan los integrantes
              y se borran los turnos del centro. Los pacientes se conservan en el espacio personal de quien los creó.
            </p>
            <p className="text-[13px] text-text-secondary mb-4 leading-[1.6]">
              Para confirmar, escribí el nombre del centro: <span className="text-text-primary font-medium">{org.name}</span>
            </p>
            <input
              type="text"
              value={deleteConfirmName}
              onChange={e => setDeleteConfirmName(e.target.value)}
              placeholder={org.name}
              autoFocus
              className="w-full bg-bg-primary border-[0.5px] border-border-strong rounded-lg px-3 py-2.5 text-[14px] mb-2 focus:outline-none focus:border-accent"
            />
            {deleteOrgError && <p className="text-[13px] text-red-400 mb-2">{deleteOrgError}</p>}
            <div className="flex gap-3 justify-end mt-3">
              <button
                onClick={() => setShowDeleteOrg(false)}
                disabled={deletingOrg}
                className="text-[13px] text-text-secondary hover:text-text-primary px-3 py-2 disabled:opacity-40"
              >
                Cancelar
              </button>
              <button
                onClick={handleDeleteOrg}
                disabled={deletingOrg || deleteConfirmName.trim() !== org.name}
                className="bg-[#A33D2D] text-white px-4 py-2 rounded-lg text-[13px] font-medium hover:opacity-90 disabled:opacity-40 disabled:cursor-not-allowed transition-opacity"
              >
                {deletingOrg ? 'Eliminando...' : 'Eliminar centro'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Confirmación: el integrante ya ingresó alguna vez */}
      {confirmResetMember && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4" onClick={() => setConfirmResetMember(null)}>
          <div
            className="bg-bg-secondary border-[0.5px] border-border rounded-xl p-6 max-w-[420px] w-full"
            onClick={e => e.stopPropagation()}
          >
            <h3 className="text-[16px] font-medium mb-2">Restablecer contraseña</h3>
            <p className="text-[13px] text-text-secondary mb-1">
              {confirmResetMember.users?.full_name || confirmResetMember.users?.email} ya ingresó al menos una vez, así que
              probablemente tenga su propia contraseña.
            </p>
            <p className="text-[13px] text-text-secondary mb-5">
              Si generás una nueva, la contraseña anterior deja de funcionar y vas a tener que pasarle la nueva. ¿Continuar?
            </p>
            <div className="flex gap-3 justify-end">
              <button
                onClick={() => setConfirmResetMember(null)}
                className="text-[13px] text-text-secondary hover:text-text-primary px-3 py-2"
              >
                Cancelar
              </button>
              <button
                onClick={() => handleResetAccess(confirmResetMember, true)}
                disabled={resettingId === confirmResetMember.id}
                className="bg-accent text-bg-primary px-4 py-2 rounded-lg text-[13px] font-medium hover:opacity-90 disabled:opacity-40 transition-opacity"
              >
                {resettingId === confirmResetMember.id ? 'Generando...' : 'Sí, generar nueva'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
