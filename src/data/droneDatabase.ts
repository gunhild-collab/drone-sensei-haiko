// Hardcoded drone database — will connect to Airtable later
export interface DroneSpec {
  id: string;
  name: string;
  manufacturer: string;
  model: string;
  mtom: number; // kg
  characteristicDimension: number; // m
  maxSpeed: number; // m/s
  categoryClass: string; // C0–C6
  supportsBVLOS: boolean;
  maxFlightTime: number; // min
  propulsion: 'elektrisk' | 'hybrid' | 'forbrenning';
  hasRemoteId: boolean;
}

export const DRONE_DATABASE: DroneSpec[] = [
  {
    id: 'dji-mini-4-pro',
    name: 'DJI Mini 4 Pro',
    manufacturer: 'DJI',
    model: 'Mini 4 Pro',
    mtom: 0.249,
    characteristicDimension: 0.298,
    maxSpeed: 16,
    categoryClass: 'C0',
    supportsBVLOS: false,
    maxFlightTime: 34,
    propulsion: 'elektrisk',
    hasRemoteId: true,
  },
  {
    id: 'dji-mavic-3-enterprise',
    name: 'DJI Mavic 3 Enterprise',
    manufacturer: 'DJI',
    model: 'Mavic 3 Enterprise',
    mtom: 1.05,
    characteristicDimension: 0.43,
    maxSpeed: 21,
    categoryClass: 'C2',
    supportsBVLOS: false,
    maxFlightTime: 45,
    propulsion: 'elektrisk',
    hasRemoteId: true,
  },
  {
    id: 'dji-matrice-350-rtk',
    name: 'DJI Matrice 350 RTK',
    manufacturer: 'DJI',
    model: 'Matrice 350 RTK',
    mtom: 6.47,
    characteristicDimension: 0.81,
    maxSpeed: 23,
    categoryClass: 'C4',
    supportsBVLOS: true,
    maxFlightTime: 55,
    propulsion: 'elektrisk',
    hasRemoteId: true,
  },
  {
    id: 'dji-m30t',
    name: 'DJI M30T',
    manufacturer: 'DJI',
    model: 'M30T',
    mtom: 3.77,
    characteristicDimension: 0.67,
    maxSpeed: 23,
    categoryClass: 'C3',
    supportsBVLOS: true,
    maxFlightTime: 41,
    propulsion: 'elektrisk',
    hasRemoteId: true,
  },
  {
    id: 'parrot-anafi-usa',
    name: 'Parrot ANAFI USA',
    manufacturer: 'Parrot',
    model: 'ANAFI USA',
    mtom: 0.5,
    characteristicDimension: 0.32,
    maxSpeed: 15,
    categoryClass: 'C1',
    supportsBVLOS: false,
    maxFlightTime: 32,
    propulsion: 'elektrisk',
    hasRemoteId: true,
  },
  {
    id: 'autel-evo-ii-pro',
    name: 'Autel EVO II Pro',
    manufacturer: 'Autel',
    model: 'EVO II Pro',
    mtom: 1.19,
    characteristicDimension: 0.4,
    maxSpeed: 20,
    categoryClass: 'C2',
    supportsBVLOS: false,
    maxFlightTime: 42,
    propulsion: 'elektrisk',
    hasRemoteId: true,
  },
  {
    id: 'wingtra-one-gen-ii',
    name: 'Wingtra One GEN II',
    manufacturer: 'Wingtra',
    model: 'One GEN II',
    mtom: 4.5,
    characteristicDimension: 1.25,
    maxSpeed: 16,
    categoryClass: 'C4',
    supportsBVLOS: true,
    maxFlightTime: 59,
    propulsion: 'elektrisk',
    hasRemoteId: true,
  },
  {
    id: 'sensefly-ebee-x',
    name: 'senseFly eBee X',
    manufacturer: 'senseFly',
    model: 'eBee X',
    mtom: 1.6,
    characteristicDimension: 1.16,
    maxSpeed: 11,
    categoryClass: 'C3',
    supportsBVLOS: true,
    maxFlightTime: 90,
    propulsion: 'elektrisk',
    hasRemoteId: true,
  },
];
