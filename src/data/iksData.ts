// IKS (Interkommunalt selskap) samarbeid for brannvesen i Norge
// Kilde: DSB og kommunale nettsider

export interface IKSPartnership {
  id: string;
  name: string;
  municipalities: string[];
  type: 'brann' | 'beredskap' | 'brann_beredskap';
  region: string;
}

export const IKS_PARTNERSHIPS: IKSPartnership[] = [
  { id: "iks-1", name: "Midt-Hedmark brann- og redningsvesen IKS", municipalities: ["Elverum", "Våler", "Åmot", "Trysil", "Stor-Elvdal", "Engerdal"], type: "brann", region: "Innlandet" },
  { id: "iks-2", name: "Salten Brann IKS", municipalities: ["Bodø", "Fauske", "Saltdal", "Beiarn", "Gildeskål", "Meløy", "Sørfold", "Steigen", "Hamarøy"], type: "brann", region: "Nordland" },
  { id: "iks-3", name: "Rogaland brann og redning IKS", municipalities: ["Stavanger", "Sandnes", "Sola", "Randaberg", "Strand", "Gjesdal", "Kvitsøy", "Hjelmeland"], type: "brann", region: "Rogaland" },
  { id: "iks-4", name: "Kristiansandsregionen brann og redning IKS", municipalities: ["Kristiansand", "Søgne", "Songdalen", "Vennesla", "Birkenes", "Lillesand", "Iveland"], type: "brann", region: "Agder" },
  { id: "iks-5", name: "Follo brannvesen IKS", municipalities: ["Nordre Follo", "Ås", "Frogn", "Nesodden", "Vestby"], type: "brann", region: "Viken" },
  { id: "iks-6", name: "Drammensregionens brannvesen IKS", municipalities: ["Drammen", "Lier", "Nedre Eiker", "Sande", "Svelvik"], type: "brann", region: "Viken" },
  { id: "iks-7", name: "Tromsø brann og redning", municipalities: ["Tromsø", "Karlsøy", "Balsfjord"], type: "brann", region: "Troms" },
  { id: "iks-8", name: "Trøndelag brann- og redningstjeneste IKS", municipalities: ["Trondheim", "Malvik", "Klæbu", "Melhus", "Midtre Gauldal", "Skaun"], type: "brann", region: "Trøndelag" },
  { id: "iks-9", name: "Nedre Romerike brann- og redningsvesen IKS", municipalities: ["Lillestrøm", "Lørenskog", "Rælingen", "Nittedal", "Aurskog-Høland", "Enebakk"], type: "brann", region: "Viken" },
  { id: "iks-10", name: "Hallingdal brann- og redningsteneste IKS", municipalities: ["Gol", "Hemsedal", "Ål", "Hol", "Flå", "Nes"], type: "brann", region: "Viken" },
  { id: "iks-11", name: "Østre Agder brannvesen IKS", municipalities: ["Arendal", "Froland", "Åmli", "Grimstad", "Tvedestrand", "Risør", "Gjerstad", "Vegårshei"], type: "brann", region: "Agder" },
  { id: "iks-12", name: "Midt-Troms brann og redning", municipalities: ["Harstad", "Kvæfjord", "Ibestad", "Lavangen", "Salangen", "Gratangen"], type: "brann", region: "Troms" },
  { id: "iks-13", name: "Bergen brannvesen", municipalities: ["Bergen", "Askøy", "Øygarden", "Bjørnafjorden", "Osterøy", "Samnanger", "Vaksdal"], type: "brann", region: "Vestland" },
  { id: "iks-14", name: "Innherred brann og redning", municipalities: ["Verdal", "Levanger", "Inderøy", "Snåsa"], type: "brann", region: "Trøndelag" },
  { id: "iks-15", name: "Namdal brann- og redningsvesen", municipalities: ["Namsos", "Overhalla", "Grong", "Høylandet", "Lierne", "Røyrvik", "Flatanger", "Fosnes"], type: "brann", region: "Trøndelag" },
  { id: "iks-16", name: "Ålesund brannvesen KF", municipalities: ["Ålesund", "Giske", "Sula", "Fjord"], type: "brann", region: "Møre og Romsdal" },
  { id: "iks-17", name: "Molde brann og redningstjeneste", municipalities: ["Molde", "Rauma", "Aukra", "Hustadvika"], type: "brann", region: "Møre og Romsdal" },
  { id: "iks-18", name: "Vest-Telemark brannvesen", municipalities: ["Seljord", "Kviteseid", "Nissedal", "Fyresdal", "Tokke", "Vinje"], type: "brann", region: "Vestfold og Telemark" },
  { id: "iks-19", name: "Grenland brann og redning IKS", municipalities: ["Skien", "Porsgrunn", "Bamble", "Siljan", "Drangedal"], type: "brann", region: "Vestfold og Telemark" },
  { id: "iks-20", name: "Vestfold Interkommunale Brannvesen", municipalities: ["Tønsberg", "Færder", "Holmestrand", "Horten", "Re"], type: "brann", region: "Vestfold og Telemark" },
  { id: "iks-21", name: "Kongsberg brann og redning", municipalities: ["Kongsberg", "Flesberg", "Rollag", "Nore og Uvdal"], type: "brann", region: "Viken" },
  { id: "iks-22", name: "Ringerike brann og redningstjeneste", municipalities: ["Ringerike", "Hole", "Jevnaker"], type: "brann", region: "Viken" },
  { id: "iks-23", name: "Valdres brannvesen", municipalities: ["Nord-Aurdal", "Sør-Aurdal", "Vestre Slidre", "Øystre Slidre", "Etnedal", "Vang"], type: "brann", region: "Innlandet" },
  { id: "iks-24", name: "Gjøvik brann og redning", municipalities: ["Gjøvik", "Østre Toten", "Vestre Toten", "Nordre Land", "Søndre Land"], type: "brann", region: "Innlandet" },
  { id: "iks-25", name: "Lillehammer region brannvesen", municipalities: ["Lillehammer", "Gausdal", "Øyer", "Ringebu"], type: "brann", region: "Innlandet" },
];

/**
 * Finn IKS-partnere for en gitt kommune
 */
export function findIKSPartners(municipalityName: string): IKSPartnership | null {
  const normalized = municipalityName.toLowerCase().trim();
  return IKS_PARTNERSHIPS.find(iks =>
    iks.municipalities.some(m => m.toLowerCase() === normalized)
  ) || null;
}

/**
 * Hent partnerkommuner (ekskluderer gjeldende kommune)
 */
export function getIKSPartnerMunicipalities(municipalityName: string): string[] {
  const iks = findIKSPartners(municipalityName);
  if (!iks) return [];
  return iks.municipalities.filter(m => m.toLowerCase() !== municipalityName.toLowerCase());
}
