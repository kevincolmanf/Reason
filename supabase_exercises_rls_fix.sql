-- ============================================================================
-- Fix: la biblioteca de ejercicios aparece vacía para pro / integrantes / trial
-- ============================================================================
-- La policy vieja "Subscriber and admin can view exercises" solo dejaba LEER el
-- catálogo a los roles 'subscriber' y 'admin'. Quedó desactualizada: no contempla
-- el rol 'pro', los integrantes de un centro, ni los usuarios en trial. Por eso la
-- Biblioteca directa (que consulta exercises con el cliente del navegador) volvía
-- 0 filas para ellos, mientras el Editor de Planes sí funcionaba (usa la API admin,
-- que saltea RLS).
--
-- El acceso a la PÁGINA de la biblioteca ya está gateado por el middleware (paywall
-- por suscripción/plan). El catálogo en sí es material de referencia (+1.700
-- ejercicios curados), no dato sensible, así que habilitamos la lectura a cualquier
-- usuario autenticado. Correr en el SQL Editor de Supabase. Idempotente.
-- ============================================================================

DROP POLICY IF EXISTS "Subscriber and admin can view exercises" ON public.exercises;

DROP POLICY IF EXISTS "Authenticated can view exercises" ON public.exercises;
CREATE POLICY "Authenticated can view exercises" ON public.exercises
  FOR SELECT
  TO authenticated
  USING (true);
