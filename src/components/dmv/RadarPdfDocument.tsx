/**
 * RadarPdfDocument — @react-pdf/renderer version of the Radar analysis report.
 * Shares data with the web view but renders statically for PDF export.
 */
import {
  Document, Page, View, Text, StyleSheet, Font,
} from "@react-pdf/renderer";
import {
  formatNOK, formatNOKRaw, EUR_TO_NOK,
  COUNTRY_FLAGS, SOFTWARE_CATEGORY_MAP,
  type FleetResult, type ScoredDrone,
} from "@/lib/droneFleetEngine";
import type { SoftwareProduct } from "@/hooks/useSoftwareStack";

/* ── Font registration ────────────────────────── */
Font.register({
  family: "Poppins",
  fonts: [
    { src: "https://fonts.gstatic.com/s/poppins/v21/pxiEyp8kv8JHgFVrFJA.ttf", fontWeight: 400 },
    { src: "https://fonts.gstatic.com/s/poppins/v21/pxiByp8kv8JHgFVrLEj6V1g.ttf", fontWeight: 600 },
    { src: "https://fonts.gstatic.com/s/poppins/v21/pxiByp8kv8JHgFVrLCz7V1g.ttf", fontWeight: 700 },
  ],
});

/* ── Brand colours ────────────────────────────── */
const C = {
  navy: "#1C0059",
  lilla: "#685BF8",
  rosa: "#FF66C4",
  white: "#FFFFFF",
  light: "#F5F5F7",
  dark: "#4A4A4A",
  med: "#8A8A8A",
  green: "#10B981",
  red: "#EF4444",
  orange: "#F59E0B",
};

/* ── Styles ───────────────────────────────────── */
const s = StyleSheet.create({
  page: { fontFamily: "Poppins", fontSize: 9, color: C.dark, paddingTop: 60, paddingBottom: 50, paddingHorizontal: 40 },
  coverPage: { fontFamily: "Poppins", backgroundColor: C.navy, justifyContent: "center", alignItems: "flex-start", paddingHorizontal: 60, paddingVertical: 80 },
  sectionTitle: { fontFamily: "Poppins", fontSize: 18, fontWeight: 700, color: C.navy, marginBottom: 12, marginTop: 24 },
  sectionSub: { fontSize: 12, fontWeight: 600, color: C.lilla, marginBottom: 8, marginTop: 16 },
  body: { fontSize: 9, lineHeight: 1.6, color: C.dark, marginBottom: 8 },
  // Table
  tHeader: { flexDirection: "row" as const, backgroundColor: C.navy, paddingVertical: 6, paddingHorizontal: 8 },
  tHeaderTxt: { color: C.white, fontSize: 8, fontWeight: 600 },
  tRow: { flexDirection: "row" as const, borderBottomWidth: 0.5, borderBottomColor: "#E5E5E5", paddingVertical: 5, paddingHorizontal: 8 },
  tRowAlt: { backgroundColor: C.light },
  tCell: { fontSize: 8, color: C.dark },
  // Drone card
  card: { borderWidth: 1, borderColor: C.lilla, borderRadius: 6, padding: 12, marginBottom: 12 },
  cardTitle: { fontSize: 12, fontWeight: 700, color: C.navy, marginBottom: 4 },
  cardRole: { fontSize: 8, fontWeight: 600, color: C.lilla, textTransform: "uppercase" as const, letterSpacing: 0.5, marginBottom: 6 },
  cardSpec: { fontSize: 8, color: C.med, marginBottom: 2 },
  tag: { backgroundColor: C.light, borderRadius: 3, paddingVertical: 2, paddingHorizontal: 6, fontSize: 7, color: C.dark, marginRight: 4, marginBottom: 4 },
  tagRow: { flexDirection: "row" as const, flexWrap: "wrap" as const, marginTop: 6 },
  // Cost
  costRow: { flexDirection: "row" as const, justifyContent: "space-between" as const, paddingVertical: 3, borderBottomWidth: 0.5, borderBottomColor: "#EEE" },
  costLabel: { fontSize: 9, color: C.dark },
  costValue: { fontSize: 9, fontWeight: 600, color: C.navy },
  costTotal: { flexDirection: "row" as const, justifyContent: "space-between" as const, paddingVertical: 6, borderTopWidth: 1.5, borderTopColor: C.navy, marginTop: 4 },
  // Bar chart
  barRow: { flexDirection: "row" as const, alignItems: "center" as const, marginBottom: 6 },
  barLabel: { width: 140, fontSize: 7, color: C.dark },
  barManual: { height: 10, backgroundColor: C.red, opacity: 0.7 },
  barDrone: { height: 10, backgroundColor: C.green },
  barVal: { fontSize: 7, color: C.med, marginLeft: 4 },
  // Footer
  footer: { position: "absolute" as const, bottom: 20, left: 40, right: 40, flexDirection: "row" as const, justifyContent: "space-between" as const, alignItems: "center" as const },
  footerTxt: { fontSize: 7, color: C.med },
});

const ROLE_LABELS: Record<string, string> = {
  inspection: "Inspeksjon",
  mapping: "Kartlegging og survey",
  emergency: "Beredskap og overvåking",
  monitoring: "Overvåking",
  delivery: "Helsetransport",
};

const TAG_LABELS: Record<string, string> = {
  kartlegging: "Kartlegging", jordbruk: "Jordbruk", miljo: "Miljø",
  helse_transport: "Helse", inspeksjon_bygg: "Bygg", inspeksjon_bro: "Bro",
  inspeksjon_va: "VA", inspeksjon_vei: "Vei", digital_tvilling: "Tvilling",
  brann_sar: "Brann/SAR", beredskap: "Beredskap", overvaking: "Overvåking",
};

const SW_CAT_LABELS: Record<string, string> = {
  photogrammetry: "Kartlegging", gis_integration: "GIS", inspection_analytics: "Inspeksjon",
  digital_twin: "Digital tvilling", mission_control: "Oppdragsstyring", thermal_analysis: "Termisk",
  agriculture: "Jordbruk", fleet_management: "Flåtestyring", flight_planning: "Flyplanlegging",
  utm_airspace: "UTM", data_processing: "Dataprosessering",
};

/* ── Types ────────────────────────────────────── */
export interface TaskEstimate {
  task: string;
  department: string;
  manualHours: number;
  droneHours: number;
  savedHours: number;
  savedPct: number;
}

interface CostLine { label: string; value: string }

export interface RadarPdfData {
  kommuneNavn: string;
  kommuneAreaKm2: number;
  kommunePopulation: number;
  selectedUseCases: string[];
  fleet: ScoredDrone[];
  softwareStack: SoftwareProduct[];
  timeEstimates: TaskEstimate[];
  costLines: CostLine[];
  totalYear1: string;
  annualOngoing: string;
}

/* ── Helpers ──────────────────────────────────── */
function getDroneSoftware(drone: ScoredDrone, allSw: SoftwareProduct[]): SoftwareProduct[] {
  const cats = new Set<string>();
  drone.matchedTags.forEach(tag => (SOFTWARE_CATEGORY_MAP[tag] || []).forEach(c => cats.add(c)));
  const byCategory: Record<string, SoftwareProduct> = {};
  for (const sw of allSw.filter(s => cats.has(s.category))) {
    const existing = byCategory[sw.category];
    if (!existing) { byCategory[sw.category] = sw; continue; }
    const isEu = (c: string) => ["switzerland","germany","france","netherlands","denmark","finland","norway","sweden","belgium","italy","spain","united kingdom","latvia"].includes(c.toLowerCase());
    const scoreA = (isEu(sw.vendor_country) ? 10 : 0) + (sw.api_available ? 3 : 0);
    const scoreB = (isEu(existing.vendor_country) ? 10 : 0) + (existing.api_available ? 3 : 0);
    if (scoreA > scoreB) byCategory[sw.category] = sw;
  }
  return Object.values(byCategory);
}

function swPrice(sw: SoftwareProduct): string {
  if (sw.open_source && (!sw.price_eur_year || sw.price_eur_year === 0)) return "Gratis";
  if (sw.price_eur_year && sw.price_eur_year > 0) return formatNOK(sw.price_eur_year, false) + "/år";
  return "Tilbud";
}

function Footer({ kommuneNavn }: { kommuneNavn: string }) {
  return (
    <View style={s.footer} fixed>
      <Text style={s.footerTxt}>Haiko AS · Konfidensielt</Text>
      <Text style={s.footerTxt}>{kommuneNavn} — Radar-analyse</Text>
      <Text style={s.footerTxt} render={({ pageNumber, totalPages }) => `${pageNumber} / ${totalPages}`} />
    </View>
  );
}

/* ══════════════════════════════════════════════════
   Main Document
   ══════════════════════════════════════════════════ */
export function RadarPdfDocument({ data }: { data: RadarPdfData }) {
  const today = new Date().toLocaleDateString("nb-NO", { year: "numeric", month: "long", day: "numeric" });

  return (
    <Document title={`Haiko Radar — ${data.kommuneNavn}`} author="Haiko AS" subject="Drone Modenhetsvurdering">

      {/* ── COVER ──────────────────────────── */}
      <Page size="A4" style={s.coverPage}>
        <Text style={{ fontSize: 24, color: C.rosa, fontWeight: 700, marginBottom: 30 }}>haiko</Text>
        <Text style={{ fontSize: 36, fontWeight: 700, color: C.white, marginBottom: 12, fontFamily: "Poppins" }}>Radar</Text>
        <Text style={{ fontSize: 16, color: C.rosa, fontWeight: 600, marginBottom: 8 }}>
          Droneanalyse for {data.kommuneNavn}
        </Text>
        <Text style={{ fontSize: 11, color: "#CCCCDD", marginTop: 8 }}>
          Anbefalt flåte, software, tidsbesparelse og implementeringsplan
        </Text>
        <View style={{ marginTop: 60 }}>
          <Text style={{ fontSize: 10, color: "#AAAACC" }}>
            {data.kommunePopulation.toLocaleString("nb-NO")} innbyggere · {data.kommuneAreaKm2} km²
          </Text>
          <Text style={{ fontSize: 10, color: "#AAAACC", marginTop: 4 }}>{today}</Text>
          <Text style={{ fontSize: 10, color: "#AAAACC", marginTop: 4 }}>Utarbeidet av Haiko AS · haiko.no</Text>
        </View>
      </Page>

      {/* ── FLEET ──────────────────────────── */}
      <Page size="A4" style={s.page}>
        <Text style={s.sectionTitle}>Anbefalt droneflåte</Text>
        <Text style={s.body}>
          Basert på {data.kommuneNavn}s bruksområder, geografi og budsjettramme anbefaler vi følgende flåtesammensetning.
        </Text>

        {data.fleet.map((drone, i) => {
          const p = drone.product;
          const flag = COUNTRY_FLAGS[p.manufacturers?.country || ""] || "";
          const droneSw = getDroneSoftware(drone, data.softwareStack);
          return (
            <View key={i} style={s.card} wrap={false}>
              <Text style={s.cardRole}>{ROLE_LABELS[drone.role] || drone.role}</Text>
              <Text style={s.cardTitle}>{flag} {p.manufacturers?.name} {p.product_name}</Text>
              <Text style={s.cardSpec}>
                {p.aircraft_type}
                {p.endurance_minutes ? ` · ${p.endurance_minutes} min` : ""}
                {p.range_km ? ` · ${p.range_km} km rekkevidde` : ""}
              </Text>
              <Text style={s.cardSpec}>
                Pris: {formatNOK(p.price_eur, !!p.quote_required)}
                {p.manufacturers?.country ? ` · ${p.manufacturers.country}` : ""}
              </Text>
              <View style={s.tagRow}>
                {drone.matchedTags.map((tag, j) => (
                  <Text key={j} style={s.tag}>{TAG_LABELS[tag] || tag}</Text>
                ))}
              </View>
              {droneSw.length > 0 && (
                <View style={{ marginTop: 8, padding: 6, backgroundColor: C.light, borderRadius: 4 }}>
                  <Text style={{ fontSize: 7, fontWeight: 600, color: C.lilla, marginBottom: 4 }}>Anbefalt software:</Text>
                  {droneSw.slice(0, 4).map((sw, si) => (
                    <Text key={si} style={{ fontSize: 7, color: C.dark, marginBottom: 1 }}>
                      • {SW_CAT_LABELS[sw.category] || sw.category}: {sw.name} — {swPrice(sw)}
                    </Text>
                  ))}
                </View>
              )}
            </View>
          );
        })}

        {/* Coverage matrix */}
        <Text style={s.sectionSub}>Sambruk på tvers av avdelinger</Text>
        <View>
          <View style={s.tHeader}>
            <Text style={[s.tHeaderTxt, { width: 140 }]}>Bruksområde</Text>
            {data.fleet.map((d, i) => (
              <Text key={i} style={[s.tHeaderTxt, { width: 100, textAlign: "center" }]}>{d.product.product_name}</Text>
            ))}
          </View>
          {data.selectedUseCases.slice(0, 15).map((uc, i) => (
            <View key={i} style={[s.tRow, i % 2 === 1 && s.tRowAlt]}>
              <Text style={[s.tCell, { width: 140 }]}>{uc}</Text>
              {data.fleet.map((d, j) => (
                <Text key={j} style={[s.tCell, { width: 100, textAlign: "center" }]}>
                  {d.matchedTags.some(t => uc.toLowerCase().includes(t.replace(/_/g, " ").substring(0, 4))) ? "●" : ""}
                </Text>
              ))}
            </View>
          ))}
        </View>

        <Footer kommuneNavn={data.kommuneNavn} />
      </Page>

      {/* ── SOFTWARE + COST ────────────────── */}
      <Page size="A4" style={s.page}>
        <Text style={s.sectionTitle}>Anbefalt software</Text>
        <View>
          <View style={s.tHeader}>
            <Text style={[s.tHeaderTxt, { width: 90 }]}>Kategori</Text>
            <Text style={[s.tHeaderTxt, { width: 110 }]}>Produkt</Text>
            <Text style={[s.tHeaderTxt, { width: 80 }]}>Leverandør</Text>
            <Text style={[s.tHeaderTxt, { width: 50 }]}>Land</Text>
            <Text style={[s.tHeaderTxt, { width: 70 }]}>Pris/år</Text>
            <Text style={[s.tHeaderTxt, { width: 60 }]}>Type</Text>
          </View>
          {data.softwareStack.map((sw, i) => (
            <View key={i} style={[s.tRow, i % 2 === 1 && s.tRowAlt]}>
              <Text style={[s.tCell, { width: 90 }]}>{SW_CAT_LABELS[sw.category] || sw.category}</Text>
              <Text style={[s.tCell, { width: 110, fontWeight: 600 }]}>{sw.name}</Text>
              <Text style={[s.tCell, { width: 80 }]}>{sw.vendor_name}</Text>
              <Text style={[s.tCell, { width: 50 }]}>{COUNTRY_FLAGS[sw.vendor_country] || sw.vendor_country}</Text>
              <Text style={[s.tCell, { width: 70 }]}>{swPrice(sw)}</Text>
              <Text style={[s.tCell, { width: 60 }]}>{sw.deployment || "-"}</Text>
            </View>
          ))}
        </View>

        {/* Cost table */}
        <Text style={s.sectionSub}>Estimert systemkostnad</Text>
        <View style={{ marginTop: 8 }}>
          {data.costLines.map((line, i) => (
            <View key={i} style={s.costRow}>
              <Text style={s.costLabel}>{line.label}</Text>
              <Text style={s.costValue}>{line.value}</Text>
            </View>
          ))}
          <View style={s.costTotal}>
            <Text style={{ fontSize: 10, fontWeight: 700, color: C.navy }}>Totalt år 1</Text>
            <Text style={{ fontSize: 10, fontWeight: 700, color: C.lilla }}>{data.totalYear1}</Text>
          </View>
          <View style={s.costRow}>
            <Text style={s.costLabel}>Løpende årlig (år 2+)</Text>
            <Text style={s.costValue}>{data.annualOngoing}</Text>
          </View>
        </View>

        <Footer kommuneNavn={data.kommuneNavn} />
      </Page>

      {/* ── TIME SAVINGS ───────────────────── */}
      <Page size="A4" style={s.page}>
        <Text style={s.sectionTitle}>Tidsbesparelse: manuelt → drone</Text>
        <Text style={s.body}>
          Estimert arbeidstid med og uten sentralisert dronedrift, basert på {data.kommuneNavn}s størrelse og oppgavevolum.
        </Text>

        {data.timeEstimates.map((task, i) => {
          const maxH = Math.max(...data.timeEstimates.map(t => t.manualHours));
          const mW = maxH > 0 ? (task.manualHours / maxH) * 280 : 0;
          const dW = maxH > 0 ? (task.droneHours / maxH) * 280 : 0;
          return (
            <View key={i} style={s.barRow} wrap={false}>
              <Text style={s.barLabel}>{task.task}</Text>
              <View>
                <View style={{ flexDirection: "row", alignItems: "center" }}>
                  <View style={[s.barManual, { width: Math.max(2, mW) }]} />
                  <Text style={s.barVal}>{task.manualHours}t</Text>
                </View>
                <View style={{ flexDirection: "row", alignItems: "center", marginTop: 1 }}>
                  <View style={[s.barDrone, { width: Math.max(2, dW) }]} />
                  <Text style={s.barVal}>{task.droneHours}t</Text>
                </View>
              </View>
            </View>
          );
        })}

        {/* Summary box */}
        {(() => {
          const totalManual = data.timeEstimates.reduce((s, t) => s + t.manualHours, 0);
          const totalDrone = data.timeEstimates.reduce((s, t) => s + t.droneHours, 0);
          const saved = totalManual - totalDrone;
          const pct = totalManual > 0 ? Math.round((saved / totalManual) * 100) : 0;
          return (
            <View style={{ backgroundColor: C.light, padding: 12, borderRadius: 6, marginTop: 16 }}>
              <Text style={{ fontSize: 10, fontWeight: 700, color: C.navy, marginBottom: 6 }}>Oppsummering</Text>
              <Text style={{ fontSize: 9, color: C.dark, marginBottom: 3 }}>Estimert arbeidstid i dag: {totalManual} timer/år</Text>
              <Text style={{ fontSize: 9, color: C.dark, marginBottom: 3 }}>Med sentralisert drone: {totalDrone} timer/år</Text>
              <Text style={{ fontSize: 11, fontWeight: 700, color: C.lilla }}>
                Besparelse: {saved} timer/år ({pct}%) ≈ {(saved / 1700).toFixed(1)} årsverk
              </Text>
            </View>
          );
        })()}

        <Footer kommuneNavn={data.kommuneNavn} />
      </Page>

      {/* ── REGULATORY ─────────────────────── */}
      <Page size="A4" style={s.page}>
        <Text style={s.sectionTitle}>Regulatorisk veikart</Text>
        <Text style={s.body}>Hva som kreves for å fly lovlig med den anbefalte flåten.</Text>

        <View style={{ flexDirection: "row", gap: 8, marginVertical: 12 }}>
          {[
            { step: "Trinn 1", title: "VLOS-drift", time: "Dag 1", items: ["A2-sertifikat", "Manuell pilot", "<120m, <500m radius"] },
            { step: "Trinn 2", title: "BVLOS", time: "3–6 mnd", items: ["SORA-søknad", "Remote pilot fra dock", "Operasjonsmanual"] },
            { step: "Trinn 3", title: "Autonom", time: "12–18 mnd", items: ["LUC-sertifikat", "Selvgodkjenning", "Nye kommuner på dager"] },
          ].map((item, i) => (
            <View key={i} style={{ flex: 1, borderWidth: 1, borderColor: i === 0 ? C.green : i === 1 ? C.orange : C.lilla, borderRadius: 6, padding: 10 }}>
              <Text style={{ fontSize: 7, fontWeight: 600, color: C.med }}>{item.step} · {item.time}</Text>
              <Text style={{ fontSize: 10, fontWeight: 700, color: C.navy, marginVertical: 4 }}>{item.title}</Text>
              {item.items.map((it, j) => (
                <Text key={j} style={{ fontSize: 8, color: C.dark, marginBottom: 2 }}>• {it}</Text>
              ))}
            </View>
          ))}
        </View>

        <Text style={s.body}>
          Haiko bistår med utarbeidelse av alle SORA-søknader, operasjonsmanual og kommunikasjon med Luftfartstilsynet som del av implementeringsprosessen.
        </Text>

        {/* Digital twin */}
        <Text style={s.sectionTitle}>Digital tvilling — autonom inspeksjon</Text>
        <View style={{ flexDirection: "row", gap: 6, marginVertical: 12 }}>
          {[
            { n: "1", title: "Baseline", desc: "Førstegangs 3D-skanning av kommunens bygninger" },
            { n: "2", title: "Autonom flyging", desc: "Drone flyr samme rute kvartalsvis eller ved behov" },
            { n: "3", title: "AI-analyse", desc: "Software sammenligner nye bilder mot baseline" },
            { n: "4", title: "Oppdatert tvilling", desc: "3D-modell oppdateres. Avvik flagges i dashboard." },
          ].map((step, i) => (
            <View key={i} style={{ flex: 1, backgroundColor: C.light, borderRadius: 6, padding: 8 }}>
              <Text style={{ fontSize: 16, fontWeight: 700, color: C.lilla }}>{step.n}</Text>
              <Text style={{ fontSize: 9, fontWeight: 600, color: C.navy, marginVertical: 3 }}>{step.title}</Text>
              <Text style={{ fontSize: 7, color: C.dark }}>{step.desc}</Text>
            </View>
          ))}
        </View>

        <Footer kommuneNavn={data.kommuneNavn} />
      </Page>

      {/* ── LAST PAGE: Next steps ──────────── */}
      <Page size="A4" style={s.coverPage}>
        <Text style={{ fontSize: 24, color: C.rosa, fontWeight: 700, marginBottom: 40 }}>haiko</Text>
        <Text style={{ fontSize: 22, fontWeight: 700, color: C.white, marginBottom: 16 }}>Neste steg</Text>
        <Text style={{ fontSize: 11, color: "#CCCCDD", lineHeight: 2 }}>
          {"1. Gjennomgang av denne rapporten med Haiko\n2. Fullstendig Preflight Pro-analyse tilpasset " + data.kommuneNavn + "\n3. Tilbudsinnhenting på anbefalt hardware og software\n4. SORA-søknad og regulatorisk godkjenning\n5. Implementering og opplæring"}
        </Text>
        <View style={{ marginTop: 50 }}>
          <Text style={{ fontSize: 11, color: C.rosa, fontWeight: 600 }}>Gunhild Fretheim</Text>
          <Text style={{ fontSize: 10, color: "#AAAACC", marginTop: 4 }}>gunhild@haiko.no · +47 482 84 691</Text>
          <Text style={{ fontSize: 10, color: "#AAAACC", marginTop: 4 }}>haiko.no</Text>
        </View>
      </Page>
    </Document>
  );
}
