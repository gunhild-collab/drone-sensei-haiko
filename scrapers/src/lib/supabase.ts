import { createClient, SupabaseClient } from '@supabase/supabase-js'
import 'dotenv/config'

const url = process.env.SUPABASE_URL
const key = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!url || !key) {
  throw new Error(
    'Missing env vars: SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are required.\n' +
    'Copy scrapers/.env.example to scrapers/.env and fill in the values.\n' +
    'The service role key is in the Supabase Dashboard → Project Settings → API.'
  )
}

export const supabase: SupabaseClient = createClient(url, key, {
  auth: { persistSession: false },
})
