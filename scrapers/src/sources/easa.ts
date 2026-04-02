/**
 * EASA Approved Drones List scraper
 *
 * Source: https://www.easa.europa.eu/en/domains/drones-air-mobility/
 *           drones-evtol-designs/drones-eu-operations
 *
 * The page renders a filterable table via JavaScript. We wait for the table
 * body rows to appear, then extract every row.
 *
 * Fields extracted per row:
 *   manufacturer, model, cx_class, max_noise_db, operational_categories,
 *   listing_date (when available in the table)
 */

import { BaseScraper } from '../lib/baseScraper.js'

export interface EasaRow {
  manufacturer: string
  model_name: string
  cx_class: string            // e.g. "C2"
  max_noise_db: string | null // e.g. "67.3"
  operational_categories: string[] // e.g. ["A1", "A2"]
  listing_date: string | null // ISO date string if available
}

const SOURCE = 'easa_approved_list'
const URL =
  'https://www.easa.europa.eu/en/domains/drones-air-mobility/drones-evtol-designs/drones-eu-operations'

export class EasaScraper extends BaseScraper {
  constructor() {
    super(SOURCE)
  }

  async run(): Promise<void> {
    const { page, context } = await this.openPage(URL)

    let html = ''
    let rows: EasaRow[] = []
    let errorMessage: string | undefined

    try {
      // The EASA page renders with React/JS. Wait for a table row to appear.
      await page.waitForSelector('table tbody tr', { timeout: 20_000 })

      html = await page.content()

      rows = await page.evaluate((): EasaRow[] => {
        const results: EasaRow[] = []

        // Find the first table that has a header row containing "class" or "manufacturer"
        const tables = Array.from(document.querySelectorAll('table'))

        for (const table of tables) {
          const headerCells = Array.from(
            table.querySelectorAll('thead th, thead td')
          ).map(el => el.textContent?.trim().toLowerCase() ?? '')

          const hasMfr = headerCells.some(h => h.includes('manufacturer') || h.includes('brand'))
          const hasCls = headerCells.some(h => h.includes('class') || h.includes('categor'))
          if (!hasMfr && !hasCls) continue

          // Map column index from headers
          const idxOf = (needle: string) =>
            headerCells.findIndex(h => h.includes(needle))

          const mfrIdx    = idxOf('manufacturer') !== -1 ? idxOf('manufacturer') : idxOf('brand')
          const modelIdx  = idxOf('model') !== -1 ? idxOf('model') : idxOf('product')
          const classIdx  = idxOf('class') !== -1 ? idxOf('class') : idxOf('categor')
          const noiseIdx  = idxOf('noise') !== -1 ? idxOf('noise') : idxOf('sound')
          const dateIdx   = idxOf('date') !== -1 ? idxOf('date') : idxOf('listed')
          const opCatIdx  = idxOf('operational') !== -1 ? idxOf('operational') : -1

          const bodyRows = Array.from(table.querySelectorAll('tbody tr'))

          for (const row of bodyRows) {
            const cells = Array.from(row.querySelectorAll('td')).map(
              td => td.textContent?.trim() ?? ''
            )
            if (cells.length < 2) continue

            const manufacturer = mfrIdx >= 0 ? cells[mfrIdx] ?? '' : ''
            const model_name   = modelIdx >= 0 ? cells[modelIdx] ?? '' : cells[0] ?? ''
            const cx_class     = classIdx >= 0 ? cells[classIdx] ?? '' : ''

            const rawNoise = noiseIdx >= 0 ? cells[noiseIdx] ?? null : null
            const max_noise_db = rawNoise && rawNoise !== '-' && rawNoise !== '' ? rawNoise : null

            const rawDate = dateIdx >= 0 ? cells[dateIdx] ?? null : null
            const listing_date = rawDate && rawDate !== '-' ? rawDate : null

            // Operational categories may be comma-separated in one cell or encoded as "A1/A2"
            const rawOp = opCatIdx >= 0 ? cells[opCatIdx] ?? '' : ''
            const operational_categories = rawOp
              .split(/[,/\s]+/)
              .map(s => s.trim())
              .filter(s => /^(A1|A2|A3|STS-?0[12]|SORA|CERTIFIED)$/i.test(s))
              .map(s => s.toUpperCase())

            if (manufacturer || model_name) {
              results.push({
                manufacturer,
                model_name,
                cx_class,
                max_noise_db,
                operational_categories,
                listing_date,
              })
            }
          }
          break // only process the first matching table
        }

        return results
      })

      console.log(`[${SOURCE}] Extracted ${rows.length} rows`)
    } catch (err) {
      errorMessage = err instanceof Error ? err.message : String(err)
      console.error(`[${SOURCE}] Scrape error:`, errorMessage)
      html = html || (await page.content().catch(() => ''))
    } finally {
      await context.close()
    }

    await this.saveRaw({
      source: SOURCE,
      url: URL,
      raw_html: html,
      extracted_json: { rows, scraped_count: rows.length },
      status: rows.length > 0 ? 'SUCCESS' : 'FAILED',
      error_message: errorMessage,
    })
  }
}
