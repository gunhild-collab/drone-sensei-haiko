export interface Question {
  id: string;
  text: string;
  method: string;
  levels: string[];
}

export interface Dimension {
  id: string;
  name: string;
  weight: number;
  questions: Question[];
}

export interface MaturityLevel {
  level: number;
  name: string;
  range: [number, number];
  description: string;
}

export interface UseCase {
  id: string;
  sector: string;
  name: string;
  description: string;
  complexity: "Lav" | "Middels" | "Høy";
  minLevel: number;
  dimensions: string[];
}

export const maturityLevels: MaturityLevel[] = [
  { level: 1, name: "Utforsker", range: [0, 25], description: "Kommunen er i en tidlig utforskningsfase med begrenset bevissthet om droneteknologi." },
  { level: 2, name: "Utvikler", range: [26, 50], description: "Kommunen har begynt å utvikle kompetanse og gjennomfører pilotprosjekter." },
  { level: 3, name: "Etablert", range: [51, 75], description: "Droneoperasjoner er etablert med klare prosedyrer og tverrsektoriell integrasjon." },
  { level: 4, name: "Ledende", range: [76, 100], description: "Kommunen er en nasjonal ledestjerne med avansert droneprogram og strategisk integrasjon." },
];

export const dimensions: Dimension[] = [
  {
    id: "D1",
    name: "Strategi og ledelse",
    weight: 0.20,
    questions: [
      { id: "D1.1", text: "Finnes det en uttalt strategi eller visjon for bruk av droner i kommunen?", method: "Dokumentgjennomgang", levels: ["Ingen strategi", "Uformell interesse", "Diskutert i ledermøte", "Del av sektorplan", "Integrert i kommuneplan"] },
      { id: "D1.2", text: "Er det politisk forankring for dronebruk?", method: "Intervju", levels: ["Ingen politisk forankring", "Nevnt i debatt", "Politisk nysgjerrighet", "Vedtak eller mandat", "Strategisk politisk prioritering"] },
      { id: "D1.3", text: "Finnes det en dedikert rolle eller ansvarlig for dronerelatert arbeid?", method: "Organisasjonskart", levels: ["Ingen ansvarlig", "Uformell ildsjel", "Delansvar hos én person", "Dedikert koordinator", "Dronekontor med team"] },
      { id: "D1.4", text: "Er det avsatt budsjett til droneaktiviteter?", method: "Budsjettgjennomgang", levels: ["Ikke avsatt", "Ad hoc-midler", "Prosjektbudsjett", "Fast driftsbudsjett", "Strategisk investeringsprogram"] },
      { id: "D1.5", text: "Er risikostyring knyttet til dronebruk vurdert?", method: "Dokumentgjennomgang", levels: ["Ikke vurdert", "Uformell vurdering", "Grunnleggende risikovurdering", "Integrert i HMS-plan", "Dynamisk risikostyring"] },
      { id: "D1.6", text: "Er det gjennomført en behovsanalyse for droneteknologi?", method: "Dokumentgjennomgang", levels: ["Ikke gjennomført", "Uformelle samtaler", "Kartlegging startet", "Analyse for 1-2 sektorer", "Helhetlig behovsanalyse"] },
      { id: "D1.7", text: "Er det satt opp KPIer eller måltall for dronebruk?", method: "Dokumentgjennomgang", levels: ["Ingen KPIer", "Vage mål", "Noen kvantitative mål", "KPIer per bruksområde", "Dashboard med oppfølging"] },
      { id: "D1.8", text: "Har kommuneledelsen deltatt i dronedemonstrasjon eller fagdag?", method: "Intervju", levels: ["Nei", "Har sett presentasjon", "Deltatt på fagdag", "Vært med på demo", "Aktivt bestilt demoer"] },
    ],
  },
  {
    id: "D2",
    name: "Regulatorisk modenhet",
    weight: 0.25,
    questions: [
      { id: "D2.1", text: "Kjenner kommunen til gjeldende droneforskrifter (EU/EASA)?", method: "Intervju", levels: ["Ingen kjennskap", "Vag bevissthet", "Kjenner til hovedkategorier", "God forståelse", "Ekspertnivå, inkl. SORA"] },
      { id: "D2.2", text: "Har noen ansatte dronebevis (A1/A3 eller A2)?", method: "Sertifikatverifisering", levels: ["Ingen", "Under opplæring", "1-2 med A1/A3", "Flere med A2", "Teamet har spesialiserte sertifiseringer"] },
      { id: "D2.3", text: "Er kommunen registrert som droneoperatør?", method: "Registersjekk", levels: ["Ikke registrert", "Kjenner til kravet", "Registrering påbegynt", "Registrert i Open", "Registrert i Open + Specific"] },
      { id: "D2.4", text: "Er det utarbeidet operasjonsmanual (OM)?", method: "Dokumentgjennomgang", levels: ["Ingen", "Kjenner til kravet", "Utkast påbegynt", "OM ferdigstilt", "OM med revisjonssyklus"] },
      { id: "D2.5", text: "Er luftromsbegrensninger og soner kartlagt for kommunen?", method: "GIS/kartgjennomgang", levels: ["Ikke kartlagt", "Grunnleggende kjennskap", "Delvis kartlagt", "Fullstendig kartlagt", "Integrert i planleggingsverktøy"] },
      { id: "D2.6", text: "Er det et etablert forhold til Luftfartstilsynet?", method: "Intervju", levels: ["Ingen kontakt", "Kjenner til LT", "Kontaktet én gang", "Jevnlig kommunikasjon", "Aktivt samarbeid"] },
      { id: "D2.7", text: "Er det bevissthet om U-space og dets implikasjoner?", method: "Intervju", levels: ["Ingen kjennskap", "Hørt om det", "Grunnleggende forståelse", "Planlegger for U-space", "Deltar i U-space"] },
      { id: "D2.8", text: "Har kommunen dronerelaterte retningslinjer (personvern, sikkerhet, støy)?", method: "Dokumentgjennomgang", levels: ["Ingen", "Uformelle retningslinjer", "Utkast til retningslinjer", "Godkjente retningslinjer", "Omfattende rammeverk"] },
    ],
  },
  {
    id: "D3",
    name: "Operasjonell kapasitet",
    weight: 0.20,
    questions: [
      { id: "D3.1", text: "Hvor mange droner eier eller har kommunen tilgang til?", method: "Ressursinventar", levels: ["Ingen", "1 forbrukerdrone", "2-3 droner", "4-5 profesjonelle droner", "Administrert flåte 6+"] },
      { id: "D3.2", text: "Er standardprosedyrer (SOPer) dokumentert for droneflygninger?", method: "Dokumentgjennomgang", levels: ["Ingen", "Uformell praksis", "Grunnleggende sjekkliste", "Dokumenterte SOPer", "SOPer med gjennomgangssyklus"] },
      { id: "D3.3", text: "Er det et flyloggingssystem i bruk?", method: "Systemgjennomgang", levels: ["Ingen logging", "Papirlapper", "Regneark", "Digitalt flyloggsystem", "Integrert flåtestyring"] },
      { id: "D3.4", text: "Er det et vedlikeholdsprogram for droneutstyr?", method: "Dokumentgjennomgang", levels: ["Ingen vedlikehold", "Kun reaktivt", "Grunnleggende plan", "Formelt vedlikeholdsprogram", "Prediktivt vedlikehold"] },
      { id: "D3.5", text: "Hvordan håndteres dronefangede data (bilder, video, LiDAR osv.)?", method: "IT-gjennomgang", levels: ["Ikke håndtert", "Lokal lagring", "Skylagring", "Strukturert pipeline", "Integrert i GIS/IT-systemer"] },
      { id: "D3.6", text: "Har kommunen gjennomført BVLOS-operasjoner (utenfor synsrekkevidde)?", method: "Intervju", levels: ["Nei", "Kjenner til konseptet", "Undersøkt", "Testet/pilotert", "Regulære BVLOS-operasjoner"] },
      { id: "D3.7", text: "Finnes det en nød-/hendelsesprosedyre for droneoperasjoner?", method: "Dokumentgjennomgang", levels: ["Ingen", "Uformell", "Grunnleggende plan", "Dokumentert prosedyre", "Testet og øvet prosedyre"] },
      { id: "D3.8", text: "Bruker kommunen automatiserte eller dokkbaserte dronesystemer?", method: "Intervju", levels: ["Nei", "Kjenner til konseptet", "Evaluert", "Piloterer", "Operasjonelt dokkbasert system"] },
    ],
  },
  {
    id: "D4",
    name: "Organisatorisk integrasjon",
    weight: 0.20,
    questions: [
      { id: "D4.1", text: "Hvor mange avdelinger har identifisert bruksområder for droner?", method: "Intervju", levels: ["Ingen", "1 avdeling", "2-3 avdelinger", "4-5 avdelinger", "Organisasjonsomfattende kartlegging"] },
      { id: "D4.2", text: "Er droneutdata integrert i eksisterende IT/GIS-systemer?", method: "IT-gjennomgang", levels: ["Nei", "Manuell overføring", "Grunnleggende integrasjon", "Automatisert pipeline", "Sanntidsintegrasjon"] },
      { id: "D4.3", text: "Har kommunen anskaffet dronetjenester via Doffin eller tilsvarende?", method: "Anskaffelsesgjennomgang", levels: ["Nei", "Undersøkt", "Uformelt kjøp", "Formell anbudskonkurranse", "Rammeavtale på plass"] },
      { id: "D4.4", text: "Er det etablerte leverandør-/operatørrelasjoner?", method: "Intervju", levels: ["Ingen", "1 kontakt", "2-3 kontakter", "Kontraktsfestet operatør", "Flere rammeavtaler"] },
      { id: "D4.5", text: "Er det koordinering på tvers av avdelinger for droneaktiviteter?", method: "Intervju", levels: ["Ingen", "Uformell", "Sporadiske møter", "Regelmessig koordinering", "Droneprogramkontor"] },
      { id: "D4.6", text: "Er dronetjenester del av kommunens digitaliseringsplan?", method: "Dokumentgjennomgang", levels: ["Nei", "Nevnt", "Inkludert som initiativ", "Aktivt prosjekt", "Kjernekomponent"] },
      { id: "D4.7", text: "Har ansatte på tvers av avdelinger grunnleggende dronekompetanse?", method: "Intervju/spørreundersøkelse", levels: ["Nei", "1-2 individer", "Nøkkelansatte i 1 avd.", "Nøkkelansatte på tvers", "Bred organisatorisk kompetanse"] },
      { id: "D4.8", text: "Har kommunen evaluert eller kartlagt ROI per bruksområde?", method: "Dokumentgjennomgang", levels: ["Nei", "Anekdotisk", "1 bruksområde estimert", "Flere bruksområder", "Systematisk ROI-oppfølging"] },
    ],
  },
  {
    id: "D5",
    name: "Økosystem og finansiering",
    weight: 0.15,
    questions: [
      { id: "D5.1", text: "Har kommunen søkt om dronerelaterte tilskudd (SESAR, IN, DSB osv.)?", method: "Intervju", levels: ["Nei", "Kjenner til muligheter", "Utforsket 1 mekanisme", "Søkt", "Aktive finansierte prosjekt(er)"] },
      { id: "D5.2", text: "Er det en relasjon til leverandører av droneopplæring?", method: "Intervju", levels: ["Ingen", "Kjenner til", "Kontaktet", "Engasjert for opplæring", "Løpende opplæringsprogram"] },
      { id: "D5.3", text: "Samarbeider kommunen med andre kommuner om droneinitiativer?", method: "Intervju", levels: ["Nei", "Uformell kjennskap", "Diskusjoner holdt", "Aktivt samarbeid", "Delt droneprogram (IKS)"] },
      { id: "D5.4", text: "Er kommunen tilknyttet det nasjonale droneøkosystemet (UAS Norway, konferanser)?", method: "Intervju", levels: ["Nei", "Kjenner til", "Deltatt på 1 arrangement", "Fast deltaker", "Aktiv bidragsyter/styremedlem"] },
      { id: "D5.5", text: "Har kommunen partnerskap med droneoperatører?", method: "Kontraktsgjennomgang", levels: ["Ingen", "1 uformell kontakt", "Testet 1 operatør", "Kontraktsfestet operatør(er)", "Strategiske fleroperatørpartnerskap"] },
      { id: "D5.6", text: "Er det kjennskap til SkatteFUNN eller andre FoU-insentiver for droneinnovasjon?", method: "Intervju", levels: ["Nei", "Hørt om det", "Undersøkt", "Søkt", "Aktivt SkatteFUNN/FoU-prosjekt"] },
      { id: "D5.7", text: "Deltar kommunen i regionale/nasjonale dronepilotprosjekter?", method: "Intervju", levels: ["Nei", "Kjenner til", "Søkt", "Deltar", "Leder et pilotprosjekt"] },
      { id: "D5.8", text: "Finnes det en plan for langsiktig droneøkosystemutvikling (utover enkeltstående prosjekter)?", method: "Intervju", levels: ["Nei", "Vage intensjoner", "Diskutert", "Skriftlig plan", "Aktiv flerårig økosystemstrategi"] },
    ],
  },
];

export const useCases: UseCase[] = [
  { id: "UC01", sector: "Plan og bygg", name: "Byggesøknader – visuell kontroll", description: "Bruke drone for visuell kontroll av byggesaker og reguleringsplaner", complexity: "Lav", minLevel: 1, dimensions: ["D3", "D4"] },
  { id: "UC02", sector: "Plan og bygg", name: "3D-modellering av områder", description: "Fotogrammetri for 3D-modeller av utbyggingsområder", complexity: "Middels", minLevel: 2, dimensions: ["D3", "D4"] },
  { id: "UC03", sector: "Plan og bygg", name: "Terrenganalyse (DSM/DTM)", description: "Digital overflate- og terrengmodeller for arealplanlegging", complexity: "Middels", minLevel: 2, dimensions: ["D3", "D4"] },
  { id: "UC04", sector: "Vann og avløp", name: "Inspeksjon av VA-infrastruktur", description: "Droneinspeksjon av rør, kummer og renseanlegg", complexity: "Middels", minLevel: 2, dimensions: ["D2", "D3"] },
  { id: "UC05", sector: "Vann og avløp", name: "Termisk lekkasjedeteksjon", description: "Bruke termisk kamera for å oppdage lekkasjer i VA-nettet", complexity: "Høy", minLevel: 3, dimensions: ["D2", "D3", "D5"] },
  { id: "UC06", sector: "Vei og transport", name: "Veginspeksjon", description: "Dronebasert tilstandsvurdering av veinettet", complexity: "Lav", minLevel: 1, dimensions: ["D3"] },
  { id: "UC07", sector: "Vei og transport", name: "Trafikktelling og -analyse", description: "Drone for overvåking og analyse av trafikkflyt", complexity: "Middels", minLevel: 2, dimensions: ["D3", "D4"] },
  { id: "UC08", sector: "Vei og transport", name: "Skredutsatte veistrekninger", description: "Overvåking av skredutsatte områder langs veinettet", complexity: "Høy", minLevel: 3, dimensions: ["D2", "D3"] },
  { id: "UC09", sector: "Miljø og klima", name: "Naturkartlegging", description: "Kartlegging av vegetasjon, våtmark og biologisk mangfold", complexity: "Middels", minLevel: 2, dimensions: ["D3", "D4"] },
  { id: "UC10", sector: "Miljø og klima", name: "Forurensningsovervåking", description: "Drone for overvåking av utslipp og forurensning", complexity: "Høy", minLevel: 3, dimensions: ["D2", "D3", "D5"] },
  { id: "UC11", sector: "Miljø og klima", name: "Strandopprydding / marin forsøpling", description: "Kartlegging av forsøpling langs kysten", complexity: "Lav", minLevel: 1, dimensions: ["D3"] },
  { id: "UC12", sector: "Beredskap", name: "Søk og redning (SAR)", description: "Droneassistert søk etter savnede personer", complexity: "Høy", minLevel: 3, dimensions: ["D2", "D3", "D5"] },
  { id: "UC13", sector: "Beredskap", name: "Brannstøtte – overblikk", description: "Drone for overblikk og varmekartlegging ved branner", complexity: "Middels", minLevel: 2, dimensions: ["D2", "D3"] },
  { id: "UC14", sector: "Beredskap", name: "Skadeomfangsvurdering", description: "Rask kartlegging av skadeomfang etter hendelser", complexity: "Middels", minLevel: 2, dimensions: ["D3", "D4"] },
  { id: "UC15", sector: "Landbruk", name: "Presisjonslandbruk", description: "Drone for overvåking av avlinger og jordhelse", complexity: "Middels", minLevel: 2, dimensions: ["D3", "D5"] },
  { id: "UC16", sector: "Landbruk", name: "Sprøyting/gjødsling", description: "Dronebasert sprøyting av avlinger", complexity: "Høy", minLevel: 3, dimensions: ["D2", "D3"] },
  { id: "UC17", sector: "Eiendom og bygg", name: "Takinspeksjon", description: "Inspeksjon av kommunale tak og fasader", complexity: "Lav", minLevel: 1, dimensions: ["D3"] },
  { id: "UC18", sector: "Eiendom og bygg", name: "Energieffektivitetskartlegging", description: "Termisk drone for energianalyse av bygningsmasse", complexity: "Middels", minLevel: 2, dimensions: ["D3", "D4"] },
  { id: "UC19", sector: "Kultur og turisme", name: "Markedsføringsfoto/-video", description: "Drone for markedsføringsmateriell av kommunen", complexity: "Lav", minLevel: 1, dimensions: ["D3"] },
  { id: "UC20", sector: "Kultur og turisme", name: "Kulturarvsdokumentasjon", description: "3D-dokumentasjon av kulturminner og historiske bygg", complexity: "Middels", minLevel: 2, dimensions: ["D3", "D4"] },
  { id: "UC21", sector: "Helse og omsorg", name: "Medikamentlevering", description: "Dronelevering av medisiner til avsidesliggende områder", complexity: "Høy", minLevel: 4, dimensions: ["D2", "D3", "D5"] },
  { id: "UC22", sector: "Helse og omsorg", name: "AED/hjertestarter-levering", description: "Dronelevering av hjertestartere ved akutte hendelser", complexity: "Høy", minLevel: 4, dimensions: ["D2", "D3", "D5"] },
  { id: "UC23", sector: "Geodata", name: "Ortofoto – oppdatering", description: "Dronebasert oppdatering av kommunens ortofoto", complexity: "Middels", minLevel: 2, dimensions: ["D3", "D4"] },
  { id: "UC24", sector: "Geodata", name: "LiDAR-scanning", description: "Dronebasert LiDAR for detaljert terrengkartlegging", complexity: "Høy", minLevel: 3, dimensions: ["D3", "D5"] },
  { id: "UC25", sector: "Skogbruk", name: "Skogtaksering", description: "Drone for kartlegging av skogressurser", complexity: "Middels", minLevel: 2, dimensions: ["D3", "D4"] },
  { id: "UC26", sector: "Skogbruk", name: "Brannforebygging i skog", description: "Droneovervåking av brannfare i skogområder", complexity: "Middels", minLevel: 2, dimensions: ["D2", "D3"] },
  { id: "UC27", sector: "Havbruk", name: "Merdeinspeksjon", description: "Inspeksjon av oppdrettsanlegg med drone", complexity: "Middels", minLevel: 2, dimensions: ["D2", "D3"] },
  { id: "UC28", sector: "Havbruk", name: "Miljøovervåking kyst", description: "Overvåking av kystmiljø og havbrukspåvirkning", complexity: "Høy", minLevel: 3, dimensions: ["D3", "D5"] },
  { id: "UC29", sector: "Smart by", name: "Trafikkanalyse i sanntid", description: "Dronebasert sanntidsanalyse av trafikk i bysentrum", complexity: "Høy", minLevel: 3, dimensions: ["D2", "D3", "D4"] },
  { id: "UC30", sector: "Smart by", name: "Luftkvalitetsmåling", description: "Drone med sensorer for måling av luftkvalitet", complexity: "Høy", minLevel: 3, dimensions: ["D3", "D5"] },
];

// Scoring engine
export function calculateDimensionScore(answers: Record<string, number>, dimensionId: string): number {
  const dimension = dimensions.find(d => d.id === dimensionId);
  if (!dimension) return 0;
  
  let total = 0;
  let answered = 0;
  
  dimension.questions.forEach(q => {
    if (answers[q.id] !== undefined) {
      total += answers[q.id];
      answered++;
    }
  });
  
  if (answered === 0) return 0;
  // Raw score out of 32, normalized to percentage, then weighted
  const rawPercent = (total / (answered * 4)) * 100;
  return rawPercent;
}

export function calculateWeightedScore(answers: Record<string, number>): number {
  let weightedTotal = 0;
  dimensions.forEach(d => {
    const dimScore = calculateDimensionScore(answers, d.id);
    weightedTotal += dimScore * d.weight;
  });
  return Math.round(weightedTotal * 10) / 10;
}

export function getMaturityLevel(score: number): MaturityLevel {
  for (const level of [...maturityLevels].reverse()) {
    if (score >= level.range[0]) return level;
  }
  return maturityLevels[0];
}

export function getRecommendedUseCases(score: number): UseCase[] {
  const level = getMaturityLevel(score);
  return useCases.filter(uc => uc.minLevel <= level.level);
}
