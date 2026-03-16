
-- Municipality profiles: stores enriched data per municipality across 3 domains
CREATE TABLE public.municipality_profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  municipality_name TEXT NOT NULL UNIQUE,

  -- Section 1: Risikobilde og beredskap
  risk_profile JSONB NOT NULL DEFAULT '{
    "ros_events": [],
    "response_times": {},
    "critical_infrastructure": [],
    "emergency_plan_links": []
  }'::jsonb,

  -- Section 2: Geografi, infrastruktur og areal
  geography_infrastructure JSONB NOT NULL DEFAULT '{
    "gis_layers": [],
    "settlements": [],
    "infrastructure": {},
    "drone_zones": []
  }'::jsonb,

  -- Section 3: Drift, økonomi og organisasjon
  operations_economy JSONB NOT NULL DEFAULT '{
    "budgets": {},
    "staffing": [],
    "existing_drone_use": {},
    "sector_potential": [],
    "regulatory_status": {}
  }'::jsonb,

  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.municipality_profiles ENABLE ROW LEVEL SECURITY;

-- Public read access (municipality data is not user-specific)
CREATE POLICY "Municipality profiles are publicly readable"
  ON public.municipality_profiles FOR SELECT
  USING (true);

-- Public insert (anyone can create a profile for a municipality)
CREATE POLICY "Anyone can create municipality profiles"
  ON public.municipality_profiles FOR INSERT
  WITH CHECK (true);

-- Public update
CREATE POLICY "Anyone can update municipality profiles"
  ON public.municipality_profiles FOR UPDATE
  USING (true);

-- Trigger for updated_at
CREATE TRIGGER update_municipality_profiles_updated_at
  BEFORE UPDATE ON public.municipality_profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();
