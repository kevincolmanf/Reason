-- Feature settings por organización — interruptor + configuración general
--
-- Mecanismo GENÉRICO (no específico de ninguna función en particular): cada fila
-- es un feature prendido/apagado para un centro, con su propia configuración en
-- jsonb. Pensado para la función de "Estándares de calidad" (panel de
-- cumplimiento por centro), pero reusable para cualquier otra feature futura
-- que necesite on/off + config por centro sin tocar código.
--
-- Las funciones SQL de agregación (panel_cumplimiento_*, etc.) NO leen esta
-- tabla: reciben los umbrales ya resueltos como parámetros (mismo patrón que
-- get_lapsing_patients(p_threshold_days)). Quien llama (la página server) lee
-- la config acá y se la pasa — mantiene esas funciones genéricas y testeables.
--
-- Ejecutar en Supabase SQL Editor ANTES de mergear
-- feature/estandares-calidad-m1-feature-settings.

CREATE TABLE IF NOT EXISTS public.organization_feature_settings (
  org_id      uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  feature_key text NOT NULL,
  enabled     boolean NOT NULL DEFAULT false,
  config      jsonb NOT NULL DEFAULT '{}'::jsonb,
  updated_at  timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (org_id, feature_key)
);

ALTER TABLE public.organization_feature_settings ENABLE ROW LEVEL SECURITY;

-- Lectura: cualquier integrante de la org (incluido el dueño, que ya queda
-- como member vía create_organization_with_admin) o admin de Reason. Así cada
-- profesional puede leer si el feature está prendido para saber si corresponde
-- mostrarle la vista, aunque solo el dueño pueda cambiarlo.
DROP POLICY IF EXISTS "Org members can read their org's feature settings" ON public.organization_feature_settings;
CREATE POLICY "Org members can read their org's feature settings" ON public.organization_feature_settings
  FOR SELECT
  USING (public.is_org_member(org_id) OR public.is_admin());

-- Nadie escribe la tabla directo (ni siquiera el dueño): toda escritura pasa
-- por la RPC de abajo, que valida ownership y reutiliza su propio SECURITY
-- DEFINER — mismo patrón que set_org_agenda_areas (supabase_agenda_v2.sql).
DROP POLICY IF EXISTS "No direct writes to feature settings" ON public.organization_feature_settings;
CREATE POLICY "No direct writes to feature settings" ON public.organization_feature_settings
  FOR ALL
  USING (false)
  WITH CHECK (false);

-- RPC: prender/apagar un feature y/o actualizar su config para una org. Solo
-- el dueño de ESA org o un admin de Reason. Hace upsert (la fila puede no
-- existir todavía para ese feature_key).
CREATE OR REPLACE FUNCTION public.set_org_feature_setting(
  p_org_id      uuid,
  p_feature_key text,
  p_enabled     boolean,
  p_config      jsonb DEFAULT NULL
)
RETURNS public.organization_feature_settings
SECURITY DEFINER
SET search_path = public
LANGUAGE plpgsql
AS $$
DECLARE
  result public.organization_feature_settings;
BEGIN
  IF NOT (public.is_org_owner(p_org_id) OR public.is_admin()) THEN
    RAISE EXCEPTION 'Solo el dueño del centro puede configurar esto.';
  END IF;

  INSERT INTO public.organization_feature_settings (org_id, feature_key, enabled, config, updated_at)
  VALUES (p_org_id, p_feature_key, p_enabled, COALESCE(p_config, '{}'::jsonb), now())
  ON CONFLICT (org_id, feature_key) DO UPDATE SET
    enabled    = EXCLUDED.enabled,
    config     = COALESCE(p_config, public.organization_feature_settings.config),
    updated_at = now()
  RETURNING * INTO result;

  RETURN result;
END;
$$;

-- No se inserta ninguna fila para ningún centro acá: esta migración es pura
-- infraestructura. La fila de Build (enabled = false al principio) se crea en
-- M8 llamando a set_org_feature_setting(...) desde el toggle de la UI de M6,
-- con el org_id real confirmado en ese momento.
