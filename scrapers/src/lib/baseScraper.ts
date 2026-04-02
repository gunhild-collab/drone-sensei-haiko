import { chromium, Browser, BrowserContext, Page } from 'playwright'
import { supabase } from './supabase.js'
import { rateLimit } from './rateLimiter.js'

export type ScrapeStatus = 'SUCCESS' | 'FAILED' | 'SKIPPED'

export interface RawRecord {
  source: string
  url: string
  raw_html: string
  extracted_json?: Record<string, unknown>
  status: ScrapeStatus
  error_message?: string
  drone_id?: string
}

export abstract class BaseScraper {
  protected browser!: Browser
  readonly sourceName: string

  constructor(sourceName: string) {
    this.sourceName = sourceName
  }

  async launch(): Promise<void> {
    this.browser = await chromium.launch({ headless: true })
    console.log(`[${this.sourceName}] Browser launched`)
  }

  async close(): Promise<void> {
    await this.browser?.close()
    console.log(`[${this.sourceName}] Browser closed`)
  }

  /** Opens a new page with the bot user-agent. Caller must close the context. */
  protected async openPage(url: string): Promise<{ page: Page; context: BrowserContext }> {
    await rateLimit(url)

    const context = await this.browser.newContext({
      userAgent: 'HaikoDroneBot/1.0 (+https://haiko.no/bot)',
      locale: 'en-US',
      extraHTTPHeaders: {
        'Accept-Language': 'en-US,en;q=0.9',
      },
    })

    const page = await context.newPage()

    // Block images, fonts, and media to reduce bandwidth
    await page.route('**/*.{png,jpg,jpeg,gif,webp,svg,woff,woff2,ttf,mp4,mp3}', r => r.abort())

    console.log(`[${this.sourceName}] Fetching ${url}`)
    await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 30_000 })

    return { page, context }
  }

  /** Writes one raw scrape record to the scrape_raw table. Returns the inserted row id. */
  protected async saveRaw(record: RawRecord): Promise<string | null> {
    const { data, error } = await supabase
      .from('scrape_raw')
      .insert({
        source: record.source,
        url: record.url,
        raw_html: record.raw_html,
        extracted_json: record.extracted_json ?? null,
        status: record.status,
        error_message: record.error_message ?? null,
        drone_id: record.drone_id ?? null,
      })
      .select('id')
      .single()

    if (error) {
      console.error(`[${this.sourceName}] DB insert error:`, error.message)
      return null
    }

    console.log(`[${this.sourceName}] Saved scrape_raw id=${data.id} status=${record.status}`)
    return data.id as string
  }

  /** Subclasses implement their scraping logic here. */
  abstract run(): Promise<void>
}
