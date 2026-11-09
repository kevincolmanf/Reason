-- Columna para no duplicar el email de aviso antes de que el descuento de
-- campaña (KEVINCOLMAN) vuelva a precio completo. Aditiva.

alter table public.promo_redemptions
  add column reminder_sent_at timestamp with time zone;
