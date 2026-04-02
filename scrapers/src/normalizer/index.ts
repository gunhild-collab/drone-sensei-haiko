/**
 * Normalizer dispatcher.
 *
 * Reads a scrape_raw record from Supabase, determines the source,
 * runs the appropriate normalizer, and returns normalised fields
 * ready to be upserted into drone_product or used to update
 * EASA fields on an existing record.
 *
 * Usage (from runner or a one-off script):
 *
 *   import { normalizeRawRecord } from './normalizer/index.js'
 *   const result = await normalizeRawRecord(scrapeRawRow)
 */

import { normalizeDji }  from './dji.js'
import { normalizeEasa } from './easa.js'
import type { DjiProductRaw } from '../sources/djiEnterprise.js'
import type { EasaRow }       from '../sources/easa.js'

export type NormalisedResult =
  | { source: 'dji_enterprise'; slug: string; fields: ReturnType<typeof normalizeDji> }
  | { source: 'easa_approved_list'; rows: ReturnType<typeof normalizeEasa>[] }
  | { source: 'dji_store_no'; slug: string; price_nok: number | null; price_text: string | null }
  | { source: 'unknown' }

export interface ScrapeRawRow {
  id: string
  source: string
  url: string
  extracted_json: Record<string, unknown> | null
}

export function normalizeRawRecord(row: ScrapeRawRow): NormalisedResult {
  const json = row.extracted_json

  switch (row.source) {
    case 'dji_enterprise': {
      if (!json) return { source: 'unknown' }
      const raw = json as unknown as DjiProductRaw
      return {
        source: 'dji_enterprise',
        slug:   raw.slug,
        fields: normalizeDji(raw),
      }
    }

    case 'easa_approved_list': {
      if (!json) return { source: 'unknown' }
      const { rows } = json as { rows: EasaRow[] }
      return {
        source: 'easa_approved_list',
        rows:   (rows ?? []).map(normalizeEasa),
      }
    }

    case 'dji_store_no': {
      if (!json) return { source: 'unknown' }
      const { slug, price_nok, price_text } = json as {
        slug: string
        price_nok: number | null
        price_text: string | null
      }
      return { source: 'dji_store_no', slug, price_nok, price_text }
    }

    default:
      return { source: 'unknown' }
  }
}
