-- Categoría del profesional (integrante de la organización)
--
-- Tres atributos, editables desde "Mi Equipo", para agrupar y contextualizar el
-- panel de gestión. Son etiquetas: NO restringen nada por sí solas.
--   · profession  → profesión / disciplina (kinesiólogo, nutricionista, médico…).
--   · specialty   → área / especialidad libre (RPG, osteopatía, estética…).
--   · vinculo     → propio (staff) | honorarios | terciarizado. 'propio' por defecto.
--
-- Aditivo. Ejecutar en Supabase SQL Editor antes de mergear feature/panel-gestion-fase1.
ALTER TABLE public.organization_members
  ADD COLUMN IF NOT EXISTS profession text,
  ADD COLUMN IF NOT EXISTS specialty  text,
  ADD COLUMN IF NOT EXISTS vinculo    text NOT NULL DEFAULT 'propio';
