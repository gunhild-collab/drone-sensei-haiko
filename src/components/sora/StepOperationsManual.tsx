import { useState, useRef } from "react";
import { Pencil, Check, Download, Info, Printer } from "lucide-react";
import { DroneSpec } from "@/data/droneDatabase";
import { SoraResults } from "@/lib/soraCalculations";
import { FlightAreaData } from "@/components/sora/Step2FlightArea";

interface Props {
  applicantName: string;
  applicantEmail: string;
  flightDate: string;
  municipality: string;
  selectedDrone: DroneSpec | null;
  results: SoraResults;
  flightAreaData: FlightAreaData | null;
  derivedInputs: {
    operationType: string;
    maxAltitude: number;
    populationDensity: string;
    dayNight: string;
    m1: number;
    m2: number;
    mtom: number;
    characteristicDimension: number;
    droneName: string;
  };
  scenario: string | null;
  manualTexts: Record<string, string>;
  onManualTextChange: (key: string, value: string) => void;
}

const popLabels: Record<string, string> = {
  controlled: 'Kontrollert bakkeområde',
  sparsely: 'Tynt befolket område',
  populated: 'Befolket område',
  gathering: 'Forsamling av mennesker',
};

function EditableField({ fieldKey, label, placeholder, value, onChange }: {
  fieldKey: string;
  label?: string;
  placeholder: string;
  value: string;
  onChange: (key: string, val: string) => void;
}) {
  const [editing, setEditing] = useState(false);
  const ref = useRef<HTMLTextAreaElement>(null);

  if (editing) {
    return (
      <div className="relative">
        {label && <span className="text-sora-text-dim text-xs">{label}</span>}
        <textarea
          ref={ref}
          className="w-full bg-sora-surface border border-sora-purple/40 rounded-lg p-3 text-sm text-sora-text resize-y min-h-[60px] focus:outline-none focus:ring-1 focus:ring-sora-purple"
          value={value}
          placeholder={placeholder}
          onChange={e => onChange(fieldKey, e.target.value)}
          autoFocus
        />
        <button
          onClick={() => setEditing(false)}
          className="absolute top-1 right-1 p-1 rounded bg-sora-purple/20 text-sora-purple hover:bg-sora-purple/30"
        >
          <Check className="w-3 h-3" />
        </button>
      </div>
    );
  }

  return (
    <div className="group relative">
      {label && <span className="text-sora-text-dim text-xs">{label}</span>}
      <div className="text-sm text-sora-text whitespace-pre-wrap">
        {value || <span className="text-sora-text-dim italic">{placeholder}</span>}
      </div>
      <button
        onClick={() => setEditing(true)}
        className="print:hidden absolute top-0 right-0 p-1 rounded opacity-0 group-hover:opacity-100 bg-sora-surface text-sora-text-muted hover:text-sora-purple transition-opacity"
        title="Rediger"
      >
        <Pencil className="w-3 h-3" />
      </button>
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="manual-section bg-white rounded-xl p-6 space-y-3 print:shadow-none print:border print:border-gray-200">
      <h2 className="text-lg font-bold text-gray-900 border-b border-gray-200 pb-2">{title}</h2>
      <div className="space-y-2 text-gray-800">{children}</div>
    </div>
  );
}

function Row({ label, value }: { label: string; value: string | number | undefined | null }) {
  return (
    <div className="flex gap-2 text-sm">
      <span className="font-medium text-gray-600 min-w-[200px]">{label}:</span>
      <span className="text-gray-900">{value ?? '—'}</span>
    </div>
  );
}

function equipmentList(drone: DroneSpec | null): string {
  if (!drone) return '—';
  const items: string[] = [];
  if (drone.hasThermal) items.push('Termisk kamera');
  if (drone.hasRTK) items.push('RTK');
  if (drone.hasParachute) items.push('Fallskjerm');
  if (drone.hasRemoteId) items.push('Remote ID');
  return items.length > 0 ? items.join(', ') : 'Standardutstyr';
}

export default function StepOperationsManual({
  applicantName, applicantEmail, flightDate, municipality, selectedDrone,
  results, flightAreaData, derivedInputs, scenario, manualTexts, onManualTextChange,
}: Props) {
  const today = new Date().toLocaleDateString('nb-NO');
  const t = (key: string) => manualTexts[key] || '';

  const handlePrint = () => {
    window.print();
  };

  const isSTS = scenario?.startsWith('STS');
  const isPDRA = scenario?.startsWith('PDRA');
  const isOpen = scenario?.startsWith('A');

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-sora-text mb-2">Operasjonsmanual</h1>
        <div className="bg-sora-surface border border-sora-border rounded-xl p-4 flex gap-3 items-start print:hidden">
          <Info className="w-5 h-5 text-sora-purple mt-0.5 shrink-0" />
          <p className="text-sm text-sora-text-muted">
            Dette er et automatisk generert utkast basert på informasjonen du har oppgitt.
            Gjennomgå alle seksjoner nøye og tilpass der det er nødvendig før du signerer og sender inn.
          </p>
        </div>
      </div>

      {/* Printable manual content */}
      <div id="operations-manual-print" className="space-y-4 print:space-y-0">
        {/* 1. Forside */}
        <Section title="1. Forside">
          <div className="text-center py-4 print:py-8">
            <p className="text-2xl font-bold text-gray-900 print:text-3xl">OPERASJONSMANUAL</p>
            <p className="text-xl text-gray-700 mt-2">{applicantName || '[Operatørnavn]'}</p>
            <p className="text-sm text-gray-500 mt-4">Dato: {today}</p>
            <p className="text-sm text-gray-500">Drone: {selectedDrone?.name || derivedInputs.droneName || '—'} — {selectedDrone?.manufacturer || '—'}</p>
            <p className="text-sm text-gray-500">Scenario: {scenario || '—'}</p>
            <p className="text-sm text-gray-500">SAIL: {results.sailRoman || '—'}</p>
            <p className="text-xs text-gray-400 mt-4">Versjon: 1.0 — Utkast</p>
          </div>
        </Section>

        {/* 2. Operatørinformasjon */}
        <Section title="2. Operatørinformasjon">
          <Row label="Operatørnavn" value={applicantName} />
          <Row label="E-post" value={applicantEmail} />
          <Row label="Operasjonsadresse" value={flightAreaData ? flightAreaData.flightDescription : municipality} />
          <EditableField fieldKey="regNumber" placeholder="Fyll inn droneregistreringsnummer" value={t('regNumber')} onChange={onManualTextChange} />
          <EditableField fieldKey="pilotCert" placeholder="Fyll inn pilotsertifikat (type og nummer)" value={t('pilotCert')} onChange={onManualTextChange} />
        </Section>

        {/* 3. Luftfartøy */}
        <Section title="3. Luftfartøy">
          <Row label="Dronemodell" value={selectedDrone?.name || derivedInputs.droneName} />
          <Row label="Produsent" value={selectedDrone?.manufacturer} />
          <Row label="MTOM" value={`${derivedInputs.mtom} kg`} />
          <Row label="Karakteristisk dimensjon" value={`${derivedInputs.characteristicDimension} m`} />
          <Row label="Maks hastighet" value={selectedDrone ? `${selectedDrone.maxSpeed} m/s` : '—'} />
          <Row label="Klasse" value={selectedDrone?.categoryClass} />
          <Row label="BVLOS-egnet" value={selectedDrone?.supportsBVLOS ? 'Ja' : 'Nei'} />
          <Row label="Nyttelast" value={selectedDrone ? `${selectedDrone.payloadKg} kg` : '—'} />
          <Row label="Nyttelasttype" value={selectedDrone?.notes} />
          <Row label="Utstyr" value={equipmentList(selectedDrone)} />
        </Section>

        {/* 4. Operasjonsområde */}
        <Section title="4. Operasjonsområde">
          <Row label="Lokasjon" value={flightAreaDatafl?.flightDescription| '—'} />
          <Row label="Kommune" value={municipality} />
          <Row label="Koordinater takeoff" value={flightAreaData?.takeoffPoint ? `${flightAreaData.takeoffPoint[0].toFixed(5)}, ${flightAreaData.takeoffPoint[1].toFixed(5)}` : '—'} />
          <Row label="Flygehøyde (maks)" value={`${derivedInputs.maxAltitude} m AGL`} />
          <Row label="Operasjonstype" value={derivedInputs.operationType} />
          <Row label="Befolkningstetthet" value={popLabels[derivedInputs.populationDensity] || derivedInputs.populationDensity} />
        </Section>

        {/* 5. Risikovurdering */}
        <Section title="5. Risikovurdering (sammendrag)">
          <Row label="Intrinsic GRC" value={results.intrinsicGrc} />
          <Row label="M1-reduksjon" value={derivedInputs.m1} />
          <Row label="M2-reduksjon" value={derivedInputs.m2} />
          <Row label="Final GRC" value={results.finalGrc} />
          <Row label="ARC" value={results.residualArc} />
          <Row label="SAIL" value={results.sailRoman} />
          <Row label="Matchet scenario" value={scenario || 'Ingen'} />
        </Section>

        {/* 6. Operasjonelle prosedyrer */}
        <Section title="6. Operasjonelle prosedyrer">
          <div className="space-y-4">
            <div>
              <p className="font-medium text-gray-700 text-sm mb-1">Pre-flight sjekkliste:</p>
              <EditableField
                fieldKey="preflight"
                placeholder="Pilot kontrollerer batteri, propeller, GPS-signal, RTK-tilkobling og luftromsstatus via Ninox/SafeSky før hver operasjon."
                value={t('preflight')}
                onChange={onManualTextChange}
              />
            </div>
            <div>
              <p className="font-medium text-gray-700 text-sm mb-1">Under-flight prosedyre:</p>
              <EditableField
                fieldKey="inflight"
                placeholder={derivedInputs.operationType === 'BVLOS'
                  ? "Pilot overvåker telemetri kontinuerlig ved BVLOS. Kommunikasjon med eventuelle observatører skjer via radio."
                  : "Pilot opprettholder VLOS til enhver tid. Kommunikasjon med eventuelle observatører skjer via radio."}
                value={t('inflight')}
                onChange={onManualTextChange}
              />
            </div>
            <div>
              <p className="font-medium text-gray-700 text-sm mb-1">Post-flight sjekkliste:</p>
              <EditableField
                fieldKey="postflight"
                placeholder="Drone inspiseres for skader. Batteri avlades til lagringskapasitet. Hendelser logges i operasjonslogg."
                value={t('postflight')}
                onChange={onManualTextChange}
              />
            </div>
          </div>
        </Section>

        {/* 7. Nødprosedyrer */}
        <Section title="7. Nødprosedyrer (ERP)">
          <div className="space-y-4">
            <div>
              <p className="font-medium text-gray-700 text-sm mb-1">Ved teknisk feil:</p>
              <EditableField
                fieldKey="erpTech"
                placeholder="Pilot aktiverer Return-to-Home umiddelbart. Dersom RTH feiler, utføres manuell nødlanding på forhåndsdefinert sikker lokasjon."
                value={t('erpTech')}
                onChange={onManualTextChange}
              />
            </div>
            <div>
              <p className="font-medium text-gray-700 text-sm mb-1">Ved luftromskonflikt:</p>
              <EditableField
                fieldKey="erpAirspace"
                placeholder="Operasjonen avbrytes umiddelbart. Drone landes på nærmeste trygge punkt. Luftfartstilsynet varsles dersom hendelsen medfører risiko."
                value={t('erpAirspace')}
                onChange={onManualTextChange}
              />
            </div>
            <div>
              <p className="font-medium text-gray-700 text-sm mb-1">Ved personskade eller materialskade:</p>
              <EditableField
                fieldKey="erpInjury"
                placeholder="Operasjonen stoppes. Nødetatene varsles via 112/113. Hendelsen rapporteres til Luftfartstilsynet via https://www.luftfartstilsynet.no/hendelsesrapportering"
                value={t('erpInjury')}
                onChange={onManualTextChange}
              />
            </div>
          </div>
        </Section>

        {/* 8. Vedlikehold */}
        <Section title="8. Vedlikehold">
          <EditableField fieldKey="maintInterval" placeholder="Fyll inn vedlikeholdsintervall" value={t('maintInterval')} onChange={onManualTextChange} />
          <EditableField fieldKey="maintResponsible" placeholder="Fyll inn ansvarlig for vedlikehold" value={t('maintResponsible')} onChange={onManualTextChange} />
          <EditableField fieldKey="maintLog" placeholder="Fyll inn hvor logg oppbevares" value={t('maintLog')} onChange={onManualTextChange} />
        </Section>

        {/* 9. Kompetanse */}
        <Section title="9. Kompetanse og opplæring">
          <EditableField fieldKey="compCert" placeholder="Fyll inn pilotsertifikat type og nummer" value={t('compCert')} onChange={onManualTextChange} />
          <EditableField fieldKey="compLastCourse" placeholder="Fyll inn dato for siste repetisjonskurs" value={t('compLastCourse')} onChange={onManualTextChange} />
          <EditableField fieldKey="compExtra" placeholder="Fyll inn tilleggsopplæring (BVLOS, termisk, osv.)" value={t('compExtra')} onChange={onManualTextChange} />
        </Section>

        {/* 10. Underskrift */}
        <Section title="10. Underskrift">
          <p className="text-sm text-gray-700 italic">
            Jeg bekrefter at denne operasjonsmanualen er korrekt og at operasjonen vil gjennomføres i henhold til gjeldende regelverk (EU 2019/947 implementert i norsk rett).
          </p>
          <div className="mt-4 space-y-2">
            <Row label="Navn" value={applicantName} />
            <Row label="Dato" value={today} />
            <p className="text-sm text-gray-600">Signatur: ___________________________</p>
          </div>
        </Section>

        {/* Print footer */}
        <div className="hidden print:block text-center text-xs text-gray-400 mt-8 pt-4 border-t border-gray-200">
          Haiko AS — haiko.no — Generert {today}
        </div>
      </div>

      {/* Download button */}
      <div className="print:hidden pt-4">
        <button
          onClick={handlePrint}
          className="w-full flex items-center justify-center gap-2 px-6 py-4 rounded-xl bg-sora-purple text-sora-text font-semibold text-base hover:opacity-90 transition-opacity"
        >
          <Printer className="w-5 h-5" /> Last ned som PDF
        </button>
        <p className="text-xs text-sora-text-dim text-center mt-2">Bruk «Lagre som PDF» i utskriftsdialogen</p>
      </div>
    </div>
  );
}
