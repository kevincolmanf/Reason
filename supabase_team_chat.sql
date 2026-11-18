-- CHAT DE EQUIPO: canal grupal por organización para que los integrantes se
-- comuniquen dentro de la app, con badge de "no leídos" en el header.
--
-- Qué hace:
--  1) team_messages: un mensaje por fila, scoped por org_id. Sin edición ni
--     borrado por ahora (fuera de alcance) — fuera de lo que postee cada uno,
--     no hay moderación.
--  2) team_chat_reads: hasta qué mensaje leyó cada usuario, por org. Un solo
--     timestamp por (org, usuario) — no se marca mensaje por mensaje.
--  3) RPC team_chat_unread_count: cuenta mensajes posteriores al último leído,
--     en una sola consulta (evita traer last_read_at y después contar aparte).
--  4) Reusa los helpers is_org_member/is_org_owner ya existentes
--     (supabase_organizations.sql, supabase_agenda_areas_por_integrante.sql).
--
-- Ejecutar en Supabase SQL Editor ANTES de mergear
-- feature/chat-equipo.

-- 1) MENSAJES ----------------------------------------------------------------
CREATE TABLE public.team_messages (
  id uuid default gen_random_uuid() primary key,
  org_id uuid references public.organizations(id) on delete cascade not null,
  user_id uuid references public.users(id) on delete cascade not null,
  body text not null,
  created_at timestamp with time zone default now() not null
);

CREATE INDEX team_messages_org_created_idx ON public.team_messages (org_id, created_at);

ALTER TABLE public.team_messages ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Org members can view team messages" ON public.team_messages
  FOR SELECT USING (public.is_org_member(org_id) OR public.is_org_owner(org_id));

CREATE POLICY "Org members can send team messages" ON public.team_messages
  FOR INSERT WITH CHECK (
    user_id = auth.uid()
    AND (public.is_org_member(org_id) OR public.is_org_owner(org_id))
  );

-- 2) MARCA DE LECTURA ---------------------------------------------------------
CREATE TABLE public.team_chat_reads (
  org_id uuid references public.organizations(id) on delete cascade not null,
  user_id uuid references public.users(id) on delete cascade not null,
  last_read_at timestamp with time zone default now() not null,
  PRIMARY KEY (org_id, user_id)
);

ALTER TABLE public.team_chat_reads ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users manage their own read marker" ON public.team_chat_reads
  FOR ALL USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());

-- 3) CONTEO DE NO LEÍDOS -------------------------------------------------------
CREATE OR REPLACE FUNCTION public.team_chat_unread_count(p_org_id uuid)
RETURNS integer
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT count(*)::integer
  FROM public.team_messages m
  WHERE m.org_id = p_org_id
    AND (public.is_org_member(p_org_id) OR public.is_org_owner(p_org_id))
    AND m.created_at > COALESCE(
      (SELECT last_read_at FROM public.team_chat_reads WHERE org_id = p_org_id AND user_id = auth.uid()),
      'epoch'::timestamptz
    );
$$;

GRANT EXECUTE ON FUNCTION public.team_chat_unread_count(uuid) TO authenticated;
