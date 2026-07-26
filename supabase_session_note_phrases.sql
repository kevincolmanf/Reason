-- Frases rápidas personalizadas para la nota de sesión (además de las
-- preestablecidas). Quedan guardadas para el futuro y, en un equipo Pro, se
-- comparten entre los integrantes de la organización. Se pueden borrar.
--
-- Ejecutar en el SQL Editor de Supabase ANTES de mergear
-- feature/integrantes-registrar-sesion-agenda.

CREATE TABLE IF NOT EXISTS session_note_phrases (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  org_id uuid REFERENCES organizations(id) ON DELETE CASCADE,
  label text NOT NULL,
  created_at timestamp with time zone DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_session_note_phrases_org ON session_note_phrases (org_id);
CREATE INDEX IF NOT EXISTS idx_session_note_phrases_user ON session_note_phrases (user_id);

ALTER TABLE session_note_phrases ENABLE ROW LEVEL SECURITY;

-- El dueño gestiona sus frases personales (org_id NULL).
CREATE POLICY "Users manage their own phrases" ON session_note_phrases
  FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- Los integrantes de la org pueden leer las frases del equipo.
CREATE POLICY "Org members read phrases" ON session_note_phrases
  FOR SELECT USING (
    org_id IS NOT NULL AND EXISTS (
      SELECT 1 FROM organization_members
      WHERE org_id = session_note_phrases.org_id AND user_id = auth.uid()
    )
  );

-- Los integrantes de la org pueden crear frases del equipo.
CREATE POLICY "Org members insert phrases" ON session_note_phrases
  FOR INSERT WITH CHECK (
    org_id IS NOT NULL AND EXISTS (
      SELECT 1 FROM organization_members
      WHERE org_id = session_note_phrases.org_id AND user_id = auth.uid()
    )
  );

-- Los integrantes de la org pueden borrar frases del equipo (curan la lista juntos).
CREATE POLICY "Org members delete phrases" ON session_note_phrases
  FOR DELETE USING (
    org_id IS NOT NULL AND EXISTS (
      SELECT 1 FROM organization_members
      WHERE org_id = session_note_phrases.org_id AND user_id = auth.uid()
    )
  );
