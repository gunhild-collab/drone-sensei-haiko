
-- Add missing columns to drone_platforms
ALTER TABLE public.drone_platforms ADD COLUMN IF NOT EXISTS name text;
ALTER TABLE public.drone_platforms ADD COLUMN IF NOT EXISTS slug text UNIQUE;
ALTER TABLE public.drone_platforms ADD COLUMN IF NOT EXISTS drone_type text NOT NULL DEFAULT 'multirotor';
ALTER TABLE public.drone_platforms ADD COLUMN IF NOT EXISTS characteristic_dimension numeric;
ALTER TABLE public.drone_platforms ADD COLUMN IF NOT EXISTS max_speed numeric;
ALTER TABLE public.drone_platforms ADD COLUMN IF NOT EXISTS max_altitude numeric DEFAULT 120;
ALTER TABLE public.drone_platforms ADD COLUMN IF NOT EXISTS supports_bvlos boolean DEFAULT false;
ALTER TABLE public.drone_platforms ADD COLUMN IF NOT EXISTS has_remote_id boolean DEFAULT true;
ALTER TABLE public.drone_platforms ADD COLUMN IF NOT EXISTS has_thermal boolean DEFAULT false;
ALTER TABLE public.drone_platforms ADD COLUMN IF NOT EXISTS has_parachute boolean DEFAULT false;
ALTER TABLE public.drone_platforms ADD COLUMN IF NOT EXISTS payload_kg numeric DEFAULT 0;
ALTER TABLE public.drone_platforms ADD COLUMN IF NOT EXISTS propulsion text DEFAULT 'elektrisk';
ALTER TABLE public.drone_platforms ADD COLUMN IF NOT EXISTS notes text DEFAULT '';

-- Create index on slug for fast lookups
CREATE INDEX IF NOT EXISTS idx_drone_platforms_slug ON public.drone_platforms (slug);
CREATE INDEX IF NOT EXISTS idx_drone_platforms_drone_type ON public.drone_platforms (drone_type);
