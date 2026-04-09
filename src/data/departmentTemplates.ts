// Standard department templates for Norwegian municipalities
// Used as basis for AI-generated department lists

export interface DepartmentTemplate {
  id: string;
  name: string;
  icon: string; // lucide icon name
  minPopulation: number; // minimum population for relevance
  relevantUseCaseIds: string[];
  description: string;
}

export const DEPARTMENT_TEMPLATES: DepartmentTemplate[] = [
  {
    id: "dept-brann",
    name: "Brann og redning",
    icon: "Flame",
    minPopulation: 0,
    relevantUseCaseIds: ["UC-001", "UC-002", "UC-003", "UC-004", "UC-005"],
    description: "Situasjonsbevissthet, søk og redning, skogbrann, skadedokumentasjon",
  },
  {
    id: "dept-vei",
    name: "Tekniske tjenester - Vei",
    icon: "Route",
    minPopulation: 0,
    relevantUseCaseIds: ["UC-006", "UC-007", "UC-008", "UC-009", "UC-010"],
    description: "Veiinspeksjon, broinspeksjon, tunneler, vinterforhold",
  },
  {
    id: "dept-va",
    name: "Vann og avløp",
    icon: "Droplets",
    minPopulation: 0,
    relevantUseCaseIds: ["UC-011", "UC-012", "UC-013", "UC-014"],
    description: "Rørinspeksjon, reservoar, flomkartlegging, lekkasjedeteksjon",
  },
  {
    id: "dept-bygg",
    name: "Byggesak / Eiendom",
    icon: "Building2",
    minPopulation: 2000,
    relevantUseCaseIds: ["UC-015", "UC-016", "UC-017", "UC-018"],
    description: "Takdokumentasjon, byggesakskontroll, plan/regulering, kulturminner",
  },
  {
    id: "dept-natur",
    name: "Naturforvaltning",
    icon: "TreePine",
    minPopulation: 0,
    relevantUseCaseIds: ["UC-019", "UC-020", "UC-021", "UC-022", "UC-023", "UC-024"],
    description: "Vegetasjon, kystlinje, skog, skred, vilttelling, jordbruk",
  },
  {
    id: "dept-helse",
    name: "Helse og omsorg",
    icon: "Heart",
    minPopulation: 5000,
    relevantUseCaseIds: ["UC-025", "UC-026"],
    description: "AED-levering, medisinlevering til avsidesliggende steder",
  },
  {
    id: "dept-plan",
    name: "Plan og utvikling",
    icon: "Map",
    minPopulation: 5000,
    relevantUseCaseIds: ["UC-017", "UC-028", "UC-029"],
    description: "Arealplan, 3D-modellering, fremdriftsdokumentasjon",
  },
  {
    id: "dept-miljo",
    name: "Miljø og klima",
    icon: "Leaf",
    minPopulation: 10000,
    relevantUseCaseIds: ["UC-019", "UC-020", "UC-022", "UC-030"],
    description: "Miljøovervåkning, forurensning, klimatilpasning",
  },
  {
    id: "dept-landbruk",
    name: "Landbruk",
    icon: "Wheat",
    minPopulation: 0,
    relevantUseCaseIds: ["UC-024"],
    description: "Tilskuddskontroll, SMIL/RMP, driveplikt, nydyrking, skogbruk, NDVI",
  },
];

/**
 * Get suggested departments based on municipality population
 */
export function getSuggestedDepartments(population: number): DepartmentTemplate[] {
  return DEPARTMENT_TEMPLATES.filter(d => population >= d.minPopulation);
}
