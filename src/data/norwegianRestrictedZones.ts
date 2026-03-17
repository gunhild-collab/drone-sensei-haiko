/**
 * Norwegian restricted / no-fly zones for SORA flight area planning.
 * Includes airports (CTR / ATZ), national parks, and nature reserves.
 * Coordinates are simplified indicative polygons.
 */

export type RestrictedZoneType = 'airport' | 'national_park' | 'nature_reserve' | 'military';

export interface RestrictedZone {
  id: string;
  name: string;
  type: RestrictedZoneType;
  /** Center point */
  lat: number;
  lng: number;
  /** Approximate radius in km (used for circle rendering & overlap check) */
  radiusKm: number;
  /** Norwegian description of the restriction */
  description: string;
  /** What is required to fly here */
  requirement: string;
  /** External link for more info */
  link?: string;
}

export const RESTRICTED_ZONES: RestrictedZone[] = [
  // ── Airports (CTR / ATZ) ──
  { id: 'engm', name: 'Oslo lufthavn Gardermoen (ENGM)', type: 'airport', lat: 60.1939, lng: 11.1004, radiusKm: 15, description: 'Kontrollert luftrom (CTR) rundt Oslo Gardermoen.', requirement: 'Krever tillatelse fra Avinor / Luftfartstilsynet og koordinering med tårnet.', link: 'https://avinor.no/konsern/flyplass/oslo/' },
  { id: 'enbr', name: 'Bergen lufthavn Flesland (ENBR)', type: 'airport', lat: 60.2934, lng: 5.2181, radiusKm: 12, description: 'Kontrollert luftrom (CTR) rundt Bergen Flesland.', requirement: 'Krever tillatelse fra Avinor og koordinering med tårnet.', link: 'https://avinor.no/konsern/flyplass/bergen/' },
  { id: 'enva', name: 'Trondheim lufthavn Værnes (ENVA)', type: 'airport', lat: 63.4578, lng: 10.9240, radiusKm: 12, description: 'Kontrollert luftrom (CTR) rundt Trondheim Værnes.', requirement: 'Krever tillatelse fra Avinor og koordinering med tårnet.', link: 'https://avinor.no/konsern/flyplass/trondheim/' },
  { id: 'enzv', name: 'Stavanger lufthavn Sola (ENZV)', type: 'airport', lat: 58.8767, lng: 5.6378, radiusKm: 12, description: 'Kontrollert luftrom (CTR) rundt Stavanger Sola.', requirement: 'Krever tillatelse fra Avinor og koordinering med tårnet.', link: 'https://avinor.no/konsern/flyplass/stavanger/' },
  { id: 'entc', name: 'Tromsø lufthavn Langnes (ENTC)', type: 'airport', lat: 69.6833, lng: 18.9189, radiusKm: 10, description: 'Kontrollert luftrom (CTR) rundt Tromsø Langnes.', requirement: 'Krever tillatelse fra Avinor og koordinering med tårnet.' },
  { id: 'enbo', name: 'Bodø lufthavn (ENBO)', type: 'airport', lat: 67.2692, lng: 14.3653, radiusKm: 10, description: 'Kontrollert luftrom (CTR) rundt Bodø lufthavn / militært.', requirement: 'Krever tillatelse fra Avinor/Forsvaret og koordinering med tårnet.' },
  { id: 'enkr', name: 'Kristiansand lufthavn Kjevik (ENCN)', type: 'airport', lat: 58.2042, lng: 8.0853, radiusKm: 8, description: 'Kontrollert luftrom (CTR) rundt Kjevik.', requirement: 'Krever tillatelse fra Avinor og koordinering med tårnet.' },
  { id: 'enry', name: 'Moss lufthavn Rygge (ENRY)', type: 'airport', lat: 59.3789, lng: 10.7853, radiusKm: 8, description: 'Militær flyplass med restriksjoner.', requirement: 'Krever tillatelse fra Forsvaret.' },
  { id: 'enal', name: 'Ålesund lufthavn Vigra (ENAL)', type: 'airport', lat: 62.5625, lng: 6.1197, radiusKm: 8, description: 'Kontrollert luftrom rundt Vigra.', requirement: 'Krever tillatelse fra Avinor.' },
  { id: 'enev', name: 'Harstad/Narvik lufthavn Evenes (ENEV)', type: 'airport', lat: 68.4917, lng: 16.6781, radiusKm: 8, description: 'Militær/sivil flyplass med restriksjoner.', requirement: 'Krever tillatelse fra Avinor/Forsvaret.' },
  { id: 'enat', name: 'Alta lufthavn (ENAT)', type: 'airport', lat: 69.9761, lng: 23.3717, radiusKm: 5, description: 'Kontrollert luftrom rundt Alta lufthavn.', requirement: 'Krever tillatelse fra Avinor.' },
  { id: 'enhf', name: 'Hammerfest lufthavn (ENHF)', type: 'airport', lat: 70.6797, lng: 23.6686, radiusKm: 5, description: 'Kontrollert luftrom rundt Hammerfest.', requirement: 'Krever tillatelse fra Avinor.' },
  { id: 'enml', name: 'Molde lufthavn Årø (ENML)', type: 'airport', lat: 62.7447, lng: 7.2625, radiusKm: 5, description: 'Kontrollert luftrom rundt Molde Årø.', requirement: 'Krever tillatelse fra Avinor.' },
  { id: 'enha', name: 'Haugesund lufthavn Karmøy (ENHD)', type: 'airport', lat: 59.3453, lng: 5.2083, radiusKm: 8, description: 'Kontrollert luftrom rundt Haugesund.', requirement: 'Krever tillatelse fra Avinor.' },
  { id: 'ento', name: 'Sandefjord lufthavn Torp (ENTO)', type: 'airport', lat: 59.1867, lng: 10.2586, radiusKm: 8, description: 'Kontrollert luftrom rundt Torp.', requirement: 'Krever tillatelse fra Avinor.' },

  // ── National Parks ──
  { id: 'np_jotunheimen', name: 'Jotunheimen nasjonalpark', type: 'national_park', lat: 61.60, lng: 8.30, radiusKm: 20, description: 'Nasjonalpark. Droneflyvning er som hovedregel forbudt uten dispensasjon.', requirement: 'Krever dispensasjon fra Statsforvalteren. Søknad må sendes i god tid.', link: 'https://www.nasjonalparkstyre.no/Jotunheimen/' },
  { id: 'np_rondane', name: 'Rondane nasjonalpark', type: 'national_park', lat: 61.90, lng: 10.00, radiusKm: 15, description: 'Nasjonalpark. Droneflyvning er forbudt uten dispensasjon.', requirement: 'Krever dispensasjon fra Statsforvalteren.' },
  { id: 'np_dovrefjell', name: 'Dovrefjell-Sunndalsfjella nasjonalpark', type: 'national_park', lat: 62.25, lng: 9.40, radiusKm: 20, description: 'Nasjonalpark. Droneflyvning er forbudt uten dispensasjon. Hensyn til moskus og villrein.', requirement: 'Krever dispensasjon fra Statsforvalteren.' },
  { id: 'np_hardangervidda', name: 'Hardangervidda nasjonalpark', type: 'national_park', lat: 60.10, lng: 7.50, radiusKm: 30, description: 'Norges største nasjonalpark. Droneflyvning er forbudt uten dispensasjon.', requirement: 'Krever dispensasjon fra Statsforvalteren.', link: 'https://www.nasjonalparkstyre.no/Hardangervidda/' },
  { id: 'np_jostedalsbreen', name: 'Jostedalsbreen nasjonalpark', type: 'national_park', lat: 61.65, lng: 6.90, radiusKm: 18, description: 'Nasjonalpark med isbre. Droneflyvning forbudt uten dispensasjon.', requirement: 'Krever dispensasjon fra Statsforvalteren.' },
  { id: 'np_breheimen', name: 'Breheimen nasjonalpark', type: 'national_park', lat: 61.75, lng: 7.60, radiusKm: 15, description: 'Nasjonalpark. Droneflyvning forbudt uten dispensasjon.', requirement: 'Krever dispensasjon fra Statsforvalteren.' },
  { id: 'np_folgefonna', name: 'Folgefonna nasjonalpark', type: 'national_park', lat: 60.05, lng: 6.35, radiusKm: 12, description: 'Nasjonalpark med isbre. Droneflyvning forbudt uten dispensasjon.', requirement: 'Krever dispensasjon fra Statsforvalteren.' },
  { id: 'np_saltfjellet', name: 'Saltfjellet-Svartisen nasjonalpark', type: 'national_park', lat: 66.75, lng: 15.50, radiusKm: 20, description: 'Nasjonalpark langs polarsirkelen. Droneflyvning forbudt uten dispensasjon.', requirement: 'Krever dispensasjon fra Statsforvalteren.' },
  { id: 'np_lofotodden', name: 'Lofotodden nasjonalpark', type: 'national_park', lat: 67.98, lng: 13.15, radiusKm: 8, description: 'Nasjonalpark i Lofoten. Droneflyvning forbudt uten dispensasjon.', requirement: 'Krever dispensasjon fra Statsforvalteren.' },
  { id: 'np_stabbursdalen', name: 'Stabbursdalen nasjonalpark', type: 'national_park', lat: 70.15, lng: 25.10, radiusKm: 10, description: 'Nasjonalpark i Finnmark. Droneflyvning forbudt uten dispensasjon.', requirement: 'Krever dispensasjon fra Statsforvalteren.' },
  { id: 'np_varangerhalvoya', name: 'Varangerhalvøya nasjonalpark', type: 'national_park', lat: 70.30, lng: 29.20, radiusKm: 18, description: 'Nasjonalpark i Finnmark. Droneflyvning forbudt uten dispensasjon.', requirement: 'Krever dispensasjon fra Statsforvalteren.' },
  { id: 'np_femundsmarka', name: 'Femundsmarka nasjonalpark', type: 'national_park', lat: 62.30, lng: 11.80, radiusKm: 12, description: 'Nasjonalpark. Droneflyvning forbudt uten dispensasjon.', requirement: 'Krever dispensasjon fra Statsforvalteren.' },
  { id: 'np_langsua', name: 'Langsua nasjonalpark', type: 'national_park', lat: 61.25, lng: 9.80, radiusKm: 12, description: 'Nasjonalpark. Droneflyvning forbudt uten dispensasjon.', requirement: 'Krever dispensasjon fra Statsforvalteren.' },
  { id: 'np_reinheimen', name: 'Reinheimen nasjonalpark', type: 'national_park', lat: 62.00, lng: 8.20, radiusKm: 18, description: 'Nasjonalpark. Droneflyvning forbudt uten dispensasjon.', requirement: 'Krever dispensasjon fra Statsforvalteren.' },

  // ── Military areas ──
  { id: 'mil_rena', name: 'Rena militærleir / Regionfelt Østlandet', type: 'military', lat: 61.18, lng: 11.38, radiusKm: 15, description: 'Militært øvingsområde. Droneflyvning strengt forbudt.', requirement: 'Krever tillatelse fra Forsvaret.' },
  { id: 'mil_orland', name: 'Ørland flystasjon', type: 'military', lat: 63.6989, lng: 9.6042, radiusKm: 10, description: 'Hovedbase for norske F-35 kampfly. Strengt kontrollert luftrom.', requirement: 'Krever tillatelse fra Forsvaret og koordinering med militær flygekontroll.' },
];

const ZONE_TYPE_COLORS: Record<RestrictedZoneType, string> = {
  airport: '#ef4444',
  national_park: '#22c55e',
  nature_reserve: '#3b82f6',
  military: '#f59e0b',
};

const ZONE_TYPE_LABELS: Record<RestrictedZoneType, string> = {
  airport: 'Flyplass / CTR',
  national_park: 'Nasjonalpark',
  nature_reserve: 'Naturreservat',
  military: 'Militært område',
};

export { ZONE_TYPE_COLORS, ZONE_TYPE_LABELS };

/** Check if a point is within any restricted zone */
export function checkRestrictedZones(lat: number, lng: number): RestrictedZone[] {
  return RESTRICTED_ZONES.filter(zone => {
    const dLat = lat - zone.lat;
    const dLng = (lng - zone.lng) * Math.cos(lat * Math.PI / 180);
    const distKm = Math.sqrt(dLat * dLat + dLng * dLng) * 111.32;
    return distKm < zone.radiusKm;
  });
}

/** Check if a polygon overlaps with any restricted zone */
export function checkPolygonRestrictedZones(latlngs: { lat: number; lng: number }[]): RestrictedZone[] {
  const found = new Map<string, RestrictedZone>();
  // Check each vertex
  for (const pt of latlngs) {
    for (const z of checkRestrictedZones(pt.lat, pt.lng)) {
      found.set(z.id, z);
    }
  }
  // Check center
  if (latlngs.length >= 3) {
    const cLat = latlngs.reduce((s, p) => s + p.lat, 0) / latlngs.length;
    const cLng = latlngs.reduce((s, p) => s + p.lng, 0) / latlngs.length;
    for (const z of checkRestrictedZones(cLat, cLng)) {
      found.set(z.id, z);
    }
  }
  // Also check if any zone center falls inside the polygon bounding box (rough)
  if (latlngs.length >= 3) {
    const minLat = Math.min(...latlngs.map(p => p.lat));
    const maxLat = Math.max(...latlngs.map(p => p.lat));
    const minLng = Math.min(...latlngs.map(p => p.lng));
    const maxLng = Math.max(...latlngs.map(p => p.lng));
    for (const zone of RESTRICTED_ZONES) {
      if (zone.lat >= minLat && zone.lat <= maxLat && zone.lng >= minLng && zone.lng <= maxLng) {
        found.set(zone.id, zone);
      }
    }
  }
  return Array.from(found.values());
}
