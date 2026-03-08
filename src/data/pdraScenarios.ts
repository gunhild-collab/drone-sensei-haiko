// Pre-defined risk assessments / standard scenarios
export interface PdraScenario {
  id: string;
  name: string;
  description: string;
  conditions: {
    maxMtom?: number;
    operationType: ('VLOS' | 'BVLOS')[];
    maxAltitude?: number;
    populationDensity: string[];
    maxCharDim?: number;
  };
  sailLevel: string;
}

export const PDRA_SCENARIOS: PdraScenario[] = [
  {
    id: 'STS-01',
    name: 'STS-01 – VLOS over kontrollert bakkeområde',
    description: 'Standard scenario for VLOS-operasjoner over kontrollert/tynt befolket område med drone ≤ 25 kg og C5-klasse.',
    conditions: {
      maxMtom: 25,
      operationType: ['VLOS'],
      maxAltitude: 120,
      populationDensity: ['controlled', 'sparsely'],
      maxCharDim: 3,
    },
    sailLevel: 'II',
  },
  {
    id: 'STS-02',
    name: 'STS-02 – BVLOS over tynt befolket område',
    description: 'Standard scenario for BVLOS i tynt befolket/kontrollert område. Krev C6-klasse drone med detect-and-avoid.',
    conditions: {
      maxMtom: 25,
      operationType: ['BVLOS'],
      maxAltitude: 120,
      populationDensity: ['controlled', 'sparsely'],
      maxCharDim: 3,
    },
    sailLevel: 'IV',
  },
  {
    id: 'PDRA-G01',
    name: 'PDRA-G01 – VLOS, tynt befolket, lav risiko',
    description: 'Forhåndsdefinert risikovurdering for VLOS i tynt befolket område. SAIL I–II.',
    conditions: {
      maxMtom: 25,
      operationType: ['VLOS'],
      maxAltitude: 120,
      populationDensity: ['sparsely'],
      maxCharDim: 3,
    },
    sailLevel: 'II',
  },
  {
    id: 'PDRA-G02',
    name: 'PDRA-G02 – BVLOS, tynt befolket',
    description: 'Forhåndsdefinert risikovurdering for BVLOS i tynt befolket. SAIL III–IV.',
    conditions: {
      maxMtom: 25,
      operationType: ['BVLOS'],
      maxAltitude: 120,
      populationDensity: ['sparsely'],
      maxCharDim: 3,
    },
    sailLevel: 'IV',
  },
  {
    id: 'PDRA-S01',
    name: 'PDRA-S01 – VLOS, befolket område',
    description: 'Forhåndsdefinert risikovurdering for VLOS over befolket område. SAIL II.',
    conditions: {
      maxMtom: 4,
      operationType: ['VLOS'],
      maxAltitude: 120,
      populationDensity: ['populated'],
      maxCharDim: 1,
    },
    sailLevel: 'II',
  },
];

export function matchPdraScenarios(
  mtom: number,
  charDim: number,
  operationType: string,
  altitude: number,
  populationDensity: string
): PdraScenario[] {
  return PDRA_SCENARIOS.filter(s => {
    const c = s.conditions;
    if (c.maxMtom && mtom > c.maxMtom) return false;
    if (c.maxCharDim && charDim > c.maxCharDim) return false;
    if (!c.operationType.includes(operationType as any)) return false;
    if (c.maxAltitude && altitude > c.maxAltitude) return false;
    if (!c.populationDensity.includes(populationDensity)) return false;
    return true;
  });
}
