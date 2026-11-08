-- Descuento 50% x 3 meses para Suscriptores individuales nuevos (campaña con
-- código, altas hasta el 14/11/2026). Tabla aditiva, no toca nada existente.
-- Ver doc "Primer uso y descuento de lanzamiento" (8/11/2026).

create table public.promo_redemptions (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references public.users(id) not null,
  code text not null,
  plan_type text not null,
  discounted_amount numeric not null,
  full_amount numeric not null,
  mp_subscription_id text not null,
  redeemed_at timestamp with time zone not null default now(),
  restore_at timestamp with time zone not null,
  restored_at timestamp with time zone,
  created_at timestamp with time zone not null default now()
);

-- Un solo uso de la promo por usuario.
create unique index promo_redemptions_user_id_key on public.promo_redemptions(user_id);

-- RLS: nadie escribe desde el cliente (solo el server action y el cron, ambos
-- con service role, que bypassa RLS). Sin policies = tabla cerrada por defecto.
alter table public.promo_redemptions enable row level security;
