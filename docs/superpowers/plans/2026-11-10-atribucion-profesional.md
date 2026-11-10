# Atribución correcta de profesional — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Que "quién atendió" en Atención de hoy y Bitácora refleje al profesional real (por el turno de agenda del día), no a la cuenta compartida de la tablet — más un bugfix independiente en el registro rápido de carga.

**Architecture:** Dos columnas nuevas y nullable (`attributed_professional_id`, `attributed_professional_name`) en `kine_attentions` y `simple_activity_log` — aditivas, no tocan `user_id` (que sigue siendo el actor técnico real, por si hiciera falta para auditoría). Un componente autónomo `<AttributionPicker>` resuelve el profesional del turno de hoy para ese paciente (si hay exactamente uno) y deja elegir manualmente si no hay turno, hay más de uno, o alguien quiere corregirlo. Se conecta en los tres lugares que hoy escriben esas tablas desde la sesión logueada.

**Tech Stack:** Next.js 14 (App Router) + TypeScript + Supabase + Tailwind. Sin framework de tests (igual que el plan anterior) — verificación con `tsc --noEmit`, `eslint` y prueba manual en el navegador.

**Flujo de git:** toca base de datos (migración) → rama obligatoria + confirmación de Kevin antes de mergear.

---

### Task 1: Rama de trabajo

- [ ] **Step 1: Verificar working tree limpio**

Run: `git status --short`
Expected: nada tuyo pendiente (los archivos sueltos de siempre — `.claude/`, `cerebro_marketing_reason.md`, los ` 2.tsx`/` 3.tsx` — no son de este trabajo, ignorarlos).

- [ ] **Step 2: Crear la rama**

```bash
git checkout -b feature/atribucion-profesional
```

---

### Task 2: Migración — columnas de atribución

**Files:**
- Create: `supabase_attribution.sql`

- [ ] **Step 1: Escribir la migración**

```sql
-- Atribución del profesional real, independiente de quién esté logueado. En
-- equipos donde los kines comparten un único login de tablet (ej. Build),
-- `user_id` siempre es la misma cuenta compartida — no sirve para saber si
-- fue Kevin, Seba o Simón. Estas columnas guardan el profesional resuelto por
-- el turno de agenda del día (o elegido a mano si no hay turno claro).
-- Nullable y aditivas: user_id/professional_name existentes no se tocan.
--
-- Ejecutar en el SQL Editor de Supabase ANTES de mergear
-- feature/atribucion-profesional.

ALTER TABLE kine_attentions
  ADD COLUMN IF NOT EXISTS attributed_professional_id uuid REFERENCES users(id),
  ADD COLUMN IF NOT EXISTS attributed_professional_name text;

ALTER TABLE simple_activity_log
  ADD COLUMN IF NOT EXISTS attributed_professional_id uuid REFERENCES users(id),
  ADD COLUMN IF NOT EXISTS attributed_professional_name text;
```

- [ ] **Step 2: Avisar que falta correrla**

Esta migración, como la anterior, hay que pegarla en el SQL Editor de Supabase — no se puede ejecutar SQL directo contra producción desde acá (el modo seguro de la sesión lo bloquea). Dejar esto pendiente para Kevin antes de probar en preview.

- [ ] **Step 3: Commit**

```bash
git add supabase_attribution.sql
git commit -m "$(cat <<'EOF'
feat(db): columnas de atribución de profesional en kine_attentions y simple_activity_log

Co-Authored-By: Claude Sonnet 4.6 <noreply@anthropic.com>
EOF
)"
```

---

### Task 3: Bugfix independiente — registrar-kine atribuía al dueño del paciente

Hallazgo de la investigación: `/api/carga/registrar-kine` guarda `user_id: patient.user_id` (el dueño/creador del paciente) en vez de `user.id` (quien está realmente logueado llamando al endpoint). Esto está mal incluso para un kine solo — si un paciente fue creado por otra persona del equipo, toda sesión de carga que cargues vos queda atribuida a quien lo creó, no a vos. Es un bug aparte, sin relación con la atribución por turno — se arregla acá porque se encontró en la misma investigación.

**Files:**
- Modify: `src/app/api/carga/registrar-kine/route.ts:60`

- [ ] **Step 1: Corregir el autor**

Buscar:
```typescript
  const { data: inserted, error } = await admin.from('load_sessions').insert({
    user_id: patient.user_id, // dueño de los datos del paciente
    patient_id: patientId,
```
Reemplazar por:
```typescript
  const { data: inserted, error } = await admin.from('load_sessions').insert({
    user_id: user.id, // quien carga la sesión, no el dueño del paciente
    patient_id: patientId,
```

- [ ] **Step 2: Verificar tipos**

Run: `npx tsc --noEmit`
Expected: sin errores.

- [ ] **Step 3: Commit**

```bash
git add src/app/api/carga/registrar-kine/route.ts
git commit -m "$(cat <<'EOF'
fix(carga): registrar-kine atribuía la sesión al dueño del paciente

user_id guardaba patient.user_id en vez de quien está logueado
llamando al endpoint. Rompía la atribución para cualquier paciente
que no haya sido creado por quien carga la sesión.

Co-Authored-By: Claude Sonnet 4.6 <noreply@anthropic.com>
EOF
)"
```

---

### Task 4: Componente `<AttributionPicker>`

**Files:**
- Create: `src/components/AttributionPicker.tsx`

- [ ] **Step 1: Escribir el componente**

```tsx
'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/utils/supabase/client'

// Resuelve quién atendió realmente a un paciente hoy — por el turno de
// agenda asignado ese día, no por la sesión logueada. Necesario en equipos
// donde los profesionales comparten un único login (ej. tablet de consultorio):
// ahí `auth.uid()` siempre es la misma cuenta, así que no alcanza para saber
// si fue Kevin, Seba o Simón. Si hay un solo turno con profesional asignado
// para este paciente hoy, lo usa sin pedir nada. Si no hay turno, hay más de
// uno, o alguien quiere corregirlo (cambio de último momento que la agenda
// no refleja), deja elegir a mano de la lista del equipo.

export interface AttributedProfessional { id: string; name: string | null }

function todayAR(): string {
  return new Date().toLocaleDateString('en-CA', { timeZone: 'America/Argentina/Buenos_Aires' })
}

export default function AttributionPicker({
  patientId, fallbackUserId, onChange,
}: {
  patientId: string
  fallbackUserId: string
  onChange: (p: AttributedProfessional) => void
}) {
  const [professionals, setProfessionals] = useState<AttributedProfessional[]>([])
  const [current, setCurrent] = useState<AttributedProfessional | null>(null)
  const [editing, setEditing] = useState(false)

  useEffect(() => {
    let cancelled = false
    const supabase = createClient()
    const today = todayAR()
    const from = `${today}T00:00:00-03:00`
    const to = `${today}T23:59:59-03:00`

    ;(async () => {
      const [{ data: turnos }, { data: patient }] = await Promise.all([
        supabase.from('turnos')
          .select('professional_id, professional_name')
          .eq('patient_id', patientId)
          .gte('start_time', from).lte('start_time', to)
          .not('professional_id', 'is', null),
        supabase.from('patients').select('org_id').eq('id', patientId).maybeSingle(),
      ])

      let profs: AttributedProfessional[] = []
      if (patient?.org_id) {
        const [{ data: org }, { data: members }] = await Promise.all([
          supabase.from('organizations').select('owner_id').eq('id', patient.org_id).single(),
          supabase.from('organization_members').select('users(id, full_name, email)').eq('org_id', patient.org_id),
        ])
        profs = (members ?? [])
          .filter((m: { users: { id: string; full_name: string | null; email: string } | null }) => m.users)
          .map((m: { users: { id: string; full_name: string | null; email: string } | null }) => ({ id: m.users!.id, name: m.users!.full_name ?? m.users!.email }))
        if (org?.owner_id && !profs.some(p => p.id === org.owner_id)) {
          const { data: ownerUser } = await supabase.from('users').select('id, full_name, email').eq('id', org.owner_id).single()
          if (ownerUser) profs.unshift({ id: ownerUser.id, name: ownerUser.full_name ?? ownerUser.email })
        }
      }
      if (profs.length === 0) {
        // Paciente sin organización (kine solo): no hay de quién elegir, el
        // fallback es la única opción posible.
        const { data: me } = await supabase.from('users').select('id, full_name, email').eq('id', fallbackUserId).maybeSingle()
        if (me) profs = [{ id: me.id, name: me.full_name ?? me.email }]
      }
      if (cancelled) return
      setProfessionals(profs)

      const distinctTurnoProfIds = new Set((turnos ?? []).map(t => t.professional_id))
      let resolved: AttributedProfessional
      if (distinctTurnoProfIds.size === 1 && turnos && turnos[0].professional_id) {
        resolved = { id: turnos[0].professional_id as string, name: turnos[0].professional_name as string | null }
      } else {
        resolved = profs.find(p => p.id === fallbackUserId) ?? { id: fallbackUserId, name: null }
      }
      setCurrent(resolved)
      onChange(resolved)
    })()

    return () => { cancelled = true }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [patientId])

  const pick = (p: AttributedProfessional) => { setCurrent(p); onChange(p); setEditing(false) }

  if (!current) return null

  return (
    <div className="flex items-center gap-1.5 mb-3 text-[12px]">
      <span className="text-text-secondary">Atendiendo:</span>
      {editing ? (
        <select
          value={current.id}
          onChange={e => { const p = professionals.find(x => x.id === e.target.value); if (p) pick(p) }}
          onBlur={() => setEditing(false)}
          autoFocus
          className="bg-bg-secondary border-[0.5px] border-border-strong rounded px-2 py-1 text-[12px] text-text-primary focus:outline-none focus:border-accent"
        >
          {professionals.map(p => <option key={p.id} value={p.id}>{p.name ?? p.id}</option>)}
        </select>
      ) : (
        <button onClick={() => setEditing(true)} className="font-medium text-text-primary hover:text-accent transition-colors">
          {current.name ?? 'Elegir'} <span className="text-text-tertiary">▾</span>
        </button>
      )}
    </div>
  )
}
```

- [ ] **Step 2: Verificar tipos y lint**

Run: `npx tsc --noEmit && npx eslint src/components/AttributionPicker.tsx`
Expected: sin errores.

- [ ] **Step 3: Commit**

```bash
git add src/components/AttributionPicker.tsx
git commit -m "$(cat <<'EOF'
feat: componente AttributionPicker (resuelve profesional por turno del día)

Co-Authored-By: Claude Sonnet 4.6 <noreply@anthropic.com>
EOF
)"
```

---

### Task 5: Conectar en `/api/pacientes/atencion` (kine_attentions)

**Files:**
- Modify: `src/app/api/pacientes/atencion/route.ts`
- Modify: `src/app/dashboard/pacientes/[id]/AtencionDeHoy.tsx` (interface `Attention` + render de continuidad)
- Modify: `src/app/dashboard/pacientes/[id]/page.tsx:80` (select)

- [ ] **Step 1: Aceptar y validar la atribución en el route**

Buscar:
```typescript
  let body: { patientId?: string; symptom?: string | null; manageSymptoms?: boolean; modalities?: string[]; note?: string; adjustedSession?: boolean }
  try { body = await request.json() } catch { return NextResponse.json({ error: 'Body inválido' }, { status: 400 }) }
  const { patientId } = body
```
Reemplazar por:
```typescript
  let body: { patientId?: string; symptom?: string | null; manageSymptoms?: boolean; modalities?: string[]; note?: string; adjustedSession?: boolean; attributedProfessionalId?: string }
  try { body = await request.json() } catch { return NextResponse.json({ error: 'Body inválido' }, { status: 400 }) }
  const { patientId, attributedProfessionalId } = body
```

Buscar:
```typescript
  // Nombre del profesional (denormalizado, sobrevive al borrado del usuario).
  const { data: prof } = await admin.from('users').select('full_name, email').eq('id', user.id).maybeSingle()
  const professionalName = prof?.full_name || prof?.email || null
```
Reemplazar por (si viene una atribución, valida que sea de la misma organización antes de usarla — nunca confiar en un id del body sin chequear):
```typescript
  // Nombre del profesional (denormalizado, sobrevive al borrado del usuario).
  const { data: prof } = await admin.from('users').select('full_name, email').eq('id', user.id).maybeSingle()
  const professionalName = prof?.full_name || prof?.email || null

  // Atribución real (por turno del día, resuelta en el cliente) — se valida
  // que pertenezca a la misma organización antes de confiar en ella.
  let attributedId: string | null = null
  let attributedName: string | null = null
  if (attributedProfessionalId && patient.org_id) {
    const isMember = attributedProfessionalId === patient.user_id || (await admin
      .from('organization_members')
      .select('*', { count: 'exact', head: true })
      .eq('org_id', patient.org_id)
      .eq('user_id', attributedProfessionalId)).count! > 0
    if (isMember) {
      const { data: attrUser } = await admin.from('users').select('full_name, email').eq('id', attributedProfessionalId).maybeSingle()
      if (attrUser) { attributedId = attributedProfessionalId; attributedName = attrUser.full_name || attrUser.email || null }
    }
  }
```

Buscar:
```typescript
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
```
Reemplazar por:
```typescript
  const { data: inserted, error } = await admin
    .from('kine_attentions')
    .insert({
      patient_id: patientId,
      user_id: user.id,
      professional_name: professionalName,
      attributed_professional_id: attributedId,
      attributed_professional_name: attributedName,
      symptom,
      manage_symptoms: manageSymptoms,
      modalities,
      auto_summary: autoSummary,
      note: note || null,
    })
    .select('id, attended_on, professional_name, attributed_professional_name, symptom, manage_symptoms, modalities, auto_summary, note, created_at')
    .single()
```

- [ ] **Step 2: Sumar el campo a la interface y al select del servidor**

En `src/app/dashboard/pacientes/[id]/page.tsx`, buscar:
```typescript
    .select('id, attended_on, professional_name, symptom, manage_symptoms, modalities, auto_summary, note, created_at')
```
Reemplazar por:
```typescript
    .select('id, attended_on, professional_name, attributed_professional_name, symptom, manage_symptoms, modalities, auto_summary, note, created_at')
```

En `src/app/dashboard/pacientes/[id]/AtencionDeHoy.tsx`, buscar:
```typescript
export interface Attention {
  id: string
  attended_on: string
  professional_name: string | null
```
Reemplazar por:
```typescript
export interface Attention {
  id: string
  attended_on: string
  professional_name: string | null
  attributed_professional_name: string | null
```

- [ ] **Step 3: Mostrar el nombre correcto en la continuidad**

Buscar:
```typescript
                    <div className="text-[11px] text-text-secondary/70 truncate">{a.professional_name ?? 'Profesional'}</div>
```
Reemplazar por:
```typescript
                    <div className="text-[11px] text-text-secondary/70 truncate">{a.attributed_professional_name ?? a.professional_name ?? 'Profesional'}</div>
```

- [ ] **Step 4: Verificar tipos y lint**

Run: `npx tsc --noEmit && npx eslint src/app/api/pacientes/atencion/route.ts "src/app/dashboard/pacientes/[id]/AtencionDeHoy.tsx" "src/app/dashboard/pacientes/[id]/page.tsx"`
Expected: sin errores.

- [ ] **Step 5: Commit**

```bash
git add src/app/api/pacientes/atencion/route.ts "src/app/dashboard/pacientes/[id]/AtencionDeHoy.tsx" "src/app/dashboard/pacientes/[id]/page.tsx"
git commit -m "$(cat <<'EOF'
feat(atencion): aceptar y mostrar la atribución por turno del día

Co-Authored-By: Claude Sonnet 4.6 <noreply@anthropic.com>
EOF
)"
```

---

### Task 6: Conectar el picker en `AtencionDeHoy.tsx`

Usa el mismo profesional resuelto para la atención de hoy Y para los ejercicios de bitácora que se agreguen en la misma visita (modo simple) — un solo picker por visión de la página, no uno por acción.

**Files:**
- Modify: `src/app/dashboard/pacientes/[id]/AtencionDeHoy.tsx`

- [ ] **Step 1: Importar el picker y guardar el profesional resuelto**

Buscar:
```typescript
import { useState, useEffect } from 'react'
import { createClient } from '@/utils/supabase/client'
```
Reemplazar por:
```typescript
import { useState, useEffect } from 'react'
import { createClient } from '@/utils/supabase/client'
import AttributionPicker, { type AttributedProfessional } from '@/components/AttributionPicker'
```

Buscar (cerca del inicio del componente, junto a los demás `useState`):
```typescript
  const [attentions, setAttentions] = useState<Attention[]>(initialAttentions)
  const [symptom, setSymptom] = useState<Symptom | null>(null)
```
Reemplazar por:
```typescript
  const [attentions, setAttentions] = useState<Attention[]>(initialAttentions)
  const [attributed, setAttributed] = useState<AttributedProfessional | null>(null)
  const [symptom, setSymptom] = useState<Symptom | null>(null)
```

- [ ] **Step 2: Renderizar el picker arriba de "¿Cómo llegó hoy?"**

Buscar:
```typescript
      {/* CHECK DE SÍNTOMA */}
      <div className="mb-4">
        <div className="text-[11px] uppercase tracking-[0.08em] text-text-secondary mb-2">¿Cómo llegó hoy?</div>
```
Reemplazar por:
```typescript
      <AttributionPicker patientId={patientId} fallbackUserId={userId} onChange={setAttributed} />

      {/* CHECK DE SÍNTOMA */}
      <div className="mb-4">
        <div className="text-[11px] uppercase tracking-[0.08em] text-text-secondary mb-2">¿Cómo llegó hoy?</div>
```

- [ ] **Step 3: Usar el profesional resuelto al registrar la atención**

Buscar:
```typescript
      const res = await fetch('/api/pacientes/atencion', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ patientId, symptom, manageSymptoms: manage, modalities: Array.from(modalities), note, adjustedSession: sessionEdited }),
      })
```
Reemplazar por:
```typescript
      const res = await fetch('/api/pacientes/atencion', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ patientId, symptom, manageSymptoms: manage, modalities: Array.from(modalities), note, adjustedSession: sessionEdited, attributedProfessionalId: attributed?.id }),
      })
```

- [ ] **Step 4: Usar el mismo profesional en los inserts de bitácora de este archivo**

Buscar (función `addBitacoraExercise`):
```typescript
        const { data, error } = await supabase.from('simple_activity_log')
          .insert({ patient_id: patientId, user_id: userId, activity_date: today, exercises: [{ name }] })
          .select('id, activity_date, exercises, note')
          .single()
```
Reemplazar por:
```typescript
        const { data, error } = await supabase.from('simple_activity_log')
          .insert({ patient_id: patientId, user_id: userId, activity_date: today, exercises: [{ name }], attributed_professional_id: attributed?.id ?? null, attributed_professional_name: attributed?.name ?? null })
          .select('id, activity_date, exercises, note')
          .single()
```

Buscar (función `bringBitacoraToToday`):
```typescript
      const { data, error } = await supabase.from('simple_activity_log')
        .insert({ patient_id: patientId, user_id: userId, activity_date: today, exercises: priorBitacora.exercises })
        .select('id, activity_date, exercises, note')
        .single()
```
Reemplazar por:
```typescript
      const { data, error } = await supabase.from('simple_activity_log')
        .insert({ patient_id: patientId, user_id: userId, activity_date: today, exercises: priorBitacora.exercises, attributed_professional_id: attributed?.id ?? null, attributed_professional_name: attributed?.name ?? null })
        .select('id, activity_date, exercises, note')
        .single()
```

- [ ] **Step 5: Verificar tipos y lint**

Run: `npx tsc --noEmit && npx eslint "src/app/dashboard/pacientes/[id]/AtencionDeHoy.tsx"`
Expected: sin errores.

- [ ] **Step 6: Commit**

```bash
git add "src/app/dashboard/pacientes/[id]/AtencionDeHoy.tsx"
git commit -m "$(cat <<'EOF'
feat(atencion): conectar AttributionPicker en Atención de hoy

Co-Authored-By: Claude Sonnet 4.6 <noreply@anthropic.com>
EOF
)"
```

---

### Task 7: Conectar el picker en `QuickAtencionSheet.tsx` (agenda)

**Files:**
- Modify: `src/components/QuickAtencionSheet.tsx`

- [ ] **Step 1: Importar y agregar el estado**

Buscar:
```typescript
import { useState, useEffect } from 'react'
import { createClient } from '@/utils/supabase/client'
```
Reemplazar por:
```typescript
import { useState, useEffect } from 'react'
import { createClient } from '@/utils/supabase/client'
import AttributionPicker, { type AttributedProfessional } from '@/components/AttributionPicker'
```

Buscar:
```typescript
export default function QuickAtencionSheet({ patientId, patientName, userId, planMode = 'detallado', onClose, onSaved }: Props) {
  const [recent, setRecent] = useState<RecentAtt[] | null>(null)
  const [symptom, setSymptom] = useState<Symptom | null>(null)
```
Reemplazar por:
```typescript
export default function QuickAtencionSheet({ patientId, patientName, userId, planMode = 'detallado', onClose, onSaved }: Props) {
  const [recent, setRecent] = useState<RecentAtt[] | null>(null)
  const [attributed, setAttributed] = useState<AttributedProfessional | null>(null)
  const [symptom, setSymptom] = useState<Symptom | null>(null)
```

- [ ] **Step 2: Renderizar el picker** (arriba de los botones Peor/Igual/Mejor — buscar ese bloque en el JSX de la hoja, mismo patrón que Task 6 Step 2: colocar `<AttributionPicker patientId={patientId} fallbackUserId={userId} onChange={setAttributed} />` inmediatamente antes del título "¿Cómo llegó hoy?" o equivalente en este archivo)

- [ ] **Step 3: Usar el profesional resuelto al registrar**

Buscar:
```typescript
      const res = await fetch('/api/pacientes/atencion', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ patientId, symptom, manageSymptoms: manage, modalities: Array.from(modalities), note, adjustedSession: sessionEdited }),
      })
```
Reemplazar por:
```typescript
      const res = await fetch('/api/pacientes/atencion', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ patientId, symptom, manageSymptoms: manage, modalities: Array.from(modalities), note, adjustedSession: sessionEdited, attributedProfessionalId: attributed?.id }),
      })
```

- [ ] **Step 4: Usar el mismo profesional en los dos inserts de bitácora de este archivo**

Buscar:
```typescript
        const { data, error } = await supabase.from('simple_activity_log')
          .insert({ patient_id: patientId, user_id: userId, activity_date: today, exercises: [{ name }] })
          .select('id, activity_date, exercises, note')
          .single()
```
Reemplazar por:
```typescript
        const { data, error } = await supabase.from('simple_activity_log')
          .insert({ patient_id: patientId, user_id: userId, activity_date: today, exercises: [{ name }], attributed_professional_id: attributed?.id ?? null, attributed_professional_name: attributed?.name ?? null })
          .select('id, activity_date, exercises, note')
          .single()
```

Buscar:
```typescript
      const { data, error } = await supabase.from('simple_activity_log')
        .insert({ patient_id: patientId, user_id: userId, activity_date: today, exercises: priorBitacora.exercises })
        .select('id, activity_date, exercises, note')
        .single()
```
Reemplazar por:
```typescript
      const { data, error } = await supabase.from('simple_activity_log')
        .insert({ patient_id: patientId, user_id: userId, activity_date: today, exercises: priorBitacora.exercises, attributed_professional_id: attributed?.id ?? null, attributed_professional_name: attributed?.name ?? null })
        .select('id, activity_date, exercises, note')
        .single()
```

- [ ] **Step 5: Verificar tipos y lint**

Run: `npx tsc --noEmit && npx eslint src/components/QuickAtencionSheet.tsx`
Expected: sin errores.

- [ ] **Step 6: Commit**

```bash
git add src/components/QuickAtencionSheet.tsx
git commit -m "$(cat <<'EOF'
feat(agenda): conectar AttributionPicker en QuickAtencionSheet

Co-Authored-By: Claude Sonnet 4.6 <noreply@anthropic.com>
EOF
)"
```

---

### Task 8: Conectar el picker en la página de Bitácora dedicada

**Files:**
- Modify: `src/app/dashboard/pacientes/[id]/bitacora/BitacoraClient.tsx`
- Modify: `src/app/dashboard/pacientes/[id]/bitacora/page.tsx:29` (select)

- [ ] **Step 1: Sumar el campo al select del servidor**

En `page.tsx`, buscar:
```typescript
    .select('id, activity_date, exercises, note, created_at, user_id')
```
Reemplazar por:
```typescript
    .select('id, activity_date, exercises, note, created_at, user_id, attributed_professional_name')
```

- [ ] **Step 2: Sumar el campo a la interface `Entry` y mostrar el nombre correcto**

En `BitacoraClient.tsx`, buscar:
```typescript
interface Entry {
  id: string
  activity_date: string
  exercises: ExerciseRef[]
  note: string | null
  created_at: string
  user_id: string | null
}
```
Reemplazar por:
```typescript
interface Entry {
  id: string
  activity_date: string
  exercises: ExerciseRef[]
  note: string | null
  created_at: string
  user_id: string | null
  attributed_professional_name: string | null
}
```

Buscar:
```typescript
                  <span className="text-[11px] text-text-secondary ml-2">· cargado por {authorName(e.user_id)}</span>
```
Reemplazar por:
```typescript
                  <span className="text-[11px] text-text-secondary ml-2">· cargado por {e.attributed_professional_name ?? authorName(e.user_id)}</span>
```

- [ ] **Step 3: Importar el picker, agregar estado, y usarlo en el insert**

Buscar:
```typescript
import { createClient } from '@/utils/supabase/client'
import { useConfirm, useToast } from '@/components/Dialogs'
```
Reemplazar por:
```typescript
import { createClient } from '@/utils/supabase/client'
import { useConfirm, useToast } from '@/components/Dialogs'
import AttributionPicker, { type AttributedProfessional } from '@/components/AttributionPicker'
```

Buscar:
```typescript
  const [entries, setEntries] = useState<Entry[]>(initialEntries)
  const [date, setDate] = useState(todayStr())
```
Reemplazar por:
```typescript
  const [entries, setEntries] = useState<Entry[]>(initialEntries)
  const [attributed, setAttributed] = useState<AttributedProfessional | null>(null)
  const [date, setDate] = useState(todayStr())
```

Buscar:
```typescript
    const { data, error } = await supabaseRef.current
      .from('simple_activity_log')
      .insert({ patient_id: patientId, user_id: userId, activity_date: date, exercises: chips, note: note.trim() || null })
      .select('id, activity_date, exercises, note, created_at, user_id')
      .single()
```
Reemplazar por:
```typescript
    const { data, error } = await supabaseRef.current
      .from('simple_activity_log')
      .insert({ patient_id: patientId, user_id: userId, activity_date: date, exercises: chips, note: note.trim() || null, attributed_professional_id: attributed?.id ?? null, attributed_professional_name: attributed?.name ?? null })
      .select('id, activity_date, exercises, note, created_at, user_id, attributed_professional_name')
      .single()
```

- [ ] **Step 4: Renderizar el picker arriba del formulario de carga**

Buscar el inicio del formulario de carga en el JSX (el bloque donde está el input de fecha / chips de ejercicios, antes del botón "Guardar"/"Registrar") y agregar `<AttributionPicker patientId={patientId} fallbackUserId={userId} onChange={setAttributed} />` como primer elemento de ese bloque, mismo patrón que Task 6 Step 2.

- [ ] **Step 5: Verificar tipos y lint**

Run: `npx tsc --noEmit && npx eslint "src/app/dashboard/pacientes/[id]/bitacora/BitacoraClient.tsx" "src/app/dashboard/pacientes/[id]/bitacora/page.tsx"`
Expected: sin errores.

- [ ] **Step 6: Commit**

```bash
git add "src/app/dashboard/pacientes/[id]/bitacora/BitacoraClient.tsx" "src/app/dashboard/pacientes/[id]/bitacora/page.tsx"
git commit -m "$(cat <<'EOF'
feat(bitacora): conectar AttributionPicker y mostrar el autor real

Co-Authored-By: Claude Sonnet 4.6 <noreply@anthropic.com>
EOF
)"
```

---

### Task 9: Verificación final y push

- [ ] **Step 1: Build completo**

Run: `npm run build`
Expected: exit code 0.

- [ ] **Step 2: Prueba manual**

Con `npm run dev` (no requiere login para confirmar que compila cada ruta; si hay forma de probarlo logueado, mejor):
- Un paciente sin turno hoy: el picker debería mostrar "Elegir" y dejar seleccionar manualmente de la lista del equipo.
- Un paciente con un turno hoy con profesional asignado: el picker debería mostrar ese nombre automáticamente, sin tocar nada.
- Un paciente con dos turnos hoy con profesionales distintos: el picker no debería adivinar — debería caer al profesional de la sesión logueada y dejar corregir a mano.

- [ ] **Step 3: Push**

```bash
git push -u origin feature/atribucion-profesional
```

- [ ] **Step 4: Avisar a Kevin**

Pasarle que falta correr `supabase_attribution.sql` antes de probar en la preview, y esperar su confirmación antes de mergear (regla del proyecto: cambios de base de datos van a rama + confirmación).

---

## Self-review

- **Cobertura del spec:** bug de `registrar-kine` (Task 3), atribución por turno con corrección rápida (Tasks 4-8) para los tres lugares reales que escriben `kine_attentions`/`simple_activity_log` desde la sesión logueada (confirmado por investigación: 1 insert de `kine_attentions`, 5 de `simple_activity_log` repartidos en 3 archivos — `AtencionDeHoy.tsx` ×2, `QuickAtencionSheet.tsx` ×2, `BitacoraClient.tsx` ×1).
- **Decisión de alcance explícita:** `patient_events` (hitos), y los inserts de `SeguimientoClient.tsx`/`PlanEditor.tsx` quedan FUERA de este plan — son acciones de planificación/administración, no "quién atendió hoy", y no fueron parte del pedido original (el ejemplo de Kevin fue específicamente sobre atención y bitácora). Si en el futuro hace falta, se agrega con el mismo patrón (`AttributionPicker` ya es reutilizable).
- **Placeholders:** ninguno — cada paso tiene el código completo.
- **Consistencia de tipos:** `attributed_professional_id`/`attributed_professional_name` se llaman igual en la migración SQL, el componente, los tres sitios de inserción, y los selects de lectura. `AttributedProfessional` es el único tipo compartido (importado desde `AttributionPicker.tsx` en los tres archivos que lo usan).
