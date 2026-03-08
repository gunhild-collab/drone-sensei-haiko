import { ExternalLink, GraduationCap, Eye, Shield, ClipboardList } from "lucide-react";
import { PdraScenario } from "@/data/pdraScenarios";

interface Props {
  sailLevel: number;
  matchedScenario: PdraScenario | null;
}

const sectionCard = "bg-sora-surface border border-sora-border rounded-xl p-5 space-y-3";
const sectionTitle = "flex items-center gap-2 text-lg font-semibold text-sora-text";
const linkClass = "text-sora-purple hover:underline inline-flex items-center gap-1 text-sm";

export default function Step7Explanation({ sailLevel, matchedScenario }: Props) {
  const sailRoman = ['', 'I', 'II', 'III', 'IV', 'V', 'VI'][sailLevel];

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-sora-text mb-1">Krav og forklaringer</h2>
        <p className="text-sora-text-muted text-sm">
          Oversikt over krav for {matchedScenario ? matchedScenario.id : `SAIL ${sailRoman}`}.
        </p>
      </div>

      {/* Pilot competence */}
      <div className={sectionCard}>
        <h3 className={sectionTitle}><GraduationCap className="w-5 h-5 text-sora-purple" /> Pilotkompetanse</h3>
        {sailLevel <= 2 ? (
          <>
            <p className="text-sora-text text-sm">For SAIL I–II (åpen/STS kategori) kreves:</p>
            <ul className="text-sora-text-muted text-sm space-y-1 list-disc pl-4">
              <li>A1/A3 kompetansebevis (online teoriprøve)</li>
              <li>A2 sertifikat for tettbygde strøk (tilleggsprøve + praktisk selvtrening)</li>
              <li>STS-sertifikat fra godkjent ATO for STS-01/STS-02 scenarioer</li>
            </ul>
          </>
        ) : sailLevel <= 4 ? (
          <>
            <p className="text-sora-text text-sm">For SAIL III–IV kreves utvidet pilotkompetanse:</p>
            <ul className="text-sora-text-muted text-sm space-y-1 list-disc pl-4">
              <li>Gjennomført opplæring hos godkjent ATO</li>
              <li>Typetrening på aktuelt dronesystem</li>
              <li>Dokumentert flyerfaring (anbefalt 50+ timer)</li>
              <li>Currency-krav: minimum 6 timer per kvartal</li>
            </ul>
          </>
        ) : (
          <>
            <p className="text-sora-text text-sm">For SAIL V–VI kreves høy pilotkompetanse:</p>
            <ul className="text-sora-text-muted text-sm space-y-1 list-disc pl-4">
              <li>Fullstendig pilotsertifikat fra godkjent ATO</li>
              <li>Omfattende typetrening og simulator-trening</li>
              <li>Minimum 100+ flytimer dokumentert</li>
              <li>Periodisk re-sertifisering</li>
            </ul>
          </>
        )}
        <a href="https://luftfartstilsynet.no/droner/" target="_blank" rel="noopener" className={linkClass}>
          Luftfartstilsynet — droner <ExternalLink className="w-3 h-3" />
        </a>
      </div>

      {/* Airspace visibility */}
      <div className={sectionCard}>
        <h3 className={sectionTitle}><Eye className="w-5 h-5 text-sora-purple" /> Luftromssynlighet</h3>
        <p className="text-sora-text text-sm">Før hver flyging må du sjekke luftromsstatus:</p>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <ToolCard
            name="NOTAM"
            desc="Offisielle meldinger om restriksjoner og endringer i luftrommet."
            url="https://www.ippc.no/ippc/index.jsp"
          />
          <ToolCard
            name="HmSWX"
            desc="Værdata og hindringer for droneoperasjoner."
            url="https://hmswx.com"
          />
          <ToolCard
            name="Ninox Drones"
            desc="Norsk luftromskart og realtidsdata for droneflygere."
            url="https://ninoxdrones.com"
          />
          <ToolCard
            name="SafeSky"
            desc="Europeisk plattform for synlighet mellom droner og bemannet luftfart."
            url="https://www.safesky.app"
          />
        </div>
      </div>

      {/* Safety and ERP */}
      <div className={sectionCard}>
        <h3 className={sectionTitle}><Shield className="w-5 h-5 text-sora-purple" /> Sikkerhet og ERP</h3>
        <p className="text-sora-text text-sm">
          For SAIL {sailRoman} skal nødresponsplanen (ERP) inneholde:
        </p>
        <ul className="text-sora-text-muted text-sm space-y-1 list-disc pl-4">
          <li>Varslingskjede: pilot → operasjonsleder → nødetater (113/112/110)</li>
          <li>Prosedyre ved mistet C2-link (RTH / autoland)</li>
          <li>Prosedyre ved lavt batteri</li>
          <li>Prosedyre ved inntrengning i operasjonsvolum</li>
          <li>Prosedyre ved personskade eller materiell skade</li>
          {sailLevel >= 3 && <li>Rapportering til Luftfartstilsynet via Altinn (alvorlige hendelser)</li>}
          {sailLevel >= 5 && <li>Øvelsesplan: minimum 2 beredskapsøvelser per år</li>}
        </ul>
      </div>

      {/* Procedures */}
      <div className={sectionCard}>
        <h3 className={sectionTitle}><ClipboardList className="w-5 h-5 text-sora-purple" /> Rutiner</h3>
        <p className="text-sora-text text-sm">Pre-flight sjekkliste må inneholde:</p>
        <ul className="text-sora-text-muted text-sm space-y-1 list-disc pl-4">
          <li>Sjekk vær og vindforhold</li>
          <li>Kontroller NOTAM og luftromsrestriksjoner</li>
          <li>Visuell inspeksjon av drone, batterier og propeller</li>
          <li>Test C2-link og failsafe-innstillinger</li>
          <li>Verifiser at operasjonsområdet er klart for uvedkommende</li>
          <li>Briefing av alle involvert personell</li>
          <li>Go/No-go beslutning dokumentert</li>
        </ul>
        <p className="text-sora-text text-sm mt-2">Post-flight:</p>
        <ul className="text-sora-text-muted text-sm space-y-1 list-disc pl-4">
          <li>Loggfør flygetid, batteri-sykluser, hendelser</li>
          <li>Inspiser drone for skader</li>
          <li>Rapporter avvik til ansvarlig leder</li>
        </ul>
      </div>
    </div>
  );
}

function ToolCard({ name, desc, url }: { name: string; desc: string; url: string }) {
  return (
    <a href={url} target="_blank" rel="noopener" className="bg-sora-bg rounded-lg p-3 hover:bg-sora-surface-hover transition-colors group">
      <p className="text-sora-text font-medium text-sm group-hover:text-sora-purple transition-colors">{name}</p>
      <p className="text-sora-text-dim text-xs mt-0.5">{desc}</p>
    </a>
  );
}
