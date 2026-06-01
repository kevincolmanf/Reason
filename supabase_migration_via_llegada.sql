-- Migración: Vías de llegada de pacientes (fuentes de referido)
-- Ejecutar en Supabase SQL Editor

-- Tabla de vías de llegada configurables por usuario/org
CREATE TABLE IF NOT EXISTS patient_sources (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  org_id uuid REFERENCES organizations(id) ON DELETE CASCADE,
  label text NOT NULL,
  sort_order integer DEFAULT 0,
  created_at timestamp with time zone DEFAULT now()
);

ALTER TABLE patient_sources ENABLE ROW LEVEL SECURITY;

-- Dueño puede gestionar sus propias fuentes
CREATE POLICY "Users manage their own sources" ON patient_sources
  FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- Miembros de la org pueden leer las fuentes de la org
CREATE POLICY "Org members can read sources" ON patient_sources
  FOR SELECT USING (
    org_id IS NOT NULL AND EXISTS (
      SELECT 1 FROM organization_members
      WHERE org_id = patient_sources.org_id AND user_id = auth.uid()
    )
  );

-- Campo de vía de llegada en pacientes (texto libre, no FK para resiliencia)
ALTER TABLE patients
  ADD COLUMN IF NOT EXISTS source text;
