-- Carpetas configurables para "Mis Ejercicios" — mismo patrón que las áreas
-- de agenda (agenda_areas): array de texto libre, sin enum fijo, para que
-- cada centro/profesional organice sus propios ejercicios como quiera (por
-- región, por tipo, como les sirva), en vez de un esquema prototipado desde
-- Build. Default NULL (sin carpetas) — opt-in, no rompe a nadie que no las use.
--
-- Ejecutar en el SQL Editor de Supabase ANTES de mergear
-- feature/carpetas-mis-ejercicios.

ALTER TABLE organizations ADD COLUMN IF NOT EXISTS exercise_folders text[];
ALTER TABLE users ADD COLUMN IF NOT EXISTS exercise_folders text[];
ALTER TABLE user_exercises ADD COLUMN IF NOT EXISTS folder text;
