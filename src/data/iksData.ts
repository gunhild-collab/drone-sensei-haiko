// Norge — 110-sentraler, brannvesen og kommunetilknytning (komplett 2026)
// Kilde: DSB, Haiko-research (Claude artifact c881710e)

// ─── 110-sentraler ───────────────────────────────────────────────────────────

export interface AlarmSentral {
  id: string;
  name: string;
  location: string;
  region: string;
  coLocated?: string; // e.g. "110, 112" or "110, 112, 113"
  isHaikoRegion?: boolean;
  isPrioritized?: boolean;
  notes?: string;
  fireDepartmentIds: string[];
}

export const ALARM_SENTRALER: AlarmSentral[] = [
  {
    id: "as-ost",
    name: "Øst 110-sentral IKS",
    location: "Ski, Akershus",
    region: "Øst",
    coLocated: "110, 112",
    isHaikoRegion: true,
    isPrioritized: false,
    notes: "ØRB er i dialog (Steinar Hofsrud). 29 kommuner, 10 brannvesen. Øst 110 eies av ØRB IKS, NRBR IKS, Follo IKS, Indre Østfold IKS, MOVAR IKS + enkeltkommuner.",
    fireDepartmentIds: ["fd-orb", "fd-nrbr", "fd-follo", "fd-indre-ostfold", "fd-movar", "fd-fredrikstad", "fd-sarpsborg", "fd-halden", "fd-aremark", "fd-hvaler"],
  },
  {
    id: "as-oslo",
    name: "Oslo brann- og redningsetat (110 Oslo)",
    location: "Oslo",
    region: "Oslo",
    isPrioritized: true,
    notes: "Oslo 110 betjener Oslo + Asker/Bærum (samlokalisert med politiet). Potensielt marked fase 2.",
    fireDepartmentIds: ["fd-obre", "fd-abbr"],
  },
  {
    id: "as-innlandet",
    name: "Alarmsentral Brann Innlandet",
    location: "Hamar, Innlandet",
    region: "Innlandet",
    coLocated: "110, 112",
    isPrioritized: true,
    notes: "Dekker 46 kommuner i Innlandet (Hedmark og Oppland), 22 brannvesen, 62 stasjoner. Samlokalisert med politiet på Hamar.",
    fireDepartmentIds: ["fd-hedmarken", "fd-elverum", "fd-glamdal", "fd-gjovik", "fd-lillehammer", "fd-ringsaker", "fd-trysil", "fd-nord-osterdalen", "fd-gudbrandsdal", "fd-valdres", "fd-hadeland", "fd-toten"],
  },
  {
    id: "as-sor-ost",
    name: "Sør-Øst 110 IKS",
    location: "Tønsberg, Vestfold",
    region: "Sør-Øst",
    coLocated: "110, 112",
    notes: "Dekker 42 kommuner i Vestfold, Telemark og Buskerud. 23 brannvesen, 54 stasjoner, ca. 710 000 innbyggere.",
    fireDepartmentIds: ["fd-drbv", "fd-hallingdal", "fd-kongsberg", "fd-ringerike", "fd-grenland", "fd-midt-telemark", "fd-vest-telemark", "fd-numedal", "fd-nedre-telemark", "fd-vib", "fd-bsv-vestfold", "fd-jevnaker"],
  },
  {
    id: "as-agder",
    name: "110 Agder IKS",
    location: "Kristiansand, Agder",
    region: "Agder",
    coLocated: "110, 112, 113",
    notes: "6 brannvesen, 24 kommuner. Samlokalisert med politi og AMK i Kristiansand.",
    fireDepartmentIds: ["fd-kbr", "fd-bvs-agder", "fd-flekkefjord", "fd-grimstad", "fd-setesdal", "fd-oabv"],
  },
  {
    id: "as-sor-vest",
    name: "110 Sør-Vest (Alarmsentral Brann Sør-Vest)",
    location: "Sandnes, Rogaland",
    region: "Sør-Vest",
    notes: "Dekker 29 kommuner: 23 i Rogaland, 5 i Vestland og Sirdal (Agder). Avdeling i Rogaland brann og redning IKS.",
    fireDepartmentIds: ["fd-rogaland", "fd-haugaland", "fd-eigersund", "fd-bjerkreim", "fd-ha", "fd-hjelmeland", "fd-etne", "fd-fitjar-sv", "fd-stord-sv", "fd-bomlo-sv", "fd-lund", "fd-sirdal"],
  },
  {
    id: "as-vest",
    name: "110 Vest — Bergen brannvesen",
    location: "Bergen, Vestland",
    region: "Vest",
    notes: "33 brannvesen, 94 stasjoner, ca. 600 000 innbyggere i nesten hele Vestland fylke. Bergen er vertskommune.",
    fireDepartmentIds: ["fd-bergen", "fd-oygarden", "fd-askoy", "fd-nordhordland", "fd-bjornafjorden", "fd-austevoll", "fd-stord-vest", "fd-fitjar-vest", "fd-bomlo-vest", "fd-kvam", "fd-samnanger", "fd-kvinnherad", "fd-tysnes", "fd-ullensvang", "fd-eidfjord", "fd-ulvik", "fd-voss", "fd-sogndal", "fd-sunnfjord", "fd-kinn"],
  },
  {
    id: "as-more-romsdal",
    name: "Møre og Romsdal 110-sentral KF",
    location: "Ålesund, Møre og Romsdal",
    region: "Møre og Romsdal",
    coLocated: "110, 112",
    notes: "Dekker alle 26 kommuner i fylket, 79 brannstasjoner, ca. 265 500 innbyggere. KF eid av Ålesund kommune.",
    fireDepartmentIds: ["fd-alesund", "fd-nibt", "fd-norbr", "fd-fjord", "fd-hareid-ulstein", "fd-heroy-mr", "fd-hustadvika", "fd-sande-mr", "fd-vanylven", "fd-volda", "fd-orsta"],
  },
  {
    id: "as-trondelag",
    name: "Midt-Norge 110-sentral IKS",
    location: "Trondheim, Trøndelag",
    region: "Trøndelag",
    notes: "Dekker 40 kommuner: Trøndelag + Os (Innlandet) + Bindal (Nordland). 82 stasjoner, ca. 472 000 innbyggere. Verdal og Steinkjer er potensielle pilotkunder (Green Flyway-intro).",
    fireDepartmentIds: ["fd-tbrt", "fd-brannvesenet-midt", "fd-fosen", "fd-gauldal", "fd-steinkjer", "fd-snasa", "fd-lierne", "fd-namsos", "fd-namdaleid", "fd-flatanger", "fd-grong", "fd-bindal", "fd-os-innlandet"],
  },
  {
    id: "as-nordland",
    name: "Salten Brann IKS (110 Nordland)",
    location: "Bodø, Nordland",
    region: "Nordland",
    coLocated: "110, 112, 113",
    notes: "Salten Brann IKS er 110-operatør for hele distriktet. Dekker hele Nordland fylke minus Bindal (Midt-Norge).",
    fireDepartmentIds: ["fd-salten", "fd-rana", "fd-vefsn-grane-heroy", "fd-ytre-helgeland", "fd-narvik", "fd-vesteralen", "fd-lofoten", "fd-evenes-tjeldsund", "fd-bronnoy"],
  },
  {
    id: "as-troms",
    name: "Tromsø 110-sentral",
    location: "Tromsø, Troms",
    region: "Troms",
    notes: "Målselv Brann er i Haikos pipeline (Kenneth Molund). Troms politidistrikt.",
    fireDepartmentIds: ["fd-tromso", "fd-harstad", "fd-senja-lenvik", "fd-malselv", "fd-balsfjord", "fd-bardu", "fd-dyroy", "fd-salangen", "fd-lavangen", "fd-gratangen", "fd-ibestad", "fd-storfjord", "fd-kafjord", "fd-lyngen", "fd-kvaefjord", "fd-torsken"],
  },
  {
    id: "as-finnmark",
    name: "110-sentralen for Finnmark",
    location: "Kirkenes, Finnmark",
    region: "Finnmark",
    coLocated: "110, 112, 113",
    notes: "15 kommuner. Spredt geografi. Samlokalisert 110/112/113. Ikke prioritert marked fase 1.",
    fireDepartmentIds: ["fd-alta", "fd-hammerfest", "fd-sor-varanger", "fd-vadso", "fd-vardo", "fd-kautokeino", "fd-karasjok", "fd-porsanger", "fd-gamvik", "fd-lebesby", "fd-berlevag", "fd-tana", "fd-nesseby", "fd-batsfjord", "fd-loppa"],
  },
];

// ─── Brannvesen (Fire Departments) ──────────────────────────────────────────

export type FireDepartmentType = 'IKS' | 'KF' | 'Enkelt';

export interface FireDepartment {
  id: string;
  name: string;
  shortName?: string;
  type: FireDepartmentType;
  municipalities: string[];
  region: string;
  alarmSentralId: string;
  isHaikoCustomer?: boolean;
  notes?: string;
}

export const FIRE_DEPARTMENTS: FireDepartment[] = [
  // ─── ØST ──────────────────────────────────────────────────────────
  { id: "fd-orb", name: "Øvre Romerike Brann og Redning IKS", shortName: "ØRB", type: "IKS", municipalities: ["Nes", "Ullensaker", "Nannestad", "Gjerdrum", "Eidsvoll", "Hurdal"], region: "Øst", alarmSentralId: "as-ost", isHaikoCustomer: true },
  { id: "fd-nrbr", name: "Nedre Romerike Brann og Redningsvesen IKS", shortName: "NRBR", type: "IKS", municipalities: ["Lørenskog", "Rælingen", "Lillestrøm", "Nittedal", "Aurskog-Høland"], region: "Øst", alarmSentralId: "as-ost" },
  { id: "fd-follo", name: "Follo Brannvesen IKS", type: "IKS", municipalities: ["Nordre Follo", "Ås", "Frogn", "Vestby", "Nesodden", "Enebakk"], region: "Øst", alarmSentralId: "as-ost" },
  { id: "fd-indre-ostfold", name: "Indre Østfold Brann og Redning IKS", type: "IKS", municipalities: ["Indre Østfold", "Marker", "Rakkestad"], region: "Øst", alarmSentralId: "as-ost" },
  { id: "fd-movar", name: "MOVAR IKS (Mosseregionen)", type: "IKS", municipalities: ["Moss", "Våler", "Råde"], region: "Øst", alarmSentralId: "as-ost" },
  { id: "fd-fredrikstad", name: "Fredrikstad brannvesen", type: "Enkelt", municipalities: ["Fredrikstad"], region: "Øst", alarmSentralId: "as-ost" },
  { id: "fd-sarpsborg", name: "Sarpsborg brannvesen", type: "Enkelt", municipalities: ["Sarpsborg"], region: "Øst", alarmSentralId: "as-ost" },
  { id: "fd-halden", name: "Halden brannvesen", type: "Enkelt", municipalities: ["Halden"], region: "Øst", alarmSentralId: "as-ost" },
  { id: "fd-aremark", name: "Aremark brannvesen", type: "Enkelt", municipalities: ["Aremark"], region: "Øst", alarmSentralId: "as-ost" },
  { id: "fd-hvaler", name: "Hvaler brannvesen", type: "Enkelt", municipalities: ["Hvaler"], region: "Øst", alarmSentralId: "as-ost" },

  // ─── OSLO ─────────────────────────────────────────────────────────
  { id: "fd-obre", name: "Oslo brann- og redningsetat", shortName: "OBRE", type: "KF", municipalities: ["Oslo"], region: "Oslo", alarmSentralId: "as-oslo" },
  { id: "fd-abbr", name: "Asker og Bærum brannvesen IKS", shortName: "ABBR", type: "IKS", municipalities: ["Asker", "Bærum"], region: "Oslo", alarmSentralId: "as-oslo" },

  // ─── INNLANDET ────────────────────────────────────────────────────
  { id: "fd-hedmarken", name: "Hedmarken brannvesen IKS", type: "IKS", municipalities: ["Hamar", "Stange", "Løten"], region: "Innlandet", alarmSentralId: "as-innlandet" },
  { id: "fd-elverum", name: "Elverum brannvesen", type: "Enkelt", municipalities: ["Elverum"], region: "Innlandet", alarmSentralId: "as-innlandet" },
  { id: "fd-glamdal", name: "Glåmdal brannvesen IKS", type: "IKS", municipalities: ["Kongsvinger", "Eidskog", "Nord-Odal", "Sør-Odal", "Grue", "Åsnes", "Våler"], region: "Innlandet", alarmSentralId: "as-innlandet" },
  { id: "fd-gjovik", name: "Gjøvik brannvesen", type: "Enkelt", municipalities: ["Gjøvik"], region: "Innlandet", alarmSentralId: "as-innlandet" },
  { id: "fd-lillehammer", name: "Lillehammer brannvesen", type: "Enkelt", municipalities: ["Lillehammer", "Øyer", "Gausdal"], region: "Innlandet", alarmSentralId: "as-innlandet" },
  { id: "fd-ringsaker", name: "Ringsaker brannvesen", type: "Enkelt", municipalities: ["Ringsaker"], region: "Innlandet", alarmSentralId: "as-innlandet" },
  { id: "fd-trysil", name: "Trysil brannvesen", type: "Enkelt", municipalities: ["Trysil"], region: "Innlandet", alarmSentralId: "as-innlandet" },
  { id: "fd-nord-osterdalen", name: "Nord-Østerdalen brannvesen IKS", type: "IKS", municipalities: ["Tynset", "Tolga", "Alvdal", "Folldal", "Rendalen", "Stor-Elvdal", "Engerdal"], region: "Innlandet", alarmSentralId: "as-innlandet" },
  { id: "fd-gudbrandsdal", name: "Gudbrandsdal brannvesen IKS", type: "IKS", municipalities: ["Ringebu", "Nord-Fron", "Sør-Fron", "Sel", "Dovre", "Lesja", "Lom", "Vågå", "Skjåk"], region: "Innlandet", alarmSentralId: "as-innlandet" },
  { id: "fd-valdres", name: "Valdres brannvesen IKS", type: "IKS", municipalities: ["Nord-Aurdal", "Sør-Aurdal", "Etnedal", "Vestre Slidre", "Øystre Slidre", "Vang"], region: "Innlandet", alarmSentralId: "as-innlandet" },
  { id: "fd-hadeland", name: "Hadeland brannvesen IKS", type: "IKS", municipalities: ["Gran", "Lunner", "Nordre Land", "Søndre Land"], region: "Innlandet", alarmSentralId: "as-innlandet" },
  { id: "fd-toten", name: "Toten brannvesen IKS", type: "IKS", municipalities: ["Østre Toten", "Vestre Toten"], region: "Innlandet", alarmSentralId: "as-innlandet" },

  // ─── SØR-ØST ──────────────────────────────────────────────────────
  { id: "fd-drbv", name: "Drammensregionens brannvesen IKS", shortName: "DRBV", type: "IKS", municipalities: ["Drammen", "Krødsherad", "Lier", "Sigdal", "Øvre Eiker"], region: "Sør-Øst", alarmSentralId: "as-sor-ost" },
  { id: "fd-hallingdal", name: "Hallingdal brann- og redningsteneste IKS", type: "IKS", municipalities: ["Flå", "Gol", "Hemsedal", "Nesbyen", "Ål"], region: "Sør-Øst", alarmSentralId: "as-sor-ost" },
  { id: "fd-kongsberg", name: "Kongsberg brannvesen", type: "Enkelt", municipalities: ["Kongsberg"], region: "Sør-Øst", alarmSentralId: "as-sor-ost" },
  { id: "fd-ringerike", name: "Ringerike brann og redning", type: "Enkelt", municipalities: ["Ringerike", "Hole", "Modum"], region: "Sør-Øst", alarmSentralId: "as-sor-ost" },
  { id: "fd-grenland", name: "Grenland brann og redning IKS", type: "IKS", municipalities: ["Skien", "Porsgrunn", "Notodden", "Bamble", "Siljan", "Drangedal", "Nome"], region: "Sør-Øst", alarmSentralId: "as-sor-ost" },
  { id: "fd-midt-telemark", name: "Midt-Telemark brannvesen", type: "Enkelt", municipalities: ["Midt-Telemark", "Hjartdal"], region: "Sør-Øst", alarmSentralId: "as-sor-ost" },
  { id: "fd-vest-telemark", name: "Vest-Telemark brannvesen IKS", type: "IKS", municipalities: ["Seljord", "Kviteseid", "Nissedal", "Fyresdal", "Tokke", "Vinje"], region: "Sør-Øst", alarmSentralId: "as-sor-ost" },
  { id: "fd-numedal", name: "Numedal brannvesen IKS", type: "IKS", municipalities: ["Flesberg", "Rollag", "Nore og Uvdal"], region: "Sør-Øst", alarmSentralId: "as-sor-ost" },
  { id: "fd-nedre-telemark", name: "Nedre Telemark brannvesen", type: "Enkelt", municipalities: ["Kragerø", "Tinn"], region: "Sør-Øst", alarmSentralId: "as-sor-ost" },
  { id: "fd-vib", name: "Vestfold Interkommunale Brannvesen IKS", shortName: "VIB", type: "IKS", municipalities: ["Holmestrand", "Horten", "Færder", "Tønsberg"], region: "Sør-Øst", alarmSentralId: "as-sor-ost" },
  { id: "fd-bsv-vestfold", name: "Brannvesenet Sør IKS", shortName: "BSV", type: "IKS", municipalities: ["Larvik", "Sandefjord"], region: "Sør-Øst", alarmSentralId: "as-sor-ost" },
  { id: "fd-jevnaker", name: "Jevnaker brannvesen", type: "Enkelt", municipalities: ["Jevnaker"], region: "Sør-Øst", alarmSentralId: "as-sor-ost" },

  // ─── AGDER ────────────────────────────────────────────────────────
  { id: "fd-kbr", name: "Kristiansandsregionen brann og redning", shortName: "KBR", type: "IKS", municipalities: ["Kristiansand", "Vennesla", "Birkenes", "Lillesand"], region: "Agder", alarmSentralId: "as-agder" },
  { id: "fd-bvs-agder", name: "Brannvesenet Sør IKS", shortName: "BVS", type: "IKS", municipalities: ["Lindesnes", "Lyngdal", "Kvinesdal", "Hægebostad", "Farsund", "Åseral"], region: "Agder", alarmSentralId: "as-agder" },
  { id: "fd-flekkefjord", name: "Flekkefjord brann og redning", type: "Enkelt", municipalities: ["Flekkefjord"], region: "Agder", alarmSentralId: "as-agder" },
  { id: "fd-grimstad", name: "Grimstad brann og redning", type: "Enkelt", municipalities: ["Grimstad"], region: "Agder", alarmSentralId: "as-agder" },
  { id: "fd-setesdal", name: "Setesdal brannvesen IKS", type: "IKS", municipalities: ["Evje og Hornnes", "Iveland", "Bygland", "Valle", "Bykle"], region: "Agder", alarmSentralId: "as-agder" },
  { id: "fd-oabv", name: "Østre Agder brannvesen", shortName: "ØABV", type: "IKS", municipalities: ["Arendal", "Tvedestrand", "Risør", "Gjerstad", "Vegårshei", "Åmli", "Froland"], region: "Agder", alarmSentralId: "as-agder" },

  // ─── SØR-VEST (Rogaland) ──────────────────────────────────────────
  { id: "fd-rogaland", name: "Rogaland brann og redning IKS", type: "IKS", municipalities: ["Stavanger", "Sandnes", "Sola", "Randaberg", "Gjesdal", "Klepp", "Time", "Strand", "Kvitsøy"], region: "Sør-Vest", alarmSentralId: "as-sor-vest" },
  { id: "fd-haugaland", name: "Haugaland brann og redning IKS", type: "IKS", municipalities: ["Haugesund", "Karmøy", "Tysvær", "Bokn", "Vindafjord", "Sveio", "Utsira", "Sauda"], region: "Sør-Vest", alarmSentralId: "as-sor-vest" },
  { id: "fd-eigersund", name: "Eigersund brann og redning", type: "Enkelt", municipalities: ["Eigersund"], region: "Sør-Vest", alarmSentralId: "as-sor-vest" },
  { id: "fd-bjerkreim", name: "Bjerkreim brannvesen", type: "Enkelt", municipalities: ["Bjerkreim"], region: "Sør-Vest", alarmSentralId: "as-sor-vest" },
  { id: "fd-ha", name: "Hå brannvesen", type: "Enkelt", municipalities: ["Hå"], region: "Sør-Vest", alarmSentralId: "as-sor-vest" },
  { id: "fd-hjelmeland", name: "Hjelmeland brannvesen", type: "Enkelt", municipalities: ["Hjelmeland"], region: "Sør-Vest", alarmSentralId: "as-sor-vest" },
  { id: "fd-etne", name: "Etne brann og redning", type: "Enkelt", municipalities: ["Etne"], region: "Sør-Vest", alarmSentralId: "as-sor-vest" },
  { id: "fd-fitjar-sv", name: "Fitjar brannvesen", type: "Enkelt", municipalities: ["Fitjar"], region: "Sør-Vest", alarmSentralId: "as-sor-vest" },
  { id: "fd-stord-sv", name: "Stord brann og redning", type: "Enkelt", municipalities: ["Stord"], region: "Sør-Vest", alarmSentralId: "as-sor-vest" },
  { id: "fd-bomlo-sv", name: "Bømlo brann og redning", type: "Enkelt", municipalities: ["Bømlo"], region: "Sør-Vest", alarmSentralId: "as-sor-vest" },
  { id: "fd-lund", name: "Lund brannvesen", type: "Enkelt", municipalities: ["Lund"], region: "Sør-Vest", alarmSentralId: "as-sor-vest" },
  { id: "fd-sirdal", name: "Sirdal brannvesen", type: "Enkelt", municipalities: ["Sirdal"], region: "Sør-Vest", alarmSentralId: "as-sor-vest" },

  // ─── VEST (Vestland) ──────────────────────────────────────────────
  { id: "fd-bergen", name: "Bergen brannvesen", type: "KF", municipalities: ["Bergen"], region: "Vest", alarmSentralId: "as-vest" },
  { id: "fd-oygarden", name: "Øygarden brann og redning", type: "Enkelt", municipalities: ["Øygarden"], region: "Vest", alarmSentralId: "as-vest" },
  { id: "fd-askoy", name: "Askøy brann og redning", type: "Enkelt", municipalities: ["Askøy"], region: "Vest", alarmSentralId: "as-vest" },
  { id: "fd-nordhordland", name: "Nordhordland brannvesen IKS", type: "IKS", municipalities: ["Alver", "Austrheim", "Fedje", "Gulen", "Masfjorden", "Modalen", "Vaksdal", "Osterøy"], region: "Vest", alarmSentralId: "as-vest" },
  { id: "fd-bjornafjorden", name: "Bjørnafjorden brann og redning", type: "Enkelt", municipalities: ["Bjørnafjorden"], region: "Vest", alarmSentralId: "as-vest" },
  { id: "fd-austevoll", name: "Austevoll brannvesen", type: "Enkelt", municipalities: ["Austevoll"], region: "Vest", alarmSentralId: "as-vest" },
  { id: "fd-stord-vest", name: "Stord brann og redning", type: "Enkelt", municipalities: ["Stord"], region: "Vest", alarmSentralId: "as-vest" },
  { id: "fd-fitjar-vest", name: "Fitjar brannvesen", type: "Enkelt", municipalities: ["Fitjar"], region: "Vest", alarmSentralId: "as-vest" },
  { id: "fd-bomlo-vest", name: "Bømlo brann og redning", type: "Enkelt", municipalities: ["Bømlo"], region: "Vest", alarmSentralId: "as-vest" },
  { id: "fd-kvam", name: "Kvam brann og redning", type: "Enkelt", municipalities: ["Kvam"], region: "Vest", alarmSentralId: "as-vest" },
  { id: "fd-samnanger", name: "Samnanger brannvesen", type: "Enkelt", municipalities: ["Samnanger"], region: "Vest", alarmSentralId: "as-vest" },
  { id: "fd-kvinnherad", name: "Kvinnherad brann og redning", type: "Enkelt", municipalities: ["Kvinnherad"], region: "Vest", alarmSentralId: "as-vest" },
  { id: "fd-tysnes", name: "Tysnes brannvesen", type: "Enkelt", municipalities: ["Tysnes"], region: "Vest", alarmSentralId: "as-vest" },
  { id: "fd-ullensvang", name: "Ullensvang brann og redning", type: "Enkelt", municipalities: ["Ullensvang"], region: "Vest", alarmSentralId: "as-vest" },
  { id: "fd-eidfjord", name: "Eidfjord brannvesen", type: "Enkelt", municipalities: ["Eidfjord"], region: "Vest", alarmSentralId: "as-vest" },
  { id: "fd-ulvik", name: "Ulvik brannvesen", type: "Enkelt", municipalities: ["Ulvik"], region: "Vest", alarmSentralId: "as-vest" },
  { id: "fd-voss", name: "Voss brannvesen", type: "Enkelt", municipalities: ["Voss"], region: "Vest", alarmSentralId: "as-vest" },
  { id: "fd-sogndal", name: "Sogndal brannvesen (og omegn)", type: "IKS", municipalities: ["Sogndal", "Luster", "Årdal", "Aurland", "Lærdal", "Vik", "Høyanger"], region: "Vest", alarmSentralId: "as-vest" },
  { id: "fd-sunnfjord", name: "Sunnfjord brannvesen IKS", type: "IKS", municipalities: ["Sunnfjord", "Askvoll", "Fjaler", "Gaular", "Jølster"], region: "Vest", alarmSentralId: "as-vest" },
  { id: "fd-kinn", name: "Kinn brannvesen (Flora/Vågsøy)", type: "IKS", municipalities: ["Kinn", "Bremanger", "Gloppen", "Stryn", "Stad"], region: "Vest", alarmSentralId: "as-vest" },

  // ─── MØRE OG ROMSDAL ──────────────────────────────────────────────
  { id: "fd-alesund", name: "Ålesund brannvesen KF", type: "KF", municipalities: ["Ålesund", "Haram", "Giske", "Sula"], region: "Møre og Romsdal", alarmSentralId: "as-more-romsdal" },
  { id: "fd-nibt", name: "Nordmøre interkommunale brann og redningstjeneste", shortName: "NIBT", type: "IKS", municipalities: ["Kristiansund", "Averøy", "Smøla", "Aure"], region: "Møre og Romsdal", alarmSentralId: "as-more-romsdal" },
  { id: "fd-norbr", name: "Nordmøre og Romsdal Brann og Redning IKS", shortName: "NORBR", type: "IKS", municipalities: ["Molde", "Rauma", "Aukra", "Gjemnes", "Sunndal", "Tingvoll"], region: "Møre og Romsdal", alarmSentralId: "as-more-romsdal" },
  { id: "fd-fjord", name: "Fjord brannvesen", type: "Enkelt", municipalities: ["Fjord", "Stranda", "Sykkylven"], region: "Møre og Romsdal", alarmSentralId: "as-more-romsdal" },
  { id: "fd-hareid-ulstein", name: "Hareid og Ulstein brannvesen", type: "IKS", municipalities: ["Hareid", "Ulstein"], region: "Møre og Romsdal", alarmSentralId: "as-more-romsdal" },
  { id: "fd-heroy-mr", name: "Herøy brann og redning", type: "Enkelt", municipalities: ["Herøy"], region: "Møre og Romsdal", alarmSentralId: "as-more-romsdal" },
  { id: "fd-hustadvika", name: "Hustadvika brann og redning", type: "Enkelt", municipalities: ["Hustadvika"], region: "Møre og Romsdal", alarmSentralId: "as-more-romsdal" },
  { id: "fd-sande-mr", name: "Sande brannvern", type: "Enkelt", municipalities: ["Sande"], region: "Møre og Romsdal", alarmSentralId: "as-more-romsdal" },
  { id: "fd-vanylven", name: "Vanylven brannvesen", type: "Enkelt", municipalities: ["Vanylven"], region: "Møre og Romsdal", alarmSentralId: "as-more-romsdal" },
  { id: "fd-volda", name: "Volda brannvesen", type: "Enkelt", municipalities: ["Volda"], region: "Møre og Romsdal", alarmSentralId: "as-more-romsdal" },
  { id: "fd-orsta", name: "Ørsta brannvesen", type: "Enkelt", municipalities: ["Ørsta"], region: "Møre og Romsdal", alarmSentralId: "as-more-romsdal" },

  // ─── TRØNDELAG ────────────────────────────────────────────────────
  { id: "fd-tbrt", name: "Trøndelag brann og redningstjeneste KF", shortName: "TBRT", type: "KF", municipalities: ["Trondheim", "Malvik", "Stjørdal", "Frosta", "Levanger", "Verdal", "Inderøy", "Meråker"], region: "Trøndelag", alarmSentralId: "as-trondelag" },
  { id: "fd-brannvesenet-midt", name: "Brannvesenet Midt IKS", type: "IKS", municipalities: ["Orkland", "Heim", "Hitra", "Frøya", "Indre Fosen", "Melhus", "Skaun", "Midtre Gauldal", "Rennebu", "Oppdal", "Røros", "Holtålen"], region: "Trøndelag", alarmSentralId: "as-trondelag" },
  { id: "fd-fosen", name: "Fosen brann og redningstjeneste IKS", shortName: "FBRT", type: "IKS", municipalities: ["Ørland", "Åfjord", "Roan", "Osen", "Bjugn"], region: "Trøndelag", alarmSentralId: "as-trondelag" },
  { id: "fd-gauldal", name: "Gauldal brann og redning IKS", type: "IKS", municipalities: ["Selbu", "Tydal"], region: "Trøndelag", alarmSentralId: "as-trondelag" },
  { id: "fd-steinkjer", name: "Steinkjer brannvesen", type: "Enkelt", municipalities: ["Steinkjer"], region: "Trøndelag", alarmSentralId: "as-trondelag" },
  { id: "fd-snasa", name: "Snåsa brannvesen", type: "Enkelt", municipalities: ["Snåsa"], region: "Trøndelag", alarmSentralId: "as-trondelag" },
  { id: "fd-lierne", name: "Lierne brannvesen", type: "Enkelt", municipalities: ["Lierne"], region: "Trøndelag", alarmSentralId: "as-trondelag" },
  { id: "fd-namsos", name: "Namsos brannvesen", type: "Enkelt", municipalities: ["Namsos"], region: "Trøndelag", alarmSentralId: "as-trondelag" },
  { id: "fd-namdaleid", name: "Namdaleid brannvesen", type: "Enkelt", municipalities: ["Namsos"], region: "Trøndelag", alarmSentralId: "as-trondelag", notes: "Tidl. Namdaleid, nå del av Namsos" },
  { id: "fd-flatanger", name: "Flatanger brannvesen", type: "Enkelt", municipalities: ["Flatanger"], region: "Trøndelag", alarmSentralId: "as-trondelag" },
  { id: "fd-grong", name: "Grong brannvesen", type: "Enkelt", municipalities: ["Grong", "Høylandet", "Overhalla"], region: "Trøndelag", alarmSentralId: "as-trondelag" },
  { id: "fd-bindal", name: "Bindal brannvesen", type: "Enkelt", municipalities: ["Bindal"], region: "Trøndelag", alarmSentralId: "as-trondelag", notes: "Bindal er i Nordland fylke, men tilhører Midt-Norge 110" },
  { id: "fd-os-innlandet", name: "Os brannvesen", type: "Enkelt", municipalities: ["Os"], region: "Trøndelag", alarmSentralId: "as-trondelag", notes: "Os er i Innlandet fylke, men tilhører Midt-Norge 110" },

  // ─── NORDLAND ─────────────────────────────────────────────────────
  { id: "fd-salten", name: "Salten Brann IKS", type: "IKS", municipalities: ["Bodø", "Fauske", "Saltdal", "Meløy", "Gildeskål", "Beiarn", "Sørfold", "Steigen", "Hamarøy"], region: "Nordland", alarmSentralId: "as-nordland" },
  { id: "fd-rana", name: "Brann og redningstjenesten i Rana", type: "Enkelt", municipalities: ["Rana"], region: "Nordland", alarmSentralId: "as-nordland" },
  { id: "fd-vefsn-grane-heroy", name: "Brann og redningstjenesten Vefsn/Grane/Herøy", type: "IKS", municipalities: ["Vefsn", "Grane", "Herøy"], region: "Nordland", alarmSentralId: "as-nordland" },
  { id: "fd-ytre-helgeland", name: "Ytre Helgeland brann og redning", type: "IKS", municipalities: ["Alstahaug", "Leirfjord", "Dønna"], region: "Nordland", alarmSentralId: "as-nordland" },
  { id: "fd-narvik", name: "Narvik brannvesen", type: "Enkelt", municipalities: ["Narvik"], region: "Nordland", alarmSentralId: "as-nordland" },
  { id: "fd-vesteralen", name: "Vesterålen brannvesen IKS", type: "IKS", municipalities: ["Hadsel", "Øksnes", "Sortland", "Bø", "Andøy"], region: "Nordland", alarmSentralId: "as-nordland" },
  { id: "fd-lofoten", name: "Lofoten brannvesen IKS", type: "IKS", municipalities: ["Vestvågøy", "Flakstad", "Moskenes", "Røst", "Værøy"], region: "Nordland", alarmSentralId: "as-nordland" },
  { id: "fd-evenes-tjeldsund", name: "Evenes og Tjeldsund brannvesen", type: "IKS", municipalities: ["Evenes", "Tjeldsund"], region: "Nordland", alarmSentralId: "as-nordland" },
  { id: "fd-bronnoy", name: "Brønnøy brann og redning", type: "Enkelt", municipalities: ["Brønnøy", "Sømna", "Vevelstad", "Bindal"], region: "Nordland", alarmSentralId: "as-nordland" },

  // ─── TROMS ────────────────────────────────────────────────────────
  { id: "fd-tromso", name: "Tromsø brann og redning", type: "Enkelt", municipalities: ["Tromsø"], region: "Troms", alarmSentralId: "as-troms" },
  { id: "fd-harstad", name: "Harstad brannvesen", type: "Enkelt", municipalities: ["Harstad"], region: "Troms", alarmSentralId: "as-troms" },
  { id: "fd-senja-lenvik", name: "Senja brannvesen (Lenvik)", type: "Enkelt", municipalities: ["Senja"], region: "Troms", alarmSentralId: "as-troms" },
  { id: "fd-malselv", name: "Målselv brann og redning", type: "Enkelt", municipalities: ["Målselv"], region: "Troms", alarmSentralId: "as-troms", notes: "I Haikos pipeline (Kenneth Molund)" },
  { id: "fd-balsfjord", name: "Balsfjord brann og redning", type: "Enkelt", municipalities: ["Balsfjord"], region: "Troms", alarmSentralId: "as-troms" },
  { id: "fd-bardu", name: "Bardu brannvesen", type: "Enkelt", municipalities: ["Bardu"], region: "Troms", alarmSentralId: "as-troms" },
  { id: "fd-dyroy", name: "Dyrøy brannvesen", type: "Enkelt", municipalities: ["Dyrøy"], region: "Troms", alarmSentralId: "as-troms" },
  { id: "fd-salangen", name: "Salangen brannvesen", type: "Enkelt", municipalities: ["Salangen"], region: "Troms", alarmSentralId: "as-troms" },
  { id: "fd-lavangen", name: "Lavangen brannvesen", type: "Enkelt", municipalities: ["Lavangen"], region: "Troms", alarmSentralId: "as-troms" },
  { id: "fd-gratangen", name: "Gratangen brannvesen", type: "Enkelt", municipalities: ["Gratangen"], region: "Troms", alarmSentralId: "as-troms" },
  { id: "fd-ibestad", name: "Ibestad brannvesen", type: "Enkelt", municipalities: ["Ibestad"], region: "Troms", alarmSentralId: "as-troms" },
  { id: "fd-storfjord", name: "Storfjord brannvesen", type: "Enkelt", municipalities: ["Storfjord"], region: "Troms", alarmSentralId: "as-troms" },
  { id: "fd-kafjord", name: "Kåfjord brannvesen", type: "Enkelt", municipalities: ["Kåfjord"], region: "Troms", alarmSentralId: "as-troms" },
  { id: "fd-lyngen", name: "Lyngen brannvesen", type: "Enkelt", municipalities: ["Lyngen"], region: "Troms", alarmSentralId: "as-troms" },
  { id: "fd-kvaefjord", name: "Kvæfjord brannvesen", type: "Enkelt", municipalities: ["Kvæfjord"], region: "Troms", alarmSentralId: "as-troms" },
  { id: "fd-torsken", name: "Torsken brannvesen (Senja)", type: "Enkelt", municipalities: ["Senja"], region: "Troms", alarmSentralId: "as-troms", notes: "Torsken/Berg, nå del av Senja kommune" },

  // ─── FINNMARK ─────────────────────────────────────────────────────
  { id: "fd-alta", name: "Alta brann og redningskorps", type: "Enkelt", municipalities: ["Alta"], region: "Finnmark", alarmSentralId: "as-finnmark" },
  { id: "fd-hammerfest", name: "Hammerfest brannvesen", type: "Enkelt", municipalities: ["Hammerfest"], region: "Finnmark", alarmSentralId: "as-finnmark" },
  { id: "fd-sor-varanger", name: "Sør-Varanger brannvesen", type: "Enkelt", municipalities: ["Sør-Varanger"], region: "Finnmark", alarmSentralId: "as-finnmark" },
  { id: "fd-vadso", name: "Vadsø brannvesen", type: "Enkelt", municipalities: ["Vadsø"], region: "Finnmark", alarmSentralId: "as-finnmark" },
  { id: "fd-vardo", name: "Vardø brannvesen", type: "Enkelt", municipalities: ["Vardø"], region: "Finnmark", alarmSentralId: "as-finnmark" },
  { id: "fd-kautokeino", name: "Kautokeino brannvesen", type: "Enkelt", municipalities: ["Kautokeino"], region: "Finnmark", alarmSentralId: "as-finnmark" },
  { id: "fd-karasjok", name: "Karasjok brannvesen", type: "Enkelt", municipalities: ["Karasjok"], region: "Finnmark", alarmSentralId: "as-finnmark" },
  { id: "fd-porsanger", name: "Porsanger brannvesen", type: "Enkelt", municipalities: ["Porsanger"], region: "Finnmark", alarmSentralId: "as-finnmark" },
  { id: "fd-gamvik", name: "Gamvik brannvesen", type: "Enkelt", municipalities: ["Gamvik"], region: "Finnmark", alarmSentralId: "as-finnmark" },
  { id: "fd-lebesby", name: "Lebesby brannvesen", type: "Enkelt", municipalities: ["Lebesby"], region: "Finnmark", alarmSentralId: "as-finnmark" },
  { id: "fd-berlevag", name: "Berlevåg brannvesen", type: "Enkelt", municipalities: ["Berlevåg"], region: "Finnmark", alarmSentralId: "as-finnmark" },
  { id: "fd-tana", name: "Tana brannvesen", type: "Enkelt", municipalities: ["Tana"], region: "Finnmark", alarmSentralId: "as-finnmark" },
  { id: "fd-nesseby", name: "Nesseby brannvesen", type: "Enkelt", municipalities: ["Nesseby"], region: "Finnmark", alarmSentralId: "as-finnmark" },
  { id: "fd-batsfjord", name: "Båtsfjord brannvesen", type: "Enkelt", municipalities: ["Båtsfjord"], region: "Finnmark", alarmSentralId: "as-finnmark" },
  { id: "fd-loppa", name: "Loppa brannvesen", type: "Enkelt", municipalities: ["Loppa"], region: "Finnmark", alarmSentralId: "as-finnmark" },
];

// ─── Lookup helpers ─────────────────────────────────────────────────────────

/**
 * Finn brannvesenet for en gitt kommune
 */
export function findFireDepartment(municipalityName: string): FireDepartment | null {
  const normalized = municipalityName.toLowerCase().trim();
  return FIRE_DEPARTMENTS.find(fd =>
    fd.municipalities.some(m => m.toLowerCase() === normalized)
  ) || null;
}

/**
 * Finn 110-sentralen for en gitt kommune
 */
export function findAlarmSentral(municipalityName: string): AlarmSentral | null {
  const fd = findFireDepartment(municipalityName);
  if (!fd) return null;
  return ALARM_SENTRALER.find(as => as.id === fd.alarmSentralId) || null;
}

/**
 * Finn alle partnerkommuner i samme brannvesen (ekskluderer gjeldende)
 */
export function getPartnerMunicipalities(municipalityName: string): string[] {
  const fd = findFireDepartment(municipalityName);
  if (!fd) return [];
  return fd.municipalities.filter(m => m.toLowerCase() !== municipalityName.toLowerCase().trim());
}

/**
 * Finn alle brannvesen under samme 110-sentral
 */
export function getSiblingFireDepartments(municipalityName: string): FireDepartment[] {
  const fd = findFireDepartment(municipalityName);
  if (!fd) return [];
  return FIRE_DEPARTMENTS.filter(
    d => d.alarmSentralId === fd.alarmSentralId && d.id !== fd.id
  );
}

/**
 * Finn alle kommuner under samme 110-sentral
 */
export function get110RegionMunicipalities(municipalityName: string): string[] {
  const siblings = getSibling FireDepartments(municipalityName);
  const fd = findFireDepartment(municipalityName);
  if (!fd) return [];
  const allDepts = [fd, ...siblings];
  return allDepts.flatMap(d => d.municipalities);
}

// ─── Legacy compatibility (used by existing code) ───────────────────────────

export interface IKSPartnership {
  id: string;
  name: string;
  municipalities: string[];
  type: 'brann' | 'beredskap' | 'brann_beredskap';
  region: string;
}

/** Legacy: returns IKS partnerships only (type=IKS brannvesen) */
export const IKS_PARTNERSHIPS: IKSPartnership[] = FIRE_DEPARTMENTS
  .filter(fd => fd.type === 'IKS')
  .map(fd => ({
    id: fd.id,
    name: fd.name,
    municipalities: fd.municipalities,
    type: 'brann' as const,
    region: fd.region,
  }));

/** Legacy compatibility */
export function findIKSPartners(municipalityName: string): IKSPartnership | null {
  const normalized = municipalityName.toLowerCase().trim();
  return IKS_PARTNERSHIPS.find(iks =>
    iks.municipalities.some(m => m.toLowerCase() === normalized)
  ) || null;
}

/** Legacy compatibility */
export function getIKSPartnerMunicipalities(municipalityName: string): string[] {
  const iks = findIKSPartners(municipalityName);
  if (!iks) return [];
  return iks.municipalities.filter(m => m.toLowerCase() !== municipalityName.toLowerCase());
}
