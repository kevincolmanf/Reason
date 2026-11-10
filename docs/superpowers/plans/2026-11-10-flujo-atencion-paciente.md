# Simplificar el flujo de atención del paciente — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Separar "Monitoreo de carga avanzado" como opt-in por paciente, reemplazar las 4 cards grandes de la ficha por una barra de accesos compacta, y achicar "Atención de hoy" por defecto — sin tocar ningún dato existente.

**Architecture:** Un flag booleano nuevo (`patients.advanced_load_mode`) sigue el mismo patrón ya probado de `kine_mode` (columna + API route + botón en el header), controla la visibilidad de 3 puntos de entrada a `load_sessions` (card de Carga, botón del header, botón del menú de agenda) sin migrar ni recalcular datos. La ficha del paciente reordena su layout: barra de accesos de navegación arriba de "Atención de hoy" en vez de cards grandes debajo. `AtencionDeHoy.tsx` gana dos estados de progressive disclosure (continuidad colapsada, "+ opciones").

**Tech Stack:** Next.js 14 (App Router) + TypeScript + Supabase + Tailwind. **Nota sobre testing:** este proyecto no tiene framework de tests (no hay jest/vitest ni archivos `*.test.*`). La verificación de cada paso es: `npx tsc --noEmit` (tipos), `npx eslint <archivo>` (lint), y para los pasos con cambios visuales, comprobación manual en el navegador con `npm run dev`. El build completo (`npm run build`) se corre una sola vez al final (Task 9) porque tarda ~1-2 minutos.

**Flujo de git:** este plan toca base de datos (migración) y un flujo significativo de uso — según las reglas del proyecto va en rama, no directo a `main`. Task 1 crea la rama `feature/simplificar-atencion-paciente`. Al terminar, se hace push de la rama y se espera la confirmación de Kevin antes de mergear (Vercel genera preview automático).

---

### Task 1: Crear la rama de trabajo

**Files:** ninguno (solo git)

- [ ] **Step 1: Verificar que no hay cambios sin commitear**

Run: `git status --short`
Expected: solo archivos que ya sabés que están sueltos (si aparece algo de este trabajo, está bien; si aparece algo inesperado, parar y preguntar antes de seguir).

- [ ] **Step 2: Crear y pasar a la rama**

```bash
git checkout -b feature/simplificar-atencion-paciente
```

Expected: `Switched to a new branch 'feature/simplificar-atencion-paciente'`

---

### Task 2: Migración — columna `advanced_load_mode`

**Files:**
- Create: `supabase_advanced_load_mode.sql`

- [ ] **Step 1: Escribir la migración**

```sql
-- Toggle por paciente para separar el Monitoreo de Carga avanzado (RPE/VAS/ACWR,
-- pensado para deportistas) del flujo diario con pacientes comunes, donde ese
-- detalle no se llena y solo agrega ruido. Default false: ningún paciente
-- existente cambia de comportamiento al correr esta migración.
--
-- Ejecutar en el SQL Editor de Supabase ANTES de mergear
-- feature/simplificar-atencion-paciente.

ALTER TABLE patients
  ADD COLUMN IF NOT EXISTS advanced_load_mode boolean NOT NULL DEFAULT false;
```

- [ ] **Step 2: Correr la migración en el SQL Editor de Supabase**

Pegar y ejecutar el contenido del archivo contra la base de datos del proyecto (la preview de Vercel usa la misma base, así que esto tiene que estar aplicado antes de probar en la preview).

- [ ] **Step 3: Confirmar que la columna existe**

En el SQL Editor:
```sql
select column_name, data_type, column_default
from information_schema.columns
where table_name = 'patients' and column_name = 'advanced_load_mode';
```
Expected: una fila con `data_type = boolean`, `column_default = false`.

- [ ] **Step 4: Commit**

```bash
git add supabase_advanced_load_mode.sql
git commit -m "$(cat <<'EOF'
feat(db): agregar patients.advanced_load_mode

Co-Authored-By: Claude Sonnet 4.6 <noreply@anthropic.com>
EOF
)"
```

---

### Task 3: API route para prender/apagar el toggle

**Files:**
- Create: `src/app/api/pacientes/advanced-load-mode/route.ts`

- [ ] **Step 1: Escribir el route handler**

Es una copia casi exacta de `src/app/api/pacientes/kine-mode/route.ts`, cambiando el campo:

```typescript
import { createClient } from '@/utils/supabase/server'
import { createAdminClient } from '@/utils/supabase/admin'
import { NextResponse } from 'next/server'

// Prende/apaga el Monitoreo de Carga avanzado de un paciente
// (patients.advanced_load_mode). Cuando está en true, se muestran los puntos de
// entrada a load_sessions (card de Carga, botón "+ Registrar sesión" en la ficha
// y en la agenda). El default es false: pensado para deportistas / seguimiento
// de rendimiento, no para el flujo diario con pacientes comunes.

export async function POST(request: Request) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })

  let body: { patientId?: string; enabled?: boolean }
  try { body = await request.json() } catch { return NextResponse.json({ error: 'Body inválido' }, { status: 400 }) }
  const { patientId, enabled } = body

  if (!patientId) return NextResponse.json({ error: 'Falta patientId' }, { status: 400 })
  if (typeof enabled !== 'boolean') return NextResponse.json({ error: 'Falta enabled (booleano)' }, { status: 400 })

  const admin = createAdminClient()

  const { data: patient } = await admin
    .from('patients')
    .select('user_id, org_id')
    .eq('id', patientId)
    .single()
  if (!patient) return NextResponse.json({ error: 'Paciente no encontrado' }, { status: 404 })

  // Acceso: creador del registro, o miembro/dueño de la organización del paciente.
  let allowed = patient.user_id === user.id
  if (!allowed && patient.org_id) {
    const { count } = await admin
      .from('organization_members')
      .select('*', { count: 'exact', head: true })
      .eq('org_id', patient.org_id)
      .eq('user_id', user.id)
    if ((count ?? 0) > 0) allowed = true
    if (!allowed) {
      const { data: org } = await admin
        .from('organizations')
        .select('id')
        .eq('id', patient.org_id)
        .eq('owner_id', user.id)
        .maybeSingle()
      if (org) allowed = true
    }
  }
  if (!allowed) return NextResponse.json({ error: 'Sin acceso a este paciente' }, { status: 403 })

  const { error } = await admin.from('patients').update({ advanced_load_mode: enabled }).eq('id', patientId)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  return NextResponse.json({ ok: true, advanced_load_mode: enabled })
}
```

- [ ] **Step 2: Verificar tipos**

Run: `npx tsc --noEmit`
Expected: sin errores nuevos relacionados a este archivo.

- [ ] **Step 3: Commit**

```bash
git add src/app/api/pacientes/advanced-load-mode/route.ts
git commit -m "$(cat <<'EOF'
feat(api): endpoint para prender/apagar advanced_load_mode

Co-Authored-By: Claude Sonnet 4.6 <noreply@anthropic.com>
EOF
)"
```

---

### Task 4: Toggle en el header del paciente

**Files:**
- Modify: `src/app/dashboard/pacientes/[id]/PacienteDetail.tsx:31` (interface `Patient`)
- Modify: `src/app/dashboard/pacientes/[id]/PacienteDetail.tsx:243-264` (agregar función junto a `setKineMode`)
- Modify: `src/app/dashboard/pacientes/[id]/PacienteDetail.tsx:443-465` (botones del header)

- [ ] **Step 1: Agregar el campo a la interface `Patient`**

Buscar (línea 31):
```typescript
  kine_mode?: boolean | null
```
Reemplazar por:
```typescript
  kine_mode?: boolean | null
  advanced_load_mode?: boolean | null
```

- [ ] **Step 2: Agregar la función `setAdvancedLoadMode`**

Buscar el cierre de `setKineMode` (después de la línea 264, antes de `const setPlanMode = async...`):
```typescript
  const setPlanMode = async (mode: 'detallado' | 'simple') => {
```
Insertar antes de esa línea:
```typescript
  // Monitoreo de carga avanzado: enciende la card de Carga, el botón "+
  // Registrar sesión" (ficha y agenda) y el acceso a RPE/VAS/ACWR para este
  // paciente. Pensado para deportistas — el default es false, así que el flujo
  // diario con pacientes comunes no muestra nada de esto.
  const [advLoadSaving, setAdvLoadSaving] = useState(false)
  const setAdvancedLoadMode = async (enabled: boolean) => {
    if ((patient.advanced_load_mode ?? false) === enabled) return
    setPatient(p => ({ ...p, advanced_load_mode: enabled })) // optimista
    setAdvLoadSaving(true)
    try {
      const res = await fetch('/api/pacientes/advanced-load-mode', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ patientId: patient.id, enabled }),
      })
      if (!res.ok) throw new Error()
      notify(enabled ? 'Monitoreo de carga avanzado activado' : 'Monitoreo de carga avanzado desactivado')
    } catch {
      setPatient(p => ({ ...p, advanced_load_mode: !enabled }))
      notify('No se pudo cambiar el monitoreo de carga avanzado.', 'error')
    } finally {
      setAdvLoadSaving(false)
    }
  }

```

- [ ] **Step 3: Agregar el botón junto a "Modo kine" y ocultar "+ Registrar sesión" cuando está apagado**

Buscar el bloque de botones del header:
```typescript
            <div className="flex gap-2 shrink-0 items-center flex-wrap">
              {sessionSaved && <span className="text-[12px] text-[#4ade80]">✓ Sesión registrada</span>}
              <button onClick={() => setSessionSheet(true)} className="bg-accent text-bg-primary px-4 py-2 rounded-lg text-[13px] font-medium hover:opacity-90 transition-opacity">
                + Registrar sesión
              </button>
              <button
                data-tour="ficha-modo-kine"
                onClick={() => setKineMode(!(patient.kine_mode ?? false))}
                disabled={kineSaving}
                title="El modo kinesiología agrega la capa &quot;Atención de hoy&quot; (check de síntoma, sugerencia y continuidad) a este paciente. No afecta a los demás."
                className={`px-4 py-2 rounded-lg text-[13px] border-[0.5px] transition-colors disabled:opacity-50 ${
                  patient.kine_mode
                    ? 'bg-accent/10 border-accent/40 text-accent hover:bg-accent/15'
                    : 'bg-bg-secondary border-border text-text-secondary hover:text-text-primary'
                }`}
              >
                {patient.kine_mode
                  ? 'Modo kine activo'
                  : (hasTurnos ? 'Activar modo kine · sugerido' : 'Activar modo kine')}
              </button>
              <button onClick={() => setEditing(true)} className="bg-bg-secondary border-[0.5px] border-border text-text-secondary px-4 py-2 rounded-lg text-[13px] hover:text-text-primary transition-colors">Editar</button>
              {isOwner && <button onClick={handleDelete} className="bg-bg-secondary border-[0.5px] border-border text-text-secondary px-4 py-2 rounded-lg text-[13px] hover:text-text-primary transition-colors">Eliminar</button>}
            </div>
```

Reemplazar por (el `+ Registrar sesión` queda condicionado, y se agrega el botón nuevo después del de modo kine):
```typescript
            <div className="flex gap-2 shrink-0 items-center flex-wrap">
              {sessionSaved && <span className="text-[12px] text-[#4ade80]">✓ Sesión registrada</span>}
              {(patient.advanced_load_mode ?? false) && (
                <button onClick={() => setSessionSheet(true)} className="bg-accent text-bg-primary px-4 py-2 rounded-lg text-[13px] font-medium hover:opacity-90 transition-opacity">
                  + Registrar sesión
                </button>
              )}
              <button
                data-tour="ficha-modo-kine"
                onClick={() => setKineMode(!(patient.kine_mode ?? false))}
                disabled={kineSaving}
                title="El modo kinesiología agrega la capa &quot;Atención de hoy&quot; (check de síntoma, sugerencia y continuidad) a este paciente. No afecta a los demás."
                className={`px-4 py-2 rounded-lg text-[13px] border-[0.5px] transition-colors disabled:opacity-50 ${
                  patient.kine_mode
                    ? 'bg-accent/10 border-accent/40 text-accent hover:bg-accent/15'
                    : 'bg-bg-secondary border-border text-text-secondary hover:text-text-primary'
                }`}
              >
                {patient.kine_mode
                  ? 'Modo kine activo'
                  : (hasTurnos ? 'Activar modo kine · sugerido' : 'Activar modo kine')}
              </button>
              <button
                onClick={() => setAdvancedLoadMode(!(patient.advanced_load_mode ?? false))}
                disabled={advLoadSaving}
                title="Monitoreo de carga avanzado: RPE, dolor y ACWR por sesión. Pensado para deportistas — no afecta a los demás pacientes."
                className={`px-4 py-2 rounded-lg text-[13px] border-[0.5px] transition-colors disabled:opacity-50 ${
                  patient.advanced_load_mode
                    ? 'bg-accent/10 border-accent/40 text-accent hover:bg-accent/15'
                    : 'bg-bg-secondary border-border text-text-secondary hover:text-text-primary'
                }`}
              >
                {patient.advanced_load_mode ? 'Carga avanzada activa' : 'Activar carga avanzada'}
              </button>
              <button onClick={() => setEditing(true)} className="bg-bg-secondary border-[0.5px] border-border text-text-secondary px-4 py-2 rounded-lg text-[13px] hover:text-text-primary transition-colors">Editar</button>
              {isOwner && <button onClick={handleDelete} className="bg-bg-secondary border-[0.5px] border-border text-text-secondary px-4 py-2 rounded-lg text-[13px] hover:text-text-primary transition-colors">Eliminar</button>}
            </div>
```

- [ ] **Step 4: Verificar tipos y lint**

Run: `npx tsc --noEmit && npx eslint "src/app/dashboard/pacientes/[id]/PacienteDetail.tsx"`
Expected: sin errores.

- [ ] **Step 5: Commit**

```bash
git add "src/app/dashboard/pacientes/[id]/PacienteDetail.tsx"
git commit -m "$(cat <<'EOF'
feat(pacientes): toggle de monitoreo de carga avanzado en el header

Co-Authored-By: Claude Sonnet 4.6 <noreply@anthropic.com>
EOF
)"
```

---

### Task 5: Relocar el toggle Detallado/Simple al formulario de edición

Al sacar la card de Plan (Task 6), el selector "Modo: Detallado / Simple" que vivía adentro de esa card se queda sin lugar. Es una configuración que se toca rara vez (no en el día a día), así que pasa al formulario "Editar paciente", junto a los otros campos de configuración del paciente.

**Files:**
- Modify: `src/app/dashboard/pacientes/[id]/PacienteDetail.tsx:395-404` (formulario de edición, después de "Profesional habitual")

- [ ] **Step 1: Agregar el selector al formulario de edición**

Buscar, dentro del bloque de edición (`editing ? (...)`):
```typescript
              {professionals.length > 0 && (
                <div className="sm:col-span-2">
                  <label className="block text-[11px] uppercase tracking-[0.05em] text-text-secondary mb-1">Profesional habitual</label>
                  <select value={editForm.habitual_professional_id} onChange={e => setEditForm(f => ({ ...f, habitual_professional_id: e.target.value }))} className="w-full bg-bg-secondary border-[0.5px] border-border-strong rounded-lg p-3 text-[14px] focus:outline-none focus:border-accent">
                    <option value="">Sin asignar</option>
                    {professionals.map(p => <option key={p.id} value={p.id}>{p.full_name ?? p.id}</option>)}
                  </select>
                  <p className="text-[11px] text-text-secondary mt-1">Se cargará por defecto al darle turno a este paciente.</p>
                </div>
              )}
            </div>
```

Reemplazar por (agrega el selector de modo de planificación después, usando la función `setPlanMode` que ya existe — se aplica al toque, no espera al botón "Guardar"):
```typescript
              {professionals.length > 0 && (
                <div className="sm:col-span-2">
                  <label className="block text-[11px] uppercase tracking-[0.05em] text-text-secondary mb-1">Profesional habitual</label>
                  <select value={editForm.habitual_professional_id} onChange={e => setEditForm(f => ({ ...f, habitual_professional_id: e.target.value }))} className="w-full bg-bg-secondary border-[0.5px] border-border-strong rounded-lg p-3 text-[14px] focus:outline-none focus:border-accent">
                    <option value="">Sin asignar</option>
                    {professionals.map(p => <option key={p.id} value={p.id}>{p.full_name ?? p.id}</option>)}
                  </select>
                  <p className="text-[11px] text-text-secondary mt-1">Se cargará por defecto al darle turno a este paciente.</p>
                </div>
              )}
              <div className="sm:col-span-2">
                <label className="block text-[11px] uppercase tracking-[0.05em] text-text-secondary mb-1">Modo de planificación</label>
                <div className="flex items-center gap-1.5">
                  <button type="button" onClick={() => setPlanMode('detallado')}
                    className={`px-3 py-2 rounded-lg text-[13px] font-medium border-[0.5px] transition-colors ${(patient.plan_mode ?? 'detallado') !== 'simple' ? 'bg-accent text-bg-primary border-accent' : 'bg-bg-secondary border-border text-text-secondary hover:text-text-primary'}`}>
                    Detallado
                  </button>
                  <button type="button" onClick={() => setPlanMode('simple')}
                    className={`px-3 py-2 rounded-lg text-[13px] font-medium border-[0.5px] transition-colors ${(patient.plan_mode ?? 'detallado') === 'simple' ? 'bg-accent text-bg-primary border-accent' : 'bg-bg-secondary border-border text-text-secondary hover:text-text-primary'}`}>
                    Simple
                  </button>
                </div>
                <p className="text-[11px] text-text-secondary mt-1">Detallado: plan de ejercicio con series/reps en el calendario. Simple: bitácora de actividad, sin dosificación.</p>
              </div>
            </div>
```

- [ ] **Step 2: Verificar tipos y lint**

Run: `npx tsc --noEmit && npx eslint "src/app/dashboard/pacientes/[id]/PacienteDetail.tsx"`
Expected: sin errores.

- [ ] **Step 3: Commit**

```bash
git add "src/app/dashboard/pacientes/[id]/PacienteDetail.tsx"
git commit -m "$(cat <<'EOF'
refactor(pacientes): mover el modo Detallado/Simple al form de edición

Co-Authored-By: Claude Sonnet 4.6 <noreply@anthropic.com>
EOF
)"
```

---

### Task 6: Barra de accesos compacta (reemplaza las 4 cards)

**Files:**
- Modify: `src/app/dashboard/pacientes/[id]/PacienteDetail.tsx:525-590` (bloque "3 CARDS PRINCIPALES")
- Modify: `src/app/dashboard/pacientes/[id]/PacienteDetail.tsx` (mover el bloque antes de "Atención de hoy")

- [ ] **Step 1: Reemplazar el bloque de cards por la barra compacta**

Buscar todo el bloque, desde el comentario hasta su cierre:
```typescript
      {/* 3 CARDS PRINCIPALES */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 mb-6">
        <Link href={`/dashboard/pacientes/${patient.id}/ficha`} className="block no-underline group">
          <div className="bg-bg-primary border-[0.5px] border-border rounded-xl p-6 hover:bg-bg-secondary transition-colors h-full">
            <div className="text-[11px] uppercase tracking-[0.05em] text-text-secondary mb-3">Expediente clínico</div>
            <div className="text-[18px] font-medium mb-1">Ficha Kinésica</div>
            <div className="text-[13px] text-text-secondary">Anamnesis, diagnóstico, goniometría, cuestionarios, dinamometría</div>
            <div className="mt-5 text-accent text-[13px] font-medium opacity-0 group-hover:opacity-100 [@media(hover:none)]:opacity-100 transition-opacity">Abrir →</div>
          </div>
        </Link>

        <Link href={`/dashboard/pacientes/${patient.id}/carga`} className="block no-underline group">
          <div className="bg-bg-primary border-[0.5px] border-border rounded-xl p-6 hover:bg-bg-secondary transition-colors h-full">
            <div className="text-[11px] uppercase tracking-[0.05em] text-text-secondary mb-3">Seguimiento</div>
            <div className="text-[18px] font-medium mb-1">Monitoreo de Carga</div>
            <div className="text-[13px] text-text-secondary">Sesiones, ACWR, VAS, RPE y consejo semanal</div>
            <div className="mt-5 text-accent text-[13px] font-medium opacity-0 group-hover:opacity-100 [@media(hover:none)]:opacity-100 transition-opacity">Abrir →</div>
          </div>
        </Link>

        {/* Planificación: según el modo del paciente, editor de planes (detallado)
            o bitácora simple. El toggle de abajo cambia el modo (default detallado,
            así nadie deja de progresar a quien lo necesita). */}
        {(() => {
          const isSimple = (patient.plan_mode ?? 'detallado') === 'simple'
          return (
            <div className="bg-bg-primary border-[0.5px] border-border rounded-xl p-6 h-full flex flex-col">
              {isSimple ? (
                <Link href={`/dashboard/pacientes/${patient.id}/bitacora`} className="block no-underline group flex-grow">
                  <div className="text-[11px] uppercase tracking-[0.05em] text-text-secondary mb-3">Planificación · Modo simple</div>
                  <div className="text-[18px] font-medium mb-1">Bitácora de actividad</div>
                  <div className="text-[13px] text-text-secondary">Registro simple del día a día, sin dosificación. Ideal para pacientes agudos; visible para el equipo.</div>
                  <div className="mt-5 text-accent text-[13px] font-medium opacity-0 group-hover:opacity-100 [@media(hover:none)]:opacity-100 transition-opacity">Abrir →</div>
                </Link>
              ) : (
                <Link href={`/dashboard/ejercicios/plan?paciente=${patient.id}`} className="block no-underline group flex-grow">
                  <div className="text-[11px] uppercase tracking-[0.05em] text-text-secondary mb-3">Planificación</div>
                  <div className="text-[18px] font-medium mb-1">Plan de Ejercicio / Calendario</div>
                  <div className="text-[13px] text-text-secondary">Armá el plan, programá las sesiones en el calendario y marcá los hitos del tratamiento</div>
                  <div className="mt-5 text-accent text-[13px] font-medium opacity-0 group-hover:opacity-100 [@media(hover:none)]:opacity-100 transition-opacity">Abrir →</div>
                </Link>
              )}
              <div className="mt-4 pt-3 border-t-[0.5px] border-border flex items-center gap-1.5">
                <span className="text-[10px] uppercase tracking-[0.05em] text-text-secondary mr-1" title="Cómo planificás a este paciente">Modo</span>
                <button onClick={() => setPlanMode('detallado')}
                  className={`px-2.5 py-1 rounded-md text-[12px] font-medium border-[0.5px] transition-colors ${!isSimple ? 'bg-accent text-bg-primary border-accent' : 'bg-bg-secondary border-border text-text-secondary hover:text-text-primary'}`}>
                  Detallado
                </button>
                <button onClick={() => setPlanMode('simple')}
                  className={`px-2.5 py-1 rounded-md text-[12px] font-medium border-[0.5px] transition-colors ${isSimple ? 'bg-accent text-bg-primary border-accent' : 'bg-bg-secondary border-border text-text-secondary hover:text-text-primary'}`}>
                  Simple
                </button>
              </div>
            </div>
          )
        })()}

        <Link href={`/dashboard/pacientes/${patient.id}/rts`} className="block no-underline group">
          <div className="bg-bg-primary border-[0.5px] border-border rounded-xl p-6 hover:bg-bg-secondary transition-colors h-full">
            <div className="text-[11px] uppercase tracking-[0.05em] text-text-secondary mb-3">Protocolos RTS</div>
            <div className="text-[18px] font-medium mb-1">Retorno al Deporte</div>
            <div className="text-[13px] text-text-secondary">LCA, isquiotibiales, tobillo, femoropatelar, tendinopatía, inguinal, hombro</div>
            <div className="mt-5 text-accent text-[13px] font-medium opacity-0 group-hover:opacity-100 [@media(hover:none)]:opacity-100 transition-opacity">Abrir →</div>
          </div>
        </Link>
      </div>
```

Reemplazar por:
```typescript
      {/* BARRA DE ACCESOS — compacta, siempre arriba de "Atención de hoy" para
          que nunca quede escondida por el tamaño de esa sección. Links de
          salida (no hay "activo": cada uno lleva a una página distinta). */}
      <nav className="inline-flex items-center gap-0.5 bg-bg-tertiary border-[0.5px] border-border-strong rounded-2xl p-1 mb-6 shadow-sm overflow-x-auto max-w-full">
        <Link href={`/dashboard/pacientes/${patient.id}/ficha`} className="flex items-center gap-2 px-3.5 py-2.5 rounded-xl text-[13px] font-medium text-text-secondary hover:text-text-primary hover:bg-bg-secondary transition-colors no-underline whitespace-nowrap">
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M9 3H6a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8l-5-5h-3"/><path d="M14 3v5h5M9 13h6M9 17h6"/></svg>
          Ficha
        </Link>
        {(patient.plan_mode ?? 'detallado') === 'simple' ? (
          <Link href={`/dashboard/pacientes/${patient.id}/bitacora`} className="flex items-center gap-2 px-3.5 py-2.5 rounded-xl text-[13px] font-medium text-text-secondary hover:text-text-primary hover:bg-bg-secondary transition-colors no-underline whitespace-nowrap">
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><rect x="3" y="4" width="18" height="18" rx="2"/><path d="M16 2v4M8 2v4M3 10h18M9 16l2 2 4-4"/></svg>
            Bitácora
          </Link>
        ) : (
          <Link href={`/dashboard/ejercicios/plan?paciente=${patient.id}`} className="flex items-center gap-2 px-3.5 py-2.5 rounded-xl text-[13px] font-medium text-text-secondary hover:text-text-primary hover:bg-bg-secondary transition-colors no-underline whitespace-nowrap">
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><rect x="3" y="4" width="18" height="18" rx="2"/><path d="M16 2v4M8 2v4M3 10h18M9 16l2 2 4-4"/></svg>
            Plan
          </Link>
        )}
        <Link href={`/dashboard/pacientes/${patient.id}/rts`} className="flex items-center gap-2 px-3.5 py-2.5 rounded-xl text-[13px] font-medium text-text-secondary hover:text-text-primary hover:bg-bg-secondary transition-colors no-underline whitespace-nowrap">
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M13 2 3 14h7l-1 8 10-12h-7l1-8z"/></svg>
          RTS
        </Link>
        {(patient.advanced_load_mode ?? false) && (
          <Link href={`/dashboard/pacientes/${patient.id}/carga`} className="flex items-center gap-2 px-3.5 py-2.5 rounded-xl text-[13px] font-medium text-text-secondary hover:text-text-primary hover:bg-bg-secondary transition-colors no-underline whitespace-nowrap">
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M3 3v18h18M7 15l3-4 3 2 4-6"/></svg>
            Carga
          </Link>
        )}
      </nav>
```

- [ ] **Step 2: Mover la barra arriba de "Atención de hoy"**

Hoy el orden es: header → "Atención de hoy" → (la barra recién reemplazada) → "Primeros pasos" → hitos. Cortar el bloque `<nav className="inline-flex ...">...</nav>` completo (el que acabás de pegar en el Step 1) y pegarlo **antes** de:
```typescript
      {/* ATENCIÓN DE HOY — solo en pacientes en modo kinesiología. */}
      {patient.kine_mode && (
```
Es decir, el orden final de bloques queda: header del paciente → barra de accesos → "Atención de hoy" (si `kine_mode`) → "Primeros pasos" / "Siguiente paso" → hitos del tratamiento. (El banner "Primeros pasos" sigue intacto, solo que ahora la barra de accesos ya está siempre visible arriba, así que ese banner deja de ser la única forma de llegar a Ficha/Plan para un paciente nuevo.)

- [ ] **Step 3: Verificar tipos y lint**

Run: `npx tsc --noEmit && npx eslint "src/app/dashboard/pacientes/[id]/PacienteDetail.tsx"`
Expected: sin errores.

- [ ] **Step 4: Prueba manual**

```bash
npm run dev
```
Abrir `http://localhost:3000/dashboard/pacientes/<algún-id-real>` y confirmar:
- La barra de accesos aparece arriba de todo (antes de "Atención de hoy" si el paciente tiene `kine_mode`).
- Con `advanced_load_mode` apagado (default), NO aparece "Carga" en la barra, ni el botón "+ Registrar sesión" del header.
- Cada link navega a la página correcta.
- En una ventana angosta (`resize_window` a mobile o achicar el navegador), la barra scrollea horizontal en vez de romper el layout.

- [ ] **Step 5: Commit**

```bash
git add "src/app/dashboard/pacientes/[id]/PacienteDetail.tsx"
git commit -m "$(cat <<'EOF'
feat(pacientes): barra de accesos compacta reemplaza las cards grandes

Co-Authored-By: Claude Sonnet 4.6 <noreply@anthropic.com>
EOF
)"
```

---

### Task 7: Ocultar "+ Registrar sesión" en el menú de la agenda

**Files:**
- Modify: `src/app/dashboard/agenda/AgendaClient.tsx:426` (nuevo estado)
- Modify: `src/app/dashboard/agenda/AgendaClient.tsx:539-550` (query de modo kine → sumar advanced_load_mode)
- Modify: `src/app/dashboard/agenda/AgendaClient.tsx:1214-1221` (gate del botón)

- [ ] **Step 1: Agregar el estado nuevo**

Buscar (línea 426):
```typescript
  const [kinePatientIds, setKinePatientIds] = useState<Set<string>>(new Set())
```
Agregar debajo:
```typescript
  const [kinePatientIds, setKinePatientIds] = useState<Set<string>>(new Set())
  const [advancedLoadPatientIds, setAdvancedLoadPatientIds] = useState<Set<string>>(new Set())
```

- [ ] **Step 2: Sumar el campo a la query existente**

Buscar:
```typescript
    // Marca de "modo kine": qué pacientes visibles están en modo kine, para
    // ofrecer la "Atención de hoy" rápida desde el turno sin entrar a la ficha.
    if (patIds.length > 0) {
      const { data: km } = await supabaseRef.current
        .from('patients')
        .select('id, plan_mode')
        .in('id', patIds)
        .eq('kine_mode', true)
      setKinePatientIds(new Set((km ?? []).map(r => r.id as string)))
      setPlanModeByPatient(Object.fromEntries((km ?? []).map(r => [r.id as string, (r.plan_mode as string | null) ?? 'detallado'])))
    } else {
      setKinePatientIds(new Set())
      setPlanModeByPatient({})
    }
```
Reemplazar por (saca el filtro `.eq('kine_mode', true)` para traer también a los pacientes con `advanced_load_mode` sin modo kine, y arma el segundo set en base al campo nuevo):
```typescript
    // Marca de "modo kine" y "carga avanzada": qué pacientes visibles tienen
    // cada modo prendido, para ofrecer los accesos rápidos correctos desde el
    // turno sin entrar a la ficha.
    if (patIds.length > 0) {
      const { data: km } = await supabaseRef.current
        .from('patients')
        .select('id, plan_mode, kine_mode, advanced_load_mode')
        .in('id', patIds)
      setKinePatientIds(new Set((km ?? []).filter(r => r.kine_mode).map(r => r.id as string)))
      setAdvancedLoadPatientIds(new Set((km ?? []).filter(r => r.advanced_load_mode).map(r => r.id as string)))
      setPlanModeByPatient(Object.fromEntries((km ?? []).map(r => [r.id as string, (r.plan_mode as string | null) ?? 'detallado'])))
    } else {
      setKinePatientIds(new Set())
      setAdvancedLoadPatientIds(new Set())
      setPlanModeByPatient({})
    }
```

- [ ] **Step 3: Gatear el botón "+ Registrar sesión"**

Buscar:
```typescript
            {!quickMenu.turno.is_blocked && quickMenu.turno.patient_id && (
              <button
                onClick={() => { setSessionSheet({ patientId: quickMenu.turno.patient_id!, patientName: quickMenu.turno.patient_name, turnoId: quickMenu.turno.id }); setQuickMenu(null) }}
                className="w-full text-left px-3 py-2 text-[13px] text-accent font-medium hover:bg-bg-primary transition-colors"
              >
                + Registrar sesión
              </button>
            )}
```
Reemplazar por:
```typescript
            {!quickMenu.turno.is_blocked && quickMenu.turno.patient_id && advancedLoadPatientIds.has(quickMenu.turno.patient_id) && (
              <button
                onClick={() => { setSessionSheet({ patientId: quickMenu.turno.patient_id!, patientName: quickMenu.turno.patient_name, turnoId: quickMenu.turno.id }); setQuickMenu(null) }}
                className="w-full text-left px-3 py-2 text-[13px] text-accent font-medium hover:bg-bg-primary transition-colors"
              >
                + Registrar sesión
              </button>
            )}
```

- [ ] **Step 4: Verificar tipos y lint**

Run: `npx tsc --noEmit && npx eslint src/app/dashboard/agenda/AgendaClient.tsx`
Expected: sin errores.

- [ ] **Step 5: Prueba manual**

En `npm run dev`, abrir la agenda, click en un turno de un paciente con `advanced_load_mode` apagado → el menú no debe mostrar "+ Registrar sesión" (solo "Atención de hoy (kine)" si corresponde, y "+ Cargar ingreso a caja" si aplica). Prender el toggle en la ficha de ese paciente, volver a la agenda, y confirmar que ahora sí aparece.

- [ ] **Step 6: Commit**

```bash
git add src/app/dashboard/agenda/AgendaClient.tsx
git commit -m "$(cat <<'EOF'
feat(agenda): ocultar + Registrar sesión si el paciente no tiene carga avanzada

Co-Authored-By: Claude Sonnet 4.6 <noreply@anthropic.com>
EOF
)"
```

---

### Task 8: "Atención de hoy" — continuidad en 1 línea por defecto

**Files:**
- Modify: `src/app/dashboard/pacientes/[id]/AtencionDeHoy.tsx:91` (estado)
- Modify: `src/app/dashboard/pacientes/[id]/AtencionDeHoy.tsx:310` (cálculo de `visible`)
- Modify: `src/app/dashboard/pacientes/[id]/AtencionDeHoy.tsx:388-392` (texto del botón "ver más")

- [ ] **Step 1: Cambiar el default de cuántas líneas se muestran**

Buscar (línea 310):
```typescript
  const visible = showAll ? attentions : attentions.slice(0, 3)
```
Reemplazar por:
```typescript
  const visible = showAll ? attentions : attentions.slice(0, 1)
```

- [ ] **Step 2: Ajustar el botón de "ver más" para que aparezca con más de 1**

Buscar:
```typescript
              {attentions.length > 3 && (
                <button onClick={() => setShowAll(v => !v)} className="text-[11.5px] text-text-secondary hover:text-text-primary px-3 py-2 border-t-[0.5px] border-border w-full text-left">
                  {showAll ? 'Ver menos' : `Ver las ${attentions.length} atenciones`}
                </button>
              )}
```
Reemplazar por:
```typescript
              {attentions.length > 1 && (
                <button onClick={() => setShowAll(v => !v)} className="text-[11.5px] text-text-secondary hover:text-text-primary px-3 py-2 border-t-[0.5px] border-border w-full text-left">
                  {showAll ? 'Ver menos' : `Ver las ${attentions.length} atenciones`}
                </button>
              )}
```

- [ ] **Step 3: Verificar tipos y lint**

Run: `npx tsc --noEmit && npx eslint "src/app/dashboard/pacientes/[id]/AtencionDeHoy.tsx"`
Expected: sin errores.

- [ ] **Step 4: Commit**

```bash
git add "src/app/dashboard/pacientes/[id]/AtencionDeHoy.tsx"
git commit -m "$(cat <<'EOF'
feat(atencion-de-hoy): continuidad colapsada a 1 línea por defecto

Co-Authored-By: Claude Sonnet 4.6 <noreply@anthropic.com>
EOF
)"
```

---

### Task 9: "Atención de hoy" — Modalidades y manejo de síntomas detrás de "+ opciones"

**Files:**
- Modify: `src/app/dashboard/pacientes/[id]/AtencionDeHoy.tsx:83-93` (nuevo estado)
- Modify: `src/app/dashboard/pacientes/[id]/AtencionDeHoy.tsx:546-564` (el bloque a colapsar)

- [ ] **Step 1: Agregar estado para el colapso, auto-expandido si ya hay algo elegido**

Buscar (dentro de la lista de `useState` al inicio del componente, después de `const [confirmDel, setConfirmDel] = useState<string | null>(null)`):
```typescript
  const [confirmDel, setConfirmDel] = useState<string | null>(null)
  const [deleting, setDeleting] = useState<string | null>(null)
```
Agregar debajo:
```typescript
  const [confirmDel, setConfirmDel] = useState<string | null>(null)
  const [deleting, setDeleting] = useState<string | null>(null)
  const [showMoreOptions, setShowMoreOptions] = useState(false)
```

- [ ] **Step 2: Envolver el bloque de modalidades + manejo de síntomas**

Buscar:
```typescript
      {/* MODALIDADES + MANEJO DE SÍNTOMAS */}
      <div className="flex flex-wrap gap-2 mb-3">
        {MODALITIES.map(m => {
          const on = modalities.has(m.id)
          return (
            <button
              key={m.id}
              onClick={() => toggleMod(m.id)}
              className={`text-[11.5px] font-medium px-3 py-1.5 rounded-full border-[0.5px] transition-colors ${on ? 'text-accent border-accent/40 bg-accent/10' : 'text-text-secondary border-border bg-bg-primary hover:text-text-primary'}`}
            >
              {m.label}
            </button>
          )
        })}
      </div>
      <label className="flex items-center gap-2 mb-4 text-[12.5px] text-text-secondary cursor-pointer w-fit">
        <input type="checkbox" checked={manage} onChange={e => setManage(e.target.checked)} style={{ accentColor: '#f87171' }} />
        Manejo de síntomas (sin carga) — no rompe la progresión del plan
      </label>
```
Reemplazar por (el bloque queda colapsado salvo que el usuario lo abra, o ya haya elegido algo — así nunca "esconde" una selección que ya hizo):
```typescript
      {/* MODALIDADES + MANEJO DE SÍNTOMAS — colapsado por defecto: no se usa en
          cada paciente, y agregaba 4 controles siempre visibles sin necesidad. */}
      {!showMoreOptions && modalities.size === 0 && !manage ? (
        <button onClick={() => setShowMoreOptions(true)} className="text-[12px] text-text-secondary hover:text-text-primary mb-4 w-fit">
          + opciones (modalidades, manejo de síntomas)
        </button>
      ) : (
        <>
          <div className="flex flex-wrap gap-2 mb-3">
            {MODALITIES.map(m => {
              const on = modalities.has(m.id)
              return (
                <button
                  key={m.id}
                  onClick={() => toggleMod(m.id)}
                  className={`text-[11.5px] font-medium px-3 py-1.5 rounded-full border-[0.5px] transition-colors ${on ? 'text-accent border-accent/40 bg-accent/10' : 'text-text-secondary border-border bg-bg-primary hover:text-text-primary'}`}
                >
                  {m.label}
                </button>
              )
            })}
          </div>
          <label className="flex items-center gap-2 mb-4 text-[12.5px] text-text-secondary cursor-pointer w-fit">
            <input type="checkbox" checked={manage} onChange={e => setManage(e.target.checked)} style={{ accentColor: '#f87171' }} />
            Manejo de síntomas (sin carga) — no rompe la progresión del plan
          </label>
        </>
      )}
```

- [ ] **Step 3: Resetear el colapso al registrar (para que el próximo paciente arranque limpio)**

Buscar, dentro de `register`, la línea:
```typescript
      setSymptom(null); setManage(false); setModalities(new Set()); setNote(''); setSessionEdited(false)
```
Reemplazar por:
```typescript
      setSymptom(null); setManage(false); setModalities(new Set()); setNote(''); setSessionEdited(false); setShowMoreOptions(false)
```

- [ ] **Step 4: Verificar tipos y lint**

Run: `npx tsc --noEmit && npx eslint "src/app/dashboard/pacientes/[id]/AtencionDeHoy.tsx"`
Expected: sin errores.

- [ ] **Step 5: Prueba manual**

En `npm run dev`, entrar a un paciente con `kine_mode` activo: confirmar que "Modalidades" y "Manejo de síntomas" arrancan ocultos detrás de "+ opciones", que tocar "+ opciones" los muestra, y que después de "Registrar atención de hoy" vuelven a arrancar colapsados para la próxima.

- [ ] **Step 6: Commit**

```bash
git add "src/app/dashboard/pacientes/[id]/AtencionDeHoy.tsx"
git commit -m "$(cat <<'EOF'
feat(atencion-de-hoy): modalidades y manejo de síntomas detrás de + opciones

Co-Authored-By: Claude Sonnet 4.6 <noreply@anthropic.com>
EOF
)"
```

---

### Task 10: Verificación final y push

**Files:** ninguno nuevo

- [ ] **Step 1: Build completo de producción**

Run: `npm run build`
Expected: termina con exit code 0, sin errores de tipos/lint que rompan el build. Confirmar que `/dashboard/pacientes/[id]` sigue listado en la tabla de rutas.

- [ ] **Step 2: Prueba manual de punta a punta**

Con `npm run dev` (o `npm run start` sobre el build):
1. Paciente común (`advanced_load_mode` apagado, `kine_mode` prendido): entrar, ver header → barra de accesos (sin "Carga") → Atención de hoy. Registrar una atención de hoy completa (síntoma + nota) y confirmar que queda en la continuidad.
2. Prender "Carga avanzada" en un paciente: confirmar que aparece "Carga" en la barra y "+ Registrar sesión" en el header, y que `/dashboard/pacientes/<id>/carga` sigue funcionando igual que antes.
3. Apagar "Carga avanzada" de nuevo: confirmar que ambos desaparecen.
4. Probar la barra de accesos en mobile (`resize_window` preset mobile): confirmar que no rompe el layout.

- [ ] **Step 3: Push de la rama**

```bash
git push -u origin feature/simplificar-atencion-paciente
```

- [ ] **Step 4: Avisar a Kevin**

Pasarle el link de preview que genera Vercel para esta rama y esperar su confirmación antes de mergear a `main` (regla del proyecto: cambios de base de datos y features significativas van a rama + confirmación).

---

## Self-review

- **Cobertura del spec:** toggle (Task 4, 7), barra de accesos (Task 6), relocación del modo Detallado/Simple que la barra dejaba huérfano (Task 5, no estaba en el spec original pero es una consecuencia directa de la Sección 2 del spec — documentado acá), continuidad 1 línea (Task 8), modalidades colapsadas (Task 9). Las tres tablas (`load_sessions`, `patient_events`, Ficha/Plan/RTS) quedan sin tocar, como pedía el spec.
- **Placeholders:** ninguno — cada paso tiene el código completo a pegar.
- **Consistencia de tipos:** `advanced_load_mode` se llama igual en la columna SQL, el body del API route, el campo de la interface `Patient`, y las dos funciones que lo leen/escriben (`setAdvancedLoadMode` en PacienteDetail, el filtro en AgendaClient). `kinePatientIds`/`advancedLoadPatientIds` siguen el mismo patrón de nombre que ya usa el archivo.
