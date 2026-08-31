'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { updateOwnProfile, updateOwnPassword } from './actions'

const label = 'text-[11px] text-text-secondary uppercase tracking-[0.05em] mb-1'
const inputCls = 'w-full bg-bg-primary border-[0.5px] border-border-strong rounded-lg px-3 py-2.5 text-[15px] focus:outline-none focus:border-accent'
const linkBtn = 'text-[14px] text-accent hover:opacity-80 transition-opacity bg-transparent border-none cursor-pointer p-0'
const primaryBtn = 'bg-accent text-bg-primary px-4 py-2 rounded-lg text-[14px] font-medium hover:opacity-90 disabled:opacity-40 transition-opacity'

export default function ProfileEditor({ fullName, email, joinDate, role }: {
  fullName: string
  email: string
  joinDate: string
  role: string
}) {
  const router = useRouter()

  const [editing, setEditing] = useState(false)
  const [name, setName] = useState(fullName)
  const [savedName, setSavedName] = useState(fullName)
  const [savingName, setSavingName] = useState(false)
  const [nameError, setNameError] = useState('')
  const [nameOk, setNameOk] = useState(false)

  const [showPw, setShowPw] = useState(false)
  const [pw, setPw] = useState('')
  const [pw2, setPw2] = useState('')
  const [savingPw, setSavingPw] = useState(false)
  const [pwError, setPwError] = useState('')
  const [pwOk, setPwOk] = useState(false)

  const saveName = async () => {
    if (!name.trim() || savingName) return
    setSavingName(true); setNameError(''); setNameOk(false)
    try {
      const fd = new FormData(); fd.set('full_name', name.trim())
      const res = await updateOwnProfile(fd)
      if (res?.error) { setNameError(res.error); return }
      setSavedName(name.trim()); setEditing(false); setNameOk(true)
      router.refresh()
    } catch (e) {
      setNameError(`Error inesperado: ${(e as Error).message}`)
    } finally {
      setSavingName(false)
    }
  }

  const savePw = async () => {
    if (savingPw) return
    setSavingPw(true); setPwError(''); setPwOk(false)
    try {
      const fd = new FormData(); fd.set('password', pw); fd.set('confirm', pw2)
      const res = await updateOwnPassword(fd)
      if (res?.error) { setPwError(res.error); return }
      setPw(''); setPw2(''); setShowPw(false); setPwOk(true)
    } catch (e) {
      setPwError(`Error inesperado: ${(e as Error).message}`)
    } finally {
      setSavingPw(false)
    }
  }

  return (
    <>
      <h2 className="text-[18px] font-medium mb-6">Datos personales</h2>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        <div>
          <div className={label}>Nombre completo</div>
          {editing ? (
            <input className={inputCls} value={name} onChange={e => setName(e.target.value)} autoFocus
              onKeyDown={e => { if (e.key === 'Enter') saveName() }} placeholder="Tu nombre y apellido" />
          ) : (
            <div className="text-[15px] font-medium">{savedName || 'No especificado'}</div>
          )}
        </div>
        <div>
          <div className={label}>Correo electrónico</div>
          <div className="text-[15px] font-medium break-all">{email}</div>
        </div>
        <div>
          <div className={label}>Miembro desde</div>
          <div className="text-[15px] font-medium">{joinDate}</div>
        </div>
        <div>
          <div className={label}>Rol actual</div>
          <div className="text-[15px] font-medium capitalize">{role}</div>
        </div>
      </div>

      {nameError && <p className="text-[13px] text-red-400 mt-4">{nameError}</p>}
      {nameOk && !editing && <p className="text-[13px] text-green-500 mt-4">Nombre actualizado ✓</p>}

      <div className="mt-8 flex items-center gap-5">
        {editing ? (
          <>
            <button onClick={saveName} disabled={savingName} className={primaryBtn}>
              {savingName ? 'Guardando…' : 'Guardar'}
            </button>
            <button onClick={() => { setEditing(false); setName(savedName); setNameError('') }}
              className="text-[14px] text-text-secondary hover:text-text-primary transition-colors bg-transparent border-none cursor-pointer p-0">
              Cancelar
            </button>
          </>
        ) : (
          <button onClick={() => { setEditing(true); setNameOk(false) }} className={linkBtn}>
            Editar perfil
          </button>
        )}
      </div>

      {/* Cambio de contraseña — self-service, sirve para cualquier integrante */}
      <div className="mt-8 pt-8 border-t-[0.5px] border-border">
        <h3 className="text-[15px] font-medium mb-1">Contraseña</h3>
        <p className="text-[13px] text-text-secondary mb-4">Cambiá la contraseña con la que iniciás sesión.</p>

        {pwOk && !showPw && <p className="text-[13px] text-green-500 mb-4">Contraseña actualizada ✓</p>}

        {showPw ? (
          <div className="flex flex-col gap-3 max-w-[360px]">
            <input type="password" className={inputCls} placeholder="Nueva contraseña (mín. 8 caracteres)"
              value={pw} onChange={e => setPw(e.target.value)} autoComplete="new-password" autoFocus />
            <input type="password" className={inputCls} placeholder="Repetir contraseña nueva"
              value={pw2} onChange={e => setPw2(e.target.value)} autoComplete="new-password"
              onKeyDown={e => { if (e.key === 'Enter') savePw() }} />
            {pwError && <p className="text-[13px] text-red-400">{pwError}</p>}
            <div className="flex items-center gap-5 mt-1">
              <button onClick={savePw} disabled={savingPw} className={primaryBtn}>
                {savingPw ? 'Guardando…' : 'Guardar contraseña'}
              </button>
              <button onClick={() => { setShowPw(false); setPw(''); setPw2(''); setPwError('') }}
                className="text-[14px] text-text-secondary hover:text-text-primary transition-colors bg-transparent border-none cursor-pointer p-0">
                Cancelar
              </button>
            </div>
          </div>
        ) : (
          <button onClick={() => { setShowPw(true); setPwOk(false) }} className={linkBtn}>
            Cambiar contraseña
          </button>
        )}
      </div>
    </>
  )
}
