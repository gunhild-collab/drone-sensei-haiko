-- ============================================================
-- Haiko Drone Product Database
-- Migration: Full schema for drone_product, manufacturers,
-- accessories, software_platforms, training_requirements,
-- scraping pipeline, and price history.
-- ============================================================

-- ============================================================
-- 1. ENUM TYPES
-- ============================================================

CREATE TYPE public.easa_cx_class_enum AS ENUM (
  'C0', 'C1', 'C2', 'C3', 'C4', 'C5', 'C6', 'NONE', 'PENDING'
);

CREATE TYPE public.operational_category_enum AS ENUM (
  'OPEN_A1', 'OPEN_A2', 'OPEN_A3',
  'SPECIFIC_STS01', 'SPECIFIC_STS02', 'SPECIFIC_SORA',
  'CERTIFIED'
);

CREATE TYPE public.remote_id_type_enum AS ENUM (
  'BUILT_IN', 'ADD_ON_MODULE', 'NONE'
);

CREATE TYPE public.drone_type_enum AS ENUM (
  'MULTIROTOR', 'FIXED_WING', 'VTOL_HYBRID', 'HELICOPTER', 'OTHER'
);

CREATE TYPE public.propulsion_enum AS ENUM (
  'ELECTRIC', 'HYBRID', 'COMBUSTION'
);

CREATE TYPE public.rtk_type_enum AS ENUM (
  'BUILT_IN', 'EXTERNAL_MODULE', 'NETWORK_RTK', 'NONE'
);

CREATE TYPE public.dmv_recommendation_tier_enum AS ENUM (
  'ENTRY', 'STANDARD', 'ADVANCED', 'SPECIALIST'
);

CREATE TYPE public.sora_complexity_enum AS ENUM (
  'LOW', 'MEDIUM', 'HIGH'
);

CREATE TYPE public.manufacturer_type_enum AS ENUM (
  'OEM', 'SYSTEM_INTEGRATOR', 'COMPONENT_MANUFACTURER'
);

CREATE TYPE public.accessory_type_enum AS ENUM (
  'BATTERY', 'CHARGER', 'PROPELLER', 'CARRYING_CASE', 'PARACHUTE',
  'RTK_MODULE', 'REMOTE_ID_MODULE',
  'PAYLOAD_CAMERA', 'PAYLOAD_LIDAR', 'PAYLOAD_THERMAL',
  'PAYLOAD_MULTISPECTRAL', 'PAYLOAD_SPEAKER', 'PAYLOAD_SPOTLIGHT',
  'PAYLOAD_DROP', 'DOCK_STATION', 'CONTROLLER', 'TABLET_MOUNT',
  'ANTENNA', 'ND_FILTER', 'OTHER'
);

CREATE TYPE public.software_type_enum AS ENUM (
  'FLIGHT_PLANNING', 'FLEET_MANAGEMENT', 'PHOTOGRAMMETRY',
  'GIS', 'DATA_ANALYTICS', 'CLOUD_STORAGE', 'UTM', 'SORA_TOOL'
);

CREATE TYPE public.scrape_status_enum AS ENUM (
  'PENDING', 'SUCCESS', 'FAILED', 'SKIPPED'
);

-- ============================================================
-- 2. MANUFACTURERS TABLE
-- ============================================================

CREATE TABLE public.manufacturers (
  id                    UUID          NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name                  VARCHAR(200)  NOT NULL,
  slug                  VARCHAR(120)  NOT NULL UNIQUE,
  country_code          CHAR(2),                           -- ISO 3166-1 alpha-2
  hq_city               VARCHAR(100),
  website_url           TEXT,
  founded_year          INT,
  european_manufacturer BOOLEAN       NOT NULL DEFAULT false,
  type                  public.manufacturer_type_enum,
  product_count         INT           NOT NULL DEFAULT 0,  -- computed / maintained by trigger
  logo_url              TEXT,
  contact_email         VARCHAR(200),
  nordic_presence       BOOLEAN       NOT NULL DEFAULT false,
  authorized_dealer_no  JSONB,                             -- [{name, url, city}]
  created_at            TIMESTAMPTZ   NOT NULL DEFAULT now(),
  updated_at            TIMESTAMPTZ   NOT NULL DEFAULT now()
);

-- ============================================================
-- 3. DRONE_PRODUCT TABLE (main entity)
-- ============================================================

CREATE TABLE public.drone_product (

  -- 3.1 Identity & Manufacturer
  id                        UUID          NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  slug                      VARCHAR(120)  NOT NULL UNIQUE,
  manufacturer_id           UUID          NOT NULL REFERENCES public.manufacturers(id) ON DELETE RESTRICT,
  model_name                VARCHAR(200)  NOT NULL,
  model_variant             VARCHAR(100),
  product_url               TEXT,
  image_urls                JSONB,                         -- [url, ...]
  release_date              DATE,
  discontinued              BOOLEAN       NOT NULL DEFAULT false,
  last_verified             TIMESTAMPTZ   NOT NULL DEFAULT now(),

  -- 3.2 EASA Regulatory & Compliance
  easa_cx_class             public.easa_cx_class_enum,
  easa_listed               BOOLEAN       NOT NULL DEFAULT false,
  easa_listing_date         DATE,
  operational_categories    public.operational_category_enum[],
  ce_marking                BOOLEAN       NOT NULL DEFAULT false,
  eu_declaration_of_conformity BOOLEAN,
  eu_doc_url                TEXT,
  remote_id_compliant       BOOLEAN       NOT NULL DEFAULT false,
  remote_id_type            public.remote_id_type_enum,
  geo_awareness             BOOLEAN,
  max_noise_level_db        DECIMAL(5,1),
  low_speed_mode            BOOLEAN,
  parachute_available       BOOLEAN,
  parachute_type            VARCHAR(100),
  lights_compliant          BOOLEAN,

  -- 3.3 Physical & Performance Specs
  drone_type                public.drone_type_enum NOT NULL,
  propulsion                public.propulsion_enum,
  num_rotors                INT,
  mtom_g                    INT           NOT NULL,         -- max takeoff mass in grams
  max_payload_g             INT,
  max_flight_time_min       INT           NOT NULL,
  max_flight_time_payload_min INT,
  max_range_km              DECIMAL(6,1),
  max_speed_ms              DECIMAL(5,1),
  max_wind_resistance_ms    DECIMAL(4,1),
  max_altitude_m            INT,
  ip_rating                 VARCHAR(10),
  operating_temp_min_c      INT,
  operating_temp_max_c      INT,
  folded_dimensions_mm      VARCHAR(60),
  unfolded_dimensions_mm    VARCHAR(60),
  wingspan_mm               INT,
  max_dimension_m           DECIMAL(4,2),  -- derived: largest dimension (regulatory relevance)
  battery_type              VARCHAR(60),
  battery_capacity_wh       DECIMAL(7,1),
  battery_swappable         BOOLEAN,
  charging_time_min         INT,

  -- 3.4 Sensor & Camera Payload
  -- Array of sensor objects; see spec §1.4 for schema
  sensors                   JSONB,

  -- 3.5 Navigation & Autonomy
  gnss_systems              TEXT[],       -- GPS, GLONASS, GALILEO, BEIDOU
  rtk_support               BOOLEAN,
  rtk_type                  public.rtk_type_enum,
  obstacle_avoidance        BOOLEAN,
  obstacle_avoidance_directions INT,
  waypoint_flight           BOOLEAN,
  autonomous_flight         BOOLEAN,
  dock_compatible           BOOLEAN,
  dock_model                VARCHAR(100),
  return_to_home            BOOLEAN,
  follow_me                 BOOLEAN,
  terrain_follow            BOOLEAN,

  -- 3.6 Communication & Data
  video_transmission_system VARCHAR(80),
  transmission_frequency_ghz DECIMAL[],
  sdk_available             BOOLEAN,
  sdk_platforms             TEXT[],       -- MSDK, PSDK, OSDK, ROS, MAVLink, ...
  onboard_storage_gb        INT,
  storage_type              VARCHAR(40),
  cloud_platform            VARCHAR(80),
  gis_integration           TEXT[],
  data_formats_output       TEXT[],

  -- 3.7 Pricing & Availability
  price_rrp_eur             DECIMAL(10,2),
  price_rrp_nok             DECIMAL(10,2),
  price_bundle_eur          DECIMAL(10,2),
  price_source              VARCHAR(200),
  price_last_updated        DATE,
  available_norway          BOOLEAN,
  available_nordics         BOOLEAN,
  authorized_dealers_no     JSONB,        -- [{name, url, city}]

  -- 3.8 Use Case Mapping
  -- Keys match the use_case taxonomy; values 0–3
  use_case_scores           JSONB,

  -- 3.9 Haiko-Specific Fields
  dmv_recommendation_tier   public.dmv_recommendation_tier_enum,
  haiko_notes               TEXT,
  haiko_verified            BOOLEAN       NOT NULL DEFAULT false,
  verification_level        SMALLINT      NOT NULL DEFAULT 0
                              CHECK (verification_level BETWEEN 0 AND 3),
  competitor_comparison_group VARCHAR(80),
  sora_complexity_indicator public.sora_complexity_enum,

  created_at                TIMESTAMPTZ   NOT NULL DEFAULT now(),
  updated_at                TIMESTAMPTZ   NOT NULL DEFAULT now()
);

-- ============================================================
-- 4. PRICE HISTORY TABLE
-- ============================================================

CREATE TABLE public.price_history (
  id              UUID          NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  drone_id        UUID          NOT NULL REFERENCES public.drone_product(id) ON DELETE CASCADE,
  price_nok       DECIMAL(10,2),
  price_eur       DECIMAL(10,2),
  source          VARCHAR(200),
  recorded_at     DATE          NOT NULL DEFAULT CURRENT_DATE,
  created_at      TIMESTAMPTZ   NOT NULL DEFAULT now()
);

-- ============================================================
-- 5. ACCESSORIES TABLE
-- ============================================================

CREATE TABLE public.accessories (
  id          UUID          NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name        VARCHAR(200)  NOT NULL,
  type        public.accessory_type_enum NOT NULL,
  price_eur   DECIMAL(10,2),
  price_nok   DECIMAL(10,2),
  essential   BOOLEAN       NOT NULL DEFAULT false,
  description TEXT,
  url         TEXT,
  created_at  TIMESTAMPTZ   NOT NULL DEFAULT now(),
  updated_at  TIMESTAMPTZ   NOT NULL DEFAULT now()
);

-- Junction: drone ↔ accessories (many-to-many)
CREATE TABLE public.drone_accessories (
  drone_id      UUID NOT NULL REFERENCES public.drone_product(id) ON DELETE CASCADE,
  accessory_id  UUID NOT NULL REFERENCES public.accessories(id)   ON DELETE CASCADE,
  PRIMARY KEY (drone_id, accessory_id)
);

-- ============================================================
-- 6. SOFTWARE PLATFORMS TABLE
-- ============================================================

CREATE TABLE public.software_platforms (
  id             UUID          NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name           VARCHAR(200)  NOT NULL,
  type           public.software_type_enum NOT NULL,
  pricing_model  VARCHAR(80),
  url            TEXT,
  created_at     TIMESTAMPTZ   NOT NULL DEFAULT now(),
  updated_at     TIMESTAMPTZ   NOT NULL DEFAULT now()
);

-- Junction: drone ↔ software (many-to-many)
CREATE TABLE public.drone_software_compatibility (
  drone_id    UUID NOT NULL REFERENCES public.drone_product(id)       ON DELETE CASCADE,
  software_id UUID NOT NULL REFERENCES public.software_platforms(id)  ON DELETE CASCADE,
  PRIMARY KEY (drone_id, software_id)
);

-- ============================================================
-- 7. TRAINING REQUIREMENTS TABLE
-- ============================================================

CREATE TABLE public.training_requirements (
  id                   UUID          NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  cx_class             public.easa_cx_class_enum,
  subcategory          VARCHAR(20),  -- A1, A2, A3, STS-01, STS-02
  min_pilot_cert       VARCHAR(60),  -- e.g. "A1/A3 online exam"
  min_age              INT,
  remote_id_required   BOOLEAN,
  registration_required BOOLEAN,
  notes                TEXT,
  created_at           TIMESTAMPTZ   NOT NULL DEFAULT now()
);

-- ============================================================
-- 8. SCRAPE RAW DATA TABLE (scraping pipeline)
-- ============================================================

CREATE TABLE public.scrape_raw (
  id             UUID          NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  source         VARCHAR(100)  NOT NULL,  -- e.g. "dji_enterprise", "easa_approved_list"
  url            TEXT          NOT NULL,
  scraped_at     TIMESTAMPTZ   NOT NULL DEFAULT now(),
  raw_html       TEXT,                    -- full HTML snapshot for re-parsing
  extracted_json JSONB,                   -- structured output from scraper
  status         public.scrape_status_enum NOT NULL DEFAULT 'PENDING',
  error_message  TEXT,
  -- Link to drone product if this scrape relates to a specific product
  drone_id       UUID REFERENCES public.drone_product(id) ON DELETE SET NULL,
  created_at     TIMESTAMPTZ   NOT NULL DEFAULT now()
);

-- ============================================================
-- 9. INDEXES
-- ============================================================

-- manufacturers
CREATE INDEX idx_manufacturers_slug        ON public.manufacturers(slug);
CREATE INDEX idx_manufacturers_country     ON public.manufacturers(country_code);
CREATE INDEX idx_manufacturers_european    ON public.manufacturers(european_manufacturer);

-- drone_product — primary lookup patterns
CREATE INDEX idx_drone_product_slug        ON public.drone_product(slug);
CREATE INDEX idx_drone_product_mfr         ON public.drone_product(manufacturer_id);
CREATE INDEX idx_drone_product_type        ON public.drone_product(drone_type);
CREATE INDEX idx_drone_product_cx_class    ON public.drone_product(easa_cx_class);
CREATE INDEX idx_drone_product_easa_listed ON public.drone_product(easa_listed);
CREATE INDEX idx_drone_product_discontinued ON public.drone_product(discontinued);
CREATE INDEX idx_drone_product_mtom        ON public.drone_product(mtom_g);
CREATE INDEX idx_drone_product_flight_time ON public.drone_product(max_flight_time_min);
CREATE INDEX idx_drone_product_price_nok   ON public.drone_product(price_rrp_nok);
CREATE INDEX idx_drone_product_avail_no    ON public.drone_product(available_norway);
CREATE INDEX idx_drone_product_haiko_tier  ON public.drone_product(dmv_recommendation_tier);
CREATE INDEX idx_drone_product_sora_complexity ON public.drone_product(sora_complexity_indicator);
-- GIN index for JSONB use_case_scores and sensors
CREATE INDEX idx_drone_product_use_cases   ON public.drone_product USING GIN (use_case_scores);
CREATE INDEX idx_drone_product_sensors     ON public.drone_product USING GIN (sensors);

-- price_history
CREATE INDEX idx_price_history_drone       ON public.price_history(drone_id);
CREATE INDEX idx_price_history_date        ON public.price_history(recorded_at DESC);

-- scrape_raw
CREATE INDEX idx_scrape_raw_source         ON public.scrape_raw(source);
CREATE INDEX idx_scrape_raw_status         ON public.scrape_raw(status);
CREATE INDEX idx_scrape_raw_scraped_at     ON public.scrape_raw(scraped_at DESC);
CREATE INDEX idx_scrape_raw_drone          ON public.scrape_raw(drone_id);

-- ============================================================
-- 10. ROW LEVEL SECURITY
-- ============================================================

ALTER TABLE public.manufacturers                 ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.drone_product                 ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.price_history                 ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.accessories                   ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.drone_accessories             ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.software_platforms            ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.drone_software_compatibility  ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.training_requirements         ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.scrape_raw                    ENABLE ROW LEVEL SECURITY;

-- Public read on all product/reference data
CREATE POLICY "manufacturers_public_read"
  ON public.manufacturers FOR SELECT USING (true);

CREATE POLICY "drone_product_public_read"
  ON public.drone_product FOR SELECT USING (true);

CREATE POLICY "price_history_public_read"
  ON public.price_history FOR SELECT USING (true);

CREATE POLICY "accessories_public_read"
  ON public.accessories FOR SELECT USING (true);

CREATE POLICY "drone_accessories_public_read"
  ON public.drone_accessories FOR SELECT USING (true);

CREATE POLICY "software_platforms_public_read"
  ON public.software_platforms FOR SELECT USING (true);

CREATE POLICY "drone_software_compat_public_read"
  ON public.drone_software_compatibility FOR SELECT USING (true);

CREATE POLICY "training_requirements_public_read"
  ON public.training_requirements FOR SELECT USING (true);

-- scrape_raw: read/write only for authenticated users (internal pipeline)
CREATE POLICY "scrape_raw_auth_read"
  ON public.scrape_raw FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY "scrape_raw_auth_insert"
  ON public.scrape_raw FOR INSERT WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "scrape_raw_auth_update"
  ON public.scrape_raw FOR UPDATE USING (auth.role() = 'authenticated');

-- ============================================================
-- 11. UPDATED_AT TRIGGERS
-- ============================================================

-- Reuse the trigger function created in the first migration.

CREATE TRIGGER update_manufacturers_updated_at
  BEFORE UPDATE ON public.manufacturers
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_drone_product_updated_at
  BEFORE UPDATE ON public.drone_product
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_accessories_updated_at
  BEFORE UPDATE ON public.accessories
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_software_platforms_updated_at
  BEFORE UPDATE ON public.software_platforms
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ============================================================
-- 12. MANUFACTURER PRODUCT COUNT MAINTENANCE
-- ============================================================

-- Keep manufacturers.product_count in sync automatically.

CREATE OR REPLACE FUNCTION public.sync_manufacturer_product_count()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE public.manufacturers
    SET product_count = product_count + 1
    WHERE id = NEW.manufacturer_id;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE public.manufacturers
    SET product_count = GREATEST(product_count - 1, 0)
    WHERE id = OLD.manufacturer_id;
  ELSIF TG_OP = 'UPDATE' AND OLD.manufacturer_id IS DISTINCT FROM NEW.manufacturer_id THEN
    UPDATE public.manufacturers
    SET product_count = GREATEST(product_count - 1, 0)
    WHERE id = OLD.manufacturer_id;
    UPDATE public.manufacturers
    SET product_count = product_count + 1
    WHERE id = NEW.manufacturer_id;
  END IF;
  RETURN NULL;
END;
$$;

CREATE TRIGGER trg_drone_product_mfr_count
  AFTER INSERT OR UPDATE OF manufacturer_id OR DELETE
  ON public.drone_product
  FOR EACH ROW EXECUTE FUNCTION public.sync_manufacturer_product_count();

-- ============================================================
-- 13. SEED: TRAINING REQUIREMENTS
-- Populated from EASA U-space regulation & Open Category rules.
-- ============================================================

INSERT INTO public.training_requirements
  (cx_class, subcategory, min_pilot_cert, min_age, remote_id_required, registration_required, notes)
VALUES
  ('C0', 'A1',    'None (online safety guidelines recommended)',  16, false, false,
   'Under 250 g. No cert required in Open A1. Awareness guidelines recommended.'),
  ('C1', 'A1',    'A1/A3 online theory exam',                     16, true,  true,
   'Under 900 g. C1 in A1 allows flight near (not over) uninvolved persons.'),
  ('C1', 'A3',    'A1/A3 online theory exam',                     16, true,  true,
   'C1 operated in A3 subcategory.'),
  ('C2', 'A2',    'A2 certificate of competency (theory + practical self-assessment)',
   16, true, true,
   'C2 in A2: may fly 30 m horizontal from uninvolved persons; 5 m in low-speed mode.'),
  ('C2', 'A3',    'A1/A3 online theory exam',                     16, true,  true,
   'C2 in A3: minimum 150 m from residential/recreational/industrial/natural areas.'),
  ('C3', 'A3',    'A1/A3 online theory exam',                     16, true,  true,
   'C3 only in A3. Must stay 150 m from populated areas.'),
  ('C4', 'A3',    'A1/A3 online theory exam',                     16, false, true,
   'C4 legacy class (grandfathered pre-2024). No Remote ID required.'),
  ('C5', NULL,    'STS-01 theoretical + practical training',       18, true,  true,
   'C5: specific category STS-01. BVLOS over controlled ground area.'),
  ('C6', NULL,    'STS-02 theoretical + practical training',       18, true,  true,
   'C6: specific category STS-02. BVLOS with airspace observers.');

-- ============================================================
-- End of migration
-- ============================================================
