
CREATE TABLE public.use_case_requirements (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  use_case_id text UNIQUE NOT NULL,
  use_case_name text NOT NULL,
  use_case_name_en text,
  department text NOT NULL,
  shared_departments text[],
  description text,
  min_range_km numeric,
  required_sensors text[],
  requires_bvlos boolean DEFAULT false,
  min_flight_time_min integer,
  max_mtow_kg numeric,
  requires_rtk boolean DEFAULT false,
  requires_dock boolean DEFAULT false,
  requires_thermal boolean DEFAULT false,
  requires_lidar boolean DEFAULT false,
  min_resolution_mp integer DEFAULT 0,
  preferred_drone_type text[],
  easa_min_category text,
  frequency text,
  priority_score integer DEFAULT 5,
  cost_driver_notes text,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.use_case_requirements ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Use case requirements are publicly readable"
  ON public.use_case_requirements FOR SELECT
  USING (true);

CREATE INDEX idx_ucr_department ON public.use_case_requirements (department);
CREATE INDEX idx_ucr_priority ON public.use_case_requirements (priority_score DESC);
