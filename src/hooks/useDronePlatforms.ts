import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import type { DroneSpec } from "@/data/droneDatabase";

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

export function useDronePlatforms() {
  const [drones, setDrones] = useState<DroneSpec[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    supabase
      .from("drone_platforms")
      .select("*")
      .order("name")
      .then(({ data, error }) => {
        if (data && !error) {
          setDrones(data.map(rowToDroneSpec));
        }
        setLoading(false);
      });
  }, []);

  return { drones, loading };
}

export { rowToDroneSpec };
