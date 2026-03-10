import { useState, useEffect } from 'react';
import { DroneSpec } from '@/data/droneDatabase';

const BASE_URL = `https://api.airtable.com/v0/${import.meta.env.VITE_AIRTABLE_BASE_ID}/${import.meta.env.VITE_AIRTABLE_TABLE_ID}`;

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function mapRecord(record: { id: string; fields: Record<string, any> }): DroneSpec {
  const f = record.fields;
  return {
    id: record.id,
    name: f.drone_name ?? '',
    manufacturer: f.manufacturer ?? '',
    mtom: f.mtom_kg ?? 0,
    maxSpeed: f.max_speed_ms ?? 0,
    categoryClass: f.c_class ?? '',
    easaCategory: f.category ?? '',
    supportsBVLOS: Boolean(f.bvlos_capable),
    maxAltitude: f.max_altitue_m ?? 0,
    hasThermal: Boolean(f.has_thermal),
    hasRGB: Boolean(f.has_rbg),
    hasLidar: Boolean(f.has_lidar),
    hasRTK: Boolean(f.has_rtk),
    hasZoom: Boolean(f.has_zoom),
    hasParachute: Boolean(f.has_parachute),
    cameraResolution: f.camera_resolution ?? undefined,
    zoomLevel: f.zoom_level ?? undefined,
    payloadKg: f.max_payload_kg ?? 0,
    hasPayloadRelease: Boolean(f.Payload_release),
    notes: f.payload_notes ?? '',
    characteristicDimension: f.characteristic_dimension_m ?? 0.5,
  };
}

async function fetchAllDrones(): Promise<DroneSpec[]> {
  const token = import.meta.env.VITE_AIRTABLE_TOKEN;
  const records: DroneSpec[] = [];
  let offset: string | undefined;

  do {
    const url = `${BASE_URL}?pageSize=100${offset ? `&offset=${offset}` : ''}`;
    const res = await fetch(url, {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (!res.ok) {
      throw new Error(`Airtable fetch failed: ${res.status} ${res.statusText}`);
    }
    const data = await res.json();
    for (const record of data.records ?? []) {
      records.push(mapRecord(record));
    }
    offset = data.offset;
  } while (offset);

  return records;
}

export function useDrones(): { drones: DroneSpec[]; loading: boolean; error: string | null } {
  const [drones, setDrones] = useState<DroneSpec[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    fetchAllDrones()
      .then((data) => {
        if (!cancelled) {
          setDrones(data);
          setLoading(false);
        }
      })
      .catch((err) => {
        if (!cancelled) {
          setError(err.message ?? 'Ukjent feil');
          setLoading(false);
        }
      });
    return () => { cancelled = true; };
  }, []);

  return { drones, loading, error };
}
