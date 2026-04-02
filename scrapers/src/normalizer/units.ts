/**
 * Unit conversion helpers used by all normalizers.
 * All output units match the drone_product schema:
 *   mass  → grams (INT)
 *   speed → m/s   (DECIMAL)
 *   dist  → km    (DECIMAL) or m (INT)
 *   time  → min   (INT)
 *   temp  → °C    (INT)
 */

/** Parse a number out of a string like "3770 g", "1.5 kg", "41 min", "15 m/s". */
export function parseNum(raw: string): number | null {
  const match = raw.replace(/,/g, '.').match(/-?\d+(\.\d+)?/)
  if (!match) return null
  return parseFloat(match[0])
}

/** Convert a raw mass string to grams. Handles g / kg / lbs / oz. */
export function toGrams(raw: string): number | null {
  const n = parseNum(raw)
  if (n === null) return null
  const s = raw.toLowerCase()
  if (s.includes('kg') || s.includes('kilogram')) return Math.round(n * 1000)
  if (s.includes('lbs') || s.includes('lb'))       return Math.round(n * 453.592)
  if (s.includes('oz'))                             return Math.round(n * 28.3495)
  // Assume grams if value > 100 and no unit; assume kg if <= 100
  return n > 100 ? Math.round(n) : Math.round(n * 1000)
}

/** Convert a raw speed string to m/s. Handles m/s, km/h, mph, knots. */
export function toMetersPerSecond(raw: string): number | null {
  const n = parseNum(raw)
  if (n === null) return null
  const s = raw.toLowerCase()
  if (s.includes('km/h') || s.includes('kph'))   return Math.round((n / 3.6) * 10) / 10
  if (s.includes('mph'))                           return Math.round((n * 0.44704) * 10) / 10
  if (s.includes('knot'))                          return Math.round((n * 0.514444) * 10) / 10
  return Math.round(n * 10) / 10 // assume m/s
}

/** Convert a raw distance string to km. Handles km, m, mi, ft. */
export function toKilometers(raw: string): number | null {
  const n = parseNum(raw)
  if (n === null) return null
  const s = raw.toLowerCase()
  if (s.includes(' m') && !s.includes('km'))   return Math.round((n / 1000) * 10) / 10
  if (s.includes('mi') && !s.includes('km'))   return Math.round((n * 1.60934) * 10) / 10
  if (s.includes('ft') || s.includes('feet'))  return Math.round((n * 0.0003048) * 10) / 10
  return Math.round(n * 10) / 10 // assume km
}

/** Convert a raw altitude/distance string to metres. */
export function toMeters(raw: string): number | null {
  const n = parseNum(raw)
  if (n === null) return null
  const s = raw.toLowerCase()
  if (s.includes('km'))                          return Math.round(n * 1000)
  if (s.includes('ft') || s.includes('feet'))    return Math.round(n * 0.3048)
  return Math.round(n) // assume metres
}

/** Parse a time string to minutes. Handles "41 min", "1 h 30 min", "90 min", "1.5 hours". */
export function toMinutes(raw: string): number | null {
  const s = raw.toLowerCase()

  // Pattern: "1 h 30 min" or "1h 30m"
  const hm = s.match(/(\d+)\s*h(?:our)?s?\s*(\d+)\s*m/)
  if (hm) return parseInt(hm[1]) * 60 + parseInt(hm[2])

  // Pattern: "1.5 hours" or "1.5h"
  const h = s.match(/(\d+(?:\.\d+)?)\s*h(?:our)?/)
  if (h) return Math.round(parseFloat(h[1]) * 60)

  // Pattern: "41 min" or "41m"
  const m = s.match(/(\d+(?:\.\d+)?)\s*m(?:in)?/)
  if (m) return Math.round(parseFloat(m[1]))

  const n = parseNum(raw)
  return n !== null ? Math.round(n) : null
}

/** Parse temperature, returning integer °C. Handles "−20°C" and "−4°F". */
export function toCelsius(raw: string): number | null {
  const n = parseNum(raw)
  if (n === null) return null
  if (raw.includes('°F') || raw.toLowerCase().includes('fahrenheit')) {
    return Math.round((n - 32) * 5 / 9)
  }
  return Math.round(n)
}
