import { Info, Shield, Plane, ChevronDown, ChevronUp } from "lucide-react";
import { useState } from "react";
import type { MitigationRobustness } from "@/lib/soraCalculations";

export interface MitigationState {
  // Ground risk mitigations (SORA 2.5 M1A/M1B/M1C/M2)
  m1a_sheltering: MitigationRobustness;
  m1b_restrictions: MitigationRobustness;
  m1c_ground_observers: boolean;
  m2_impact: MitigationRobustness;
  // Transponder / Remote ID
  hasTransponder: boolean;
  // Day/Night
  dayNight: 'day' | 'night' | 'both';
  // Observers
  hasObservers: boolean;
  // Strategic air mitigations (MS1-MS5)
  ms1_segregation: MitigationRobustness;
  ms2_time_windows: boolean;
  ms3_visual_observers: MitigationRobustness;
  ms4_airspace_coord: boolean;
  ms5_boundaries: MitigationRobustness;
}

interface Props {
  mitigations: MitigationState;
  isBVLOS: boolean;
  onChange: (updates: Partial<MitigationState>) => void;
}

const questionCard = "bg-sora-surface border border-sora-border rounded-xl p-5";
const questionTitle = "text-sora-text font-medium text-sm mb-3";
const btnBase = "px-4 py-2 rounded-lg text-sm font-medium transition-all";
const btnActive = "bg-sora-purple text-sora-text";
const btnInactive = "bg-sora-bg border border-sora-border text-sora-text-muted hover:bg-sora-surface-hover";
const sectionTitle = "text-lg font-semibold text-sora-text flex items-center gap-2";
const robLabel = "text-xs text-sora-text-dim mt-1";

function RobustnessSelector({ value, onChange, allowLow = false }: { value: MitigationRobustness; onChange: (v: MitigationRobustness) => void; allowLow?: boolean }) {
  const options: { val: MitigationRobustness; label: string; desc: string }[] = [
    { val: 'none', label: 'Ingen', desc: 'Ikke aktivt' },
    ...(allowLow ? [{ val: 'low' as MitigationRobustness, label: 'Lav', desc: '−1 GRC' }] : []),
    { val: 'medium', label: 'Middels', desc: '−1 GRC' },
    { val: 'high', label: 'Høy', desc: '−2 GRC' },
  ];
  return (
    <div className="flex gap-2 mt-2">
      {options.map(o => (
        <button key={o.val} className={`${btnBase} flex-1 text-center ${value === o.val ? btnActive : btnInactive}`} onClick={() => onChange(o.val)}>
          <div>{o.label}</div>
          <div className="text-[10px] opacity-70">{o.desc}</div>
        </button>
      ))}
    </div>
  );
}

export default function Step4Mitigations({ mitigations, isBVLOS, onChange }: Props) {
  const [showAirMit, setShowAirMit] = useState(false);

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-sora-text mb-1">Mitigasjoner</h2>
        <p className="text-sora-text-muted text-sm">Tiltak som reduserer risikoen. Svarene påvirker GRC, ARC og endelig SAIL.</p>
      </div>

      {/* ── GROUND RISK MITIGATIONS ── */}
      <div className="space-y-4">
        <h3 className={sectionTitle}><Shield className="w-5 h-5 text-sora-purple" /> Bakkemitigasjoner (M1/M2)</h3>

        {/* M1A — Sheltering */}
        <div className={questionCard}>
          <p className={questionTitle}>M1A — Er mennesker i området beskyttet under faste konstruksjoner?</p>
          <p className="text-xs text-sora-text-dim mb-2">F.eks. bygninger, parkeringshus, overdekket tribune. Over 75% av personene i området må være under tak.</p>
          <RobustnessSelector value={mitigations.m1a_sheltering} onChange={v => onChange({ m1a_sheltering: v })} />
          <p className={robLabel}>Middels: Dokumentert beskyttelse. Høy: Permanent struktur med tilgangskontroll.</p>
        </div>

        {/* M1B — Operational restrictions */}
        <div className={questionCard}>
          <p className={questionTitle}>M1B — Begrenser dere operasjonsområdet med sperring eller tidsvinduer?</p>
          <p className="text-xs text-sora-text-dim mb-2">Fysisk sperring av område, tidsbaserte restriksjoner, sikkerhetsvakter, eller NOTAM-publisering.</p>
          <RobustnessSelector value={mitigations.m1b_restrictions} onChange={v => onChange({ m1b_restrictions: v })} />
          <p className={robLabel}>Middels: Skriftlig prosedyre + sperring. Høy: Fysisk tilgangskontroll + overvåkning.</p>
        </div>

        {/* M1C — Ground observers */}
        <div className={questionCard}>
          <p className={questionTitle}>M1C — Har dere dedikerte bakkeobservatører?</p>
          <p className="text-xs text-sora-text-dim mb-2">Person(er) som overvåker bakkeområdet og varsler piloten dersom uvedkommende nærmer seg operasjonsvolumet.</p>
          <div className="flex gap-3">
            <button className={`${btnBase} ${mitigations.m1c_ground_observers ? btnActive : btnInactive}`} onClick={() => onChange({ m1c_ground_observers: true })}>Ja (−1 GRC)</button>
            <button className={`${btnBase} ${!mitigations.m1c_ground_observers ? btnActive : btnInactive}`} onClick={() => onChange({ m1c_ground_observers: false })}>Nei</button>
          </div>
          <p className={robLabel}>Kun lav robusthet. Gir −1 på GRC.</p>
        </div>

        {/* M2 — Impact dynamics */}
        <div className={questionCard}>
          <p className={questionTitle}>M2 — Har dronen system for å redusere skade ved nedslag?</p>
          <p className="text-xs text-sora-text-dim mb-2">Fallskjerm, frangibel (knusbar) konstruksjon, flight termination system, eller annen energiabsorbering.</p>
          <RobustnessSelector value={mitigations.m2_impact} onChange={v => onChange({ m2_impact: v })} />
          <p className={robLabel}>Middels: Fallskjerm eller frangibel (−1). Høy: Sertifisert FTS (−2).</p>
        </div>
      </div>

      {/* ── GENERAL ── */}
      <div className="space-y-4">
        {/* Transponder */}
        <div className={questionCard}>
          <p className={questionTitle}>Er dronen utstyrt med transponder eller aktiv Remote ID?</p>
          <div className="flex gap-3">
            <button className={`${btnBase} ${mitigations.hasTransponder ? btnActive : btnInactive}`} onClick={() => onChange({ hasTransponder: true })}>Ja</button>
            <button className={`${btnBase} ${!mitigations.hasTransponder ? btnActive : btnInactive}`} onClick={() => onChange({ hasTransponder: false })}>Nei</button>
          </div>
        </div>

        {/* Day/Night */}
        <div className={questionCard}>
          <p className={questionTitle}>Når skal flygingen foregå?</p>
          <div className="flex gap-3">
            <button className={`${btnBase} ${mitigations.dayNight === 'day' ? btnActive : btnInactive}`} onClick={() => onChange({ dayNight: 'day' })}>Dagtid</button>
            <button className={`${btnBase} ${mitigations.dayNight === 'night' ? btnActive : btnInactive}`} onClick={() => onChange({ dayNight: 'night' })}>Natt</button>
            <button className={`${btnBase} ${mitigations.dayNight === 'both' ? btnActive : btnInactive}`} onClick={() => onChange({ dayNight: 'both' })}>Begge deler</button>
          </div>
        </div>

        {/* Observers (BVLOS only) */}
        {isBVLOS && (
          <div className={questionCard}>
            <p className={questionTitle}>Har dere luftromsobservatørnettverk langs ruten?</p>
            <div className="flex gap-3">
              <button className={`${btnBase} ${mitigations.hasObservers ? btnActive : btnInactive}`} onClick={() => onChange({ hasObservers: true })}>Ja</button>
              <button className={`${btnBase} ${!mitigations.hasObservers ? btnActive : btnInactive}`} onClick={() => onChange({ hasObservers: false })}>Nei</button>
            </div>
            <div className="mt-2 flex items-start gap-2 text-xs text-sora-text-dim">
              <Info className="w-3 h-3 shrink-0 mt-0.5" />
              <span>Luftromsobservatører reduserer ARC med ett nivå for BVLOS-operasjoner.</span>
            </div>
          </div>
        )}
      </div>

      {/* ── STRATEGIC AIR MITIGATIONS (MS1-MS5) ── */}
      <div className="space-y-4">
        <button onClick={() => setShowAirMit(!showAirMit)} className="flex items-center gap-2 w-full">
          <h3 className={sectionTitle}><Plane className="w-5 h-5 text-sora-purple" /> Strategiske luftmitigasjoner (MS1–MS5)</h3>
          <span className="ml-auto text-sora-text-dim">
            {showAirMit ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
          </span>
        </button>
        <p className="text-xs text-sora-text-dim">Tiltak som reduserer luftrisikoen (ARC). Hvert godkjent tiltak senker ARC med ett nivå. Klikk for å utvide.</p>

        {showAirMit && (
          <div className="space-y-4">
            {/* MS1 — Segregation */}
            <div className={questionCard}>
              <p className={questionTitle}>MS1 — Segregert luftrom</p>
              <p className="text-xs text-sora-text-dim mb-2">Avtale om eksklusiv bruk av luftrommet i en gitt periode (f.eks. NOTAM-restriksjonsområde).</p>
              <RobustnessSelector value={mitigations.ms1_segregation} onChange={v => onChange({ ms1_segregation: v })} />
            </div>

            {/* MS2 — Time windows */}
            <div className={questionCard}>
              <p className={questionTitle}>MS2 — Flyr kun i lavtrafikkperioder</p>
              <p className="text-xs text-sora-text-dim mb-2">Operasjonen gjennomføres når bemannet lufttrafikk er minimal (tidlig morgen, helg, etc.).</p>
              <div className="flex gap-3">
                <button className={`${btnBase} ${mitigations.ms2_time_windows ? btnActive : btnInactive}`} onClick={() => onChange({ ms2_time_windows: true })}>Ja (−1 ARC)</button>
                <button className={`${btnBase} ${!mitigations.ms2_time_windows ? btnActive : btnInactive}`} onClick={() => onChange({ ms2_time_windows: false })}>Nei</button>
              </div>
            </div>

            {/* MS3 — Visual observers */}
            <div className={questionCard}>
              <p className={questionTitle}>MS3 — Dedikerte luftromsobservatører (see-and-avoid)</p>
              <p className="text-xs text-sora-text-dim mb-2">Personer som visuelt overvåker luftrommet og varsler piloten om annen trafikk. Krever høy robusthet.</p>
              <RobustnessSelector value={mitigations.ms3_visual_observers} onChange={v => onChange({ ms3_visual_observers: v })} />
            </div>

            {/* MS4 — Airspace coordination */}
            <div className={questionCard}>
              <p className={questionTitle}>MS4 — Koordinering med flykontroll (ANSP)</p>
              <p className="text-xs text-sora-text-dim mb-2">Avtale med Avinor/flykontrolltjeneste om operasjonen.</p>
              <div className="flex gap-3">
                <button className={`${btnBase} ${mitigations.ms4_airspace_coord ? btnActive : btnInactive}`} onClick={() => onChange({ ms4_airspace_coord: true })}>Ja (−1 ARC)</button>
                <button className={`${btnBase} ${!mitigations.ms4_airspace_coord ? btnActive : btnInactive}`} onClick={() => onChange({ ms4_airspace_coord: false })}>Nei</button>
              </div>
            </div>

            {/* MS5 — Location boundaries */}
            <div className={questionCard}>
              <p className={questionTitle}>MS5 — Geofencing / grensekontroll</p>
              <p className="text-xs text-sora-text-dim mb-2">Dronen er begrenset til et definert område via geofencing i lavtrafikkssone.</p>
              <RobustnessSelector value={mitigations.ms5_boundaries} onChange={v => onChange({ ms5_boundaries: v })} />
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
