-- WHATSAPP DEL PROFESIONAL
-- Número de WhatsApp propio de cada usuario (profesional). Se usa en la página
-- pública de confirmación de turno (/turno/[token]): cuando el paciente toca
-- "No voy a poder ir", se le abre un chat de WhatsApp hacia el profesional del
-- turno con un mensaje pre-armado, en lugar de cancelar el turno en el sistema.
-- El aviso queda así en la conversación, y la secretaría decide qué hacer con el hueco.

ALTER TABLE public.users ADD COLUMN IF NOT EXISTS whatsapp text;
