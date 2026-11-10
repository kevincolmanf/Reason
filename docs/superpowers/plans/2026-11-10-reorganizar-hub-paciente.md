# Reorganizar el hub del paciente — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** La barra de accesos del paciente pasa de 4 a 7 ítems (Ficha · Atención · Plan · Hitos · Historial · Portal · RTS); Hitos y Portal se mudan a sus propias páginas (igual que Ficha/Plan/RTS); el bloque "Historial de turnos" se borra del hub porque ya quedó cubierto por el Historial unificado; "Atención de hoy" se achica un paso más (todo lo de abajo de "¿Cómo llegó hoy?" se expande solo al tocar un síntoma).

**Architecture:** Dos extracciones mecánicas (Hitos, Portal): el JSX y los handlers que hoy viven inline en `PacienteDetail.tsx` se mudan tal cual a una ruta propia (`page.tsx` server + `*Client.tsx`), sin cambiar su lógica. El bloque de turnos se borra sin reemplazo (ya está en Historial). La barra de accesos se extiende con los mismos estilos ya validados. El achique de Atención de hoy reutiliza el estado `symptom` que ya existe — no hace falta un state nuevo.

**Tech Stack:** Next.js 14 (App Router) + TypeScript + Supabase + Tailwind. Sin framework de tests — verificación con `tsc --noEmit`, `eslint`, build completo.

**Dependencia de ramas (importante):** este plan parte de `feature/historial-paciente` (necesita que la ruta `/historial` ya exista para poder linkearla desde la barra) — **no** de `main`. Por separado, `feature/atribucion-profesional` (Plan 1, sin mergear todavía) toca `AtencionDeHoy.tsx` cerca del mismo lugar que este plan (la zona de "¿Cómo llegó hoy?"). Cuando las tres ramas converjan a `main`, va a hacer falta resolver ese conflicto a mano — es esperable, no es un error de este plan. Avisar a Kevin del orden: lo más simple es mergear primero Plan 1, después este Plan 3 (resolviendo el conflicto chico en `AtencionDeHoy.tsx`), con Plan 2 (Historial) en cualquier punto del medio ya que no toca ese archivo.

**Flujo de git:** reorganiza un flujo de uso significativo → rama obligatoria + confirmación de Kevin antes de mergear. No toca la base de datos — no hace falta migración en este plan.

---

### Task 1: Rama de trabajo

- [ ] **Step 1: Partir de `feature/historial-paciente`, no de `main`**

```bash
git checkout feature/historial-paciente
git pull origin feature/historial-paciente
git checkout -b feature/reorganizar-hub-paciente
```

---

### Task 2: Extraer "Hitos del tratamiento" a su propia ruta

**Files:**
- Create: `src/app/dashboard/pacientes/[id]/hitos/HitosClient.tsx`
- Create: `src/app/dashboard/pacientes/[id]/hitos/page.tsx`
- Modify: `src/app/dashboard/pacientes/[id]/PacienteDetail.tsx` (quitar el bloque y su estado)
- Modify: `src/app/dashboard/pacientes/[id]/page.tsx` (quitar el fetch de `patient_events` y el prop `initialEvents`)

- [ ] **Step 1: Crear `HitosClient.tsx`** (mismo JSX y handlers que hoy, sin cambios de lógica — `patientId`/`patientName` entran como props en vez de leerse de `patient`)

```tsx
'use client'

import { useState, useRef } from 'react'
import { createClient } from '@/utils/supabase/client'
import { useConfirm, useToast } from '@/components/Dialogs'
import { softDeleteRecord } from '@/lib/softDelete'
import { EVENT_TYPES, eventMeta, type PatientEvent } from '@/lib/patientEvents'

export default function HitosClient({
  patientId, patientName, userId, initialEvents,
}: {
  patientId: string
  patientName: string
  userId: string
  initialEvents: PatientEvent[]
}) {
  const { confirm, confirmDialog } = useConfirm()
  const { notify, toast } = useToast()
  const supabaseRef = useRef(createClient())

  const [events, setEvents] = useState<PatientEvent[]>(initialEvents)
  const [showEventForm, setShowEventForm] = useState(false)
  const [evType, setEvType] = useState('evaluacion')
  const [evDate, setEvDate] = useState(() => new Date().toISOString().split('T')[0])
  const [evTitle, setEvTitle] = useState('')
  const [evNote, setEvNote] = useState('')
  const [evSaving, setEvSaving] = useState(false)

  const addEvent = async () => {
    if (!evDate) return
    setEvSaving(true)
    const { data, error } = await supabaseRef.current
      .from('patient_events')
      .insert({ patient_id: patientId, user_id: userId, event_date: evDate, type: evType, title: evTitle.trim() || null, note: evNote.trim() || null })
      .select('id, event_date, type, title, note')
      .single()
    if (!error && data) {
      setEvents(prev => [...prev, data as PatientEvent].sort((a, b) => a.event_date.localeCompare(b.event_date)))
      setEvTitle(''); setEvNote(''); setShowEventForm(false)
    }
    setEvSaving(false)
  }

  const deleteEvent = async (id: string) => {
    if (!(await confirm({ title: 'Borrar hito', message: 'El hito se moverá a la papelera. Podés restaurarlo por 30 días.', danger: true, confirmLabel: 'Borrar' }))) return
    const { error } = await softDeleteRecord(supabaseRef.current, {
      table: 'patient_events', id, userId, patientId, patientName,
    })
    if (error) { notify('No se pudo borrar: ' + error, 'error'); return }
    setEvents(prev => prev.filter(e => e.id !== id))
    notify('Hito movido a la papelera')
  }

  return (
    <div>
      {confirmDialog}
      {toast}
      <div className="bg-bg-primary border-[0.5px] border-border rounded-xl p-5">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-[16px] font-medium">Hitos del tratamiento</h2>
          <button onClick={() => setShowEventForm(v => !v)} className="text-[13px] font-medium text-accent hover:opacity-80">
            {showEventForm ? 'Cerrar' : '+ Agregar hito'}
          </button>
        </div>

        {showEventForm && (
          <div className="bg-bg-secondary border-[0.5px] border-border rounded-xl p-4 mb-4 space-y-3">
            <div>
              <label className="block text-[11px] uppercase tracking-[0.05em] text-text-secondary mb-2">Tipo</label>
              <div className="flex flex-wrap gap-1.5">
                {EVENT_TYPES.map(t => (
                  <button key={t.value} onClick={() => setEvType(t.value)}
                    className={`inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-full text-[12px] font-medium border-[0.5px] transition-colors ${evType === t.value ? 'text-white' : 'bg-bg-primary border-border text-text-secondary hover:text-text-primary'}`}
                    style={evType === t.value ? { backgroundColor: t.color, borderColor: t.color } : {}}>
                    <span className="w-2 h-2 rounded-full" style={{ backgroundColor: evType === t.value ? '#fff' : t.color }} />
                    {t.label}
                  </button>
                ))}
              </div>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-[11px] uppercase tracking-[0.05em] text-text-secondary mb-1">Fecha</label>
                <input type="date" value={evDate} onChange={e => setEvDate(e.target.value)} className="w-full bg-bg-primary border-[0.5px] border-border rounded-lg p-2.5 text-[14px] focus:outline-none focus:border-accent" />
              </div>
              <div>
                <label className="block text-[11px] uppercase tracking-[0.05em] text-text-secondary mb-1">Título (opcional)</label>
                <input type="text" value={evTitle} onChange={e => setEvTitle(e.target.value)} placeholder="Ej: Reeval. LCA, torneo regional…" className="w-full bg-bg-primary border-[0.5px] border-border rounded-lg p-2.5 text-[14px] focus:outline-none focus:border-accent" />
              </div>
            </div>
            <div>
              <label className="block text-[11px] uppercase tracking-[0.05em] text-text-secondary mb-1">Nota (opcional)</label>
              <input type="text" value={evNote} onChange={e => setEvNote(e.target.value)} placeholder="Detalle del hito…" className="w-full bg-bg-primary border-[0.5px] border-border rounded-lg p-2.5 text-[14px] focus:outline-none focus:border-accent" />
            </div>
            <button onClick={addEvent} disabled={evSaving || !evDate}
              className="bg-accent text-bg-primary px-4 py-2 rounded-lg text-[13px] font-medium hover:opacity-90 disabled:opacity-40 transition-opacity">
              {evSaving ? 'Guardando…' : 'Agregar hito'}
            </button>
          </div>
        )}

        {events.length === 0 ? (
          <p className="text-[13px] text-text-secondary bg-bg-secondary border-[0.5px] border-dashed border-border rounded-xl px-4 py-5 text-center">
            Sin hitos todavía. Marcá evaluaciones, RTP, altas o competencias para ver el proceso completo del paciente.
          </p>
        ) : (
          <div className="border-[0.5px] border-border rounded-xl overflow-hidden divide-y-[0.5px] divide-border">
            {events.map(ev => {
              const meta = eventMeta(ev.type)
              const past = ev.event_date < new Date().toISOString().split('T')[0]
              return (
                <div key={ev.id} className={`flex items-center gap-3 px-4 py-3 ${past ? 'opacity-60' : ''}`}>
                  <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: meta.color }} />
                  <div className="w-[92px] shrink-0 text-[12px] text-text-secondary tabular-nums">
                    {new Date(ev.event_date + 'T12:00:00').toLocaleDateString('es-AR', { day: '2-digit', month: 'short', year: '2-digit' })}
                  </div>
                  <div className="min-w-0 flex-1">
                    <span className="text-[13px] font-medium" style={{ color: meta.color }}>{meta.label}</span>
                    {ev.title && <span className="text-[13px] text-text-primary"> · {ev.title}</span>}
                    {ev.note && <p className="text-[12px] text-text-secondary truncate">{ev.note}</p>}
                  </div>
                  <button onClick={() => deleteEvent(ev.id)} className="text-text-secondary hover:text-warning text-[14px] shrink-0 transition-colors" title="Eliminar hito">×</button>
                </div>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}
```

- [ ] **Step 2: Crear `page.tsx`**

```tsx
import { createClient } from '@/utils/supabase/server'
import { redirect } from 'next/navigation'
import Header from '@/components/Header'
import Link from 'next/link'
import { verifyPatientAccess } from '@/utils/patient-access'
import HitosClient from './HitosClient'

export const dynamic = 'force-dynamic'
export const metadata = { title: 'Hitos | Reason' }

export default async function HitosPage({ params }: { params: { id: string } }) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: patient } = await supabase.from('patients').select('id, name').eq('id', params.id).single()
  if (!patient) redirect('/dashboard/pacientes')
  await verifyPatientAccess(params.id, user.id)

  const { data: events } = await supabase
    .from('patient_events')
    .select('id, event_date, type, title, note')
    .eq('patient_id', params.id)
    .order('event_date', { ascending: true })

  return (
    <div className="min-h-screen bg-bg-primary text-text-primary">
      <Header />
      <main className="max-w-[820px] mx-auto px-6 py-8">
        <div className="mb-5">
          <Link href={`/dashboard/pacientes/${params.id}`} className="text-[13px] text-text-secondary hover:text-text-primary no-underline">← {patient.name}</Link>
        </div>
        <h1 className="text-[22px] font-medium mb-5">Hitos del tratamiento</h1>
        <HitosClient patientId={params.id} patientName={patient.name} userId={user.id} initialEvents={events ?? []} />
      </main>
    </div>
  )
}
```

- [ ] **Step 3: Quitar el bloque de `PacienteDetail.tsx`**

Buscar el bloque completo:
```typescript
      {/* HITOS DEL TRATAMIENTO */}
      <div className="bg-bg-primary border-[0.5px] border-border rounded-xl p-5 mb-6">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-[16px] font-medium">Hitos del tratamiento</h2>
          <button onClick={() => setShowEventForm(v => !v)} className="text-[13px] font-medium text-accent hover:opacity-80">
            {showEventForm ? 'Cerrar' : '+ Agregar hito'}
          </button>
        </div>

        {showEventForm && (
          <div className="bg-bg-secondary border-[0.5px] border-border rounded-xl p-4 mb-4 space-y-3">
            <div>
              <label className="block text-[11px] uppercase tracking-[0.05em] text-text-secondary mb-2">Tipo</label>
              <div className="flex flex-wrap gap-1.5">
                {EVENT_TYPES.map(t => (
                  <button key={t.value} onClick={() => setEvType(t.value)}
                    className={`inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-full text-[12px] font-medium border-[0.5px] transition-colors ${evType === t.value ? 'text-white' : 'bg-bg-primary border-border text-text-secondary hover:text-text-primary'}`}
                    style={evType === t.value ? { backgroundColor: t.color, borderColor: t.color } : {}}>
                    <span className="w-2 h-2 rounded-full" style={{ backgroundColor: evType === t.value ? '#fff' : t.color }} />
                    {t.label}
                  </button>
                ))}
              </div>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-[11px] uppercase tracking-[0.05em] text-text-secondary mb-1">Fecha</label>
                <input type="date" value={evDate} onChange={e => setEvDate(e.target.value)} className="w-full bg-bg-primary border-[0.5px] border-border rounded-lg p-2.5 text-[14px] focus:outline-none focus:border-accent" />
              </div>
              <div>
                <label className="block text-[11px] uppercase tracking-[0.05em] text-text-secondary mb-1">Título (opcional)</label>
                <input type="text" value={evTitle} onChange={e => setEvTitle(e.target.value)} placeholder="Ej: Reeval. LCA, torneo regional…" className="w-full bg-bg-primary border-[0.5px] border-border rounded-lg p-2.5 text-[14px] focus:outline-none focus:border-accent" />
              </div>
            </div>
            <div>
              <label className="block text-[11px] uppercase tracking-[0.05em] text-text-secondary mb-1">Nota (opcional)</label>
              <input type="text" value={evNote} onChange={e => setEvNote(e.target.value)} placeholder="Detalle del hito…" className="w-full bg-bg-primary border-[0.5px] border-border rounded-lg p-2.5 text-[14px] focus:outline-none focus:border-accent" />
            </div>
            <button onClick={addEvent} disabled={evSaving || !evDate}
              className="bg-accent text-bg-primary px-4 py-2 rounded-lg text-[13px] font-medium hover:opacity-90 disabled:opacity-40 transition-opacity">
              {evSaving ? 'Guardando…' : 'Agregar hito'}
            </button>
          </div>
        )}

        {events.length === 0 ? (
          <p className="text-[13px] text-text-secondary bg-bg-secondary border-[0.5px] border-dashed border-border rounded-xl px-4 py-5 text-center">
            Sin hitos todavía. Marcá evaluaciones, RTP, altas o competencias para ver el proceso completo del paciente.
          </p>
        ) : (
          <div className="border-[0.5px] border-border rounded-xl overflow-hidden divide-y-[0.5px] divide-border">
            {events.map(ev => {
              const meta = eventMeta(ev.type)
              const past = ev.event_date < new Date().toISOString().split('T')[0]
              return (
                <div key={ev.id} className={`flex items-center gap-3 px-4 py-3 ${past ? 'opacity-60' : ''}`}>
                  <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: meta.color }} />
                  <div className="w-[92px] shrink-0 text-[12px] text-text-secondary tabular-nums">
                    {new Date(ev.event_date + 'T12:00:00').toLocaleDateString('es-AR', { day: '2-digit', month: 'short', year: '2-digit' })}
                  </div>
                  <div className="min-w-0 flex-1">
                    <span className="text-[13px] font-medium" style={{ color: meta.color }}>{meta.label}</span>
                    {ev.title && <span className="text-[13px] text-text-primary"> · {ev.title}</span>}
                    {ev.note && <p className="text-[12px] text-text-secondary truncate">{ev.note}</p>}
                  </div>
                  <button onClick={() => deleteEvent(ev.id)} className="text-text-secondary hover:text-warning text-[14px] shrink-0 transition-colors" title="Eliminar hito">×</button>
                </div>
              )
            })}
          </div>
        )}
      </div>
```
Reemplazar por nada (borrar el bloque entero — el siguiente bloque en el archivo es `{/* HISTORIAL DE TURNOS */}`, que se borra en la Task 4).

- [ ] **Step 4: Quitar el estado/handlers de Hitos de `PacienteDetail.tsx`**

Buscar:
```typescript
  // ── Hitos del tratamiento ──────────────────────────────────────────────────
  const [events, setEvents] = useState<PatientEvent[]>(initialEvents)
  const [showEventForm, setShowEventForm] = useState(false)
  const [evType, setEvType] = useState('evaluacion')
  const [evDate, setEvDate] = useState(() => new Date().toISOString().split('T')[0])
  const [evTitle, setEvTitle] = useState('')
  const [evNote, setEvNote] = useState('')
  const [evSaving, setEvSaving] = useState(false)

  const addEvent = async () => {
    if (!evDate) return
    setEvSaving(true)
    const { data, error } = await supabaseRef.current
      .from('patient_events')
      .insert({ patient_id: patient.id, user_id: userId, event_date: evDate, type: evType, title: evTitle.trim() || null, note: evNote.trim() || null })
      .select('id, event_date, type, title, note')
      .single()
    if (!error && data) {
      setEvents(prev => [...prev, data as PatientEvent].sort((a, b) => a.event_date.localeCompare(b.event_date)))
      setEvTitle(''); setEvNote(''); setShowEventForm(false)
    }
    setEvSaving(false)
  }

  const deleteEvent = async (id: string) => {
    if (!(await confirm({ title: 'Borrar hito', message: 'El hito se moverá a la papelera. Podés restaurarlo por 30 días.', danger: true, confirmLabel: 'Borrar' }))) return
    const { error } = await softDeleteRecord(supabaseRef.current, {
      table: 'patient_events', id, userId, patientId: patient.id, patientName: patient.name,
    })
    if (error) { notify('No se pudo borrar: ' + error, 'error'); return }
    setEvents(prev => prev.filter(e => e.id !== id))
    notify('Hito movido a la papelera')
  }

  // ── Historial de turnos ────────────────────────────────────────────────────
```
Reemplazar por:
```typescript
  // ── Historial de turnos ────────────────────────────────────────────────────
```
(se deja el comentario de la siguiente sección como ancla — la Task 4 se encarga de borrar lo que sigue)

- [ ] **Step 5: Quitar el import y el prop `initialEvents`**

Buscar:
```typescript
import { EVENT_TYPES, eventMeta, type PatientEvent } from '@/lib/patientEvents'
import AtencionDeHoy, { type Attention, type KineSession } from './AtencionDeHoy'
```
Reemplazar por:
```typescript
import AtencionDeHoy, { type Attention, type KineSession } from './AtencionDeHoy'
```

Buscar:
```typescript
export default function PacienteDetail({ patient: initialPatient, userId, initialEvents = [], treatmentStart = null, professionals = [], hasFicha = false, patientHasTurnos = false, initialAttentions = [], kineSession = null }: { patient: Patient; userId: string; initialEvents?: PatientEvent[]; treatmentStart?: string | null; professionals?: { id: string; full_name: string | null }[]; hasFicha?: boolean; patientHasTurnos?: boolean; initialAttentions?: Attention[]; kineSession?: KineSession | null }) {
```
Reemplazar por:
```typescript
export default function PacienteDetail({ patient: initialPatient, userId, treatmentStart = null, professionals = [], hasFicha = false, patientHasTurnos = false, initialAttentions = [], kineSession = null }: { patient: Patient; userId: string; treatmentStart?: string | null; professionals?: { id: string; full_name: string | null }[]; hasFicha?: boolean; patientHasTurnos?: boolean; initialAttentions?: Attention[]; kineSession?: KineSession | null }) {
```

- [ ] **Step 6: Quitar el fetch de `patient_events` y el prop en `page.tsx`**

Buscar:
```typescript
  const [
    { data: patient, error },
    { data: events },
    { data: firstPlan },
    { data: fichaRow },
    { count: turnosCount },
  ] = await Promise.all([
    supabase.from('patients').select('*').eq('id', params.id).single(),
    supabase
      .from('patient_events')
      .select('id, event_date, type, title, note')
      .eq('patient_id', params.id)
      .order('event_date', { ascending: true }),
    supabase
```
Reemplazar por:
```typescript
  const [
    { data: patient, error },
    { data: firstPlan },
    { data: fichaRow },
    { count: turnosCount },
  ] = await Promise.all([
    supabase.from('patients').select('*').eq('id', params.id).single(),
    supabase
```

Buscar (la llamada a `PacienteDetail`, quitando `initialEvents={events ?? []}`):
```typescript
<PacienteDetail patient={patient} userId={user.id} initialEvents={events ?? []} treatmentStart={firstPlan?.created_at ?? null} professionals={professionals} hasFicha={hasFicha} patientHasTurnos={patientHasTurnos} initialAttentions={initialAttentions as never} kineSession={kineSession as never} />
```
Reemplazar por:
```typescript
<PacienteDetail patient={patient} userId={user.id} treatmentStart={firstPlan?.created_at ?? null} professionals={professionals} hasFicha={hasFicha} patientHasTurnos={patientHasTurnos} initialAttentions={initialAttentions as never} kineSession={kineSession as never} />
```

- [ ] **Step 7: Verificar tipos y lint**

Run: `npx tsc --noEmit && npx eslint "src/app/dashboard/pacientes/[id]/hitos/HitosClient.tsx" "src/app/dashboard/pacientes/[id]/hitos/page.tsx" "src/app/dashboard/pacientes/[id]/PacienteDetail.tsx" "src/app/dashboard/pacientes/[id]/page.tsx"`
Expected: sin errores. Si `tsc` marca algo sin usar que no se haya limpiado (ej. `EVENT_TYPES` todavía importado en algún lado), sacarlo.

- [ ] **Step 8: Commit**

```bash
git add "src/app/dashboard/pacientes/[id]/hitos" "src/app/dashboard/pacientes/[id]/PacienteDetail.tsx" "src/app/dashboard/pacientes/[id]/page.tsx"
git commit -m "$(cat <<'EOF'
feat(hitos): extraer Hitos del tratamiento a su propia ruta

Co-Authored-By: Claude Sonnet 4.6 <noreply@anthropic.com>
EOF
)"
```

---

### Task 3: Extraer "Portal del Paciente" a su propia ruta

**Files:**
- Create: `src/app/dashboard/pacientes/[id]/portal/PortalClient.tsx`
- Create: `src/app/dashboard/pacientes/[id]/portal/page.tsx`
- Modify: `src/app/dashboard/pacientes/[id]/PacienteDetail.tsx`

- [ ] **Step 1: Crear `PortalClient.tsx`**

```tsx
'use client'

import { useState } from 'react'
import { createClient } from '@/utils/supabase/client'
import { useConfirm, useToast } from '@/components/Dialogs'

export default function PortalClient({
  patientId, patientName, initialLoadShareToken, initialFollowUpMode,
}: {
  patientId: string
  patientName: string
  initialLoadShareToken: string | null
  initialFollowUpMode: string | null
}) {
  const { confirm, confirmDialog } = useConfirm()
  const { notify, toast } = useToast()
  const [loadShareToken, setLoadShareToken] = useState(initialLoadShareToken)
  const [followUpMode, setFollowUpModeState] = useState(initialFollowUpMode ?? 'presencial')
  const [generatingToken, setGeneratingToken] = useState(false)
  const [modeSaving, setModeSaving] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle')

  const generatePortalToken = async () => {
    setGeneratingToken(true)
    const token = crypto.randomUUID()
    const supabase = createClient()
    const { data, error } = await supabase
      .from('patients')
      .update({ load_share_token: token })
      .eq('id', patientId)
      .select('load_share_token')
      .single()
    if (!error && data) setLoadShareToken(data.load_share_token)
    setGeneratingToken(false)
  }

  const revokePortalToken = async () => {
    if (!(await confirm({ title: 'Revocar link del portal', message: 'El paciente ya no podrá acceder con el link actual. ¿Revocar?', danger: true, confirmLabel: 'Revocar' }))) return
    const supabase = createClient()
    const { data, error } = await supabase
      .from('patients')
      .update({ load_share_token: null })
      .eq('id', patientId)
      .select('load_share_token')
      .single()
    if (!error && data) setLoadShareToken(data.load_share_token)
  }

  const setFollowUpMode = async (mode: 'presencial' | 'online' | 'hibrido') => {
    const prev = followUpMode
    if (mode === prev) return
    setFollowUpModeState(mode)
    setModeSaving('saving')
    try {
      const res = await fetch('/api/pacientes/modalidad', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ patientId, mode }),
      })
      if (!res.ok) throw new Error()
      setModeSaving('saved')
      setTimeout(() => setModeSaving('idle'), 2500)
    } catch {
      setFollowUpModeState(prev)
      setModeSaving('error')
    }
  }

  const opts: { value: 'presencial' | 'online' | 'hibrido'; label: string; desc: string }[] = [
    { value: 'presencial', label: 'Presencial', desc: 'Lo ves en el centro. El registro lo llevás vos con notas — al paciente no se le pide cargar sesiones.' },
    { value: 'online',     label: 'Online',     desc: 'Se entrena a distancia. Registra un check-in corto desde su portal.' },
    { value: 'hibrido',    label: 'Híbrido',    desc: 'Combina presencial y a distancia. Registra el check-in corto los días que no viene.' },
  ]

  return (
    <div>
      {confirmDialog}
      {toast}
      <div data-tour="ficha-portal" className="bg-bg-primary border-[0.5px] border-border rounded-xl p-5">
        <div className="flex justify-between items-center mb-3">
          <h2 className="text-[14px] font-medium">Portal del Paciente</h2>
        </div>

        <div className="mb-4 pb-4 border-b-[0.5px] border-border">
          <div className="flex items-center gap-2 mb-2">
            <label className="block text-[11px] uppercase tracking-[0.05em] text-text-secondary">Modalidad de seguimiento</label>
            {modeSaving === 'saving' && <span className="text-[11px] text-text-secondary">Guardando…</span>}
            {modeSaving === 'saved' && <span className="text-[11px] text-[#4ade80]">✓ Guardado</span>}
            {modeSaving === 'error' && <span className="text-[11px] text-warning">Error al guardar — reintentá</span>}
          </div>
          <div className="flex gap-1.5 mb-2">
            {opts.map(o => (
              <button key={o.value} onClick={() => setFollowUpMode(o.value)}
                className={`flex-1 px-3 py-2 rounded-lg text-[13px] font-medium border-[0.5px] transition-colors ${followUpMode === o.value ? 'bg-accent text-bg-primary border-accent' : 'bg-bg-secondary border-border text-text-secondary hover:text-text-primary'}`}>
                {o.label}
              </button>
            ))}
          </div>
          <p className="text-[12px] text-text-secondary">{opts.find(o => o.value === followUpMode)?.desc}</p>
        </div>

        {loadShareToken ? (
          <div>
            <p className="text-[13px] text-text-secondary mb-3">
              Compartí este link con {patientName} para que vea sus ejercicios y registre sesiones desde el celular.
            </p>
            <div className="flex gap-2">
              <button
                onClick={() => { navigator.clipboard.writeText(`${window.location.origin}/paciente/${loadShareToken}`); notify('Link copiado') }}
                className="bg-[#24342A] border-[0.5px] border-[#34D399]/50 text-[#34D399] px-4 py-2 rounded-lg text-[13px] font-medium flex-grow truncate"
              >
                Enviar link al paciente
              </button>
              <button onClick={revokePortalToken} className="bg-bg-secondary border-[0.5px] border-border px-3 py-2 rounded-lg text-[13px] text-text-secondary hover:text-warning" title="Revocar">
                X
              </button>
            </div>
          </div>
        ) : (
          <div>
            <p className="text-[13px] text-text-secondary mb-3">
              Generá un link único para que {patientName} pueda ver sus ejercicios y registrar sus sesiones desde el celular.
            </p>
            <button onClick={generatePortalToken} disabled={generatingToken} className="bg-accent text-bg-primary px-4 py-2 rounded-lg text-[13px] font-medium hover:opacity-90 disabled:opacity-40">
              {generatingToken ? 'Generando...' : 'Generar link para el paciente'}
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
```

- [ ] **Step 2: Crear `page.tsx`**

```tsx
import { createClient } from '@/utils/supabase/server'
import { redirect } from 'next/navigation'
import Header from '@/components/Header'
import Link from 'next/link'
import { verifyPatientAccess } from '@/utils/patient-access'
import PortalClient from './PortalClient'

export const dynamic = 'force-dynamic'
export const metadata = { title: 'Portal del paciente | Reason' }

export default async function PortalPage({ params }: { params: { id: string } }) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: patient } = await supabase.from('patients').select('id, name, load_share_token, follow_up_mode').eq('id', params.id).single()
  if (!patient) redirect('/dashboard/pacientes')
  await verifyPatientAccess(params.id, user.id)

  return (
    <div className="min-h-screen bg-bg-primary text-text-primary">
      <Header />
      <main className="max-w-[820px] mx-auto px-6 py-8">
        <div className="mb-5">
          <Link href={`/dashboard/pacientes/${params.id}`} className="text-[13px] text-text-secondary hover:text-text-primary no-underline">← {patient.name}</Link>
        </div>
        <h1 className="text-[22px] font-medium mb-5">Portal del paciente</h1>
        <PortalClient
          patientId={params.id}
          patientName={patient.name}
          initialLoadShareToken={patient.load_share_token}
          initialFollowUpMode={patient.follow_up_mode}
        />
      </main>
    </div>
  )
}
```

- [ ] **Step 3: Quitar el bloque de `PacienteDetail.tsx`**

Buscar el bloque completo (empieza en `{/* PORTAL */}`, termina justo antes del `</div>` de cierre del componente):
```typescript
      {/* PORTAL */}
      <div data-tour="ficha-portal" className="bg-bg-primary border-[0.5px] border-border rounded-xl p-5">
        <div className="flex justify-between items-center mb-3">
          <h2 className="text-[14px] font-medium">Portal del Paciente</h2>
        </div>

        {/* Modalidad de seguimiento: define qué se le pide al paciente. Se muestra
            igual que el resto de la sección Portal (sin exigir ser el creador del
            registro): en un equipo, cualquiera que gestiona al paciente la ve. */}
        {(() => {
          const mode = patient.follow_up_mode ?? 'presencial'
          const opts: { value: 'presencial' | 'online' | 'hibrido'; label: string; desc: string }[] = [
            { value: 'presencial', label: 'Presencial', desc: 'Lo ves en el centro. El registro lo llevás vos con notas — al paciente no se le pide cargar sesiones.' },
            { value: 'online',     label: 'Online',     desc: 'Se entrena a distancia. Registra un check-in corto desde su portal.' },
            { value: 'hibrido',    label: 'Híbrido',    desc: 'Combina presencial y a distancia. Registra el check-in corto los días que no viene.' },
          ]
          return (
            <div className="mb-4 pb-4 border-b-[0.5px] border-border">
              <div className="flex items-center gap-2 mb-2">
                <label className="block text-[11px] uppercase tracking-[0.05em] text-text-secondary">Modalidad de seguimiento</label>
                {modeSaving === 'saving' && <span className="text-[11px] text-text-secondary">Guardando…</span>}
                {modeSaving === 'saved' && <span className="text-[11px] text-[#4ade80]">✓ Guardado</span>}
                {modeSaving === 'error' && <span className="text-[11px] text-warning">Error al guardar — reintentá</span>}
              </div>
              <div className="flex gap-1.5 mb-2">
                {opts.map(o => (
                  <button key={o.value} onClick={() => setFollowUpMode(o.value)}
                    className={`flex-1 px-3 py-2 rounded-lg text-[13px] font-medium border-[0.5px] transition-colors ${mode === o.value ? 'bg-accent text-bg-primary border-accent' : 'bg-bg-secondary border-border text-text-secondary hover:text-text-primary'}`}>
                    {o.label}
                  </button>
                ))}
              </div>
              <p className="text-[12px] text-text-secondary">{opts.find(o => o.value === mode)?.desc}</p>
            </div>
          )
        })()}
        {patient.load_share_token ? (
          <div>
            <p className="text-[13px] text-text-secondary mb-3">
              Compartí este link con {patient.name} para que vea sus ejercicios y registre sesiones desde el celular.
            </p>
            <div className="flex gap-2">
              <button
                onClick={() => { navigator.clipboard.writeText(`${window.location.origin}/paciente/${patient.load_share_token}`); notify('Link copiado') }}
                className="bg-[#24342A] border-[0.5px] border-[#34D399]/50 text-[#34D399] px-4 py-2 rounded-lg text-[13px] font-medium flex-grow truncate"
              >
                Enviar link al paciente
              </button>
              <button onClick={revokePortalToken} className="bg-bg-secondary border-[0.5px] border-border px-3 py-2 rounded-lg text-[13px] text-text-secondary hover:text-warning" title="Revocar">
                X
              </button>
            </div>
          </div>
        ) : (
          <div>
            <p className="text-[13px] text-text-secondary mb-3">
              Generá un link único para que {patient.name} pueda ver sus ejercicios y registrar sus sesiones desde el celular.
            </p>
            <button onClick={generatePortalToken} disabled={generatingToken} className="bg-accent text-bg-primary px-4 py-2 rounded-lg text-[13px] font-medium hover:opacity-90 disabled:opacity-40">
              {generatingToken ? 'Generando...' : 'Generar link para el paciente'}
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
```
Reemplazar por:
```typescript
    </div>
  )
}
```

- [ ] **Step 4: Quitar el estado/handlers de Portal**

Buscar:
```typescript
  const [generatingToken, setGeneratingToken] = useState(false)
  const [modeSaving, setModeSaving] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle')
  const [sessionSheet, setSessionSheet] = useState(false)
```
Reemplazar por:
```typescript
  const [sessionSheet, setSessionSheet] = useState(false)
```

Buscar:
```typescript
  const generatePortalToken = async () => {
    setGeneratingToken(true)
    const token = crypto.randomUUID()
    const { data, error } = await supabaseRef.current
      .from('patients')
      .update({ load_share_token: token })
      .eq('id', patient.id)
      .select()
      .single()
    if (!error && data) setPatient(data)
    setGeneratingToken(false)
  }

  const revokePortalToken = async () => {
    if (!(await confirm({ title: 'Revocar link del portal', message: 'El paciente ya no podrá acceder con el link actual. ¿Revocar?', danger: true, confirmLabel: 'Revocar' }))) return
    const { data, error } = await supabaseRef.current
      .from('patients')
      .update({ load_share_token: null })
      .eq('id', patient.id)
      .select()
      .single()
    if (!error && data) setPatient(data)
  }

  const setFollowUpMode = async (mode: 'presencial' | 'online' | 'hibrido') => {
    const prev = patient.follow_up_mode ?? 'presencial'
    if (mode === prev) return
    setPatient(p => ({ ...p, follow_up_mode: mode })) // optimista
    setModeSaving('saving')
    try {
      const res = await fetch('/api/pacientes/modalidad', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ patientId: patient.id, mode }),
      })
      if (!res.ok) throw new Error()
      setModeSaving('saved')
      setTimeout(() => setModeSaving('idle'), 2500)
    } catch {
      setPatient(p => ({ ...p, follow_up_mode: prev }))
      setModeSaving('error')
    }
  }

  // Modo Kinesiología: enciende la capa "Atención de hoy" para este paciente.
```
Reemplazar por:
```typescript
  // Modo Kinesiología: enciende la capa "Atención de hoy" para este paciente.
```

- [ ] **Step 5: Verificar tipos y lint**

Run: `npx tsc --noEmit && npx eslint "src/app/dashboard/pacientes/[id]/portal/PortalClient.tsx" "src/app/dashboard/pacientes/[id]/portal/page.tsx" "src/app/dashboard/pacientes/[id]/PacienteDetail.tsx"`
Expected: sin errores.

- [ ] **Step 6: Commit**

```bash
git add "src/app/dashboard/pacientes/[id]/portal" "src/app/dashboard/pacientes/[id]/PacienteDetail.tsx"
git commit -m "$(cat <<'EOF'
feat(portal): extraer Portal del Paciente a su propia ruta

Co-Authored-By: Claude Sonnet 4.6 <noreply@anthropic.com>
EOF
)"
```

---

### Task 4: Borrar "Historial de turnos" (ya cubierto por Historial) y limpiar el código muerto

Este bloque no se muda a ningún lado — el Historial unificado (Plan 2) ya mezcla los turnos con todo lo demás. Se borra sin reemplazo, y se limpia todo lo que quedaba solo para sostenerlo (interface, colores, helper de fechas relativas).

**Files:**
- Modify: `src/app/dashboard/pacientes/[id]/PacienteDetail.tsx`

- [ ] **Step 1: Borrar el bloque JSX**

Buscar el bloque completo (empieza en `{/* HISTORIAL DE TURNOS */}`, termina justo antes de `{/* PORTAL */}` — que a esta altura del plan ya fue reemplazado por el cierre del componente en la Task 3, así que este bloque queda pegado a ese cierre):
```typescript
      {/* HISTORIAL DE TURNOS */}
      <div className="bg-bg-primary border-[0.5px] border-border rounded-xl p-5 mb-6">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <h2 className="text-[16px] font-medium">Historial de turnos</h2>
            {turnos !== null && <span className="text-[12px] text-text-secondary">({turnos.length})</span>}
          </div>
          <button onClick={toggleTurnos} className="text-[13px] font-medium text-accent hover:opacity-80">
            {showTurnos ? 'Ocultar' : 'Ver'}
          </button>
        </div>

        {showTurnos && (
          loadingTurnos ? (
            <p className="text-[13px] text-text-secondary bg-bg-secondary border-[0.5px] border-dashed border-border rounded-xl px-4 py-5 text-center">
              Cargando turnos…
            </p>
          ) : !turnos || turnos.length === 0 ? (
            <p className="text-[13px] text-text-secondary bg-bg-secondary border-[0.5px] border-dashed border-border rounded-xl px-4 py-5 text-center">
              Este paciente no tiene turnos registrados en la agenda.
            </p>
          ) : (() => {
            const nowIso = new Date().toISOString()
            // Última visita: el turno pasado más reciente al que asistió (no ausente/cancelado).
            const lastVisit = turnos.find(t => t.start_time <= nowIso && t.status !== 'cancelado' && t.status !== 'ausente')
            // Próximo turno: el futuro más cercano que no esté cancelado.
            const upcoming = turnos.filter(t => t.start_time > nowIso && t.status !== 'cancelado')
            const nextTurno = upcoming.length ? upcoming[upcoming.length - 1] : null
            return (
              <>
                {(lastVisit || nextTurno) && (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-4">
                    <div className="bg-bg-secondary border-[0.5px] border-border rounded-xl px-4 py-3">
                      <div className="text-[11px] uppercase tracking-[0.05em] text-text-secondary mb-1">Última visita</div>
                      {lastVisit ? (
                        <div className="text-[14px] font-medium">
                          {new Date(lastVisit.start_time).toLocaleDateString('es-AR', { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' })}
                          <span className="text-[13px] text-text-secondary font-normal"> · {relativeDay(lastVisit.start_time)}</span>
                        </div>
                      ) : <div className="text-[14px] text-text-secondary">Sin visitas registradas</div>}
                    </div>
                    <div className="bg-bg-secondary border-[0.5px] border-border rounded-xl px-4 py-3">
                      <div className="text-[11px] uppercase tracking-[0.05em] text-text-secondary mb-1">Próximo turno</div>
                      {nextTurno ? (
                        <div className="text-[14px] font-medium">
                          {new Date(nextTurno.start_time).toLocaleDateString('es-AR', { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' })}
                          <span className="text-[13px] text-text-secondary font-normal"> · {relativeDay(nextTurno.start_time)}</span>
                        </div>
                      ) : <div className="text-[14px] text-text-secondary">Sin turnos agendados</div>}
                    </div>
                  </div>
                )}

                <div className="border-[0.5px] border-border rounded-xl overflow-hidden divide-y-[0.5px] divide-border">
                  {turnos.map(t => {
                    const meta = TURNO_STATUS[t.status] ?? { label: t.status, color: '#94a3b8' }
                    const past = t.start_time <= nowIso
                    const start = new Date(t.start_time)
                    return (
                      <div key={t.id} className={`flex items-center gap-3 px-4 py-3 ${past ? 'opacity-70' : ''}`}>
                        <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: meta.color }} />
                        <div className="w-[132px] shrink-0 text-[12px] text-text-secondary tabular-nums">
                          {start.toLocaleDateString('es-AR', { day: '2-digit', month: 'short', year: '2-digit' })}
                          {' · '}
                          {start.toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit' })}
                        </div>
                        <div className="min-w-0 flex-1">
                          <span className="text-[13px] text-text-primary">{t.area || 'Turno'}</span>
                          {t.professional_name && <span className="text-[12px] text-text-secondary"> · {t.professional_name}</span>}
                        </div>
                        <span className="text-[11px] font-medium shrink-0" style={{ color: meta.color }}>{meta.label}</span>
                      </div>
                    )
                  })}
                </div>
              </>
            )
          })()
        )}
      </div>

```
Reemplazar por nada (borrar — el próximo bloque en el archivo pasa a ser el cierre del componente, que ya quedó como `</div>\n  )\n}` tras la Task 3).

- [ ] **Step 2: Borrar el estado/handlers de turnos**

Buscar:
```typescript
  // ── Historial de turnos ────────────────────────────────────────────────────
  // Se carga bajo demanda al abrir la sección para no pesar la carga del perfil.
  const [showTurnos, setShowTurnos] = useState(false)
  const [turnos, setTurnos] = useState<TurnoHist[] | null>(null) // null = aún no cargado
  const [loadingTurnos, setLoadingTurnos] = useState(false)

  const loadTurnos = async () => {
    setLoadingTurnos(true)
    const { data } = await supabaseRef.current
      .from('turnos')
      .select('id, start_time, end_time, area, status, professional_name')
      .eq('patient_id', patient.id)
      .order('start_time', { ascending: false })
      .limit(200)
    setTurnos((data ?? []) as TurnoHist[])
    setLoadingTurnos(false)
  }

  const toggleTurnos = () => {
    const next = !showTurnos
    setShowTurnos(next)
    if (next && turnos === null && !loadingTurnos) loadTurnos()
  }

  const router = useRouter()
```
Reemplazar por:
```typescript
  const router = useRouter()
```

- [ ] **Step 3: Borrar las declaraciones de nivel superior que quedan sin uso**

Buscar:
```typescript
// ── Historial de turnos ──────────────────────────────────────────────────────
interface TurnoHist {
  id: string
  start_time: string
  end_time: string
  area: string | null
  status: string
  professional_name: string | null
}

// Etiqueta + color por estado, alineado con los colores de la agenda.
const TURNO_STATUS: Record<string, { label: string; color: string }> = {
  presente:   { label: 'Presente',   color: '#4ade80' },
  confirmado: { label: 'Confirmado', color: '#38bdf8' },
  programado: { label: 'Programado', color: '#94a3b8' },
  ausente:    { label: 'Ausente',    color: '#f87171' },
  cancelado:  { label: 'Cancelado',  color: '#9ca3af' },
  sobreturno: { label: 'Sobreturno', color: '#fbbf24' },
}

// Diferencia en días calendario (positivo = en el pasado). Para el "hace X días".
function dayDiff(dateStr: string): number {
  const d = new Date(dateStr)
  const now = new Date()
  const d0 = new Date(d.getFullYear(), d.getMonth(), d.getDate())
  const n0 = new Date(now.getFullYear(), now.getMonth(), now.getDate())
  return Math.round((n0.getTime() - d0.getTime()) / 86400000)
}

function relativeDay(dateStr: string): string {
  const diff = dayDiff(dateStr)
  if (diff === 0) return 'hoy'
  if (diff === 1) return 'ayer'
  if (diff > 1) return `hace ${diff} días`
  if (diff === -1) return 'mañana'
  return `en ${-diff} días`
}

// Tiempo de tratamiento
```
Reemplazar por:
```typescript
// Tiempo de tratamiento
```

- [ ] **Step 4: Quitar el import de `softDeleteRecord`** (quedó sin uso una vez borrado `deleteEvent` en la Task 2 — `handleDelete`, el único borrado que queda en este archivo, es hard-delete directo y no lo usa)

Buscar:
```typescript
import { useConfirm, useToast } from '@/components/Dialogs'
import { softDeleteRecord } from '@/lib/softDelete'
```
Reemplazar por:
```typescript
import { useConfirm, useToast } from '@/components/Dialogs'
```

- [ ] **Step 5: Verificar tipos y lint**

Run: `npx tsc --noEmit && npx eslint "src/app/dashboard/pacientes/[id]/PacienteDetail.tsx"`
Expected: sin errores ni warnings de variables sin usar (si `tsc`/`eslint` marcan algo que esta limpieza no cubrió, sacarlo también — típicamente sería `patientHasTurnos` si dejó de usarse, pero sigue usándose en `hasTurnos` para la sugerencia de Modo Kinesiología, así que no debería saltar nada más).

- [ ] **Step 6: Commit**

```bash
git add "src/app/dashboard/pacientes/[id]/PacienteDetail.tsx"
git commit -m "$(cat <<'EOF'
refactor(pacientes): borrar Historial de turnos (absorbido por Historial)

Co-Authored-By: Claude Sonnet 4.6 <noreply@anthropic.com>
EOF
)"
```

---

### Task 5: Ampliar la barra de accesos a 7 ítems

Orden: Ficha · Atención (si `kine_mode`) · Plan/Bitácora · Hitos · Historial · Portal · RTS · Carga (si `advanced_load_mode`, como ya estaba).

**Files:**
- Modify: `src/app/dashboard/pacientes/[id]/PacienteDetail.tsx`

- [ ] **Step 1: Agregar "Atención" después de "Ficha"**

Buscar:
```typescript
        <Link href={`/dashboard/pacientes/${patient.id}/ficha`} className="flex items-center gap-2 px-3.5 py-2.5 rounded-xl text-[13px] font-medium text-text-secondary hover:text-text-primary hover:bg-bg-secondary transition-colors no-underline whitespace-nowrap">
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M9 3H6a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8l-5-5h-3"/><path d="M14 3v5h5M9 13h6M9 17h6"/></svg>
          Ficha
        </Link>
        {(patient.plan_mode ?? 'detallado') === 'simple' ? (
```
Reemplazar por:
```typescript
        <Link href={`/dashboard/pacientes/${patient.id}/ficha`} className="flex items-center gap-2 px-3.5 py-2.5 rounded-xl text-[13px] font-medium text-text-secondary hover:text-text-primary hover:bg-bg-secondary transition-colors no-underline whitespace-nowrap">
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M9 3H6a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8l-5-5h-3"/><path d="M14 3v5h5M9 13h6M9 17h6"/></svg>
          Ficha
        </Link>
        {patient.kine_mode && (
          <Link href={`/dashboard/pacientes/${patient.id}#atencion-de-hoy`} className="flex items-center gap-2 px-3.5 py-2.5 rounded-xl text-[13px] font-medium text-text-secondary hover:text-text-primary hover:bg-bg-secondary transition-colors no-underline whitespace-nowrap">
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><rect x="9" y="2" width="6" height="4" rx="1"/><path d="M9 4H6a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V6a2 2 0 0 0-2-2h-3"/><path d="m9 14 2 2 4-4"/></svg>
            Atención
          </Link>
        )}
        {(patient.plan_mode ?? 'detallado') === 'simple' ? (
```

- [ ] **Step 2: Agregar Hitos, Historial y Portal entre el ítem de Plan y RTS**

Buscar:
```typescript
        <Link href={`/dashboard/pacientes/${patient.id}/rts`} className="flex items-center gap-2 px-3.5 py-2.5 rounded-xl text-[13px] font-medium text-text-secondary hover:text-text-primary hover:bg-bg-secondary transition-colors no-underline whitespace-nowrap">
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M13 2 3 14h7l-1 8 10-12h-7l1-8z"/></svg>
          RTS
        </Link>
```
Reemplazar por:
```typescript
        <Link href={`/dashboard/pacientes/${patient.id}/hitos`} className="flex items-center gap-2 px-3.5 py-2.5 rounded-xl text-[13px] font-medium text-text-secondary hover:text-text-primary hover:bg-bg-secondary transition-colors no-underline whitespace-nowrap">
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M4 4h12l-3 4 3 4H4"/><line x1="4" y1="2" x2="4" y2="22"/></svg>
          Hitos
        </Link>
        <Link href={`/dashboard/pacientes/${patient.id}/historial`} className="flex items-center gap-2 px-3.5 py-2.5 rounded-xl text-[13px] font-medium text-text-secondary hover:text-text-primary hover:bg-bg-secondary transition-colors no-underline whitespace-nowrap">
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><circle cx="12" cy="12" r="9"/><polyline points="12 7 12 12 15 15"/></svg>
          Historial
        </Link>
        <Link href={`/dashboard/pacientes/${patient.id}/portal`} className="flex items-center gap-2 px-3.5 py-2.5 rounded-xl text-[13px] font-medium text-text-secondary hover:text-text-primary hover:bg-bg-secondary transition-colors no-underline whitespace-nowrap">
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><rect x="7" y="2" width="10" height="20" rx="2"/><line x1="11" y1="18" x2="13" y2="18"/></svg>
          Portal
        </Link>
        <Link href={`/dashboard/pacientes/${patient.id}/rts`} className="flex items-center gap-2 px-3.5 py-2.5 rounded-xl text-[13px] font-medium text-text-secondary hover:text-text-primary hover:bg-bg-secondary transition-colors no-underline whitespace-nowrap">
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M13 2 3 14h7l-1 8 10-12h-7l1-8z"/></svg>
          RTS
        </Link>
```

- [ ] **Step 3: Agregar el ancla `id` en `AtencionDeHoy.tsx` para que el link `#atencion-de-hoy` de arriba funcione**

Buscar (en `src/app/dashboard/pacientes/[id]/AtencionDeHoy.tsx`):
```typescript
    <section data-tour="ficha-atencion" className="bg-bg-secondary border-[0.5px] border-border rounded-xl p-5 mb-8">
```
Reemplazar por:
```typescript
    <section id="atencion-de-hoy" data-tour="ficha-atencion" className="bg-bg-secondary border-[0.5px] border-border rounded-xl p-5 mb-8">
```

- [ ] **Step 4: Verificar tipos y lint**

Run: `npx tsc --noEmit && npx eslint "src/app/dashboard/pacientes/[id]/PacienteDetail.tsx" "src/app/dashboard/pacientes/[id]/AtencionDeHoy.tsx"`
Expected: sin errores.

- [ ] **Step 5: Commit**

```bash
git add "src/app/dashboard/pacientes/[id]/PacienteDetail.tsx" "src/app/dashboard/pacientes/[id]/AtencionDeHoy.tsx"
git commit -m "$(cat <<'EOF'
feat(pacientes): ampliar la barra de accesos a 7 ítems

Co-Authored-By: Claude Sonnet 4.6 <noreply@anthropic.com>
EOF
)"
```

---

### Task 6: "Atención de hoy" — expandir todo al tocar un síntoma

Reutiliza el estado `symptom` que ya existe (se setea al tocar Peor/Igual/Mejor) — no hace falta un state nuevo. Todo lo que hoy se ve siempre (Sugerencia, Sesión de hoy, Modalidades, Nota + Registrar) pasa a verse recién después de elegir un síntoma.

**Files:**
- Modify: `src/app/dashboard/pacientes/[id]/AtencionDeHoy.tsx`

- [ ] **Step 1: Envolver desde "SUGERENCIA" hasta el botón de Registrar en `{symptom && (...)}`**

Buscar:
```typescript
      {/* SUGERENCIA */}
      {sug && (
```
Reemplazar por:
```typescript
      {symptom && (
      <>
      {/* SUGERENCIA */}
      {sug && (
```

Buscar (el final del bloque, justo antes del cierre de `<section>`):
```typescript
        {status === 'saved' && <span className="text-[12px] text-[#4ade80]">✓ Registrada — la continuidad quedó lista</span>}
        {status === 'error' && <span className="text-[12px] text-warning">No se pudo registrar — reintentá</span>}
      </div>
    </section>
  )
}
```
Reemplazar por:
```typescript
        {status === 'saved' && <span className="text-[12px] text-[#4ade80]">✓ Registrada — la continuidad quedó lista</span>}
        {status === 'error' && <span className="text-[12px] text-warning">No se pudo registrar — reintentá</span>}
      </div>
      </>
      )}
    </section>
  )
}
```

- [ ] **Step 2: Verificar tipos y lint**

Run: `npx tsc --noEmit && npx eslint "src/app/dashboard/pacientes/[id]/AtencionDeHoy.tsx"`
Expected: sin errores.

- [ ] **Step 3: Commit**

```bash
git add "src/app/dashboard/pacientes/[id]/AtencionDeHoy.tsx"
git commit -m "$(cat <<'EOF'
feat(atencion-de-hoy): expandir sesión/modalidades/registrar solo al elegir síntoma

Co-Authored-By: Claude Sonnet 4.6 <noreply@anthropic.com>
EOF
)"
```

---

### Task 7: Verificación final y push

- [ ] **Step 1: Build completo**

Run: `npm run build`
Expected: exit code 0. Confirmar en la tabla de rutas que `/dashboard/pacientes/[id]/hitos` y `/dashboard/pacientes/[id]/portal` aparecen, y que `/dashboard/pacientes/[id]` (el hub) se achicó de tamaño (menos JS que antes, al sacar dos bloques enteros).

- [ ] **Step 2: Prueba manual** (si hay forma de probarlo logueado)

- Entrar a un paciente: confirmar que el hub termina después de "Atención de hoy" / "Primeros pasos" — ya no aparecen Hitos, Historial de turnos ni Portal inline.
- Tocar cada uno de los 7 (u 8, con Carga) accesos de la barra y confirmar que lleva a la página correcta.
- En "Atención de hoy": confirmar que al entrar solo se ve continuidad + "¿Cómo llegó hoy?", y que tocar Peor/Igual/Mejor destapa todo lo demás (incluido el botón "Registrar").
- Tocar "Atención" en la barra desde otra página (ej. Historial) y confirmar que vuelve al hub con scroll a esa sección.

- [ ] **Step 3: Push**

```bash
git push -u origin feature/reorganizar-hub-paciente
```

- [ ] **Step 4: Avisar a Kevin**

Explicar el orden de merge sugerido (ver "Dependencia de ramas" al principio del plan): Plan 1 (atribución) primero, después este Plan 3 resolviendo el conflicto chico en `AtencionDeHoy.tsx`, con Plan 2 (Historial) en cualquier punto del medio. No hay migración pendiente en este plan — no hace falta correr nada en Supabase.

---

## Self-review

- **Cobertura del spec:** barra a 7 ítems (Task 5), Hitos y Portal como páginas propias (Task 2, 3), Historial de turnos borrado sin reemplazo por quedar cubierto por Historial (Task 4), achique final de Atención de hoy (Task 6).
- **Dependencia entre ramas:** documentada explícitamente al principio — este plan no se puede mergear de forma aislada sin pensar el orden con Plan 1 y Plan 2, y el plan dice exactamente dónde va a aparecer el conflicto (el mismo lugar en `AtencionDeHoy.tsx` que toca Plan 1).
- **Limpieza de código muerto:** cada extracción (Hitos, Portal) y el borrado de turnos vino acompañado de sacar el estado/handlers/imports que quedaban sin uso (`TurnoHist`, `TURNO_STATUS`, `relativeDay`, `dayDiff`, `softDeleteRecord`, `EVENT_TYPES`/`eventMeta`/`PatientEvent`) — confirmado con grep que no se usan en ningún otro lado del archivo antes de sacarlos.
- **Placeholders:** ninguno — cada paso tiene el código completo, incluidos los `page.tsx`/`*Client.tsx` nuevos enteros.
- **Fuera de alcance:** ningún cambio en Ficha, Plan, RTS, ni en el modelo de datos — ninguna migración en este plan.