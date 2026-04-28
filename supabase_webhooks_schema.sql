-- Crear tabla para registrar los eventos de Mercado Pago (para debugging y seguridad)
CREATE TABLE IF NOT EXISTS public.webhook_logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    event_type TEXT NOT NULL,
    payload JSONB NOT NULL,
    processed BOOLEAN DEFAULT false,
    error_message TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Proteger la tabla
ALTER TABLE public.webhook_logs ENABLE ROW LEVEL SECURITY;

-- Solo el servidor puede insertar/leer (usando service_role)
-- No agregamos políticas públicas.
