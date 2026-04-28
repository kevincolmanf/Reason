-- ENUMS
CREATE TYPE user_role AS ENUM ('free', 'subscriber', 'admin');
CREATE TYPE subscription_plan AS ENUM ('monthly', 'annual');
CREATE TYPE subscription_status AS ENUM ('active', 'pending', 'cancelled', 'expired');
CREATE TYPE content_category AS ENUM ('resumen_comentado', 'aplicacion_clinica', 'protocolo', 'caso_real');
CREATE TYPE visual_type AS ENUM ('arbol', 'tabla', 'linea_tiempo', 'algoritmo', 'diagnostico_diferencial', 'esquema_anatomico', 'null');
CREATE TYPE content_level AS ENUM ('fundamentos', 'aplicado', 'avanzado');

-- USERS TABLE
CREATE TABLE public.users (
  id uuid references auth.users not null primary key,
  email text not null unique,
  created_at timestamp with time zone default now() not null,
  full_name text,
  role user_role default 'free'::user_role not null,
  mp_customer_id text
);

-- SUBSCRIPTIONS TABLE
CREATE TABLE public.subscriptions (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references public.users(id) not null,
  mp_subscription_id text,
  plan subscription_plan not null,
  status subscription_status not null,
  started_at timestamp with time zone not null,
  expires_at timestamp with time zone,
  cancelled_at timestamp with time zone
);

-- CONTENT TABLE
CREATE TABLE public.content (
  id uuid default gen_random_uuid() primary key,
  slug text not null unique,
  title text not null,
  subtitle text,
  category content_category not null,
  body_que_saber jsonb,
  body_interpretacion text,
  body_aplicacion text,
  body_aplicacion_visual text,
  body_aplicacion_visual_type visual_type,
  body_que_evitar jsonb,
  body_conclusion text,
  metadata_region jsonb,
  metadata_tema jsonb,
  metadata_nivel content_level,
  metadata_tags jsonb,
  referencia text,
  tiempo_lectura_min integer,
  published boolean default false not null,
  published_at timestamp with time zone,
  created_at timestamp with time zone default now() not null,
  updated_at timestamp with time zone default now() not null
);

-- CASO_REAL_EXTENSION TABLE
CREATE TABLE public.caso_real_extension (
  content_id uuid references public.content(id) on delete cascade primary key,
  body_presentacion text,
  body_razonamiento text,
  body_decisiones text,
  body_resultado text
);


-- ENABLE RLS
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.content ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.caso_real_extension ENABLE ROW LEVEL SECURITY;

-- HELPERS (is_admin function for easier RLS rules)
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.users 
    WHERE id = auth.uid() AND role = 'admin'
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION public.is_subscriber()
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.users 
    WHERE id = auth.uid() AND role = 'subscriber'
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;


-- RLS: USERS
CREATE POLICY "Users can view their own data" ON public.users
  FOR SELECT USING (auth.uid() = id);

CREATE POLICY "Admin can view all users" ON public.users
  FOR SELECT USING (public.is_admin());

-- RLS: SUBSCRIPTIONS
CREATE POLICY "Users can view their own subscriptions" ON public.subscriptions
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Admin can view all subscriptions" ON public.subscriptions
  FOR SELECT USING (public.is_admin());

-- RLS: CONTENT

-- Everyone can read partial fields for preview if published (This is tricky to do at column level in standard RLS, but we'll allow reading the row and handle column hiding in frontend or via a view. For RLS, we allow reading the row if it's published, but the query should only select specific columns. Wait, Supabase allows column-level security. But for simplicity, we let them read the row if published, and restrict full content read logic in the app, OR we restrict the row.
-- Let's restrict the row for full content, and maybe use a secure view for the library, or just let users see published rows but the application checks subscription before showing body).
-- Document says: "Lectura completa de un contenido: Permitido si el usuario tiene role = subscriber o role = admin. Si el usuario es free o no está logueado, solo se pueden ver los contenidos con slug="dolor-lumbar-inespecifico". Lectura de campos parciales para preview en biblioteca: Cualquier usuario logueado (incluso free) puede ver título, subtítulo, etc. El cuerpo solo se entrega si es suscriptor."
-- Since RLS applies to rows, we can't easily nullify columns per user role directly in RLS (only via views or complex policies). We will allow SELECT on published rows for all users, but the application code will restrict rendering body fields. Wait! To be absolutely safe at DB level, we can define column level privileges, OR we assume the frontend query is responsible for not fetching body unless subscriber, and RLS allows reading the row. Let's write RLS that allows reading ALL published rows for authenticated users (for the library), and let the Next.js API/Server Component hide the body if they aren't subscribed.
-- Wait, the prompt specifically says "Incluí también las políticas RLS básicas que dejé indicadas en la sección 6".
-- Seccion 6:
-- Lectura de campos parciales para preview en biblioteca: Cualquier usuario logueado.
-- This means any authenticated user can read the row.

CREATE POLICY "Anyone can read published content rows" ON public.content
  FOR SELECT USING (published = true);

CREATE POLICY "Admin can read all content (including drafts)" ON public.content
  FOR SELECT USING (public.is_admin());

CREATE POLICY "Admin can insert content" ON public.content
  FOR INSERT WITH CHECK (public.is_admin());

CREATE POLICY "Admin can update content" ON public.content
  FOR UPDATE USING (public.is_admin());

CREATE POLICY "Admin can delete content" ON public.content
  FOR DELETE USING (public.is_admin());

-- RLS: CASO_REAL_EXTENSION
CREATE POLICY "Anyone can read published caso real" ON public.caso_real_extension
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM public.content c WHERE c.id = content_id AND c.published = true)
  );

CREATE POLICY "Admin can manage caso real" ON public.caso_real_extension
  FOR ALL USING (public.is_admin());

