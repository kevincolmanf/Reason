CREATE TABLE dynamometer_results (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  patient_id uuid REFERENCES patients(id) ON DELETE CASCADE,
  unit text NOT NULL DEFAULT 'kg',
  muscle_results jsonb DEFAULT '{}'::jsonb,
  notes text,
  created_at timestamp with time zone DEFAULT now()
);

ALTER TABLE dynamometer_results ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users manage their own dynamometer results" ON dynamometer_results
  FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE INDEX dynamometer_results_patient_id_idx ON dynamometer_results(patient_id);
CREATE INDEX dynamometer_results_user_id_idx ON dynamometer_results(user_id);
