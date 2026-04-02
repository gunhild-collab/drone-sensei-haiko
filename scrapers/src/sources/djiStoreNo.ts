/**
 * DJI Store Norway price scraper
 *
 * Source: https://store.dji.com/no
 *
 * Strategy:
 *  1. Search for each known enterprise model on the Norwegian store.
 *  2. Extract the NOK price and store it in scrape_raw.
 *  3. Prices change daily so this scraper runs every day (see runner.ts).
 *
 * Note: Prices scraped here are never presented as "official" — they are
 *       stored with source + timestamp per spec §4.3 ethics rules.
 */

import { BaseScraper } from '../lib/baseScraper.js'
import { rateLimit } from '../lib/rateLimiter.js'

const SOURCE = 'dji_store_no'
const STORE_BASE = 'https://store.dji.com/no'

// Map of enterprise model slugs → expected store search terms
const MODELS_TO_PRICE: Record<string, string> = {
  'matrice-30':         'Matrice 30',
  'matrice-30t':        'Matrice 30T',
  'matrice-350-rtk':    'Matrice 350 RTK',
  'dji-dock-2':         'DJI Dock 2',
  'mavic-3-enterprise': 'Mavic 3 Enterprise',
  'mavic-3-thermal':    'Mavic 3T',
  'mini-4-pro':         'Mini 4 Pro',
  'air-3':              'Air 3',
}

export interface DjiPriceResult {
  slug: string
  search_term: string
  price_nok: number | null
  price_text: string | null
  product_url: string | null
}

export class DjiStoreNoScraper extends BaseScraper {
  constructor() {
    super(SOURCE)
  }

  async run(): Promise<void> {
    const results: DjiPriceResult[] = []

    for (const [slug, searchTerm] of Object.entries(MODELS_TO_PRICE)) {
      const result = await this.scrapePrice(slug, searchTerm)
      results.push(result)
      await new Promise<void>(r => setTimeout(r, 500))
    }

    const found = results.filter(r => r.price_nok !== null).length
    console.log(`[${SOURCE}] Done. Found prices for ${found}/${results.length} models.`)
  }

  private async scrapePrice(slug: string, searchTerm: string): Promise<DjiPriceResult> {
    const searchUrl = `${STORE_BASE}/search#q=${encodeURIComponent(searchTerm)}&t=all`
    await rateLimit(searchUrl)

    const { page, context } = await this.openPage(searchUrl)

    let result: DjiPriceResult = {
      slug,
      search_term: searchTerm,
      price_nok: null,
      price_text: null,
      product_url: null,
    }
    let html = ''
    let errorMessage: string | undefined

    try {
      // Wait for product cards to render
      await page.waitForSelector('[class*="product"], [class*="Product"], .search-result', {
        timeout: 15_000,
      }).catch(() => {})

      html = await page.content()

      const extracted = await page.evaluate((term: string): {
        price_text: string | null
        product_url: string | null
      } => {
        // Find the first product card whose title contains the search term
        const allCards = Array.from(
          document.querySelectorAll('[class*="product-item"], [class*="ProductItem"], li[class*="item"]')
        )

        for (const card of allCards) {
          const title = card.querySelector('h2, h3, [class*="title"], [class*="name"]')
          const titleText = title?.textContent?.trim() ?? ''
          if (!titleText.toLowerCase().includes(term.toLowerCase().split(' ')[0].toLowerCase())) {
            continue
          }

          // Look for price element
          const priceEl = card.querySelector(
            '[class*="price"],[class*="Price"],[data-price],[itemprop="price"]'
          )
          const price_text = priceEl?.textContent?.trim() ?? null

          // Product link
          const anchor = card.querySelector('a[href]') as HTMLAnchorElement | null
          const product_url = anchor?.href ?? null

          if (price_text) return { price_text, product_url }
        }

        // Fallback: try to grab the first visible price on the page
        const firstPrice = document.querySelector(
          '[class*="price"],[class*="Price"],[data-price]'
        )
        return {
          price_text: firstPrice?.textContent?.trim() ?? null,
          product_url: null,
        }
      }, searchTerm)

      // Parse NOK amount from text like "kr 189 000" or "189 000 kr" or "NOK 189,000"
      const raw = extracted.price_text ?? ''
      const cleaned = raw.replace(/[^\d.,]/g, '').replace(/[.,](?=\d{3})/g, '')
      const parsed = parseFloat(cleaned.replace(',', '.'))

      result = {
        slug,
        search_term: searchTerm,
        price_nok: isNaN(parsed) || parsed < 100 ? null : parsed,
        price_text: extracted.price_text,
        product_url: extracted.product_url,
      }

      console.log(
        `[${SOURCE}] ${searchTerm}: ${result.price_nok ? `NOK ${result.price_nok}` : 'price not found'}`
      )
    } catch (err) {
      errorMessage = err instanceof Error ? err.message : String(err)
      console.error(`[${SOURCE}] Error for "${searchTerm}":`, errorMessage)
      html = html || (await page.content().catch(() => ''))
    } finally {
      await context.close()
    }

    await this.saveRaw({
      source: SOURCE,
      url: searchUrl,
      raw_html: html,
      extracted_json: result as unknown as Record<string, unknown>,
      status: result.price_nok !== null ? 'SUCCESS' : 'FAILED',
      error_message: errorMessage,
    })

    return result
  }
}
