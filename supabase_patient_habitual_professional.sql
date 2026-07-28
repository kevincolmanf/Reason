-- Profesional habitual del paciente
-- Permite fijar, por paciente, el profesional que lo atiende habitualmente. Al dar
-- un turno se predetermina ese profesional (incluido el primer turno), sin depender
-- de inferir del historial. Nullable: si no se fija, se cae al historial / default.

ALTER TABLE public.patients
  ADD COLUMN IF NOT EXISTS habitual_professional_id uuid
  REFERENCES public.users(id) ON DELETE SET NULL;
