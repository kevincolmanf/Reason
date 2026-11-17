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
