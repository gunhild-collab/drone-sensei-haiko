/**
 * DJI Enterprise product scraper
 *
 * Source: https://enterprise.dji.com/
 *
 * Strategy:
 *  1. Load the products listing page to discover product URLs.
 *  2. For each product URL, load the page and extract specs from the
 *     spec table / spec grid that DJI renders.
 *  3. Save one scrape_raw record per product page (extracted_json = raw spec map).
 *
 * DJI uses a JavaScript-rendered spec table. We wait for the spec container
 * to appear before extracting.
 *
 * Spec keys extracted (raw, un-normalised — normalizer/dji.ts maps these):
 *   model_name, takeoff_weight, max_flight_time, max_speed, max_wind_speed,
 *   max_range, ip_rating, operating_temperature, video_transmission,
 *   sensors (array of {type, resolution, zoom, thermal_resolution}),
 *   rtk, obstacle_avoidance, gnss, sdk, storage, charger_time,
 *   dimensions_folded, dimensions_unfolded, battery_capacity
 */

import { BaseScraper } from '../lib/baseScraper.js'
import { rateLimit } from '../lib/rateLimiter.js'

const SOURCE = 'dji_enterprise'
const LISTING_URL = 'https://enterprise.dji.com/'

// Explicit product slugs for the MVP priority list (spec §4.4).
// The listing-page discovery below runs first; these are fallbacks in case
// discovery misses any.
const MVP_PRODUCT_PATHS: string[] = [
  '/matrice-30',
  '/matrice-350-rtk',
  '/dji-dock-2',
  '/mavic-3-enterprise',
  '/mavic-3-thermal',
  '/matrice-4-enterprise',
  '/zenmuse-h30t',
  '/zenmuse-l2',
]

export interface DjiProductRaw {
  slug: string
  product_url: string
  model_name: string
  specs: Record<string, string>  // raw key→value pairs from the spec table
  sensor_sections: Array<{
    heading: string
    specs: Record<string, string>
  }>
}

export class DjiEnterpriseScraper extends BaseScraper {
  constructor() {
    super(SOURCE)
  }

  async run(): Promise<void> {
    const productUrls = await this.discoverProductUrls()

    for (const url of productUrls) {
      await this.scrapeProduct(url)
      // Rate limiting is handled inside openPage, but add a small extra gap
      // between products to be polite.
      await new Promise<void>(r => setTimeout(r, 500))
    }

    console.log(`[${SOURCE}] Finished. Scraped ${productUrls.length} products.`)
  }

  // ─── Step 1: Discover product URLs ─────────────────────────────────────────

  private async discoverProductUrls(): Promise<string[]> {
    const { page, context } = await this.openPage(LISTING_URL)

    let discovered: string[] = []

    try {
      // DJI renders product cards. Wait for any anchor inside a card.
      await page.waitForSelector('a[href*="/matrice"], a[href*="/mavic"], a[href*="/dock"]', {
        timeout: 15_000,
      }).catch(() => {/* ignore — fall through to MVP list */})

      discovered = await page.evaluate((): string[] => {
        // Collect all hrefs that look like drone product pages
        const anchors = Array.from(document.querySelectorAll('a[href]'))
        const seen = new Set<string>()
        const results: string[] = []

        for (const a of anchors) {
          const href = (a as HTMLAnchorElement).href
          // DJI product pages: enterprise.dji.com/<product-slug>
          // Filter out deep paths (/matrice-30/specs), nav links, etc.
          const url = new URL(href)
          if (url.hostname !== 'enterprise.dji.com') continue
          const parts = url.pathname.split('/').filter(Boolean)
          if (parts.length !== 1) continue   // skip /matrice-30/specs etc.
          if (parts[0].length < 3) continue  // skip short paths like /en
          if (seen.has(url.pathname)) continue
          seen.add(url.pathname)
          results.push(href)
        }

        return results
      })

      console.log(`[${SOURCE}] Discovered ${discovered.length} product URLs from listing page`)
    } catch (err) {
      console.warn(`[${SOURCE}] Listing page discovery failed:`, (err as Error).message)
    } finally {
      await context.close()
    }

    // Merge with MVP list — ensures priority products are always scraped
    const merged = new Set(discovered)
    for (const path of MVP_PRODUCT_PATHS) {
      merged.add(`https://enterprise.dji.com${path}`)
    }

    return Array.from(merged)
  }

  // ─── Step 2: Scrape a single product page ──────────────────────────────────

  private async scrapeProduct(url: string): Promise<void> {
    await rateLimit(url)
    const { page, context } = await this.openPage(url)

    let html = ''
    let extracted: DjiProductRaw | null = null
    let errorMessage: string | undefined

    try {
      // Wait for the spec section to render. DJI uses various selectors;
      // we try a few and proceed once any resolves.
      await Promise.race([
        page.waitForSelector('[class*="spec"]', { timeout: 15_000 }),
        page.waitForSelector('[class*="Spec"]', { timeout: 15_000 }),
        page.waitForSelector('table',           { timeout: 15_000 }),
      ]).catch(() => {/* timed out — will still try to extract */})

      html = await page.content()

      extracted = await page.evaluate((productUrl: string): DjiProductRaw => {
        // ── Model name ────────────────────────────────────────────────────────
        const modelName =
          document.querySelector('h1')?.textContent?.trim() ??
          document.title.split('|')[0].trim()

        const slug = new URL(productUrl).pathname.replace(/^\//, '')

        // ── Generic spec key→value extraction ─────────────────────────────────
        // DJI uses spec rows like:  <dt>Max Takeoff Weight</dt><dd>3770 g</dd>
        // or table rows:            <td>Max Takeoff Weight</td><td>3770 g</td>
        const specs: Record<string, string> = {}

        // 1. Definition lists
        const dts = Array.from(document.querySelectorAll('dt'))
        for (const dt of dts) {
          const key = dt.textContent?.trim() ?? ''
          const val = dt.nextElementSibling?.textContent?.trim() ?? ''
          if (key && val) specs[key] = val
        }

        // 2. Two-column table rows (if no dt/dd found above)
        if (Object.keys(specs).length === 0) {
          const rows = Array.from(document.querySelectorAll('tr'))
          for (const row of rows) {
            const cells = Array.from(row.querySelectorAll('td, th')).map(
              c => c.textContent?.trim() ?? ''
            )
            if (cells.length === 2 && cells[0] && cells[1]) {
              specs[cells[0]] = cells[1]
            }
          }
        }

        // 3. Key-value divs with a label class + value class (common in DJI's React components)
        const labelEls = Array.from(
          document.querySelectorAll('[class*="label"],[class*="Label"],[class*="param-name"]')
        )
        for (const el of labelEls) {
          const key = el.textContent?.trim() ?? ''
          // The value is usually the next sibling or a sibling with "value" in its class
          const nextEl = el.nextElementSibling
          const val = nextEl?.textContent?.trim() ?? ''
          if (key && val && !specs[key]) specs[key] = val
        }

        // ── Sensor sections (DJI groups camera/sensor specs under a heading) ──
        const sensor_sections: Array<{ heading: string; specs: Record<string, string> }> = []
        const headings = Array.from(
          document.querySelectorAll('h2, h3, h4, [class*="section-title"],[class*="SectionTitle"]')
        )

        for (const heading of headings) {
          const text = heading.textContent?.trim() ?? ''
          if (
            /camera|sensor|thermal|lidar|gimbal|payload|zoom|rgb|ir|visual/i.test(text)
          ) {
            // Collect spec rows that follow this heading until the next heading
            const sectionSpecs: Record<string, string> = {}
            let sibling = heading.nextElementSibling
            while (sibling && !['H2', 'H3', 'H4'].includes(sibling.tagName)) {
              const dts = Array.from(sibling.querySelectorAll('dt'))
              for (const dt of dts) {
                const k = dt.textContent?.trim() ?? ''
                const v = dt.nextElementSibling?.textContent?.trim() ?? ''
                if (k && v) sectionSpecs[k] = v
              }
              sibling = sibling.nextElementSibling
            }
            if (Object.keys(sectionSpecs).length > 0) {
              sensor_sections.push({ heading: text, specs: sectionSpecs })
            }
          }
        }

        return { slug, product_url: productUrl, model_name: modelName, specs, sensor_sections }
      }, url)

      const specCount = Object.keys(extracted?.specs ?? {}).length
      console.log(`[${SOURCE}] ${url} → ${specCount} spec fields, ${extracted?.sensor_sections.length ?? 0} sensor sections`)
    } catch (err) {
      errorMessage = err instanceof Error ? err.message : String(err)
      console.error(`[${SOURCE}] Error scraping ${url}:`, errorMessage)
      html = html || (await page.content().catch(() => ''))
    } finally {
      await context.close()
    }

    await this.saveRaw({
      source: SOURCE,
      url,
      raw_html: html,
      extracted_json: extracted ? (extracted as unknown as Record<string, unknown>) : {},
      status: extracted && Object.keys(extracted.specs).length > 0 ? 'SUCCESS' : 'FAILED',
      error_message: errorMessage,
    })
  }
}
