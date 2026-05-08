-- Tabla de ejercicios personalizados por usuario
CREATE TABLE user_exercises (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  name text NOT NULL,
  youtube_url text,
  created_at timestamp with time zone DEFAULT now()
);

ALTER TABLE user_exercises ENABLE ROW LEVEL SECURITY;

-- Cada usuario solo puede ver y gestionar sus propios ejercicios
CREATE POLICY "Users manage their own exercises" ON user_exercises
  FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
