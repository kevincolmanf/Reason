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
