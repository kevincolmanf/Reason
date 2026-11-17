# Recolección de datos clínicos estructurados — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Que el diagnóstico de una ficha se elija de un catálogo (nunca se tipee a mano) y que la ficha capture, de forma estructurada, el perfil del paciente (hábitos, comorbilidades, antropometría, sociodemográficos, ocupación) y los datos propios del episodio (mecanismo de lesión, lateralidad) — la base necesaria para que después se puedan sacar estadísticas confiables.

**Architecture:** Dos catálogos nuevos (diagnósticos, ocupaciones), cada uno con una tabla global de solo lectura (precargada por el equipo de Reason) y una tabla `_custom` privada por cuenta/equipo para lo que cada uno agregue. Un combobox buscable reusable (`CatalogCombobox`) nunca permite guardar texto libre: siempre resuelve a una fila de alguna de las dos tablas. El perfil del paciente vive en una tabla nueva 1:1 con `patients` (no cambia por consulta, se autoguarda solo); el diagnóstico y los datos del episodio se agregan como columnas nuevas en `patient_fichas` (si el paciente vuelve con otra lesión, queda registrado aparte, no se pisa el anterior).

**Tech Stack:** Next.js 14 (App Router) + TypeScript + Supabase (Postgres + RLS) + Tailwind. Sin framework de tests — verificación con `tsc --noEmit`, `eslint` y prueba manual en el navegador.

**Flujo de git:** toca base de datos y datos de pacientes → rama obligatoria (`feature/datos-clinicos-estructurados`) + confirmación de Kevin antes de mergear (regla del proyecto en CLAUDE.md).

**Spec de referencia:** [docs/superpowers/specs/2026-11-17-datos-clinicos-estructurados-design.md](docs/superpowers/specs/2026-11-17-datos-clinicos-estructurados-design.md)

**Alcance de este plan:** solo la fase de **captura** (catálogos + perfil del paciente + diagnóstico del episodio). La pantalla de estadísticas (fase B de la spec) es un plan separado, a escribir después de que esto esté en producción y haya datos reales para consultar — no tiene sentido diseñar las queries de agregación todavía sin fichas cargadas con el modelo nuevo.

**Decisiones de diseño tomadas en este plan (no estaban cerradas en la spec, se explican acá):**
- **Columnas con `TEXT + CHECK`, no `ENUM` de Postgres:** es el patrón que ya usa el repo para campos de opciones fijas (ver `follow_up_mode` en `supabase_patient_follow_up_mode.sql`) — agregar un valor nuevo después es un `ALTER ... DROP CONSTRAINT` + `ADD CONSTRAINT`, sin tocar un tipo.
- **Los catálogos `_custom` se comparten a nivel de equipo (`org_id`), no por usuario individual dentro del equipo:** si dos kinesiólogos del mismo centro atienden al mismo tipo de paciente, tiene sentido que el diagnóstico que agregó uno esté disponible para el otro — ya es el mismo criterio con el que `patients.org_id` comparte pacientes entre integrantes de un equipo (ver `supabase_org_rls_fix.sql`). Sigue sin cruzar entre cuentas distintas, que es lo que pidió Kevin.
- **`patients.occupation` (texto libre, ya existe) no se toca.** Se usa en 6 archivos fuera de la ficha (creación rápida de paciente, CRM, modal de turno) para un propósito distinto (identificar al paciente en una lista, no estadística). La ocupación estructurada nueva (`patient_clinical_profile.occupation_id`) es un campo aparte, exclusivo del perfil clínico. Tocar el campo viejo es un refactor más grande que no se pidió y no hace falta para este plan.
- **El perfil del paciente se autoguarda solo (debounce 1500ms), independiente del botón "Guardar cambios" de la ficha.** La ficha actual (`FichaClient.tsx`) tiene un flujo de guardado manual con guard de "cambios sin guardar" porque es contenido largo que se edita en una sesión de trabajo. El perfil del paciente es un dato que se completa una vez y rara vez se vuelve a tocar — meterlo en el mismo guard de navegación de la ficha complicaría ese código para un caso de uso distinto. El diagnóstico/mecanismo/lateralidad del episodio, en cambio, SÍ entran al flujo de guardado manual de la ficha, porque son parte del mismo acto de completar la consulta de hoy.
- **El combobox de catálogo busca sobre todas las filas en memoria (fetch único al montar), no por query al servidor en cada tecla.** El catálogo global más el custom de una cuenta nunca va a tener más de unas pocas centenas de filas — filtrar en el cliente es instantáneo y evita programar un endpoint de búsqueda aparte. Si en el futuro el catálogo global crece mucho (miles de filas), esto se revisa.
- **`org_id` para una entrada custom nueva se toma de `patients.org_id` del paciente que se está atendiendo, no del "contexto activo" del header.** Son casi siempre lo mismo, pero `patients.org_id` es la fuente de verdad real de a qué equipo pertenece ese paciente puntual, y evita un caso raro donde alguien tenga el contexto activo mal sincronizado.

---

### Task 1: Rama de trabajo

- [ ] **Step 1: Verificar working tree limpio**

Run: `git status --short`
Expected: nada tuyo pendiente (podés ignorar los archivos sueltos `*  2.*` que ya estaban ahí, no son de este plan).

- [ ] **Step 2: Crear la rama**

```bash
git checkout -b feature/datos-clinicos-estructurados
```

---

### Task 2: Migración SQL — catálogos de diagnósticos y ocupaciones

**Files:**
- Create: `supabase_catalogos_clinicos.sql`

- [ ] **Step 1: Escribir el esquema completo**

```sql
-- Catálogos de diagnósticos y ocupaciones — el diagnóstico de una ficha y la
-- ocupación del perfil del paciente se eligen de acá, nunca se tipean a mano.
-- Cada catálogo tiene una tabla global (precargada por el equipo de Reason,
-- de solo lectura para todos) y una tabla "_custom" privada por cuenta/equipo
-- para lo que cada uno agregue cuando no encuentra algo.
-- Ejecutar en el SQL Editor de Supabase ANTES de mergear
-- feature/datos-clinicos-estructurados.

-- ── Regiones corporales (catálogo fijo, no editable desde la app) ──────────
CREATE TABLE IF NOT EXISTS body_region_catalog (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  nombre text NOT NULL UNIQUE
);

ALTER TABLE body_region_catalog ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Lectura pública de regiones corporales" ON body_region_catalog
  FOR SELECT TO authenticated USING (true);

-- ── Diagnósticos: catálogo global ───────────────────────────────────────────
CREATE TABLE IF NOT EXISTS diagnosis_catalog (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  nombre text NOT NULL,
  codigo_cie10 text,
  body_region_id uuid REFERENCES body_region_catalog(id) NOT NULL,
  activo boolean NOT NULL DEFAULT true
);

CREATE INDEX IF NOT EXISTS diagnosis_catalog_region_idx ON diagnosis_catalog (body_region_id);

ALTER TABLE diagnosis_catalog ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Lectura pública de diagnósticos globales" ON diagnosis_catalog
  FOR SELECT TO authenticated USING (true);

-- ── Diagnósticos: extensión privada por cuenta/equipo ───────────────────────
CREATE TABLE IF NOT EXISTS diagnosis_catalog_custom (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  org_id uuid REFERENCES organizations(id) ON DELETE SET NULL,
  nombre text NOT NULL,
  codigo_cie10 text,
  body_region_id uuid REFERENCES body_region_catalog(id) NOT NULL,
  created_at timestamp with time zone DEFAULT now()
);

CREATE INDEX IF NOT EXISTS diagnosis_catalog_custom_user_idx ON diagnosis_catalog_custom (user_id);
CREATE INDEX IF NOT EXISTS diagnosis_catalog_custom_org_idx ON diagnosis_catalog_custom (org_id);

ALTER TABLE diagnosis_catalog_custom ENABLE ROW LEVEL SECURITY;

-- Mismo criterio que patients (supabase_org_rls_fix.sql): el dueño de la fila
-- siempre puede, y si pertenece a un equipo (org_id), cualquier integrante de
-- ese equipo también — así todos reutilizan lo que cualquiera agregó, sin que
-- cruce a otra cuenta.
CREATE POLICY "Dueño y equipo acceden a diagnósticos custom" ON diagnosis_catalog_custom
  FOR ALL
  USING (
    auth.uid() = user_id
    OR (org_id IS NOT NULL AND public.is_org_member(org_id))
  )
  WITH CHECK (
    auth.uid() = user_id
    OR (org_id IS NOT NULL AND public.is_org_member(org_id))
  );

-- ── Ocupaciones: catálogo global ────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS occupation_catalog (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  nombre text NOT NULL,
  nivel_esfuerzo text NOT NULL CHECK (nivel_esfuerzo IN ('sedentaria', 'de_pie', 'esfuerzo_fisico')),
  activo boolean NOT NULL DEFAULT true
);

ALTER TABLE occupation_catalog ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Lectura pública de ocupaciones globales" ON occupation_catalog
  FOR SELECT TO authenticated USING (true);

-- ── Ocupaciones: extensión privada por cuenta/equipo ────────────────────────
CREATE TABLE IF NOT EXISTS occupation_catalog_custom (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  org_id uuid REFERENCES organizations(id) ON DELETE SET NULL,
  nombre text NOT NULL,
  nivel_esfuerzo text NOT NULL CHECK (nivel_esfuerzo IN ('sedentaria', 'de_pie', 'esfuerzo_fisico')),
  created_at timestamp with time zone DEFAULT now()
);

CREATE INDEX IF NOT EXISTS occupation_catalog_custom_user_idx ON occupation_catalog_custom (user_id);
CREATE INDEX IF NOT EXISTS occupation_catalog_custom_org_idx ON occupation_catalog_custom (org_id);

ALTER TABLE occupation_catalog_custom ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Dueño y equipo acceden a ocupaciones custom" ON occupation_catalog_custom
  FOR ALL
  USING (
    auth.uid() = user_id
    OR (org_id IS NOT NULL AND public.is_org_member(org_id))
  )
  WITH CHECK (
    auth.uid() = user_id
    OR (org_id IS NOT NULL AND public.is_org_member(org_id))
  );
```

(seguir con Task 3 en el mismo archivo, no commitear todavía)

- [ ] **Step 2: Avisar que falta correrla**

Igual que las migraciones anteriores del repo: pegarla en el SQL Editor de Supabase antes de probar en preview. `public.is_org_member` ya existe (viene de `supabase_organizations.sql`) — si Supabase tira error de función inexistente, esa migración no se corrió todavía en este proyecto y hay que avisar antes de seguir.

---

### Task 3: Seed — contenido inicial de los catálogos

**Files:**
- Modify: `supabase_catalogos_clinicos.sql` (agregar al final, mismo archivo de Task 2)

- [ ] **Step 1: Agregar las regiones corporales**

```sql
-- ═══════════════ SEED: contenido inicial de los catálogos ═══════════════
-- Punto de partida curado a mano (diagnósticos frecuentes en kinesiología/
-- fisioterapia musculoesquelética, con código CIE-10 cuando existe uno claro
-- y específico — varios cuadros kinésicos no lo tienen, y en esos casos
-- queda NULL a propósito en vez de forzar un código aproximado). Se puede
-- seguir ampliando después sin tocar código, con un INSERT más a cada tabla.

INSERT INTO body_region_catalog (nombre) VALUES
  ('Columna cervical'), ('Columna dorsal'), ('Columna lumbar'), ('Hombro'),
  ('Codo'), ('Muñeca/Mano'), ('Cadera'), ('Rodilla'), ('Tobillo/Pie'), ('Otro')
ON CONFLICT (nombre) DO NOTHING;
```

- [ ] **Step 2: Agregar los diagnósticos (por región)**

```sql
INSERT INTO diagnosis_catalog (nombre, codigo_cie10, body_region_id)
SELECT x.nombre, x.codigo, br.id
FROM (VALUES
  -- Columna cervical
  ('Cervicalgia mecánica', 'M54.2', 'Columna cervical'),
  ('Cervicobraquialgia', 'M53.1', 'Columna cervical'),
  ('Hernia discal cervical', 'M50.2', 'Columna cervical'),
  ('Radiculopatía cervical', 'M54.1', 'Columna cervical'),
  ('Esguince cervical (latigazo)', 'S13.4', 'Columna cervical'),
  ('Tortícolis', 'M43.6', 'Columna cervical'),
  ('Espondilosis cervical', 'M47.8', 'Columna cervical'),
  ('Síndrome del desfiladero torácico', 'G54.0', 'Columna cervical'),
  ('Cefalea cervicogénica', NULL, 'Columna cervical'),
  -- Columna dorsal
  ('Dorsalgia mecánica', 'M54.6', 'Columna dorsal'),
  ('Escoliosis', 'M41', 'Columna dorsal'),
  ('Hipercifosis / Enfermedad de Scheuermann', 'M42.0', 'Columna dorsal'),
  ('Contractura paravertebral dorsal', 'M62.8', 'Columna dorsal'),
  ('Fractura por compresión vertebral dorsal', 'S22.0', 'Columna dorsal'),
  ('Síndrome facetario dorsal', NULL, 'Columna dorsal'),
  -- Columna lumbar
  ('Lumbalgia mecánica', 'M54.5', 'Columna lumbar'),
  ('Lumbociática', 'M54.4', 'Columna lumbar'),
  ('Hernia de disco lumbar', 'M51.2', 'Columna lumbar'),
  ('Estenosis de canal lumbar', 'M48.0', 'Columna lumbar'),
  ('Espondilolistesis', 'M43.1', 'Columna lumbar'),
  ('Espondilólisis', 'M43.0', 'Columna lumbar'),
  ('Síndrome piriforme', 'G57.0', 'Columna lumbar'),
  ('Disfunción sacroilíaca', NULL, 'Columna lumbar'),
  ('Síndrome facetario lumbar', NULL, 'Columna lumbar'),
  -- Hombro
  ('Tendinopatía del manguito rotador', 'M75.1', 'Hombro'),
  ('Síndrome de pinzamiento subacromial', 'M75.4', 'Hombro'),
  ('Capsulitis adhesiva (hombro congelado)', 'M75.0', 'Hombro'),
  ('Tendinitis bicipital', 'M75.2', 'Hombro'),
  ('Bursitis subacromial', 'M75.5', 'Hombro'),
  ('Inestabilidad glenohumeral', 'M24.4', 'Hombro'),
  ('Luxación de hombro', 'S43.0', 'Hombro'),
  ('Omalgia inespecífica', 'M25.5', 'Hombro'),
  -- Codo
  ('Epicondilitis lateral (codo de tenista)', 'M77.1', 'Codo'),
  ('Epicondilitis medial (codo de golfista)', 'M77.0', 'Codo'),
  ('Bursitis olecraneana', 'M70.2', 'Codo'),
  ('Síndrome del túnel cubital', 'G56.2', 'Codo'),
  ('Artrosis de codo', 'M19.0', 'Codo'),
  -- Muñeca/Mano
  ('Síndrome del túnel carpiano', 'G56.0', 'Muñeca/Mano'),
  ('Tendinopatía de De Quervain', 'M65.4', 'Muñeca/Mano'),
  ('Dedo en gatillo', 'M65.3', 'Muñeca/Mano'),
  ('Rizartrosis (trapecio-metacarpiana)', 'M18.1', 'Muñeca/Mano'),
  ('Esguince de muñeca', 'S63.5', 'Muñeca/Mano'),
  ('Fractura de radio distal (Colles)', 'S52.5', 'Muñeca/Mano'),
  -- Cadera
  ('Coxartrosis (artrosis de cadera)', 'M16', 'Cadera'),
  ('Tendinopatía glútea / síndrome trocantéreo', 'M70.6', 'Cadera'),
  ('Bursitis trocantérea', 'M70.6', 'Cadera'),
  ('Pubalgia', NULL, 'Cadera'),
  ('Choque femoroacetabular', NULL, 'Cadera'),
  ('Fractura de cadera', 'S72.0', 'Cadera'),
  -- Rodilla
  ('Gonartrosis (artrosis de rodilla)', 'M17', 'Rodilla'),
  ('Síndrome femoropatelar', 'M22.2', 'Rodilla'),
  ('Tendinopatía rotuliana', 'M76.5', 'Rodilla'),
  ('Lesión de ligamento cruzado anterior', 'S83.5', 'Rodilla'),
  ('Lesión de menisco', 'S83.2', 'Rodilla'),
  ('Esguince de ligamento colateral de rodilla', 'S83.4', 'Rodilla'),
  ('Bursitis prepatelar', 'M70.4', 'Rodilla'),
  ('Síndrome de la cintilla iliotibial', NULL, 'Rodilla'),
  -- Tobillo/Pie
  ('Esguince de tobillo', 'S93.4', 'Tobillo/Pie'),
  ('Fascitis plantar', 'M72.2', 'Tobillo/Pie'),
  ('Tendinopatía de Aquiles', 'M76.6', 'Tobillo/Pie'),
  ('Rotura del tendón de Aquiles', 'S86.0', 'Tobillo/Pie'),
  ('Síndrome del túnel tarsiano', 'G57.5', 'Tobillo/Pie'),
  ('Hallux valgus', 'M20.1', 'Tobillo/Pie'),
  ('Fractura de tobillo', 'S82.6', 'Tobillo/Pie'),
  ('Metatarsalgia', 'M77.4', 'Tobillo/Pie'),
  -- Otro
  ('Fibromialgia', 'M79.7', 'Otro'),
  ('Dolor miofascial inespecífico', 'M79.1', 'Otro'),
  ('Síndrome de fatiga crónica', 'G93.3', 'Otro'),
  ('Osteoporosis', 'M81.9', 'Otro')
) AS x(nombre, codigo, region_nombre)
JOIN body_region_catalog br ON br.nombre = x.region_nombre;
```

- [ ] **Step 3: Agregar las ocupaciones**

```sql
INSERT INTO occupation_catalog (nombre, nivel_esfuerzo) VALUES
  ('Oficinista / Administrativo', 'sedentaria'),
  ('Contador / Contable', 'sedentaria'),
  ('Programador / Desarrollador de software', 'sedentaria'),
  ('Abogado/a', 'sedentaria'),
  ('Diseñador/a gráfico', 'sedentaria'),
  ('Analista', 'sedentaria'),
  ('Secretario/a', 'sedentaria'),
  ('Atención al cliente / Call center', 'sedentaria'),
  ('Chofer / Conductor', 'sedentaria'),
  ('Estudiante', 'sedentaria'),
  ('Contador de otra oficina (remoto)', 'sedentaria'),
  ('Docente', 'de_pie'),
  ('Enfermero/a', 'de_pie'),
  ('Peluquero/a', 'de_pie'),
  ('Vendedor/a de comercio', 'de_pie'),
  ('Cajero/a de supermercado', 'de_pie'),
  ('Mozo / Camarero', 'de_pie'),
  ('Cocinero/a', 'de_pie'),
  ('Guardia de seguridad', 'de_pie'),
  ('Barista', 'de_pie'),
  ('Farmacéutico/a', 'de_pie'),
  ('Recepcionista de hotel', 'de_pie'),
  ('Guía turístico', 'de_pie'),
  ('Peluquero/a canino', 'de_pie'),
  ('Albañil / Obrero de la construcción', 'esfuerzo_fisico'),
  ('Operario de fábrica', 'esfuerzo_fisico'),
  ('Carpintero/a', 'esfuerzo_fisico'),
  ('Electricista', 'esfuerzo_fisico'),
  ('Plomero / Gasista', 'esfuerzo_fisico'),
  ('Mecánico/a', 'esfuerzo_fisico'),
  ('Jardinero/a', 'esfuerzo_fisico'),
  ('Repositor/a de depósito/logística', 'esfuerzo_fisico'),
  ('Mudancero/a', 'esfuerzo_fisico'),
  ('Pintor/a', 'esfuerzo_fisico'),
  ('Herrero/a', 'esfuerzo_fisico'),
  ('Trabajador/a rural / Agricultor', 'esfuerzo_fisico'),
  ('Personal de limpieza', 'esfuerzo_fisico'),
  ('Cadete / Repartidor', 'esfuerzo_fisico'),
  ('Transportista de carga', 'esfuerzo_fisico'),
  ('Bombero/a', 'esfuerzo_fisico'),
  ('Policía (patrullaje)', 'esfuerzo_fisico'),
  ('Entrenador personal / Profesor de educación física', 'esfuerzo_fisico'),
  ('Kinesiólogo/a / Fisioterapeuta', 'esfuerzo_fisico')
ON CONFLICT DO NOTHING;
```

- [ ] **Step 4: Avisar que falta correrla, y commit**

Pegar todo el archivo (Task 2 + Task 3) en el SQL Editor de Supabase antes de probar en preview.

```bash
git add supabase_catalogos_clinicos.sql
git commit -m "$(cat <<'EOF'
feat(db): catálogos de diagnósticos y ocupaciones + seed inicial

Co-Authored-By: Claude Sonnet 4.6 <noreply@anthropic.com>
EOF
)"
```

---

### Task 4: Migración SQL — perfil clínico del paciente

**Files:**
- Create: `supabase_perfil_clinico_paciente.sql`

- [ ] **Step 1: Escribir la tabla y su RLS**

```sql
-- Perfil clínico del paciente: hábitos, comorbilidades, antropometría,
-- sociodemográficos y ocupación. Una fila por paciente — no cambia por
-- consulta, se completa/edita con el tiempo. Todo nullable: nada de esto es
-- obligatorio para atender a un paciente.
-- Ejecutar en el SQL Editor de Supabase ANTES de mergear
-- feature/datos-clinicos-estructurados.

CREATE TABLE IF NOT EXISTS patient_clinical_profile (
  patient_id uuid REFERENCES patients(id) ON DELETE CASCADE PRIMARY KEY,
  sexo text CHECK (sexo IN ('masculino', 'femenino', 'otro')),
  nivel_actividad_fisica text CHECK (nivel_actividad_fisica IN ('sedentario', 'activo', 'muy_activo')),
  tabaquismo text CHECK (tabaquismo IN ('no_fuma', 'fuma', 'ex_fumador')),
  consumo_alcohol text CHECK (consumo_alcohol IN ('no', 'ocasional', 'habitual')),
  diabetes boolean,
  hipertension boolean,
  obesidad boolean,
  enf_cardiovascular boolean,
  osteoporosis boolean,
  cirugia_previa boolean,
  peso_kg numeric(5,2),
  talla_cm numeric(5,1),
  nivel_socioeconomico text CHECK (nivel_socioeconomico IN ('bajo', 'medio', 'alto')),
  occupation_id uuid, -- apunta a occupation_catalog u occupation_catalog_custom, sin FK única (ver nota abajo)
  occupation_source text CHECK (occupation_source IN ('global', 'custom')),
  updated_at timestamp with time zone DEFAULT now()
);

-- Nota: occupation_id no tiene FK directa porque puede apuntar a dos tablas
-- distintas (occupation_catalog u occupation_catalog_custom) — se guarda
-- occupation_source junto al id para saber en cuál buscar, y la integridad
-- real la garantiza el combobox (nunca permite elegir algo que no exista en
-- una de las dos tablas), igual que con diagnosis_id en patient_fichas.

ALTER TABLE patient_clinical_profile ENABLE ROW LEVEL SECURITY;

-- Mismo criterio que patient_fichas/questionnaire_results/etc: el dueño del
-- paciente, o cualquier integrante del equipo si el paciente es de un equipo.
CREATE POLICY "Dueño y equipo acceden al perfil clínico" ON patient_clinical_profile
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM patients p
      WHERE p.id = patient_clinical_profile.patient_id
        AND (p.user_id = auth.uid() OR (p.org_id IS NOT NULL AND public.is_org_member(p.org_id)))
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM patients p
      WHERE p.id = patient_clinical_profile.patient_id
        AND (p.user_id = auth.uid() OR (p.org_id IS NOT NULL AND public.is_org_member(p.org_id)))
    )
  );

CREATE OR REPLACE FUNCTION update_patient_clinical_profile_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER patient_clinical_profile_updated_at
  BEFORE UPDATE ON patient_clinical_profile
  FOR EACH ROW EXECUTE FUNCTION update_patient_clinical_profile_updated_at();
```

- [ ] **Step 2: Avisar que falta correrla, y commit**

```bash
git add supabase_perfil_clinico_paciente.sql
git commit -m "$(cat <<'EOF'
feat(db): tabla patient_clinical_profile

Co-Authored-By: Claude Sonnet 4.6 <noreply@anthropic.com>
EOF
)"
```

---

### Task 5: Migración SQL — datos del episodio en `patient_fichas`

**Files:**
- Create: `supabase_ficha_diagnostico_estructurado.sql`

- [ ] **Step 1: Escribir las columnas nuevas**

```sql
-- Diagnóstico estructurado y datos del episodio en cada ficha. diagnosis_id
-- no tiene FK única por la misma razón que occupation_id en
-- patient_clinical_profile: puede apuntar a diagnosis_catalog (global) o a
-- diagnosis_catalog_custom — diagnosis_source dice en cuál buscar.
-- Ejecutar en el SQL Editor de Supabase ANTES de mergear
-- feature/datos-clinicos-estructurados.

ALTER TABLE patient_fichas
  ADD COLUMN IF NOT EXISTS diagnosis_id uuid,
  ADD COLUMN IF NOT EXISTS diagnosis_source text CHECK (diagnosis_source IN ('global', 'custom')),
  ADD COLUMN IF NOT EXISTS mecanismo_lesion text CHECK (mecanismo_lesion IN ('traumatico', 'sobreuso', 'degenerativo')),
  ADD COLUMN IF NOT EXISTS lateralidad text CHECK (lateralidad IN ('derecha', 'izquierda', 'bilateral', 'no_aplica'));
```

- [ ] **Step 2: Avisar que falta correrla, y commit**

```bash
git add supabase_ficha_diagnostico_estructurado.sql
git commit -m "$(cat <<'EOF'
feat(db): columnas de diagnóstico estructurado en patient_fichas

Co-Authored-By: Claude Sonnet 4.6 <noreply@anthropic.com>
EOF
)"
```

---

### Task 6: Tipos y helpers de catálogo

**Files:**
- Create: `src/lib/clinicalCatalog.ts`

- [ ] **Step 1: Escribir los tipos y las funciones de fetch/creación**

```typescript
import type { SupabaseClient } from '@supabase/supabase-js'

export type BodyRegion = { id: string; nombre: string }

export type NivelEsfuerzo = 'sedentaria' | 'de_pie' | 'esfuerzo_fisico'

export interface DiagnosisOption {
  id: string
  nombre: string
  codigo_cie10: string | null
  body_region_id: string
  source: 'global' | 'custom'
}

export interface OccupationOption {
  id: string
  nombre: string
  nivel_esfuerzo: NivelEsfuerzo
  source: 'global' | 'custom'
}

export async function fetchBodyRegions(supabase: SupabaseClient): Promise<BodyRegion[]> {
  const { data, error } = await supabase.from('body_region_catalog').select('id, nombre').order('nombre')
  if (error) throw error
  return data ?? []
}

// Trae catálogo global + el custom de la cuenta/equipo a la vez (RLS ya
// limita el custom a lo que esta cuenta puede ver). Un solo fetch al montar
// el combobox — filtrar por texto se hace en el cliente.
export async function fetchDiagnosisCatalog(supabase: SupabaseClient): Promise<DiagnosisOption[]> {
  const [{ data: global, error: e1 }, { data: custom, error: e2 }] = await Promise.all([
    supabase.from('diagnosis_catalog').select('id, nombre, codigo_cie10, body_region_id').eq('activo', true),
    supabase.from('diagnosis_catalog_custom').select('id, nombre, codigo_cie10, body_region_id'),
  ])
  if (e1) throw e1
  if (e2) throw e2
  const globalOpts: DiagnosisOption[] = (global ?? []).map(d => ({ ...d, source: 'global' as const }))
  const customOpts: DiagnosisOption[] = (custom ?? []).map(d => ({ ...d, source: 'custom' as const }))
  return [...globalOpts, ...customOpts].sort((a, b) => a.nombre.localeCompare(b.nombre))
}

export async function createCustomDiagnosis(
  supabase: SupabaseClient,
  params: { nombre: string; bodyRegionId: string; userId: string; orgId: string | null },
): Promise<DiagnosisOption> {
  const { data, error } = await supabase
    .from('diagnosis_catalog_custom')
    .insert({ nombre: params.nombre, body_region_id: params.bodyRegionId, user_id: params.userId, org_id: params.orgId })
    .select('id, nombre, codigo_cie10, body_region_id')
    .single()
  if (error) throw error
  return { ...data, source: 'custom' }
}

export async function fetchOccupationCatalog(supabase: SupabaseClient): Promise<OccupationOption[]> {
  const [{ data: global, error: e1 }, { data: custom, error: e2 }] = await Promise.all([
    supabase.from('occupation_catalog').select('id, nombre, nivel_esfuerzo').eq('activo', true),
    supabase.from('occupation_catalog_custom').select('id, nombre, nivel_esfuerzo'),
  ])
  if (e1) throw e1
  if (e2) throw e2
  const globalOpts: OccupationOption[] = (global ?? []).map(o => ({ ...o, source: 'global' as const }))
  const customOpts: OccupationOption[] = (custom ?? []).map(o => ({ ...o, source: 'custom' as const }))
  return [...globalOpts, ...customOpts].sort((a, b) => a.nombre.localeCompare(b.nombre))
}

export async function createCustomOccupation(
  supabase: SupabaseClient,
  params: { nombre: string; nivelEsfuerzo: NivelEsfuerzo; userId: string; orgId: string | null },
): Promise<OccupationOption> {
  const { data, error } = await supabase
    .from('occupation_catalog_custom')
    .insert({ nombre: params.nombre, nivel_esfuerzo: params.nivelEsfuerzo, user_id: params.userId, org_id: params.orgId })
    .select('id, nombre, nivel_esfuerzo')
    .single()
  if (error) throw error
  return { ...data, source: 'custom' }
}
```

- [ ] **Step 2: Verificar tipos**

Run: `npx tsc --noEmit`
Expected: sin errores.

- [ ] **Step 3: Commit**

```bash
git add src/lib/clinicalCatalog.ts
git commit -m "$(cat <<'EOF'
feat: tipos y fetch de catálogos de diagnósticos y ocupaciones

Co-Authored-By: Claude Sonnet 4.6 <noreply@anthropic.com>
EOF
)"
```

---

### Task 7: Componente `CatalogCombobox`

Buscador con autocompletar, reusado para diagnóstico (con región corporal como campo extra al crear) y ocupación (con nivel de esfuerzo como campo extra al crear). Nunca deja guardar texto libre: si no hay match, el único camino es "Crear" — eso inserta en el catálogo custom y lo deja seleccionado.

**Files:**
- Create: `src/components/CatalogCombobox.tsx`

- [ ] **Step 1: Escribir el componente**

```tsx
'use client'

import { useMemo, useRef, useState } from 'react'

export interface CatalogComboboxOption {
  id: string
  nombre: string
  sublabel?: string // ej. código CIE-10
}

interface ExtraFieldOption { value: string; label: string }

export default function CatalogCombobox({
  value, onChange, options, placeholder, extraFieldLabel, extraFieldOptions, onCreate, disabled,
}: {
  value: string | null
  onChange: (id: string) => void
  options: CatalogComboboxOption[]
  placeholder: string
  extraFieldLabel: string
  extraFieldOptions: ExtraFieldOption[]
  onCreate: (nombre: string, extraValue: string) => Promise<CatalogComboboxOption>
  disabled?: boolean
}) {
  const [open, setOpen] = useState(false)
  const [query, setQuery] = useState('')
  const [creatingExtra, setCreatingExtra] = useState<string | null>(null) // nombre pendiente de crear
  const [saving, setSaving] = useState(false)
  const containerRef = useRef<HTMLDivElement>(null)

  const selected = options.find(o => o.id === value) ?? null

  const matches = useMemo(() => {
    const q = query.trim().toLowerCase()
    if (!q) return options.slice(0, 30)
    return options.filter(o => o.nombre.toLowerCase().includes(q)).slice(0, 30)
  }, [query, options])

  const exactMatch = matches.some(o => o.nombre.toLowerCase() === query.trim().toLowerCase())

  const pick = (opt: CatalogComboboxOption) => {
    onChange(opt.id)
    setQuery('')
    setOpen(false)
    setCreatingExtra(null)
  }

  const startCreate = () => setCreatingExtra(query.trim())

  const confirmCreate = async (extraValue: string) => {
    if (!creatingExtra) return
    setSaving(true)
    try {
      const created = await onCreate(creatingExtra, extraValue)
      pick(created)
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="relative" ref={containerRef}>
      {!open ? (
        <button
          type="button"
          disabled={disabled}
          onClick={() => setOpen(true)}
          className="w-full text-left bg-bg-primary border-[0.5px] border-border-strong rounded-lg p-3 text-[14px] focus:outline-none focus:border-accent disabled:opacity-50"
        >
          {selected ? (
            <span>
              {selected.nombre}
              {selected.sublabel && <span className="text-text-tertiary text-[12px] ml-2">{selected.sublabel}</span>}
            </span>
          ) : (
            <span className="text-text-tertiary">{placeholder}</span>
          )}
        </button>
      ) : (
        <div className="bg-bg-primary border-[0.5px] border-accent rounded-lg shadow-lg absolute z-20 w-full">
          <input
            autoFocus
            type="text"
            value={query}
            onChange={e => { setQuery(e.target.value); setCreatingExtra(null) }}
            onBlur={() => setTimeout(() => setOpen(false), 150)}
            placeholder={placeholder}
            className="w-full bg-bg-primary border-b-[0.5px] border-border p-3 text-[14px] focus:outline-none rounded-t-lg"
          />
          {creatingExtra ? (
            <div className="p-3 space-y-2">
              <p className="text-[12px] text-text-secondary">Crear &quot;{creatingExtra}&quot; — elegí {extraFieldLabel.toLowerCase()}:</p>
              <div className="flex flex-wrap gap-2">
                {extraFieldOptions.map(opt => (
                  <button
                    key={opt.value}
                    type="button"
                    disabled={saving}
                    onMouseDown={e => e.preventDefault()}
                    onClick={() => confirmCreate(opt.value)}
                    className="px-3 py-1.5 rounded-lg text-[13px] border-[0.5px] border-border-strong bg-bg-secondary text-text-primary hover:border-accent disabled:opacity-40 transition-colors"
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
            </div>
          ) : (
            <ul className="max-h-[240px] overflow-y-auto">
              {matches.map(opt => (
                <li key={opt.id}>
                  <button
                    type="button"
                    onMouseDown={e => e.preventDefault()}
                    onClick={() => pick(opt)}
                    className="w-full text-left px-3 py-2 text-[14px] hover:bg-bg-secondary transition-colors"
                  >
                    {opt.nombre}
                    {opt.sublabel && <span className="text-text-tertiary text-[12px] ml-2">{opt.sublabel}</span>}
                  </button>
                </li>
              ))}
              {query.trim() && !exactMatch && (
                <li>
                  <button
                    type="button"
                    onMouseDown={e => e.preventDefault()}
                    onClick={startCreate}
                    className="w-full text-left px-3 py-2 text-[14px] text-accent hover:bg-bg-secondary transition-colors border-t-[0.5px] border-border"
                  >
                    + Crear &quot;{query.trim()}&quot;
                  </button>
                </li>
              )}
              {matches.length === 0 && !query.trim() && (
                <li className="px-3 py-2 text-[13px] text-text-tertiary">Escribí para buscar…</li>
              )}
            </ul>
          )}
        </div>
      )}
    </div>
  )
}
```

- [ ] **Step 2: Verificar tipos y lint**

Run: `npx tsc --noEmit && npx eslint src/components/CatalogCombobox.tsx`
Expected: sin errores.

- [ ] **Step 3: Commit**

```bash
git add src/components/CatalogCombobox.tsx
git commit -m "$(cat <<'EOF'
feat: componente CatalogCombobox (buscar + crear, sin texto libre)

Co-Authored-By: Claude Sonnet 4.6 <noreply@anthropic.com>
EOF
)"
```

---

### Task 8: Componente `ClinicalProfilePanel` (perfil del paciente)

**Files:**
- Create: `src/app/dashboard/pacientes/[id]/ficha/ClinicalProfilePanel.tsx`

- [ ] **Step 1: Escribir el componente**

```tsx
'use client'

import { useEffect, useRef, useState } from 'react'
import { createClient } from '@/utils/supabase/client'
import CatalogCombobox, { type CatalogComboboxOption } from '@/components/CatalogCombobox'
import {
  fetchOccupationCatalog, createCustomOccupation,
  type OccupationOption, type NivelEsfuerzo,
} from '@/lib/clinicalCatalog'

interface ClinicalProfile {
  sexo: 'masculino' | 'femenino' | 'otro' | null
  nivel_actividad_fisica: 'sedentario' | 'activo' | 'muy_activo' | null
  tabaquismo: 'no_fuma' | 'fuma' | 'ex_fumador' | null
  consumo_alcohol: 'no' | 'ocasional' | 'habitual' | null
  diabetes: boolean | null
  hipertension: boolean | null
  obesidad: boolean | null
  enf_cardiovascular: boolean | null
  osteoporosis: boolean | null
  cirugia_previa: boolean | null
  peso_kg: number | null
  talla_cm: number | null
  nivel_socioeconomico: 'bajo' | 'medio' | 'alto' | null
  occupation_id: string | null
  occupation_source: 'global' | 'custom' | null
}

const emptyProfile: ClinicalProfile = {
  sexo: null, nivel_actividad_fisica: null, tabaquismo: null, consumo_alcohol: null,
  diabetes: null, hipertension: null, obesidad: null, enf_cardiovascular: null,
  osteoporosis: null, cirugia_previa: null, peso_kg: null, talla_cm: null,
  nivel_socioeconomico: null, occupation_id: null, occupation_source: null,
}

const COMORBILIDADES: { key: keyof ClinicalProfile; label: string }[] = [
  { key: 'diabetes', label: 'Diabetes' },
  { key: 'hipertension', label: 'Hipertensión' },
  { key: 'obesidad', label: 'Obesidad' },
  { key: 'enf_cardiovascular', label: 'Enf. cardiovascular' },
  { key: 'osteoporosis', label: 'Osteoporosis' },
  { key: 'cirugia_previa', label: 'Cirugía previa en la zona' },
]

const NIVEL_ESFUERZO_OPTIONS: { value: NivelEsfuerzo; label: string }[] = [
  { value: 'sedentaria', label: 'Sedentaria' },
  { value: 'de_pie', label: 'De pie' },
  { value: 'esfuerzo_fisico', label: 'Esfuerzo físico' },
]

function summaryChips(p: ClinicalProfile, occupationName: string | null): string[] {
  const chips: string[] = []
  if (p.sexo) chips.push(p.sexo === 'masculino' ? 'Masculino' : p.sexo === 'femenino' ? 'Femenino' : 'Otro')
  if (p.nivel_actividad_fisica) chips.push(p.nivel_actividad_fisica.charAt(0).toUpperCase() + p.nivel_actividad_fisica.slice(1))
  if (p.tabaquismo === 'fuma') chips.push('Fumador')
  if (p.tabaquismo === 'ex_fumador') chips.push('Ex-fumador')
  if (p.diabetes) chips.push('Diabetes')
  if (p.hipertension) chips.push('Hipertensión')
  if (occupationName) chips.push(occupationName)
  return chips
}

export default function ClinicalProfilePanel({
  patientId, userId, orgId,
}: {
  patientId: string
  userId: string
  orgId: string | null
}) {
  const [profile, setProfile] = useState<ClinicalProfile>(emptyProfile)
  const [loaded, setLoaded] = useState(false)
  const [occupations, setOccupations] = useState<OccupationOption[]>([])
  const [saveStatus, setSaveStatus] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle')
  const supabaseRef = useRef(createClient())
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    let cancelled = false
    const supabase = supabaseRef.current
    ;(async () => {
      const [{ data: existing }, occs] = await Promise.all([
        supabase.from('patient_clinical_profile').select('*').eq('patient_id', patientId).maybeSingle(),
        fetchOccupationCatalog(supabase),
      ])
      if (cancelled) return
      if (existing) setProfile({ ...emptyProfile, ...existing })
      setOccupations(occs)
      setLoaded(true)
    })()
    return () => { cancelled = true }
  }, [patientId])

  const persist = (next: ClinicalProfile) => {
    if (timeoutRef.current) clearTimeout(timeoutRef.current)
    setSaveStatus('saving')
    timeoutRef.current = setTimeout(async () => {
      const { error } = await supabaseRef.current
        .from('patient_clinical_profile')
        .upsert({ patient_id: patientId, ...next })
      setSaveStatus(error ? 'error' : 'saved')
    }, 1500)
  }

  const update = <K extends keyof ClinicalProfile>(key: K, value: ClinicalProfile[K]) => {
    const next = { ...profile, [key]: value }
    setProfile(next)
    persist(next)
  }

  const occupationOptions: CatalogComboboxOption[] = occupations.map(o => ({ id: o.id, nombre: o.nombre }))
  const selectedOccupation = occupations.find(o => o.id === profile.occupation_id) ?? null
  const chips = summaryChips(profile, selectedOccupation?.nombre ?? null)
  const imc = profile.peso_kg && profile.talla_cm
    ? (profile.peso_kg / ((profile.talla_cm / 100) ** 2)).toFixed(1)
    : null

  if (!loaded) return null

  return (
    <details className="bg-bg-primary border-[0.5px] border-border rounded-xl p-8 mb-6" open={chips.length === 0}>
      <summary className="cursor-pointer select-none list-none">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-[15px] font-medium tracking-[-0.01em] inline">Perfil del paciente</h2>
            <span className="text-[11px] text-text-tertiary ml-2">no cambia por consulta</span>
          </div>
          {saveStatus === 'saving' && <span className="text-[12px] text-text-secondary">Guardando…</span>}
          {saveStatus === 'saved' && <span className="text-[12px] text-[#3b82f6]">✓ Guardado</span>}
        </div>
        {chips.length > 0 ? (
          <div className="flex flex-wrap gap-1.5 mt-2">
            {chips.map(c => (
              <span key={c} className="text-[12px] bg-bg-secondary border-[0.5px] border-border rounded-full px-2.5 py-0.5 text-text-secondary">{c}</span>
            ))}
          </div>
        ) : (
          <p className="text-[12px] text-text-tertiary mt-1">Completar una vez — ayuda a las estadísticas.</p>
        )}
      </summary>

      <div className="mt-6 space-y-5">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-[12px] text-text-secondary mb-1">Sexo</label>
            <select value={profile.sexo ?? ''} onChange={e => update('sexo', (e.target.value || null) as ClinicalProfile['sexo'])}
              className="w-full bg-bg-primary border-[0.5px] border-border-strong rounded-lg p-2.5 text-[14px] focus:outline-none focus:border-accent">
              <option value="">Sin especificar</option>
              <option value="masculino">Masculino</option>
              <option value="femenino">Femenino</option>
              <option value="otro">Otro</option>
            </select>
          </div>
          <div>
            <label className="block text-[12px] text-text-secondary mb-1">Nivel socioeconómico</label>
            <select value={profile.nivel_socioeconomico ?? ''} onChange={e => update('nivel_socioeconomico', (e.target.value || null) as ClinicalProfile['nivel_socioeconomico'])}
              className="w-full bg-bg-primary border-[0.5px] border-border-strong rounded-lg p-2.5 text-[14px] focus:outline-none focus:border-accent">
              <option value="">Sin especificar</option>
              <option value="bajo">Bajo</option>
              <option value="medio">Medio</option>
              <option value="alto">Alto</option>
            </select>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div>
            <label className="block text-[12px] text-text-secondary mb-1">Actividad física</label>
            <select value={profile.nivel_actividad_fisica ?? ''} onChange={e => update('nivel_actividad_fisica', (e.target.value || null) as ClinicalProfile['nivel_actividad_fisica'])}
              className="w-full bg-bg-primary border-[0.5px] border-border-strong rounded-lg p-2.5 text-[14px] focus:outline-none focus:border-accent">
              <option value="">Sin especificar</option>
              <option value="sedentario">Sedentario</option>
              <option value="activo">Activo</option>
              <option value="muy_activo">Muy activo</option>
            </select>
          </div>
          <div>
            <label className="block text-[12px] text-text-secondary mb-1">Tabaquismo</label>
            <select value={profile.tabaquismo ?? ''} onChange={e => update('tabaquismo', (e.target.value || null) as ClinicalProfile['tabaquismo'])}
              className="w-full bg-bg-primary border-[0.5px] border-border-strong rounded-lg p-2.5 text-[14px] focus:outline-none focus:border-accent">
              <option value="">Sin especificar</option>
              <option value="no_fuma">No fuma</option>
              <option value="fuma">Fuma</option>
              <option value="ex_fumador">Ex-fumador</option>
            </select>
          </div>
          <div>
            <label className="block text-[12px] text-text-secondary mb-1">Consumo de alcohol</label>
            <select value={profile.consumo_alcohol ?? ''} onChange={e => update('consumo_alcohol', (e.target.value || null) as ClinicalProfile['consumo_alcohol'])}
              className="w-full bg-bg-primary border-[0.5px] border-border-strong rounded-lg p-2.5 text-[14px] focus:outline-none focus:border-accent">
              <option value="">Sin especificar</option>
              <option value="no">No</option>
              <option value="ocasional">Ocasional</option>
              <option value="habitual">Habitual</option>
            </select>
          </div>
        </div>

        <div>
          <label className="block text-[12px] text-text-secondary mb-2">Antecedentes médicos</label>
          <div className="flex flex-wrap gap-2">
            {COMORBILIDADES.map(({ key, label }) => {
              const sel = profile[key] === true
              return (
                <button key={key} type="button" onClick={() => update(key, !sel as never)}
                  className={`px-3 py-1.5 rounded-lg text-[13px] border-[0.5px] transition-colors ${sel ? 'bg-accent text-bg-primary border-accent' : 'bg-bg-primary border-border-strong text-text-secondary hover:text-text-primary'}`}
                >{label}</button>
              )
            })}
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 items-end">
          <div>
            <label className="block text-[12px] text-text-secondary mb-1">Peso (kg)</label>
            <input type="number" step="0.1" value={profile.peso_kg ?? ''} onChange={e => update('peso_kg', e.target.value ? Number(e.target.value) : null)}
              className="w-full bg-bg-primary border-[0.5px] border-border-strong rounded-lg p-2.5 text-[14px] focus:outline-none focus:border-accent" />
          </div>
          <div>
            <label className="block text-[12px] text-text-secondary mb-1">Talla (cm)</label>
            <input type="number" step="0.1" value={profile.talla_cm ?? ''} onChange={e => update('talla_cm', e.target.value ? Number(e.target.value) : null)}
              className="w-full bg-bg-primary border-[0.5px] border-border-strong rounded-lg p-2.5 text-[14px] focus:outline-none focus:border-accent" />
          </div>
          <div className="text-[13px] text-text-secondary pb-2.5">
            {imc ? <>IMC: <span className="text-text-primary font-medium">{imc}</span></> : 'IMC: —'}
          </div>
        </div>

        <div>
          <label className="block text-[12px] text-text-secondary mb-1">Ocupación</label>
          <CatalogCombobox
            value={profile.occupation_id}
            onChange={id => {
              const occ = occupations.find(o => o.id === id)
              const next = { ...profile, occupation_id: id, occupation_source: occ?.source ?? 'global' }
              setProfile(next)
              persist(next)
            }}
            options={occupationOptions}
            placeholder="Buscar ocupación…"
            extraFieldLabel="Nivel de esfuerzo"
            extraFieldOptions={NIVEL_ESFUERZO_OPTIONS}
            onCreate={async (nombre, extraValue) => {
              const created = await createCustomOccupation(supabaseRef.current, {
                nombre, nivelEsfuerzo: extraValue as NivelEsfuerzo, userId, orgId,
              })
              setOccupations(prev => [...prev, created])
              return { id: created.id, nombre: created.nombre }
            }}
          />
        </div>
      </div>
    </details>
  )
}
```

- [ ] **Step 2: Verificar tipos y lint**

Run: `npx tsc --noEmit && npx eslint src/app/dashboard/pacientes/\[id\]/ficha/ClinicalProfilePanel.tsx`
Expected: sin errores.

- [ ] **Step 3: Commit**

```bash
git add "src/app/dashboard/pacientes/[id]/ficha/ClinicalProfilePanel.tsx"
git commit -m "$(cat <<'EOF'
feat: panel de perfil clínico del paciente (autoguardado)

Co-Authored-By: Claude Sonnet 4.6 <noreply@anthropic.com>
EOF
)"
```

---

### Task 9: Integrar el perfil clínico en la página de la ficha

**Files:**
- Modify: `src/app/dashboard/pacientes/[id]/ficha/page.tsx:19-23,71-78`
- Modify: `src/app/dashboard/pacientes/[id]/ficha/FichaClient.tsx` (props + render)

- [ ] **Step 1: Pasar `org_id` del paciente desde `page.tsx`**

En `page.tsx`, ampliar el select de `patients` para incluir `org_id`:

```typescript
  const { data: patient } = await supabase
    .from('patients')
    .select('id, name, age, occupation, org_id')
    .eq('id', params.id)
    .single()
```

Y pasarlo a `FichaClient`:

```tsx
        <FichaClient
          ficha={ficha!}
          patientId={patient.id}
          patientName={patient.name}
          orgId={patient.org_id}
          questionnaireResults={questionnaireResults ?? []}
          dynamoResults={dynamoResults ?? []}
          userId={user.id}
        />
```

- [ ] **Step 2: Aceptar `orgId` y renderizar el panel en `FichaClient.tsx`**

Ampliar la firma del componente (cerca de la línea 217):

```tsx
export default function FichaClient({
  ficha: initialFicha,
  patientId,
  patientName,
  orgId,
  questionnaireResults,
  dynamoResults,
  userId,
}: {
  ficha: PatientFicha
  patientId: string
  patientName: string
  orgId: string | null
  questionnaireResults: QuestionnaireResult[]
  dynamoResults: DynamoResult[]
  userId: string
}) {
```

Agregar el import junto a los demás (cerca de la línea 9):

```tsx
import ClinicalProfilePanel from './ClinicalProfilePanel'
```

Y renderizarlo justo antes del "BLOQUE 1" (antes de la línea `{/* ══════════ BLOQUE 1 · ANAMNESIS Y DIAGNÓSTICO ══════════ */}`):

```tsx
      <ClinicalProfilePanel patientId={patientId} userId={userId} orgId={orgId} />

      {/* ══════════ BLOQUE 1 · ANAMNESIS Y DIAGNÓSTICO ══════════ */}
```

- [ ] **Step 3: Verificar tipos**

Run: `npx tsc --noEmit`
Expected: sin errores.

- [ ] **Step 4: Prueba manual**

Abrir una ficha en el navegador (`npm run dev`, ir a `/dashboard/pacientes/<id>/ficha`). Confirmar: el panel "Perfil del paciente" aparece arriba de todo, expandido si está vacío. Completar sexo, actividad física, una comorbilidad, peso/talla (ver que el IMC se calcule), y ocupación (buscar una que exista en el seed, ej. "Albañil"). Esperar ~2 segundos y ver "✓ Guardado". Recargar la página: los datos deben seguir ahí y el panel debe aparecer colapsado con los chips.

- [ ] **Step 5: Commit**

```bash
git add "src/app/dashboard/pacientes/[id]/ficha/page.tsx" "src/app/dashboard/pacientes/[id]/ficha/FichaClient.tsx"
git commit -m "$(cat <<'EOF'
feat(ficha): integrar panel de perfil clínico del paciente

Co-Authored-By: Claude Sonnet 4.6 <noreply@anthropic.com>
EOF
)"
```

---

### Task 10: Diagnóstico estructurado del episodio en la ficha

**Files:**
- Modify: `src/app/dashboard/pacientes/[id]/ficha/FichaClient.tsx`

- [ ] **Step 1: Ampliar el tipo `PatientFicha` (cerca de la línea 92)**

```tsx
interface PatientFicha {
  id: string
  patient_id: string
  fecha: string | null
  diagnosis_id: string | null
  diagnosis_source: 'global' | 'custom' | null
  mecanismo_lesion: 'traumatico' | 'sobreuso' | 'degenerativo' | null
  lateralidad: 'derecha' | 'izquierda' | 'bilateral' | 'no_aplica' | null
  ficha_data: Partial<FichaData>
}
```

- [ ] **Step 2: Agregar imports y estado nuevo (cerca de las líneas 3-10 y 232-239)**

```tsx
import { useState, useRef, useEffect, useMemo } from 'react'
import { fetchDiagnosisCatalog, fetchBodyRegions, createCustomDiagnosis, type DiagnosisOption, type BodyRegion } from '@/lib/clinicalCatalog'
import CatalogCombobox from '@/components/CatalogCombobox'
```

(La línea de imports de `useState, useRef, useEffect` ya existe — agregar `useMemo` a la misma.)

Junto al resto del estado del componente:

```tsx
  const [diagnosisId, setDiagnosisId] = useState<string | null>(initialFicha.diagnosis_id)
  const [diagnosisSource, setDiagnosisSource] = useState<'global' | 'custom' | null>(initialFicha.diagnosis_source)
  const [mecanismoLesion, setMecanismoLesion] = useState<'traumatico' | 'sobreuso' | 'degenerativo' | null>(initialFicha.mecanismo_lesion)
  const [lateralidad, setLateralidad] = useState<'derecha' | 'izquierda' | 'bilateral' | 'no_aplica' | null>(initialFicha.lateralidad)
  const [diagnosisCatalog, setDiagnosisCatalog] = useState<DiagnosisOption[]>([])
  const [bodyRegions, setBodyRegions] = useState<BodyRegion[]>([])

  useEffect(() => {
    let cancelled = false
    ;(async () => {
      const [catalog, regions] = await Promise.all([
        fetchDiagnosisCatalog(supabaseRef.current),
        fetchBodyRegions(supabaseRef.current),
      ])
      if (!cancelled) { setDiagnosisCatalog(catalog); setBodyRegions(regions) }
    })()
    return () => { cancelled = true }
  }, [])

  const diagnosisOptions = useMemo(
    () => diagnosisCatalog.map(d => ({ id: d.id, nombre: d.nombre, sublabel: d.codigo_cie10 ?? undefined })),
    [diagnosisCatalog],
  )
  const bodyRegionFieldOptions = useMemo(
    () => bodyRegions.map(r => ({ value: r.id, label: r.nombre })),
    [bodyRegions],
  )
```

(Esto va después de donde ya se declara `supabaseRef`, para poder usarlo en el `fetchDiagnosisCatalog`.)

- [ ] **Step 3: Incluir los campos nuevos en `persistFicha` (cerca de la línea 294)**

```tsx
  const persistFicha = async (data: FichaData): Promise<boolean> => {
    setSaveStatus('saving')
    const { error } = await supabaseRef.current
      .from('patient_fichas')
      .update({
        fecha: data.fecha || null,
        ficha_data: data,
        diagnosis_id: diagnosisId,
        diagnosis_source: diagnosisSource,
        mecanismo_lesion: mecanismoLesion,
        lateralidad: lateralidad,
      })
      .eq('id', initialFicha.id)
    if (error) {
      setSaveStatus('error')
      notify(`Error al guardar: ${error.message}`, 'error')
      return false
    }
    setSaveStatus('saved')
    setHasChanges(false)
    return true
  }
```

- [ ] **Step 4: Marcar `hasChanges` cuando se tocan los campos nuevos**

Agregar un helper junto a `handleChange` (cerca de la línea 361):

```tsx
  const handleEpisodeFieldChange = () => {
    setHasChanges(true)
    setSaveStatus('idle')
  }
```

- [ ] **Step 5: Reemplazar la sección de diagnóstico libre (líneas 794-797)**

Reemplazar:

```tsx
        <div>
          <label className="block text-[12px] uppercase tracking-[0.05em] text-accent mb-2 font-medium">Diagnóstico Kinésico</label>
          <textarea rows={3} value={ficha.diagnostico} onChange={e => handleChange('diagnostico', e.target.value)} placeholder="Conclusión de los hallazgos y diagnóstico de movimiento. (Se puede completar/editar en cualquier momento.)" className="w-full bg-bg-primary border-[0.5px] border-border-strong rounded-lg p-3 text-[14px] focus:outline-none focus:border-accent resize-y" />
        </div>
```

por:

```tsx
        <div>
          <label className="block text-[12px] uppercase tracking-[0.05em] text-accent mb-2 font-medium">Diagnóstico Kinésico</label>
          <CatalogCombobox
            value={diagnosisId}
            onChange={id => {
              const d = diagnosisCatalog.find(x => x.id === id)
              setDiagnosisId(id)
              setDiagnosisSource(d?.source ?? 'global')
              handleEpisodeFieldChange()
            }}
            options={diagnosisOptions}
            placeholder="Buscar diagnóstico…"
            extraFieldLabel="Región corporal"
            extraFieldOptions={bodyRegionFieldOptions}
            onCreate={async (nombre, bodyRegionId) => {
              const created = await createCustomDiagnosis(supabaseRef.current, {
                nombre, bodyRegionId, userId, orgId,
              })
              setDiagnosisCatalog(prev => [...prev, created])
              return { id: created.id, nombre: created.nombre, sublabel: created.codigo_cie10 ?? undefined }
            }}
          />
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-3">
            <div>
              <label className="block text-[12px] text-text-secondary mb-1">Mecanismo de lesión</label>
              <select
                value={mecanismoLesion ?? ''}
                onChange={e => { setMecanismoLesion((e.target.value || null) as typeof mecanismoLesion); handleEpisodeFieldChange() }}
                className="w-full bg-bg-primary border-[0.5px] border-border-strong rounded-lg p-2.5 text-[14px] focus:outline-none focus:border-accent"
              >
                <option value="">Sin especificar</option>
                <option value="traumatico">Traumático</option>
                <option value="sobreuso">Por sobreuso</option>
                <option value="degenerativo">Degenerativo</option>
              </select>
            </div>
            <div>
              <label className="block text-[12px] text-text-secondary mb-1">Lateralidad</label>
              <select
                value={lateralidad ?? ''}
                onChange={e => { setLateralidad((e.target.value || null) as typeof lateralidad); handleEpisodeFieldChange() }}
                className="w-full bg-bg-primary border-[0.5px] border-border-strong rounded-lg p-2.5 text-[14px] focus:outline-none focus:border-accent"
              >
                <option value="">Sin especificar</option>
                <option value="derecha">Derecha</option>
                <option value="izquierda">Izquierda</option>
                <option value="bilateral">Bilateral</option>
                <option value="no_aplica">No aplica</option>
              </select>
            </div>
          </div>
          <label className="block text-[12px] text-text-secondary mt-3 mb-1">Detalle clínico adicional (opcional)</label>
          <textarea rows={2} value={ficha.diagnostico} onChange={e => handleChange('diagnostico', e.target.value)} placeholder="Ej: Lasègue positivo, compresión radicular L5 probable..." className="w-full bg-bg-primary border-[0.5px] border-border-strong rounded-lg p-3 text-[14px] focus:outline-none focus:border-accent resize-y" />
        </div>
```

- [ ] **Step 6: Verificar tipos**

Run: `npx tsc --noEmit`
Expected: sin errores.

- [ ] **Step 7: Prueba manual**

En la misma ficha, ir a "Diagnóstico Kinésico": buscar "lumbalgia", elegirla, ver que aparece con el código M54.5 al lado. Elegir mecanismo "Sobreuso" y lateralidad "No aplica". Escribir algo en "Detalle clínico adicional". Apretar "Guardar cambios" (arriba o el sticky de abajo) y confirmar que el estado pasa a "✓ Guardado". Recargar la página: el diagnóstico elegido, el mecanismo y la lateralidad deben seguir ahí. Probar también "+ Crear" con un nombre que no exista en el catálogo (ej. "Prueba XYZ"), elegir una región, confirmar que se crea y queda seleccionado — y que al volver a abrir el combobox, "Prueba XYZ" ya aparece en la lista (viene del catálogo custom).

- [ ] **Step 8: Commit**

```bash
git add "src/app/dashboard/pacientes/[id]/ficha/FichaClient.tsx"
git commit -m "$(cat <<'EOF'
feat(ficha): diagnóstico estructurado del episodio (catálogo + mecanismo + lateralidad)

Co-Authored-By: Claude Sonnet 4.6 <noreply@anthropic.com>
EOF
)"
```

---

### Task 11: Verificación final y confirmación antes de mergear

- [ ] **Step 1: Build completo**

Run: `npm run build`
Expected: build exitoso, sin errores de tipos ni de lint.

- [ ] **Step 2: Push de la rama**

```bash
git push -u origin feature/datos-clinicos-estructurados
```

- [ ] **Step 3: Pedir confirmación a Kevin**

Esto toca base de datos (6 tablas/columnas nuevas) y el flujo de la ficha de todos los pacientes — por regla del proyecto (CLAUDE.md) necesita confirmación explícita antes de mergear a `main`, aunque Vercel ya genera una URL de preview de esta rama para probar primero. Antes de pedir la confirmación, recordarle que:
1. Correr en el SQL Editor de Supabase, en este orden: `supabase_catalogos_clinicos.sql`, `supabase_perfil_clinico_paciente.sql`, `supabase_ficha_diagnostico_estructurado.sql`.
2. Probar en la URL de preview: completar el perfil de un paciente de prueba y elegir un diagnóstico en una ficha.
3. Revisar el seed de diagnósticos/ocupaciones (Task 3) — es un punto de partida curado a mano, pensado para ampliarse con el uso real; no pretende ser exhaustivo desde el día uno.

No mergear hasta tener el OK explícito.

---

## Fuera de este plan (ver spec)

- Pantalla de estadísticas (`/dashboard/estadisticas`) — plan separado, después de tener datos reales cargados con este modelo.
- Migración de diagnósticos en texto libre de fichas viejas — decidido que no se hace (ver spec, sección 6).
- Tocar `fichas/[fichaId]/PatientFichaEditor.tsx` (confirmado en desuso).
