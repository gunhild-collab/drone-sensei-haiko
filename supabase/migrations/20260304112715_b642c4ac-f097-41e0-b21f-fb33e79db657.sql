-- EASA regulatory rules reference table
CREATE TABLE public.easa_rules (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  category TEXT NOT NULL,
  subcategory TEXT,
  c_class TEXT,
  max_weight_kg NUMERIC,
  max_height_m NUMERIC DEFAULT 120,
  requires_pilot_cert TEXT,
  requires_operator_reg BOOLEAN DEFAULT true,
  allows_bvlos BOOLEAN DEFAULT false,
  allows_over_people BOOLEAN DEFAULT false,
  min_distance_people_m NUMERIC,
  description_no TEXT NOT NULL,
  requirements_no TEXT,
  luftfartstilsynet_ref TEXT,
  use_case_ids TEXT[],
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Drone platforms reference table
CREATE TABLE public.drone_platforms (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  manufacturer TEXT NOT NULL,
  model TEXT NOT NULL,
  c_class TEXT,
  category TEXT NOT NULL,
  max_takeoff_weight_kg NUMERIC,
  max_flight_time_min INTEGER,
  max_range_km NUMERIC,
  camera_specs TEXT,
  sensor_types TEXT[],
  has_rtk BOOLEAN DEFAULT false,
  ip_rating TEXT,
  wind_resistance_ms NUMERIC,
  price_nok_estimate NUMERIC,
  suitable_use_cases TEXT[],
  easa_category TEXT,
  requires_cert TEXT,
  url TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- KOSTRA indicators cache per municipality
CREATE TABLE public.kostra_data (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  municipality_code TEXT NOT NULL,
  municipality_name TEXT NOT NULL,
  year INTEGER NOT NULL,
  indicator_id TEXT NOT NULL,
  indicator_name TEXT NOT NULL,
  value NUMERIC,
  unit TEXT,
  fetched_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(municipality_code, year, indicator_id)
);

-- Assessments table to persist evaluations
CREATE TABLE public.assessments (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  municipality_name TEXT NOT NULL,
  assessor_name TEXT,
  answers JSONB NOT NULL DEFAULT '{}'::jsonb,
  total_score NUMERIC,
  maturity_level INTEGER,
  kostra_enrichment JSONB,
  easa_evaluation JSONB,
  platform_recommendations JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.easa_rules ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.drone_platforms ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.kostra_data ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.assessments ENABLE ROW LEVEL SECURITY;

-- Public read for reference data
CREATE POLICY "EASA rules are publicly readable" ON public.easa_rules FOR SELECT USING (true);
CREATE POLICY "Drone platforms are publicly readable" ON public.drone_platforms FOR SELECT USING (true);
CREATE POLICY "KOSTRA data is publicly readable" ON public.kostra_data FOR SELECT USING (true);

-- Assessments publicly accessible (no auth yet)
CREATE POLICY "Assessments are publicly readable" ON public.assessments FOR SELECT USING (true);
CREATE POLICY "Anyone can create assessments" ON public.assessments FOR INSERT WITH CHECK (true);
CREATE POLICY "Anyone can update assessments" ON public.assessments FOR UPDATE USING (true);

-- Timestamp trigger
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END;
$$ LANGUAGE plpgsql SET search_path = public;

CREATE TRIGGER update_assessments_updated_at
BEFORE UPDATE ON public.assessments
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();