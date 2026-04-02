/**
 * DJI → drone_product field normalizer.
 *
 * Takes the raw specs Record<string,string> extracted by djiEnterprise.ts
 * and maps them onto our drone_product schema fields.
 *
 * Key mapping reference (DJI label → our field):
 *   "Max Takeoff Weight"         → mtom_g
 *   "Max Payload Weight"         → max_payload_g
 *   "Max Flight Time"            → max_flight_time_min
 *   "Hovering Time"              → max_flight_time_min (fallback)
 *   "Max Speed"                  → max_speed_ms
 *   "Max Wind Speed Resistance"  → max_wind_resistance_ms
 *   "Max Transmission Distance"  → max_range_km
 *   "Ingress Protection Rating"  → ip_rating
 *   "Operating Temperature"      → operating_temp_min_c / max_c
 *   "GNSS"                       → gnss_systems[]
 *   "Satellite Systems"          → gnss_systems[]
 *   "Video Transmission System"  → video_transmission_system
 *   "Internal Storage"           → onboard_storage_gb
 *   "Charging Time"              → charging_time_min
 *   "Battery Capacity"           → battery_capacity_wh
 *   "Obstacle Sensing"           → obstacle_avoidance
 *   "RTK"                        → rtk_support
 *   "SDK"                        → sdk_available / sdk_platforms[]
 *   "Max Service Ceiling"        → max_altitude_m
 *   "Dimensions (Unfolded)"      → unfolded_dimensions_mm
 *   "Dimensions (Folded)"        → folded_dimensions_mm
 */

import {
  toGrams, toMetersPerSecond, toKilometers, toMeters, toMinutes, toCelsius, parseNum,
} from './units.js'
import type { DjiProductRaw } from '../sources/djiEnterprise.js'

export interface NormalisedDroneFields {
  model_name: string
  product_url: string
  drone_type: 'MULTIROTOR' | 'FIXED_WING' | 'VTOL_HYBRID' | 'HELICOPTER' | 'OTHER'
  propulsion: 'ELECTRIC' | 'HYBRID' | 'COMBUSTION' | null
  mtom_g: number | null
  max_payload_g: number | null
  max_flight_time_min: number | null
  max_speed_ms: number | null
  max_wind_resistance_ms: number | null
  max_range_km: number | null
  ip_rating: string | null
  operating_temp_min_c: number | null
  operating_temp_max_c: number | null
  max_altitude_m: number | null
  gnss_systems: string[]
  rtk_support: boolean | null
  rtk_type: 'BUILT_IN' | 'EXTERNAL_MODULE' | 'NETWORK_RTK' | 'NONE' | null
  obstacle_avoidance: boolean | null
  obstacle_avoidance_directions: number | null
  video_transmission_system: string | null
  sdk_available: boolean | null
  sdk_platforms: string[]
  onboard_storage_gb: number | null
  battery_capacity_wh: number | null
  charging_time_min: number | null
  folded_dimensions_mm: string | null
  unfolded_dimensions_mm: string | null
  sensors: SensorEntry[]
}

export interface SensorEntry {
  sensor_id: string
  type: 'VISUAL_RGB' | 'THERMAL' | 'LIDAR' | 'MULTISPECTRAL' | 'OTHER'
  model_name: string | null
  resolution_mp: number | null
  video_max_resolution: string | null
  zoom_optical: number | null
  zoom_digital: number | null
  gimbal_axis: number | null
  thermal_resolution: string | null
  thermal_sensitivity_mk: number | null
  fov_deg: number | null
  integrated: boolean
}

/** Main entry point. Accepts the raw DjiProductRaw object and returns normalised fields. */
export function normalizeDji(raw: DjiProductRaw): NormalisedDroneFields {
  const s = raw.specs

  // Case-insensitive lookup helper
  const get = (keys: string[]): string | null => {
    for (const k of keys) {
      for (const [rawKey, val] of Object.entries(s)) {
        if (rawKey.toLowerCase().includes(k.toLowerCase())) return val
      }
    }
    return null
  }

  // ── Physical / Performance ──────────────────────────────────────────────────
  const mtom_g        = toGrams(get(['max takeoff weight', 'takeoff weight', 'mtow']) ?? '')
  const max_payload_g = toGrams(get(['max payload', 'payload weight', 'payload capacity']) ?? '')

  const flightTimeRaw = get(['max flight time', 'hovering time', 'flight time'])
  const max_flight_time_min = flightTimeRaw ? toMinutes(flightTimeRaw) : null

  const speedRaw = get(['max speed', 'maximum speed'])
  const max_speed_ms = speedRaw ? toMetersPerSecond(speedRaw) : null

  const windRaw = get(['max wind speed', 'wind speed resistance', 'wind resistance'])
  const max_wind_resistance_ms = windRaw ? toMetersPerSecond(windRaw) : null

  const rangeRaw = get(['max transmission distance', 'transmission range', 'max range', 'control range'])
  const max_range_km = rangeRaw ? toKilometers(rangeRaw) : null

  const ip_rating = get(['ingress protection', 'ip rating', 'ip43', 'ip54', 'ip55']) ?? null

  // Temperature range: often "−20° to 50°C" or "−20°C to 50°C"
  const tempRaw = get(['operating temperature', 'temperature range', 'working temperature']) ?? ''
  const { min: operating_temp_min_c, max: operating_temp_max_c } = parseTempRange(tempRaw)

  const altRaw = get(['max service ceiling', 'service ceiling', 'max altitude'])
  const max_altitude_m = altRaw ? toMeters(altRaw) : null

  // ── Navigation ─────────────────────────────────────────────────────────────
  const gnssRaw = get(['gnss', 'satellite systems', 'navigation systems']) ?? ''
  const gnss_systems = parseGnss(gnssRaw)

  const rtkRaw = get(['rtk', 'real-time kinematic']) ?? ''
  const rtk_support = rtkRaw ? !rtkRaw.toLowerCase().includes('no') : null
  const rtk_type = rtk_support
    ? (rtkRaw.toLowerCase().includes('network') ? 'NETWORK_RTK' : 'BUILT_IN')
    : (rtkRaw ? 'NONE' : null)

  const obsRaw = get(['obstacle sensing', 'obstacle avoidance', 'obstacle detection']) ?? ''
  const obstacle_avoidance = obsRaw ? !obsRaw.toLowerCase().includes('no') : null
  const obstacle_avoidance_directions = parseObstacleDirections(obsRaw)

  // ── Comms & Data ───────────────────────────────────────────────────────────
  const video_transmission_system = get(['video transmission', 'transmission system', 'o3', 'o4']) ?? null

  const sdkRaw = get(['sdk', 'software development kit']) ?? ''
  const sdk_available = sdkRaw ? true : null
  const sdk_platforms = parseSdkPlatforms(sdkRaw)

  const storageRaw = get(['internal storage', 'onboard storage', 'storage']) ?? ''
  const onboard_storage_gb = storageRaw ? (parseNum(storageRaw) ?? null) : null

  const batteryRaw = get(['battery capacity', 'battery life']) ?? ''
  const battery_capacity_wh = batteryRaw ? (parseNum(batteryRaw) ?? null) : null

  const chargeRaw = get(['charging time', 'charge time']) ?? ''
  const charging_time_min = chargeRaw ? toMinutes(chargeRaw) : null

  // ── Dimensions ─────────────────────────────────────────────────────────────
  const unfolded_dimensions_mm = get(['dimensions (unfolded)', 'unfolded dimensions', 'unfolded size']) ?? null
  const folded_dimensions_mm   = get(['dimensions (folded)', 'folded dimensions', 'folded size']) ?? null

  // ── Sensors ────────────────────────────────────────────────────────────────
  const sensors = parseSensors(s, raw.sensor_sections)

  // ── Drone type (all DJI enterprise products are multirotors unless stated) ──
  const modelLower = raw.model_name.toLowerCase()
  let drone_type: NormalisedDroneFields['drone_type'] = 'MULTIROTOR'
  if (modelLower.includes('fixed') || modelLower.includes('wing')) drone_type = 'FIXED_WING'
  if (modelLower.includes('vtol') || modelLower.includes('hybrid')) drone_type = 'VTOL_HYBRID'

  return {
    model_name:                  raw.model_name,
    product_url:                 raw.product_url,
    drone_type,
    propulsion:                  'ELECTRIC',
    mtom_g,
    max_payload_g,
    max_flight_time_min,
    max_speed_ms,
    max_wind_resistance_ms,
    max_range_km,
    ip_rating,
    operating_temp_min_c,
    operating_temp_max_c,
    max_altitude_m,
    gnss_systems,
    rtk_support,
    rtk_type:                    rtk_type as NormalisedDroneFields['rtk_type'],
    obstacle_avoidance,
    obstacle_avoidance_directions,
    video_transmission_system,
    sdk_available,
    sdk_platforms,
    onboard_storage_gb,
    battery_capacity_wh,
    charging_time_min,
    folded_dimensions_mm,
    unfolded_dimensions_mm,
    sensors,
  }
}

// ─── Helpers ───────────────────────────────────────────────────────────────────

function parseTempRange(raw: string): { min: number | null; max: number | null } {
  if (!raw) return { min: null, max: null }
  // Match patterns like "-20° to 50°C", "−20 ~ 50 °C", "-20°C to +50°C"
  const match = raw.match(/(-?\d+)\s*[°℃]?\s*(?:to|~|–|-)\s*\+?(\d+)\s*[°℃Ff]?/i)
  if (match) {
    const a = parseInt(match[1])
    const b = parseInt(match[2])
    const min = Math.min(a, b)
    const max = Math.max(a, b)
    return {
      min: raw.toLowerCase().includes('f') ? toCelsius(`${min}°F`) : min,
      max: raw.toLowerCase().includes('f') ? toCelsius(`${max}°F`) : max,
    }
  }
  const single = toCelsius(raw)
  return { min: null, max: single }
}

function parseGnss(raw: string): string[] {
  const known = ['GPS', 'GLONASS', 'GALILEO', 'BEIDOU', 'QZSS', 'NAVIC']
  return known.filter(sys => raw.toUpperCase().includes(sys))
}

function parseObstacleDirections(raw: string): number | null {
  const lower = raw.toLowerCase()
  if (lower.includes('omnidirectional') || lower.includes('6-direction') || lower.includes('6 direction')) return 6
  if (lower.includes('5-direction') || lower.includes('5 direction')) return 5
  if (lower.includes('4-direction') || lower.includes('4 direction')) return 4
  if (lower.includes('forward') && lower.includes('backward')) return 2
  if (lower.includes('forward')) return 1
  const m = raw.match(/(\d+)[-\s]?direction/i)
  return m ? parseInt(m[1]) : null
}

function parseSdkPlatforms(raw: string): string[] {
  const platforms = ['MSDK', 'PSDK', 'OSDK', 'ROS', 'MAVLink', 'DJI Terra', 'Payload SDK']
  return platforms.filter(p => raw.toUpperCase().includes(p.toUpperCase()))
}

function parseSensors(
  globalSpecs: Record<string, string>,
  sensorSections: DjiProductRaw['sensor_sections']
): SensorEntry[] {
  const sensors: SensorEntry[] = []

  // Build from sensor sections first
  sensorSections.forEach((section, idx) => {
    const heading = section.heading.toLowerCase()
    const isRgb     = /rgb|visual|camera|wide|zoom/.test(heading)
    const isThermal = /thermal|ir\b|infrared/.test(heading)
    const isLidar   = /lidar|laser/.test(heading)

    const type: SensorEntry['type'] = isThermal ? 'THERMAL'
      : isLidar ? 'LIDAR'
      : isRgb ? 'VISUAL_RGB'
      : 'OTHER'

    const getS = (keys: string[]): string | null => {
      for (const k of keys) {
        for (const [rawKey, val] of Object.entries(section.specs)) {
          if (rawKey.toLowerCase().includes(k.toLowerCase())) return val
        }
      }
      return null
    }

    const resRaw    = getS(['effective pixels', 'resolution', 'image size'])
    const mpMatch   = resRaw?.match(/(\d+(?:\.\d+)?)\s*MP/i)
    const resolution_mp = mpMatch ? parseFloat(mpMatch[1]) : null

    const thermalRes = isThermal
      ? (getS(['resolution', 'pixel']) ?? null)
      : null

    const netdRaw = getS(['netd', 'sensitivity', 'thermal sensitivity'])
    const thermal_sensitivity_mk = netdRaw ? parseNum(netdRaw) : null

    const fovRaw = getS(['fov', 'field of view'])
    const fov_deg = fovRaw ? parseNum(fovRaw) : null

    const zoomOptRaw = getS(['optical zoom', 'optical'])
    const zoom_optical = zoomOptRaw ? parseNum(zoomOptRaw) : null

    const zoomDigRaw = getS(['digital zoom'])
    const zoom_digital = zoomDigRaw ? parseNum(zoomDigRaw) : null

    const gimbalRaw = getS(['gimbal', 'stabilization'])
    const gimbalMatch = gimbalRaw?.match(/(\d)-axis/i)
    const gimbal_axis = gimbalMatch ? parseInt(gimbalMatch[1]) : null

    const videoRaw = getS(['video', 'max video', 'video resolution'])
    const video_max_resolution = videoRaw?.match(/(4K|2\.7K|1080p|720p|\d{3,4}p)/i)?.[1] ?? null

    sensors.push({
      sensor_id:             `sensor_${idx}`,
      type,
      model_name:            getS(['sensor', 'cmos', 'detector']) ?? null,
      resolution_mp,
      video_max_resolution,
      zoom_optical,
      zoom_digital,
      gimbal_axis,
      thermal_resolution:    thermalRes,
      thermal_sensitivity_mk,
      fov_deg,
      integrated:            true,
    })
  })

  // If no sections found, try to infer a basic sensor from global specs
  if (sensors.length === 0) {
    const hasThermal = Object.keys(globalSpecs).some(k =>
      /thermal|infrared/i.test(k)
    )
    const hasCamera = Object.keys(globalSpecs).some(k =>
      /camera|lens|sensor|cmos/i.test(k)
    )

    if (hasCamera) {
      sensors.push({
        sensor_id: 'main_camera',
        type: 'VISUAL_RGB',
        model_name: null,
        resolution_mp: null,
        video_max_resolution: null,
        zoom_optical: null,
        zoom_digital: null,
        gimbal_axis: null,
        thermal_resolution: null,
        thermal_sensitivity_mk: null,
        fov_deg: null,
        integrated: true,
      })
    }

    if (hasThermal) {
      sensors.push({
        sensor_id: 'thermal',
        type: 'THERMAL',
        model_name: null,
        resolution_mp: null,
        video_max_resolution: null,
        zoom_optical: null,
        zoom_digital: null,
        gimbal_axis: null,
        thermal_resolution: null,
        thermal_sensitivity_mk: null,
        fov_deg: null,
        integrated: true,
      })
    }
  }

  return sensors
}
