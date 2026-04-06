import { useState, useEffect } from "react";
import { createClient } from "@supabase/supabase-js";

const dmaClient = createClient(
  "https://mlrvjprgiookaiiohhkg.supabase.co",
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1scnZqcHJnaW9va2FpaW9oaGtnIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzUyMzE5NDEsImV4cCI6MjA5MDgwNzk0MX0.etqIrK9By1lJAV7Ypz-3uNokNp2XiD11HTbOalO3xYk"
);

export interface SoftwareProduct {
  id: string;
  name: string;
  category: string;
  subcategory: string | null;
  deployment: string | null;
  pricing_model: string | null;
  price_eur_year: number | null;
  quote_required: boolean | null;
  open_source: boolean;
  api_available: boolean;
  key_features: string[] | null;
  vendor_name: string;
  vendor_country: string;
  also_manufacturer_id: string | null;
}

// Maps use-case departments to software categories
export const DEPT_SOFTWARE_MAP: Record<string, string[]> = {
  "Kartlegging": ["photogrammetry", "gis_integration"],
  "VA": ["photogrammetry", "gis_integration"],
  "Plan": ["photogrammetry", "gis_integration"],
  "Plan og geodata": ["photogrammetry", "gis_integration"],
  "Vann og avløp": ["photogrammetry", "gis_integration"],
  "Inspeksjon": ["inspection_analytics", "digital_twin"],
  "Bygg": ["inspection_analytics", "digital_twin"],
  "Bygg og eiendom": ["inspection_analytics", "digital_twin"],
  "Vei": ["inspection_analytics", "digital_twin"],
  "Vei og transport": ["inspection_analytics", "digital_twin"],
  "Brann": ["mission_control", "thermal_analysis"],
  "Brann og redning": ["mission_control", "thermal_analysis"],
  "Beredskap": ["mission_control", "thermal_analysis"],
  "Landbruk": ["agriculture"],
  "Jordbruk": ["agriculture"],
  "Miljø": ["photogrammetry", "gis_integration"],
  "Miljø og naturforvaltning": ["photogrammetry", "gis_integration"],
  "Helse": ["mission_control", "fleet_management"],
  "Helse og omsorg": ["mission_control", "fleet_management"],
};

const EUR_TO_NOK = 11.5;

export function useSoftwareStack() {
  const [software, setSoftware] = useState<SoftwareProduct[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    dmaClient
      .from("software")
      .select("*, software_vendors(name, country, also_manufacturer_id)")
      .order("name")
      .then(({ data, error }) => {
        if (data && !error) {
          setSoftware(
            data.map((row: any) => ({
              id: row.id,
              name: row.name,
              category: row.category,
              subcategory: row.subcategory,
              deployment: row.deployment,
              pricing_model: row.pricing_model,
              price_eur_year: row.price_eur_year,
              quote_required: row.quote_required,
              open_source: row.open_source ?? false,
              api_available: row.api_available ?? false,
              key_features: row.key_features,
              vendor_name: row.software_vendors?.name || "Ukjent",
              vendor_country: row.software_vendors?.country || "",
              also_manufacturer_id: row.software_vendors?.also_manufacturer_id,
            }))
          );
        }
        setLoading(false);
      });
  }, []);

  return { software, loading };
}

/** Get recommended software for a set of department names */
export function getRecommendedSoftware(
  allSoftware: SoftwareProduct[],
  departments: string[],
  fleetSize: number
): { byCategory: Record<string, SoftwareProduct>; totalEurYear: number; items: Array<{ label: string; sw: SoftwareProduct }> } {
  const neededCategories = new Set<string>();
  for (const dept of departments) {
    const cats = Object.entries(DEPT_SOFTWARE_MAP).find(([key]) =>
      dept.toLowerCase().includes(key.toLowerCase()) || key.toLowerCase().includes(dept.toLowerCase().split(" ")[0])
    );
    if (cats) cats[1].forEach(c => neededCategories.add(c));
  }

  // If >1 drone, add fleet management
  if (fleetSize > 1) neededCategories.add("fleet_management");
  // If any BVLOS use case, add UTM
  neededCategories.add("flight_planning");

  const byCategory: Record<string, SoftwareProduct> = {};
  const items: Array<{ label: string; sw: SoftwareProduct }> = [];

  const CATEGORY_LABELS: Record<string, string> = {
    photogrammetry: "Kartlegging/fotogrammetri",
    gis_integration: "GIS-integrasjon",
    inspection_analytics: "Inspeksjonsanalyse",
    digital_twin: "Digital tvilling",
    mission_control: "Oppdragsstyring",
    thermal_analysis: "Termisk analyse",
    agriculture: "Jordbruksanalyse",
    fleet_management: "Flåtestyring",
    flight_planning: "Flyplanlegging",
    utm_airspace: "UTM/Luftromstyring",
    data_processing: "Dataprosessering",
  };

  for (const cat of neededCategories) {
    const candidates = allSoftware.filter(s => s.category === cat);
    if (candidates.length === 0) continue;

    // Score: prefer European, open_source as alt, api_available, has price
    const scored = candidates.map(s => {
      let score = 0;
      const country = (s.vendor_country || "").toLowerCase();
      const isEuropean = ["switzerland", "germany", "france", "netherlands", "denmark", "finland", "norway", "sweden", "belgium", "italy", "spain", "united kingdom", "latvia", "international"].includes(country);
      if (isEuropean) score += 10;
      if (s.api_available) score += 3;
      if (s.price_eur_year !== null && s.price_eur_year > 0) score += 2;
      if (s.open_source) score += 1; // keep as alt
      return { sw: s, score };
    }).sort((a, b) => b.score - a.score);

    const best = scored[0]?.sw;
    if (best) {
      byCategory[cat] = best;
      items.push({ label: CATEGORY_LABELS[cat] || cat, sw: best });
    }
  }

  let totalEurYear = 0;
  for (const item of items) {
    if (item.sw.price_eur_year && item.sw.price_eur_year > 0) {
      totalEurYear += item.sw.price_eur_year;
    }
  }

  return { byCategory, totalEurYear, items };
}

export function formatSoftwarePrice(sw: SoftwareProduct): string {
  if (sw.open_source && (sw.price_eur_year === 0 || sw.price_eur_year === null)) return "Gratis (open source)";
  if (sw.quote_required) return "Tilbud";
  if (sw.price_eur_year && sw.price_eur_year > 0) return `~€${sw.price_eur_year.toLocaleString("nb-NO")}/år`;
  if (sw.pricing_model === "included") return "Inkludert";
  return "Tilbud";
}

export function formatSoftwarePriceNOK(sw: SoftwareProduct): string {
  if (sw.open_source && (sw.price_eur_year === 0 || sw.price_eur_year === null)) return "Gratis";
  if (sw.price_eur_year && sw.price_eur_year > 0) return `~${Math.round(sw.price_eur_year * EUR_TO_NOK).toLocaleString("nb-NO")} kr/år`;
  return "Tilbud";
}
