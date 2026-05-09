CREATE TABLE rts_evaluations (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  patient_id uuid REFERENCES patients(id) ON DELETE CASCADE NOT NULL,
  protocol_type text NOT NULL DEFAULT 'lca',
  surgery_date date,
  graft_type text, -- 'htb', 'stg', 'qt', 'other'
  affected_side text NOT NULL DEFAULT 'left', -- 'right' | 'left'
  -- Fase 0 — Criterios de fase previa
  effusion integer, -- 0=ninguno, 1=traza, 2=moderado, 3=severo
  rom_extension numeric, -- grados de déficit (0 = extensión completa)
  rom_flexion numeric, -- grados alcanzados
  pain_vas numeric, -- 0-10
  -- Fuerza (ingresada manualmente o desde dinamómetro)
  quad_affected numeric, -- kg
  quad_unaffected numeric, -- kg
  hamstring_affected numeric, -- kg
  hamstring_unaffected numeric, -- kg
  patient_body_weight numeric, -- kg, para normalización
  patient_age integer,
  patient_sex text, -- 'male' | 'female'
  -- Hop tests horizontales (cm o segundos)
  single_hop_affected numeric,
  single_hop_unaffected numeric,
  triple_hop_affected numeric,
  triple_hop_unaffected numeric,
  crossover_hop_affected numeric,
  crossover_hop_unaffected numeric,
  timed_hop_affected numeric, -- segundos (menor = mejor)
  timed_hop_unaffected numeric,
  -- Saltos verticales
  cmj_bilateral numeric, -- cm
  slcmj_affected numeric, -- cm
  slcmj_unaffected numeric,
  drop_jump_quality text, -- 'good' | 'moderate' | 'poor'
  -- Cuestionarios (ingresados manualmente o desde historial)
  koos_sport numeric, -- 0-100
  acl_rsi numeric, -- 0-100
  grs numeric, -- 0-100
  notes text,
  created_at timestamp with time zone DEFAULT now()
);

ALTER TABLE rts_evaluations ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users manage their own RTS evaluations" ON rts_evaluations
  FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE INDEX rts_evaluations_patient_id_idx ON rts_evaluations(patient_id);
CREATE INDEX rts_evaluations_user_id_idx ON rts_evaluations(user_id);
