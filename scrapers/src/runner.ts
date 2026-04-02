/**
 * Haiko Drone Scraper — CLI runner
 *
 * Usage:
 *   npm run scrape:easa          # EASA approved drones list
 *   npm run scrape:dji           # DJI Enterprise product specs
 *   npm run scrape:dji-prices    # DJI Store Norway NOK prices
 *   npm run scrape:all           # All scrapers in sequence
 *
 * Or directly:
 *   tsx src/runner.ts easa
 *   tsx src/runner.ts dji-enterprise
 *   tsx src/runner.ts dji-store-no
 *   tsx src/runner.ts all
 *
 * Environment:
 *   Copy .env.example to .env and set SUPABASE_URL + SUPABASE_SERVICE_ROLE_KEY.
 *   Run `npm run install:browsers` once to install Playwright's Chromium binary.
 */

import { EasaScraper }           from './sources/easa.js'
import { DjiEnterpriseScraper }  from './sources/djiEnterprise.js'
import { DjiStoreNoScraper }     from './sources/djiStoreNo.js'
import type { BaseScraper }      from './lib/baseScraper.js'

type ScraperKey = 'easa' | 'dji-enterprise' | 'dji-store-no' | 'all'

const SCRAPERS: Record<Exclude<ScraperKey, 'all'>, () => BaseScraper> = {
  'easa':          () => new EasaScraper(),
  'dji-enterprise': () => new DjiEnterpriseScraper(),
  'dji-store-no':  () => new DjiStoreNoScraper(),
}

async function runScraper(scraper: BaseScraper): Promise<void> {
  await scraper.launch()
  try {
    await scraper.run()
  } finally {
    await scraper.close()
  }
}

async function main(): Promise<void> {
  const arg = (process.argv[2] ?? 'all') as ScraperKey

  if (arg === 'all') {
    for (const [key, factory] of Object.entries(SCRAPERS)) {
      console.log(`\n${'─'.repeat(60)}`)
      console.log(`  Running: ${key}`)
      console.log('─'.repeat(60))
      await runScraper(factory())
    }
    console.log('\nAll scrapers finished.')
    return
  }

  const factory = SCRAPERS[arg]
  if (!factory) {
    console.error(`Unknown scraper: "${arg}"`)
    console.error(`Available: ${Object.keys(SCRAPERS).join(', ')}, all`)
    process.exit(1)
  }

  await runScraper(factory())
}

main().catch(err => {
  console.error('Fatal error:', err)
  process.exit(1)
})
