-- Fichas kinésicas vinculadas a pacientes
CREATE TABLE patient_fichas (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  patient_id uuid REFERENCES patients(id) ON DELETE CASCADE NOT NULL,
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  fecha date DEFAULT CURRENT_DATE,
  ficha_data jsonb DEFAULT '{}'::jsonb,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now()
);

ALTER TABLE patient_fichas ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users manage their own fichas" ON patient_fichas
  FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- Reutilizamos la función de updated_at que ya existe
CREATE TRIGGER patient_fichas_updated_at
  BEFORE UPDATE ON patient_fichas
  FOR EACH ROW EXECUTE FUNCTION update_patients_updated_at();
