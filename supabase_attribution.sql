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
