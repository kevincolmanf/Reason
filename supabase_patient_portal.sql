ALTER TABLE patients ADD COLUMN IF NOT EXISTS load_share_token text UNIQUE;
ALTER TABLE load_sessions ADD COLUMN IF NOT EXISTS source text DEFAULT 'clinician';
CREATE INDEX IF NOT EXISTS load_sessions_source_idx ON load_sessions(patient_id, source);
