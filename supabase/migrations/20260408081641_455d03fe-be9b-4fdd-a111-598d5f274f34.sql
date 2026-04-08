
-- Municipality to weather station mapping
CREATE TABLE public.municipality_weather_stations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  municipality_code text NOT NULL UNIQUE,
  municipality_name text NOT NULL,
  latitude float NOT NULL,
  longitude float NOT NULL,
  frost_station_id text,
  frost_station_name text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.municipality_weather_stations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Municipality stations are publicly readable"
  ON public.municipality_weather_stations FOR SELECT
  USING (true);

-- Weather observations cache
CREATE TABLE public.weather_observations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  station_id text NOT NULL,
  observed_at timestamptz NOT NULL,
  wind_speed float,
  wind_speed_of_gust float,
  air_temperature float,
  precipitation_amount float,
  relative_humidity float,
  visibility float,
  source text NOT NULL DEFAULT 'frost',
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(station_id, observed_at, source)
);

ALTER TABLE public.weather_observations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Weather observations are publicly readable"
  ON public.weather_observations FOR SELECT
  USING (true);

-- Indexes for performance
CREATE INDEX idx_weather_obs_station_time 
  ON public.weather_observations (station_id, observed_at);

CREATE INDEX idx_weather_stations_code
  ON public.municipality_weather_stations (municipality_code);

-- Trigger for updated_at on stations
CREATE TRIGGER update_municipality_weather_stations_updated_at
  BEFORE UPDATE ON public.municipality_weather_stations
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
