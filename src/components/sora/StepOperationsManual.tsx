import { useState, useMemo } from "react";
import { ChevronDown, ChevronUp, Check, Info, Printer, Eye, Loader2 } from "lucide-react";
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

const CERT_TYPES = ['A1/A3', 'A2', 'STS', 'Specific'];

const REQUIRED_FIELDS = [
  'regNumber', 'certType', 'certNumber',
  'erpTechFail', 'erpCommLoss', 'erpAirspace', 'erpInjury', 'erpFire',
  'preflight', 'pilotName',
];

// For VLOS, erpCommLoss is not required
function getRequiredFields(opType: string) {
  if (opType === 'VLOS') return REQUIRED_FIELDS.filter(f => f !== 'erpCommLoss');
  return REQUIRED_FIELDS;
}

function LockedField({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <label className="haiko-label block mb-1">{label}</label>
      <div className="bg-sora-light border-l-2 border-sora-purple rounded-lg px-3 py-2.5 text-sm text-sora-text font-sora flex items-center justify-between">
        <span>{value || '—'}</span>
        <span className="text-[11px] bg-sora-light text-sora-purple px-2 py-0.5 rounded-full font-medium font-sora whitespace-nowrap ml-2">Hentet automatisk</span>
      </div>
    </div>
  );
}

function FormField({ label, required, children }: { label: string; required?: boolean; children: React.ReactNode }) {
  return (
    <div>
      <label className="haiko-label block mb-1">
        {label}{required && <span className="text-sora-pink ml-0.5">*</span>}
      </label>
      {children}
    </div>
  );
}

function SectionCard({ title, index, complete, children }: { title: string; index: number; complete: boolean; children: React.ReactNode }) {
  const [open, setOpen] = useState(true);
  return (
    <div className="haiko-card overflow-hidden">
      <button onClick={() => setOpen(!open)} className="w-full flex items-center justify-between px-5 py-3.5 text-left hover:bg-sora-surface-hover transition-colors">
        <div className="flex items-center gap-3">
          <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${complete ? 'bg-gradient-to-br from-sora-pink to-sora-purple text-white' : 'bg-sora-light text-sora-purple'}`}>
            {complete ? <Check className="w-3.5 h-3.5" strokeWidth={2} /> : index}
          </div>
          <span className="font-display font-bold text-[15px] text-sora-text">{title}</span>
        </div>
        {open ? <ChevronUp className="w-5 h-5 text-sora-purple" strokeWidth={1.5} /> : <ChevronDown className="w-5 h-5 text-sora-purple" strokeWidth={1.5} />}
      </button>
      {open && <div className="px-5 pb-5 space-y-3 border-t border-sora-border pt-4">{children}</div>}
    </div>
  );
}

function PreviewRow({ label, value, missing }: { label: string; value: string; missing?: boolean }) {
  return (
    <div className="flex gap-2 text-sm font-sora">
      <span className="font-medium text-sora-text-dim min-w-[180px]">{label}:</span>
      {missing ? (
        <span className="text-sora-pink border-b border-sora-pink border-dashed italic">Ikke utfylt</span>
      ) : (
        <span className="text-sora-text">{value}</span>
      )}
    </div>
  );
}

export default function StepOperationsManual({
  applicantName, applicantEmail, flightDate, municipality, selectedDrone,
  results, flightAreaData, derivedInputs, scenario, manualTexts, onManualTextChange,
}: Props) {
  const [showPreviewMobile, setShowPreviewMobile] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [generated, setGenerated] = useState(false);

  const t = (key: string) => manualTexts[key] || '';
  const set = (key: string, val: string) => onManualTextChange(key, val);
  const today = new Date().toLocaleDateString('nb-NO');

  const isBVLOS = derivedInputs.operationType === 'BVLOS' || derivedInputs.operationType === 'EVLOS';
  const requiredFields = useMemo(() => getRequiredFields(derivedInputs.operationType), [derivedInputs.operationType]);
  const filledCount = useMemo(() => requiredFields.filter(f => t(f).trim().length > 0).length, [requiredFields, manualTexts]);
  const remaining = requiredFields.length - filledCount;
  const allFilled = remaining === 0;

  const address = flightAreaData?.flightDescription || municipality || '—';
  const takeoffCoords = (() => {
    const tp = flightAreaData?.takeoffPoint;
    if (!tp) return '—';
    const lat = (tp as any).lat ?? (tp as any)[0] ?? 0;
    const lng = (tp as any).lng ?? (tp as any)[1] ?? 0;
    return `${Number(lat).toFixed(5)}, ${Number(lng).toFixed(5)}`;
  })();

  // Section completion
  const sec1Done = ['regNumber', 'certType', 'certNumber'].every(f => t(f).trim().length > 0);
  const sec3Done = true; // all locked
  const sec4Done = (() => {
    const erpFields = ['erpTechFail', 'erpAirspace', 'erpInjury', 'erpFire'];
    if (isBVLOS) erpFields.push('erpCommLoss');
    return erpFields.every(f => t(f).trim().length > 0);
  })();
  const sec5Done = t('preflight').trim().length > 0;
  const sec7Done = t('pilotName').trim().length > 0;

  const inputCls = "haiko-input w-full";
  const textareaCls = "haiko-input w-full resize-y min-h-[80px]";

  const handleGenerate = () => {
    setGenerating(true);
    setTimeout(() => {
      setGenerating(false);
      setGenerated(true);
      setTimeout(() => window.print(), 300);
    }, 1200);
  };

  const equipList = (() => {
    if (!selectedDrone) return '—';
    const items: string[] = [];
    if (selectedDrone.hasThermal) items.push('Termisk kamera');
    if (selectedDrone.hasRTK) items.push('RTK');
    if (selectedDrone.hasParachute) items.push('Fallskjerm');
    if (selectedDrone.hasRemoteId) items.push('Remote ID');
    return items.length > 0 ? items.join(', ') : 'Standardutstyr';
  })();

  // ---- FORM ----
  const formContent = (
    <div className="space-y-4 print:hidden">
      {/* Progress */}
      <div className="flex items-center gap-2 flex-wrap">
        {[
          { label: 'Operatør', done: sec1Done },
          { label: 'Luftfartøy', done: true },
          { label: 'Område', done: sec3Done },
          { label: 'ERP', done: sec4Done },
          { label: 'Prosedyrer', done: sec5Done },
          { label: 'Vedlikehold', done: true },
          { label: 'Kompetanse', done: sec7Done },
        ].map((s, i) => (
          <div key={i} className="flex items-center gap-1">
            <div className={`w-5 h-5 rounded-full flex items-center justify-center ${s.done ? 'bg-gradient-to-br from-sora-pink to-sora-purple text-white' : 'bg-sora-light text-sora-text-dim'}`}>
              {s.done ? <Check className="w-3 h-3" strokeWidth={2} /> : <span className="text-[9px]">{i + 1}</span>}
            </div>
            <span className={`text-[11px] font-sora ${s.done ? 'text-sora-purple font-semibold' : 'text-sora-text-dim'}`}>{s.label}</span>
            {i < 6 && <div className={`w-3 h-px ${s.done ? 'bg-gradient-to-r from-sora-pink to-sora-purple' : 'bg-sora-border'}`} />}
          </div>
        ))}
      </div>

      {/* S1 - Operatør */}
      <SectionCard title="Operatørinformasjon" index={1} complete={sec1Done}>
        <LockedField label="Operatørnavn" value={applicantName} />
        <LockedField label="E-post" value={applicantEmail} />
        <LockedField label="Operasjonsadresse" value={address} />
        <FormField label="Droneregistreringsnummer" required>
          <input className={inputCls} placeholder="NOR-DJI-M30T-00123" value={t('regNumber')} onChange={e => set('regNumber', e.target.value)} />
        </FormField>
        <FormField label="Type pilotsertifikat" required>
          <select className={inputCls} value={t('certType')} onChange={e => set('certType', e.target.value)}>
            <option value="">Velg type...</option>
            {CERT_TYPES.map(ct => <option key={ct} value={ct}>{ct}</option>)}
          </select>
        </FormField>
        <FormField label="Sertifikatnummer" required>
          <input className={inputCls} placeholder="NO-CERT-2024-XXXXX" value={t('certNumber')} onChange={e => set('certNumber', e.target.value)} />
        </FormField>
      </SectionCard>

      {/* S2 - Luftfartøy */}
      <SectionCard title="Luftfartøy" index={2} complete={true}>
        <LockedField label="Dronemodell" value={selectedDrone?.name || derivedInputs.droneName} />
        <LockedField label="Produsent" value={selectedDrone?.manufacturer || '—'} />
        <LockedField label="MTOM" value={`${derivedInputs.mtom} kg`} />
        <LockedField label="Karakteristisk dimensjon" value={`${derivedInputs.characteristicDimension} m`} />
        <LockedField label="Maks hastighet" value={selectedDrone ? `${selectedDrone.maxSpeed} m/s` : '—'} />
        <LockedField label="Klasse" value={selectedDrone?.categoryClass || '—'} />
        <LockedField label="BVLOS-egnet" value={selectedDrone?.supportsBVLOS ? 'Ja' : 'Nei'} />
        <LockedField label="Nyttelast" value={selectedDrone ? `${selectedDrone.payloadKg} kg` : '—'} />
        <LockedField label="Utstyr" value={equipList} />
      </SectionCard>

      {/* S3 - Operasjonsområde */}
      <SectionCard title="Operasjonsområde" index={3} complete={sec3Done}>
        <LockedField label="Lokasjon" value={address} />
        <LockedField label="Kommune" value={municipality} />
        <LockedField label="Flygehøyde maks" value={`${derivedInputs.maxAltitude} m AGL`} />
        <LockedField label="Operasjonstype" value={derivedInputs.operationType} />
        <FormField label="Tidsrom for operasjon">
          <input className={inputCls} placeholder="Hverdager 08:00–16:00, unngå helligdager" value={t('opTimeframe')} onChange={e => set('opTimeframe', e.target.value)} />
        </FormField>
        <FormField label="Eventuelle restriksjoner i området">
          <input className={inputCls} placeholder="CTR Gardermoen, høyspenttrasé innenfor 200m" value={t('opRestrictions')} onChange={e => set('opRestrictions', e.target.value)} />
        </FormField>
      </SectionCard>

      {/* S4 - ERP */}
      <SectionCard title="Nødprosedyrer (ERP)" index={4} complete={sec4Done}>
        <div className="bg-sora-purple/10 border border-sora-purple/20 rounded-lg p-3 flex gap-2 items-start">
          <Info className="w-4 h-4 text-sora-purple mt-0.5 shrink-0" />
          <p className="text-xs text-sora-text-muted">ERP-planen beskriver hva piloten gjør når noe går galt. Svar på hvert scenario under. Forslagene kan brukes direkte eller tilpasses.</p>
        </div>
        <FormField label="Ved teknisk feil på dronen" required>
          <textarea className={textareaCls} placeholder="Pilot aktiverer Return-to-Home umiddelbart. Dersom RTH feiler, utføres manuell nødlanding på forhåndsdefinert sikker lokasjon utenfor folkemengde. Operasjonen avbrytes og dronen inspiseres." value={t('erpTechFail')} onChange={e => set('erpTechFail', e.target.value)} />
        </FormField>
        {isBVLOS && (
          <FormField label="Ved tap av kommunikasjonsforbindelse" required>
            <textarea className={textareaCls} placeholder="Dronen følger forhåndsprogrammert failsafe-sekvens: hover i 10 sekunder, deretter RTH til takeoff-punkt. Pilot forblir på takeoff-punkt inntil dronen er landet." value={t('erpCommLoss')} onChange={e => set('erpCommLoss', e.target.value)} />
          </FormField>
        )}
        <FormField label="Ved luftromskonflikt eller uventet lufttrafikk" required>
          <textarea className={textareaCls} placeholder="Operasjonen avbrytes umiddelbart. Dronen landes på nærmeste trygge punkt. Pilot varsler øvrig lufttrafikk via SafeSky/radio om nødvendig." value={t('erpAirspace')} onChange={e => set('erpAirspace', e.target.value)} />
        </FormField>
        <FormField label="Ved personskade eller materialskade" required>
          <textarea className={textareaCls} placeholder="Operasjonen stoppes. Nødetatene varsles via 112/113. Hendelsen dokumenteres og rapporteres til Luftfartstilsynet via hendelsesrapporteringssystemet." value={t('erpInjury')} onChange={e => set('erpInjury', e.target.value)} />
        </FormField>
        <FormField label="Ved brann eller eksplosjon" required>
          <textarea className={textareaCls} placeholder="Pilot forlater området umiddelbart. Brannvesenet varsles via 110. Dronen etterlates dersom evakuering er nødvendig. Hendelsen rapporteres til Luftfartstilsynet." value={t('erpFire')} onChange={e => set('erpFire', e.target.value)} />
        </FormField>
        <FormField label="Sikker nødlandingslokasjon">
          <input className={inputCls} placeholder="Parkeringsplass sør for operasjonsområdet, koordinater: [fyll inn]" value={t('erpLanding')} onChange={e => set('erpLanding', e.target.value)} />
        </FormField>
      </SectionCard>

      {/* S5 - Prosedyrer */}
      <SectionCard title="Operasjonelle prosedyrer" index={5} complete={sec5Done}>
        <FormField label="Pre-flight sjekkliste" required>
          <textarea className={textareaCls} placeholder="Batteri over 80%. Propeller inspisert. GPS-signal bekreftet (min. 12 satellitter). Luftrom klarert via Ninox og SafeSky. Vær sjekket — vind under [X] m/s, ingen nedbør. Takeoff-område inspisert og klarert for uvedkommende." value={t('preflight')} onChange={e => set('preflight', e.target.value)} />
        </FormField>
        <FormField label="Prosedyre under flygning">
          <textarea className={textareaCls} placeholder="Pilot opprettholder VLOS til enhver tid. Flygehøyde overstiger ikke [X] m AGL. Dronen holdes innenfor definert operasjonsvolum. Kommunikasjon med observatør via radio på kanal [X]." value={t('inflight')} onChange={e => set('inflight', e.target.value)} />
        </FormField>
        <FormField label="Post-flight sjekkliste">
          <textarea className={textareaCls} placeholder="Drone inspisert for skader. Batteri avlades til lagringskapasitet (ca. 50%). Minnekort sikret. Eventuelle hendelser eller avvik loggføres i operasjonslogg med dato, tid og beskrivelse." value={t('postflight')} onChange={e => set('postflight', e.target.value)} />
        </FormField>
      </SectionCard>

      {/* S6 - Vedlikehold */}
      <SectionCard title="Vedlikehold" index={6} complete={true}>
        <FormField label="Vedlikeholdsintervall">
          <input className={inputCls} placeholder="Etter hver 50. flygeime, eller minimum én gang per kvartal" value={t('maintInterval')} onChange={e => set('maintInterval', e.target.value)} />
        </FormField>
        <FormField label="Ansvarlig for vedlikehold">
          <input className={inputCls} placeholder="Simen Holter, teknisk sjef" value={t('maintResponsible')} onChange={e => set('maintResponsible', e.target.value)} />
        </FormField>
        <FormField label="Hvor logg oppbevares">
          <input className={inputCls} placeholder="Digitalt i operasjonslogg på SharePoint / Google Drive" value={t('maintLog')} onChange={e => set('maintLog', e.target.value)} />
        </FormField>
        <FormField label="Siste gjennomførte service">
          <input type="date" className={inputCls} value={t('maintLastService')} onChange={e => set('maintLastService', e.target.value)} />
        </FormField>
      </SectionCard>

      {/* S7 - Kompetanse */}
      <SectionCard title="Kompetanse" index={7} complete={sec7Done}>
        <FormField label="Pilotens fulle navn" required>
          <input className={inputCls} placeholder="Ola Nordmann" value={t('pilotName')} onChange={e => set('pilotName', e.target.value)} />
        </FormField>
        <FormField label="Kompetansebevis type og nummer">
          <input className={inputCls} placeholder="A2-sertifikat, NO-A2-2024-00123" value={t('compCert')} onChange={e => set('compCert', e.target.value)} />
        </FormField>
        <FormField label="Dato siste repetisjonskurs">
          <input type="date" className={inputCls} value={t('compLastCourse')} onChange={e => set('compLastCourse', e.target.value)} />
        </FormField>
        <FormField label="Tilleggsopplæring">
          <input className={inputCls} placeholder="BVLOS-kurs juni 2024, termisk kamera-kurs mars 2024" value={t('compExtra')} onChange={e => set('compExtra', e.target.value)} />
        </FormField>
      </SectionCard>

      {/* Generate button */}
      <div className="pt-2">
        <button onClick={handleGenerate} disabled={!allFilled || generating} className="haiko-btn-primary w-full py-4 text-base">
          {generating ? <><Loader2 className="w-5 h-5 animate-spin" /> Genererer dokument...</> : <><Printer className="w-5 h-5" strokeWidth={1.5} /> Generer operasjonsmanual</>}
        </button>
        {!allFilled && (
          <p className="text-xs text-sora-text-dim text-center mt-2 font-sora">{remaining} av {requiredFields.length} obligatoriske felt gjenstår</p>
        )}
        {generated && (
          <p className="text-xs text-sora-success text-center mt-2 font-sora">Operasjonsmanualen er klar. Du kan nå gå videre til søknad.</p>
        )}
      </div>

      <button onClick={() => setShowPreviewMobile(!showPreviewMobile)} className="haiko-btn-secondary w-full text-sm lg:hidden">
        <Eye className="w-4 h-4" strokeWidth={1.5} /> {showPreviewMobile ? 'Skjul forhåndsvisning' : 'Se forhåndsvisning'}
      </button>
    </div>
  );

  // ---- PREVIEW ----
  const pv = (key: string) => t(key).trim();
  const previewContent = (
    <div id="operations-manual-print" className="bg-white rounded-xl p-6 text-gray-900 text-sm space-y-6 print:rounded-none print:p-0 print:shadow-none">
      {/* Header */}
      <div className="flex items-start justify-between border-b border-gray-200 pb-4">
        <div>
          <p className="text-xl font-bold text-gray-900">OPERASJONSMANUAL</p>
          <p className="text-gray-600 mt-1">{applicantName || '[Operatørnavn]'}</p>
        </div>
        <div className="text-right text-xs text-gray-400">
          <p className="font-bold text-sora-purple text-sm">Haiko</p>
          <p>{today}</p>
        </div>
      </div>

      {/* Cover info */}
      <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-xs text-gray-500 border-b border-gray-100 pb-3">
        <span>Drone: {selectedDrone?.name || derivedInputs.droneName || '—'}</span>
        <span>Scenario: {scenario || '—'}</span>
        <span>SAIL: {results.sailRoman || '—'}</span>
        <span>Versjon: 1.0 — Utkast</span>
      </div>

      {/* S1 */}
      <div>
        <h3 className="font-bold text-gray-900 mb-2">1. Operatørinformasjon</h3>
        <PreviewRow label="Operatørnavn" value={applicantName} />
        <PreviewRow label="E-post" value={applicantEmail} />
        <PreviewRow label="Adresse" value={address} />
        <PreviewRow label="Reg.nummer" value={pv('regNumber')} missing={!pv('regNumber')} />
        <PreviewRow label="Sertifikattype" value={pv('certType')} missing={!pv('certType')} />
        <PreviewRow label="Sertifikatnr." value={pv('certNumber')} missing={!pv('certNumber')} />
      </div>

      {/* S2 */}
      <div>
        <h3 className="font-bold text-gray-900 mb-2">2. Luftfartøy</h3>
        <PreviewRow label="Modell" value={selectedDrone?.name || derivedInputs.droneName} />
        <PreviewRow label="Produsent" value={selectedDrone?.manufacturer || '—'} />
        <PreviewRow label="MTOM" value={`${derivedInputs.mtom} kg`} />
        <PreviewRow label="Dimensjon" value={`${derivedInputs.characteristicDimension} m`} />
        <PreviewRow label="Maks hastighet" value={selectedDrone ? `${selectedDrone.maxSpeed} m/s` : '—'} />
        <PreviewRow label="Klasse" value={selectedDrone?.categoryClass || '—'} />
        <PreviewRow label="Utstyr" value={equipList} />
      </div>

      {/* S3 */}
      <div>
        <h3 className="font-bold text-gray-900 mb-2">3. Operasjonsområde</h3>
        <PreviewRow label="Lokasjon" value={address} />
        <PreviewRow label="Kommune" value={municipality} />
        <PreviewRow label="Takeoff" value={takeoffCoords} />
        <PreviewRow label="Maks høyde" value={`${derivedInputs.maxAltitude} m AGL`} />
        <PreviewRow label="Type" value={derivedInputs.operationType} />
        <PreviewRow label="Befolkning" value={popLabels[derivedInputs.populationDensity] || derivedInputs.populationDensity} />
        {pv('opTimeframe') && <PreviewRow label="Tidsrom" value={pv('opTimeframe')} />}
        {pv('opRestrictions') && <PreviewRow label="Restriksjoner" value={pv('opRestrictions')} />}
      </div>

      {/* S4 */}
      <div>
        <h3 className="font-bold text-gray-900 mb-2">4. Risikovurdering</h3>
        <PreviewRow label="Intrinsic GRC" value={String(results.intrinsicGrc)} />
        <PreviewRow label="Final GRC" value={String(results.finalGrc)} />
        <PreviewRow label="ARC" value={results.residualArc} />
        <PreviewRow label="SAIL" value={results.sailRoman} />
        <PreviewRow label="Scenario" value={scenario || 'Ingen'} />
      </div>

      {/* S5 - ERP */}
      <div>
        <h3 className="font-bold text-gray-900 mb-2">5. Nødprosedyrer (ERP)</h3>
        <div className="space-y-2">
          <PreviewRow label="Teknisk feil" value={pv('erpTechFail')} missing={!pv('erpTechFail')} />
          {isBVLOS && <PreviewRow label="Komm.tap" value={pv('erpCommLoss')} missing={!pv('erpCommLoss')} />}
          <PreviewRow label="Luftromskonflikt" value={pv('erpAirspace')} missing={!pv('erpAirspace')} />
          <PreviewRow label="Personskade" value={pv('erpInjury')} missing={!pv('erpInjury')} />
          <PreviewRow label="Brann" value={pv('erpFire')} missing={!pv('erpFire')} />
          {pv('erpLanding') && <PreviewRow label="Nødlanding" value={pv('erpLanding')} />}
        </div>
      </div>

      {/* S6 - Prosedyrer */}
      <div>
        <h3 className="font-bold text-gray-900 mb-2">6. Operasjonelle prosedyrer</h3>
        <div className="space-y-2">
          <PreviewRow label="Pre-flight" value={pv('preflight')} missing={!pv('preflight')} />
          {pv('inflight') && <PreviewRow label="Under flygning" value={pv('inflight')} />}
          {pv('postflight') && <PreviewRow label="Post-flight" value={pv('postflight')} />}
        </div>
      </div>

      {/* S7 - Vedlikehold */}
      <div>
        <h3 className="font-bold text-gray-900 mb-2">7. Vedlikehold</h3>
        {pv('maintInterval') && <PreviewRow label="Intervall" value={pv('maintInterval')} />}
        {pv('maintResponsible') && <PreviewRow label="Ansvarlig" value={pv('maintResponsible')} />}
        {pv('maintLog') && <PreviewRow label="Logg" value={pv('maintLog')} />}
        {pv('maintLastService') && <PreviewRow label="Siste service" value={pv('maintLastService')} />}
      </div>

      {/* S8 - Kompetanse */}
      <div>
        <h3 className="font-bold text-gray-900 mb-2">8. Kompetanse og opplæring</h3>
        <PreviewRow label="Pilot" value={pv('pilotName')} missing={!pv('pilotName')} />
        {pv('compCert') && <PreviewRow label="Sertifikat" value={pv('compCert')} />}
        {pv('compLastCourse') && <PreviewRow label="Siste kurs" value={pv('compLastCourse')} />}
        {pv('compExtra') && <PreviewRow label="Tillegg" value={pv('compExtra')} />}
      </div>

      {/* Signature */}
      <div className="border-t border-gray-200 pt-4 mt-6">
        <p className="text-xs text-gray-500 italic mb-4">
          Jeg bekrefter at denne operasjonsmanualen er korrekt og at operasjonen vil gjennomføres i henhold til gjeldende regelverk (EU 2019/947 implementert i norsk rett).
        </p>
        <div className="space-y-1">
          <PreviewRow label="Navn" value={applicantName} />
          <PreviewRow label="Dato" value={today} />
          <p className="text-sm text-gray-600 mt-2">Signatur: ___________________________</p>
        </div>
      </div>

      {/* Footer */}
      <div className="text-center text-[10px] text-gray-400 border-t border-gray-100 pt-3 mt-4">
        Haiko AS — haiko.no — Generert {today}
      </div>
    </div>
  );

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-bold text-sora-text mb-2">Operasjonsmanual</h1>
        <div className="bg-sora-surface border border-sora-border rounded-xl p-4 flex gap-3 items-start print:hidden">
          <Info className="w-5 h-5 text-sora-purple mt-0.5 shrink-0" />
          <p className="text-sm text-sora-text-muted">
            Fyll inn feltene under for å generere operasjonsmanualen. Felt med lilla bakgrunn er hentet automatisk fra tidligere steg.
          </p>
        </div>
      </div>

      <div className="flex gap-6 items-start print:block">
        {/* Left: Form */}
        <div className="flex-1 min-w-0">
          {formContent}
          {showPreviewMobile && <div className="mt-4 lg:hidden">{previewContent}</div>}
        </div>
        {/* Right: Preview (desktop only) */}
        <div className="hidden lg:block w-[420px] shrink-0 sticky top-4 max-h-[calc(100vh-120px)] overflow-y-auto print:hidden">
          <p className="text-xs text-sora-text-dim mb-2 font-medium">Live forhåndsvisning</p>
          <div className="transform scale-[0.85] origin-top">{previewContent}</div>
        </div>
      </div>

      {/* Full preview for print */}
      <div className="hidden print:block">{previewContent}</div>
    </div>
  );
}
