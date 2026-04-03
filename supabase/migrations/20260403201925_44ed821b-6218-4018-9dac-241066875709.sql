ALTER TABLE public.use_case_requirements ADD COLUMN IF NOT EXISTS min_payload_kg numeric DEFAULT 0;

-- Medisinsk transport needs at least 2 kg payload for blood samples / medicine boxes
UPDATE public.use_case_requirements SET min_payload_kg = 2.0 WHERE use_case_name ILIKE '%Medisinsk transport%';