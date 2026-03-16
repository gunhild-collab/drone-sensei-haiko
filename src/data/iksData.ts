// IKS (Interkommunalt selskap) samarbeid for brannvesen i Norge
// Kilde: DSB, statsforvalteren og kommunale nettsider

export interface IKSPartnership {
  id: string;
  name: string;
  municipalities: string[];
  type: 'brann' | 'beredskap' | 'brann_beredskap';
  region: string;
}

export const IKS_PARTNERSHIPS: IKSPartnership[] = [
  // Viken / Akershus / Buskerud
  { id: "iks-5", name: "Follo brannvesen IKS", municipalities: ["Nordre Follo", "Ås", "Frogn", "Nesodden", "Vestby"], type: "brann", region: "Viken" },
  { id: "iks-6", name: "Drammensregionens brannvesen IKS", municipalities: ["Drammen", "Lier", "Nedre Eiker", "Sande", "Svelvik"], type: "brann", region: "Viken" },
  { id: "iks-9", name: "Nedre Romerike brann- og redningsvesen IKS", municipalities: ["Lillestrøm", "Lørenskog", "Rælingen", "Nittedal", "Aurskog-Høland", "Enebakk"], type: "brann", region: "Viken" },
  { id: "iks-10", name: "Hallingdal brann- og redningsteneste IKS", municipalities: ["Gol", "Hemsedal", "Ål", "Hol", "Flå", "Nes"], type: "brann", region: "Viken" },
  { id: "iks-21", name: "Kongsberg brann og redning", municipalities: ["Kongsberg", "Flesberg", "Rollag", "Nore og Uvdal"], type: "brann", region: "Viken" },
  { id: "iks-22", name: "Ringerike brann og redningstjeneste", municipalities: ["Ringerike", "Hole", "Jevnaker"], type: "brann", region: "Viken" },
  { id: "iks-26", name: "Øvre Romerike brann og redning IKS", municipalities: ["Ullensaker", "Eidsvoll", "Nannestad", "Gjerdrum", "Hurdal", "Nes"], type: "brann", region: "Viken" },
  { id: "iks-27", name: "Asker og Bærum brann og redning IKS", municipalities: ["Asker", "Bærum"], type: "brann", region: "Viken" },
  { id: "iks-28", name: "Mosseregionens interkommunale brann og redning", municipalities: ["Moss", "Råde", "Våler", "Rygge"], type: "brann", region: "Viken" },
  { id: "iks-29", name: "Indre Østfold brannvesen", municipalities: ["Indre Østfold", "Marker", "Skiptvet", "Rakkestad"], type: "brann", region: "Viken" },
  
  // Innlandet
  { id: "iks-1", name: "Midt-Hedmark brann- og redningsvesen IKS", municipalities: ["Elverum", "Våler", "Åmot", "Trysil", "Stor-Elvdal", "Engerdal"], type: "brann", region: "Innlandet" },
  { id: "iks-23", name: "Valdres brannvesen", municipalities: ["Nord-Aurdal", "Sør-Aurdal", "Vestre Slidre", "Øystre Slidre", "Etnedal", "Vang"], type: "brann", region: "Innlandet" },
  { id: "iks-24", name: "Gjøvik brann og redning", municipalities: ["Gjøvik", "Østre Toten", "Vestre Toten", "Nordre Land", "Søndre Land"], type: "brann", region: "Innlandet" },
  { id: "iks-25", name: "Lillehammer region brannvesen", municipalities: ["Lillehammer", "Gausdal", "Øyer", "Ringebu"], type: "brann", region: "Innlandet" },
  { id: "iks-30", name: "Hadeland brannvesen", municipalities: ["Gran", "Lunner", "Jevnaker"], type: "brann", region: "Innlandet" },
  { id: "iks-31", name: "Nord-Østerdal brannvesen", municipalities: ["Tynset", "Alvdal", "Folldal", "Os", "Tolga", "Rendalen"], type: "brann", region: "Innlandet" },
  { id: "iks-32", name: "Glåmdal brannvesen IKS", municipalities: ["Kongsvinger", "Grue", "Eidskog", "Sør-Odal", "Nord-Odal", "Åsnes"], type: "brann", region: "Innlandet" },

  // Vestfold og Telemark
  { id: "iks-18", name: "Vest-Telemark brannvesen", municipalities: ["Seljord", "Kviteseid", "Nissedal", "Fyresdal", "Tokke", "Vinje"], type: "brann", region: "Vestfold og Telemark" },
  { id: "iks-19", name: "Grenland brann og redning IKS", municipalities: ["Skien", "Porsgrunn", "Bamble", "Siljan", "Drangedal"], type: "brann", region: "Vestfold og Telemark" },
  { id: "iks-20", name: "Vestfold Interkommunale Brannvesen", municipalities: ["Tønsberg", "Færder", "Holmestrand", "Horten", "Re"], type: "brann", region: "Vestfold og Telemark" },
  { id: "iks-33", name: "Midt-Telemark brannvesen", municipalities: ["Midt-Telemark", "Nome", "Notodden"], type: "brann", region: "Vestfold og Telemark" },

  // Agder
  { id: "iks-4", name: "Kristiansandsregionen brann og redning IKS", municipalities: ["Kristiansand", "Vennesla", "Birkenes", "Lillesand", "Iveland"], type: "brann", region: "Agder" },
  { id: "iks-11", name: "Østre Agder brannvesen IKS", municipalities: ["Arendal", "Froland", "Åmli", "Grimstad", "Tvedestrand", "Risør", "Gjerstad", "Vegårshei"], type: "brann", region: "Agder" },
  { id: "iks-34", name: "Setesdal brannvesen IKS", municipalities: ["Valle", "Bygland", "Evje og Hornnes", "Bykle"], type: "brann", region: "Agder" },
  { id: "iks-35", name: "Lister brannvesen", municipalities: ["Farsund", "Flekkefjord", "Lyngdal", "Hægebostad", "Kvinesdal", "Sirdal"], type: "brann", region: "Agder" },

  // Rogaland
  { id: "iks-3", name: "Rogaland brann og redning IKS", municipalities: ["Stavanger", "Sandnes", "Sola", "Randaberg", "Strand", "Gjesdal", "Kvitsøy", "Hjelmeland"], type: "brann", region: "Rogaland" },
  { id: "iks-36", name: "Haugaland brann og redning IKS", municipalities: ["Haugesund", "Karmøy", "Tysvær", "Bokn", "Vindafjord", "Sveio", "Etne"], type: "brann", region: "Rogaland" },

  // Vestland
  { id: "iks-13", name: "Bergen brannvesen", municipalities: ["Bergen", "Askøy", "Øygarden", "Bjørnafjorden", "Osterøy", "Samnanger", "Vaksdal"], type: "brann", region: "Vestland" },
  { id: "iks-37", name: "Nordhordland brann og redning IKS", municipalities: ["Alver", "Austrheim", "Fedje", "Gulen", "Masfjorden", "Modalen"], type: "brann", region: "Vestland" },
  { id: "iks-38", name: "Hardanger og Voss brannvesen", municipalities: ["Voss", "Ullensvang", "Eidfjord", "Ulvik", "Kvam"], type: "brann", region: "Vestland" },
  { id: "iks-39", name: "Sogn brann og redning IKS", municipalities: ["Sogndal", "Luster", "Aurland", "Lærdal", "Vik", "Høyanger", "Balestrand"], type: "brann", region: "Vestland" },
  { id: "iks-40", name: "Sunnfjord brann og redning", municipalities: ["Sunnfjord", "Kinn", "Bremanger", "Askvoll", "Fjaler", "Hyllestad", "Solund"], type: "brann", region: "Vestland" },

  // Møre og Romsdal
  { id: "iks-16", name: "Ålesund brannvesen KF", municipalities: ["Ålesund", "Giske", "Sula", "Fjord"], type: "brann", region: "Møre og Romsdal" },
  { id: "iks-17", name: "Molde brann og redningstjeneste", municipalities: ["Molde", "Rauma", "Aukra", "Hustadvika"], type: "brann", region: "Møre og Romsdal" },
  { id: "iks-41", name: "Kristiansund og Nordmøre brannvesen", municipalities: ["Kristiansund", "Averøy", "Gjemnes", "Tingvoll", "Sunndal", "Surnadal", "Smøla", "Aure"], type: "brann", region: "Møre og Romsdal" },

  // Trøndelag
  { id: "iks-8", name: "Trøndelag brann- og redningstjeneste IKS", municipalities: ["Trondheim", "Malvik", "Klæbu", "Melhus", "Midtre Gauldal", "Skaun"], type: "brann", region: "Trøndelag" },
  { id: "iks-14", name: "Innherred brann og redning", municipalities: ["Verdal", "Levanger", "Inderøy", "Snåsa"], type: "brann", region: "Trøndelag" },
  { id: "iks-15", name: "Namdal brann- og redningsvesen", municipalities: ["Namsos", "Overhalla", "Grong", "Høylandet", "Lierne", "Røyrvik", "Flatanger"], type: "brann", region: "Trøndelag" },
  { id: "iks-42", name: "Fosen brann og redningstjeneste IKS", municipalities: ["Ørland", "Åfjord", "Indre Fosen", "Osen", "Roan"], type: "brann", region: "Trøndelag" },

  // Nordland
  { id: "iks-2", name: "Salten Brann IKS", municipalities: ["Bodø", "Fauske", "Saltdal", "Beiarn", "Gildeskål", "Meløy", "Sørfold", "Steigen", "Hamarøy"], type: "brann", region: "Nordland" },
  { id: "iks-43", name: "Helgeland brann og redning", municipalities: ["Rana", "Hemnes", "Nesna", "Lurøy"], type: "brann", region: "Nordland" },
  { id: "iks-44", name: "Ofoten brann IKS", municipalities: ["Narvik", "Evenes", "Ballangen", "Tysfjord"], type: "brann", region: "Nordland" },
  { id: "iks-45", name: "Lofoten brann og redning", municipalities: ["Vestvågøy", "Vågan", "Flakstad", "Moskenes", "Røst", "Værøy"], type: "brann", region: "Nordland" },
  { id: "iks-46", name: "Vesterålen brann og redning", municipalities: ["Sortland", "Hadsel", "Bø", "Øksnes", "Andøy"], type: "brann", region: "Nordland" },

  // Troms
  { id: "iks-7", name: "Tromsø brann og redning", municipalities: ["Tromsø", "Karlsøy", "Balsfjord"], type: "brann", region: "Troms" },
  { id: "iks-12", name: "Midt-Troms brann og redning", municipalities: ["Harstad", "Kvæfjord", "Ibestad", "Lavangen", "Salangen", "Gratangen"], type: "brann", region: "Troms" },
  { id: "iks-47", name: "Nord-Troms brannvesen", municipalities: ["Nordreisa", "Skjervøy", "Kvænangen", "Kåfjord", "Storfjord", "Lyngen"], type: "brann", region: "Troms" },
  { id: "iks-48", name: "Senja brann og redning", municipalities: ["Senja", "Dyrøy", "Tjeldsund"], type: "brann", region: "Troms" },

  // Finnmark
  { id: "iks-49", name: "Hammerfest brann og redning", municipalities: ["Hammerfest", "Kvalsund", "Måsøy"], type: "brann", region: "Finnmark" },
  { id: "iks-50", name: "Varanger brannvesen IKS", municipalities: ["Vadsø", "Vardø", "Nesseby", "Båtsfjord", "Berlevåg"], type: "brann", region: "Finnmark" },
  { id: "iks-51", name: "Alta brann og redning", municipalities: ["Alta", "Loppa", "Hasvik"], type: "brann", region: "Finnmark" },
  { id: "iks-52", name: "Tana og Sør-Varanger brannvesen", municipalities: ["Tana", "Sør-Varanger", "Lebesby", "Gamvik"], type: "brann", region: "Finnmark" },
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
