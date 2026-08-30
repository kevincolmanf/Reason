-- ============================================================================
-- Normalización SEGURA de obra social ya cargada (R-07, feedback de Hernán #1)
-- ============================================================================
-- Lleva el campo libre obra_social de los pacientes a la forma canónica de la
-- lista del contexto (obras_sociales), SOLO cuando coincide ignorando mayúsculas
-- y acentos (ej. "osde"/"Osde" -> "OSDE", "medifé"/"medife" -> "Medifé").
-- NO adivina typos ni toca las que no matchean ninguna entrada de la lista.
-- Idempotente (correrla dos veces no hace nada la segunda). Correr en Supabase.
--
-- Antes de aplicar, si querés PREVISUALIZAR qué cambiaría, corré el SELECT de
-- abajo (comentado). Después corré los dos UPDATE.
-- ============================================================================

-- Normalizador: minúsculas + sin acentos (SQL puro, sin extensiones).
-- lower(translate(x, 'áéíóúÁÉÍÓÚüÜñÑ', 'aeiouAEIOUuUnN'))

-- ---- PREVIEW (opcional): qué pacientes se normalizarían y a qué valor ----
-- SELECT p.id, p.obra_social AS actual, os.name AS quedaria
-- FROM public.patients p
-- JOIN public.obras_sociales os
--   ON ( (p.org_id IS NOT NULL AND os.org_id = p.org_id)
--     OR (p.org_id IS NULL     AND os.user_id = p.user_id) )
--  AND lower(translate(trim(p.obra_social), 'áéíóúÁÉÍÓÚüÜñÑ', 'aeiouAEIOUuUnN'))
--    = lower(translate(os.name,             'áéíóúÁÉÍÓÚüÜñÑ', 'aeiouAEIOUuUnN'))
-- WHERE p.obra_social IS NOT NULL AND p.obra_social <> os.name;

-- ---- Centros (org) ----
UPDATE public.patients p
SET obra_social = os.name
FROM public.obras_sociales os
WHERE p.org_id IS NOT NULL
  AND os.org_id = p.org_id
  AND p.obra_social IS NOT NULL
  AND lower(translate(trim(p.obra_social), 'áéíóúÁÉÍÓÚüÜñÑ', 'aeiouAEIOUuUnN'))
    = lower(translate(os.name,             'áéíóúÁÉÍÓÚüÜñÑ', 'aeiouAEIOUuUnN'))
  AND p.obra_social <> os.name;

-- ---- Espacios personales (user) ----
UPDATE public.patients p
SET obra_social = os.name
FROM public.obras_sociales os
WHERE p.org_id IS NULL
  AND os.user_id = p.user_id
  AND p.obra_social IS NOT NULL
  AND lower(translate(trim(p.obra_social), 'áéíóúÁÉÍÓÚüÜñÑ', 'aeiouAEIOUuUnN'))
    = lower(translate(os.name,             'áéíóúÁÉÍÓÚüÜñÑ', 'aeiouAEIOUuUnN'))
  AND p.obra_social <> os.name;
