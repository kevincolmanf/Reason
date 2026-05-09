CREATE TABLE load_sessions (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  patient_id uuid REFERENCES patients(id) ON DELETE CASCADE NOT NULL,
  session_date date NOT NULL DEFAULT CURRENT_DATE,
  activity text,
  duration_minutes integer NOT NULL,
  rpe integer NOT NULL CHECK (rpe >= 0 AND rpe <= 10),
  load_units integer NOT NULL, -- rpe × duration_minutes (sRPE, Foster 2001)
  vas_pre numeric CHECK (vas_pre >= 0 AND vas_pre <= 100),
  vas_during numeric CHECK (vas_during >= 0 AND vas_during <= 100),
  vas_post numeric CHECK (vas_post >= 0 AND vas_post <= 100),
  notes text,
  created_at timestamp with time zone DEFAULT now()
);

ALTER TABLE load_sessions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users manage their own load sessions" ON load_sessions
  FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE INDEX load_sessions_patient_id_idx ON load_sessions(patient_id);
CREATE INDEX load_sessions_session_date_idx ON load_sessions(patient_id, session_date DESC);
