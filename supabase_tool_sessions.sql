-- Tabla de analytics de uso de herramientas (Sprint 2 - Fase 1.5)
CREATE TABLE IF NOT EXISTS tool_sessions (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id uuid REFERENCES auth.users NOT NULL,
  tool_type text NOT NULL, -- 'cuestionario', 'calculadora', 'ficha', 'bandera_roja'
  tool_slug text NOT NULL, -- Ej: 'tampa', 'spadi', '1rm'
  used_at timestamp with time zone DEFAULT now() NOT NULL
);

-- Políticas de Seguridad (RLS)
ALTER TABLE tool_sessions ENABLE ROW LEVEL SECURITY;

-- Cada usuario puede insertar sus propias sesiones
CREATE POLICY "Users can insert their own tool sessions" 
ON tool_sessions FOR INSERT 
WITH CHECK (auth.uid() = user_id);

-- Cada usuario puede ver sus propias sesiones (aunque la UI actual no lo muestre, es buena práctica)
CREATE POLICY "Users can view their own tool sessions" 
ON tool_sessions FOR SELECT 
USING (auth.uid() = user_id);
