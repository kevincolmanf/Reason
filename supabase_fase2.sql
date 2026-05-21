-- Fase 2: Unificación de ejercicios y planificador

-- 1. Crear Enum de categorías de ejercicios
CREATE TYPE exercise_category AS ENUM (
  'lower_body', 
  'upper_body', 
  'trunk_core', 
  'jump', 
  'speed', 
  'mobility_stretch', 
  'conditioning', 
  'testing', 
  'adjuntos'
);

-- 2. Crear tabla de ejercicios (Matriz + Build)
CREATE TABLE IF NOT EXISTS exercises (
    id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
    name text NOT NULL,
    youtube_url text,
    category exercise_category NOT NULL,
    equipment text,
    pattern text,
    contraction_type text,
    exercise_type text,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);

-- Habilitar RLS en exercises
ALTER TABLE exercises ENABLE ROW LEVEL SECURITY;

-- Políticas de lectura para exercises
CREATE POLICY "Subscriber and admin can view exercises" ON exercises
FOR SELECT USING (
  EXISTS (
    SELECT 1 FROM users WHERE users.id = auth.uid() AND (users.role = 'subscriber' OR users.role = 'admin')
  )
);

-- 3. Crear tabla de planes de ejercicio
CREATE TABLE IF NOT EXISTS exercise_plans (
    id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id uuid REFERENCES auth.users NOT NULL,
    name text NOT NULL,
    start_date date,
    notes text,
    plan_data jsonb NOT NULL DEFAULT '{}'::jsonb,
    share_token text UNIQUE,
    share_token_expires_at timestamp with time zone,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);

-- Habilitar RLS en exercise_plans
ALTER TABLE exercise_plans ENABLE ROW LEVEL SECURITY;

-- Políticas para exercise_plans
CREATE POLICY "Users can manage their own plans" 
ON exercise_plans 
FOR ALL 
USING (auth.uid() = user_id);

-- 4. Función y trigger para actualizar updated_at en exercise_plans
CREATE OR REPLACE FUNCTION update_modified_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_exercise_plans_modtime
BEFORE UPDATE ON exercise_plans
FOR EACH ROW
EXECUTE FUNCTION update_modified_column();
