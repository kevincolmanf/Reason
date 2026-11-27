-- Estándares de calidad — área principal por integrante del equipo
--
-- Hoy el área que cuenta para un profesional en panel_cumplimiento se
-- deriva SOLO del área de sus pacientes (patients.area, o el binario
-- kine_mode como último recurso). Si los pacientes no tienen área propia
-- cargada (el caso normal: es un campo nuevo, nadie lo completa a mano
-- paciente por paciente), un profesional termina contando para el área
-- equivocada aunque su especialidad real sea otra.
--
-- Esta columna es el "rol" del profesional dentro del equipo — distinta
-- de organization_members.agenda_areas (que es qué áreas puede VER en la
-- agenda, un filtro de visibilidad, no su especialidad). Texto libre,
-- pensada para coincidir con organizations.agenda_areas, mismo criterio
-- que patients.area/turnos.area — sin FK rígida.
--
-- Ejecutar en Supabase SQL Editor ANTES de mergear
-- feature/estandares-calidad-area-profesional.

ALTER TABLE public.organization_members ADD COLUMN IF NOT EXISTS area text;
