-- WHATSAPP DE CONTACTO PARA AVISOS DE AUSENCIA
-- Número al que se abre WhatsApp cuando el paciente toca "No voy a poder ir" en
-- la página pública de confirmación de turno (/turno/[token]). El aviso queda en
-- la conversación y la secretaría decide qué hacer con el hueco.
--
-- El número vive a nivel de ORGANIZACIÓN (un solo número por clínica, controlado
-- por el dueño). Para usuarios sin organización (agenda personal), se usa el
-- número propio del usuario. Por eso la columna existe en ambas tablas.
--
-- Nota: public.users no tiene policy de UPDATE por RLS, así que el guardado del
-- número personal solo aplica a usuarios que ya tengan permisos de update sobre
-- su fila; para clínicas el guardado va a organizations (que sí tiene la policy
-- "Owner can update their organization").

ALTER TABLE public.users ADD COLUMN IF NOT EXISTS whatsapp text;
ALTER TABLE public.organizations ADD COLUMN IF NOT EXISTS whatsapp text;
