import { useState, useEffect } from "react";
import { createClient } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";
import type { DroneSpec } from "@/data/droneDatabase";

// External drone database (DMA Library)
const dmaClient = createClient(
  "https://mlrvjprgiookaiiohhkg.supabase.co",
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1scnZqcHJnaW9va2FpaW9oaGtnIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzUyMzE5NDEsImV4cCI6MjA5MDgwNzk0MX0.etqIrK9By1lJAV7Ypz-3uNokNp2XiD11HTbOalO3xYk"
);

function rowToDroneSpec(row: any): DroneSpec {
  return {
    id: row.slug || row.id,
    name: row.name || `${row.manufacturer} ${row.model}`,
    manufacturer: row.manufacturer,
    model: row.model,
    mtom: Number(row.max_takeoff_weight_kg) || 0,
    characteristicDimension: Number(row.characteristic_dimension) || 0,
    maxSpeed: Number(row.max_speed) || 0,
    categoryClass: row.c_class || 'C0',
    easaCategory: row.easa_category === 'Specific' ? 'Specific' : 'Open',
    supportsBVLOS: row.supports_bvlos ?? false,
    maxAltitude: Number(row.max_altitude) || 120,
    maxFlightTime: Number(row.max_flight_time_min) || 0,
    propulsion: row.propulsion || 'elektrisk',
    hasRemoteId: row.has_remote_id ?? true,
    hasThermal: row.has_thermal ?? false,
    hasParachute: row.has_parachute ?? false,
    hasRTK: row.has_rtk ?? false,
    payloadKg: Number(row.payload_kg) || 0,
    notes: row.notes || '',
  };
}

function externalRowToDroneSpec(row: any): DroneSpec {
  const manufacturer = row.manufacturers?.name || 'Ukjent';
  const country = row.manufacturers?.country || '';
  const aircraftType = (row.aircraft_type || '').toLowerCase();

  // Map aircraft_type to drone_type categories
  let droneType = 'multirotor';
  if (aircraftType.includes('fixed-wing') || aircraftType.includes('fixed wing')) {
    droneType = aircraftType.includes('vtol') ? 'vtol' : 'fixed-wing';
  } else if (aircraftType.includes('vtol')) {
    droneType = 'vtol';
  }

  // Convert max_speed from km/h to m/s
  const maxSpeedMs = row.max_speed_kmh ? Math.round(row.max_speed_kmh / 3.6) : 0;

  // Infer sensors from sensor_1 and sensor_2 fields
  const sensorText = `${row.sensor_1 || ''} ${row.sensor_2 || ''}`.toLowerCase();
  const hasThermal = sensorText.includes('thermal') || sensorText.includes('ir');
  const hasRTK = sensorText.includes('rtk');
  const hasLidar = sensorText.includes('lidar');

  return {
    id: row.id,
    name: row.product_name,
    manufacturer,
    model: row.product_name,
    mtom: Number(row.mtow_kg) || 0,
    characteristicDimension: Number(row.wingspan_m) || 0,
    maxSpeed: maxSpeedMs,
    categoryClass: row.c_class || 'C0',
    easaCategory: row.easa_type_certificate ? 'Specific' : 'Open',
    supportsBVLOS: row.bvlos_ready ?? false,
    maxAltitude: 120,
    maxFlightTime: Number(row.endurance_minutes) || 0,
    propulsion: 'elektrisk',
    hasRemoteId: true,
    hasThermal,
    hasParachute: false,
    hasRTK: hasRTK,
    payloadKg: Number(row.payload_kg) || 0,
    notes: [
      row.category,
      row.ip_rating ? `IP: ${row.ip_rating}` : '',
      row.wind_resistance_ms ? `Vindmotstand: ${row.wind_resistance_ms} m/s` : '',
      row.launch_method ? `Launch: ${row.launch_method}` : '',
      country ? `Land: ${country}` : '',
      row.range_km ? `Rekkevidde: ${row.range_km} km` : '',
    ].filter(Boolean).join(' · '),
    // Extra fields for analysis
    countryOfManufacturer: country,
    droneType,
    rangeKm: Number(row.range_km) || 0,
    windResistanceMs: Number(row.wind_resistance_ms) || 0,
    ipRating: row.ip_rating || '',
    launchMethod: row.launch_method || '',
    sourceUrl: row.source_url || '',
    priceEur: row.price_eur,
  } as DroneSpec & Record<string, any>;
}

export function useDronePlatforms() {
  const [drones, setDrones] = useState<DroneSpec[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Fetch from both sources in parallel
    const fetchLocal = supabase
      .from("drone_platforms")
      .select("*")
      .order("name");

    const fetchExternal = dmaClient
      .from("products")
      .select("*, manufacturers(name, country)")
      .order("product_name");

    Promise.all([fetchLocal, fetchExternal]).then(([localResult, externalResult]) => {
      const localDrones = (localResult.data && !localResult.error)
        ? localResult.data.map(rowToDroneSpec)
        : [];

      const externalDrones = (externalResult.data && !externalResult.error)
        ? externalResult.data.map(externalRowToDroneSpec)
        : [];

      // Merge: external drones that don't duplicate local ones (by name similarity)
      const localNames = new Set(localDrones.map(d => d.name.toLowerCase()));
      const uniqueExternal = externalDrones.filter(d =>
        !localNames.has(d.name.toLowerCase())
      );

      setDrones([...localDrones, ...uniqueExternal]);
      setLoading(false);
    });
  }, []);

  return { drones, loading };
}

export { rowToDroneSpec };
