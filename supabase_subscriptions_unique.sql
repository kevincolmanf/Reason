-- ============================================================================
-- Constraint ÚNICO en subscriptions.user_id
-- ============================================================================
-- Todos los upsert de suscripciones (webhook MP, /api/subscription/sync,
-- /api/admin/fix-user) usan `onConflict: 'user_id'`. En Postgres eso REQUIERE
-- un constraint/índice único en user_id. El esquema versionado solo tenía un
-- índice NO único (supabase_indices_escala.sql), así que este constraint puede
-- faltar en prod.
--
-- PASO 1 — VERIFICAR ANTES DE CORRER NADA:
--   ¿Ya existe el único?  (si devuelve una fila con contype 'u' o 'p' sobre
--   user_id, NO hace falta hacer nada más)
--
--     select conname, contype from pg_constraint
--     where conrelid = 'public.subscriptions'::regclass and contype in ('u','p');
--
--   ¿Hay duplicados que romperían el ALTER?  (tiene que devolver 0 filas)
--
--     select user_id, count(*) from public.subscriptions
--     group by user_id having count(*) > 1;
--
-- PASO 2 — Si NO existe el único y NO hay duplicados, recién ahí correr:
-- ============================================================================

alter table public.subscriptions
  add constraint subscriptions_user_id_key unique (user_id);

-- Si el PASO 1 mostró duplicados, hay que consolidarlos primero (conservar la
-- fila más reciente por user_id y borrar el resto) — no lo automatizo acá para
-- no borrar datos a ciegas. Avisame y armamos la limpieza con cuidado.
