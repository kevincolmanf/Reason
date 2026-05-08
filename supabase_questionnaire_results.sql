CREATE TABLE questionnaire_results (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  patient_id uuid REFERENCES patients(id) ON DELETE CASCADE NOT NULL,
  questionnaire_type text NOT NULL,
  score numeric,
  interpretation text,
  result_data jsonb DEFAULT '{}'::jsonb,
  created_at timestamp with time zone DEFAULT now()
);

ALTER TABLE questionnaire_results ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users manage their own questionnaire results" ON questionnaire_results
  FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE INDEX questionnaire_results_patient_id_idx ON questionnaire_results(patient_id);
CREATE INDEX questionnaire_results_user_id_idx ON questionnaire_results(user_id);
