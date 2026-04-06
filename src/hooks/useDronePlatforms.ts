import { useState, useEffect } from "react";
import { createClient } from "@supabase/supabase-js";
import type { DroneSpec } from "@/data/droneDatabase";

// External drone database (DMA Library)
const dmaClient = createClient(
  "https://mlrvjprgiookaiiohhkg.supabase.co",
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1scnZqcHJnaW9va2FpaW9oaGtnIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzUyMzE5NDEsImV4cCI6MjA5MDgwNzk0MX0.etqIrK9By1lJAV7Ypz-3uNokNp2XiD11HTbOalO3xYk"
);

function externalRowToDroneSpec(row: any): DroneSpec {
  const manufacturer = row.manufacturers?.name || 'Ukjent';
  const country = row.manufacturers?.country || '';
  const aircraftType = (row.aircraft_type || '').toLowerCase();

  let droneType = 'multirotor';
  if (aircraftType.includes('fixed-wing') || aircraftType.includes('fixed wing')) {
    droneType = aircraftType.includes('vtol') ? 'vtol' : 'fixed-wing';
  } else if (aircraftType.includes('vtol')) {
    droneType = 'vtol';
  }

  const maxSpeedMs = row.max_speed_kmh ? Math.round(row.max_speed_kmh / 3.6) : 0;

  const sensorText = `${row.sensor_1 || ''} ${row.sensor_2 || ''}`.toLowerCase();
  const hasThermal = sensorText.includes('thermal') || sensorText.includes('ir');
  const hasRTK = sensorText.includes('rtk');

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
    hasRTK,
    payloadKg: Number(row.payload_kg) || 0,
    notes: [
      row.category,
      row.ip_rating ? `IP: ${row.ip_rating}` : '',
      row.wind_resistance_ms ? `Vindmotstand: ${row.wind_resistance_ms} m/s` : '',
      row.launch_method ? `Launch: ${row.launch_method}` : '',
      country ? `Land: ${country}` : '',
      row.range_km ? `Rekkevidde: ${row.range_km} km` : '',
    ].filter(Boolean).join(' · '),
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
    dmaClient
      .from("products")
      .select("*, manufacturers(name, country)")
      .order("product_name")
      .then(({ data, error }) => {
        if (data && !error) {
          setDrones(data.map(externalRowToDroneSpec));
        }
        setLoading(false);
      });
  }, []);

  return { drones, loading };
}
