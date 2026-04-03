
ALTER TABLE public.drone_platforms ADD COLUMN IF NOT EXISTS price_eur_estimate text;
ALTER TABLE public.drone_platforms ADD COLUMN IF NOT EXISTS launch_method text;
ALTER TABLE public.drone_platforms ADD COLUMN IF NOT EXISTS ground_station_model text;
ALTER TABLE public.drone_platforms ADD COLUMN IF NOT EXISTS ground_station_price_eur text;
ALTER TABLE public.drone_platforms ADD COLUMN IF NOT EXISTS country_of_manufacturer text;
