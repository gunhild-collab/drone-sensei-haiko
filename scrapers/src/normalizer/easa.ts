/**
 * EASA approved list → drone_product partial field normalizer.
 *
 * The EASA list provides only a subset of fields:
 *   manufacturer, model_name, cx_class, max_noise_level_db,
 *   operational_categories, easa_listing_date
 *
 * These are merged with manufacturer-sourced records; they never
 * overwrite manufacturer-provided specs.
 */

import type { EasaRow } from '../sources/easa.js'
import { parseNum } from './units.js'

export type EasaCxClass =
  | 'C0' | 'C1' | 'C2' | 'C3' | 'C4' | 'C5' | 'C6'
  | 'NONE' | 'PENDING'

export type OperationalCategory =
  | 'OPEN_A1' | 'OPEN_A2' | 'OPEN_A3'
  | 'SPECIFIC_STS01' | 'SPECIFIC_STS02' | 'SPECIFIC_SORA'
  | 'CERTIFIED'

export interface NormalisedEasaFields {
  manufacturer_name: string
  model_name: string
  easa_cx_class: EasaCxClass
  easa_listed: true
  easa_listing_date: string | null       // ISO date "YYYY-MM-DD" or null
  max_noise_level_db: number | null
  operational_categories: OperationalCategory[]
  ce_marking: true                       // If on EASA list, CE marking is present
  remote_id_compliant: boolean           // C1+ requires Remote ID
}

export function normalizeEasa(row: EasaRow): NormalisedEasaFields {
  const cx_class = parseCxClass(row.cx_class)

  return {
    manufacturer_name:     row.manufacturer.trim(),
    model_name:            row.model_name.trim(),
    easa_cx_class:         cx_class,
    easa_listed:           true,
    easa_listing_date:     parseDate(row.listing_date),
    max_noise_level_db:    row.max_noise_db ? (parseNum(row.max_noise_db) ?? null) : null,
    operational_categories: deriveOperationalCategories(cx_class, row.operational_categories),
    ce_marking:            true,
    remote_id_compliant:   requiresRemoteId(cx_class),
  }
}

// ─── Helpers ───────────────────────────────────────────────────────────────────

function parseCxClass(raw: string): EasaCxClass {
  const upper = raw.trim().toUpperCase()
  const match = upper.match(/C[0-6]/)
  if (match) return match[0] as EasaCxClass
  if (upper === 'NONE' || upper === '') return 'NONE'
  return 'PENDING'
}

/**
 * Derive the allowed operational categories for a given Cx class.
 * If the EASA table provides explicit categories, use those; otherwise derive
 * from the class using the standard EASA mapping.
 */
function deriveOperationalCategories(
  cx: EasaCxClass,
  explicit: string[]
): OperationalCategory[] {
  // Validate and map explicit values first
  const validMap: Record<string, OperationalCategory> = {
    A1: 'OPEN_A1', A2: 'OPEN_A2', A3: 'OPEN_A3',
    'OPEN_A1': 'OPEN_A1', 'OPEN_A2': 'OPEN_A2', 'OPEN_A3': 'OPEN_A3',
    'STS-01': 'SPECIFIC_STS01', 'STS01': 'SPECIFIC_STS01', 'SPECIFIC_STS01': 'SPECIFIC_STS01',
    'STS-02': 'SPECIFIC_STS02', 'STS02': 'SPECIFIC_STS02', 'SPECIFIC_STS02': 'SPECIFIC_STS02',
    'SORA': 'SPECIFIC_SORA', 'SPECIFIC_SORA': 'SPECIFIC_SORA',
    'CERTIFIED': 'CERTIFIED',
  }
  const mapped = explicit.map(e => validMap[e.toUpperCase()]).filter(Boolean) as OperationalCategory[]
  if (mapped.length > 0) return mapped

  // Default mapping per EASA Open Category regulation
  switch (cx) {
    case 'C0': return ['OPEN_A1', 'OPEN_A3']
    case 'C1': return ['OPEN_A1', 'OPEN_A3']
    case 'C2': return ['OPEN_A2', 'OPEN_A3']
    case 'C3': return ['OPEN_A3']
    case 'C4': return ['OPEN_A3']
    case 'C5': return ['SPECIFIC_STS01']
    case 'C6': return ['SPECIFIC_STS02']
    default:   return []
  }
}

function requiresRemoteId(cx: EasaCxClass): boolean {
  // C1 and above require Remote ID per EU 2019/945 as amended
  return ['C1', 'C2', 'C3', 'C4', 'C5', 'C6'].includes(cx)
}

function parseDate(raw: string | null): string | null {
  if (!raw) return null
  // Try common European formats: DD/MM/YYYY, DD.MM.YYYY, YYYY-MM-DD
  const dmy = raw.match(/(\d{1,2})[./](\d{1,2})[./](\d{4})/)
  if (dmy) return `${dmy[3]}-${dmy[2].padStart(2, '0')}-${dmy[1].padStart(2, '0')}`
  const iso = raw.match(/(\d{4})-(\d{2})-(\d{2})/)
  if (iso) return `${iso[1]}-${iso[2]}-${iso[3]}`
  return null
}
