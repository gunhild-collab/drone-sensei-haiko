import { Info } from "lucide-react";

interface MitigationState {
  areaControlled: boolean;
  hasWrittenProcedure: boolean;
  hasParachute: boolean;
  hasTransponder: boolean;
  dayNight: 'day' | 'night' | 'both';
  hasObservers: boolean;
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

export type { MitigationState };

export default function Step4Mitigations({ mitigations, isBVLOS, onChange }: Props) {
  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-sora-text mb-1">Mitigrasjoner</h2>
        <p className="text-sora-text-muted text-sm">Svar på spørsmålene nedenfor. Svarene påvirker risikoberegningen.</p>
      </div>

      {/* M1 - Area controlled */}
      <div className={questionCard}>
        <p className={questionTitle}>Skal flygeområdet sperres av og kontrolleres under flyging?</p>
        <div className="flex gap-3">
          <button className={`${btnBase} ${mitigations.areaControlled ? btnActive : btnInactive}`} onClick={() => onChange({ areaControlled: true })}>Ja</button>
          <button className={`${btnBase} ${!mitigations.areaControlled ? btnActive : btnInactive}`} onClick={() => onChange({ areaControlled: false })}>Nei</button>
        </div>
        {mitigations.areaControlled && (
          <div className="mt-4 pl-4 border-l-2 border-sora-purple/30">
            <p className={questionTitle}>Har dere skriftlig prosedyre for sperring og varsling?</p>
            <div className="flex gap-3">
              <button className={`${btnBase} ${mitigations.hasWrittenProcedure ? btnActive : btnInactive}`} onClick={() => onChange({ hasWrittenProcedure: true })}>Ja</button>
              <button className={`${btnBase} ${!mitigations.hasWrittenProcedure ? btnActive : btnInactive}`} onClick={() => onChange({ hasWrittenProcedure: false })}>Nei</button>
            </div>
            <div className="mt-2 flex items-start gap-2 text-xs text-sora-text-dim">
              <Info className="w-3 h-3 shrink-0 mt-0.5" />
              <span>Skriftlig prosedyre gir høyere robusthet for M1-mitigering (−2 i stedet for −1 på GRC).</span>
            </div>
          </div>
        )}
      </div>

      {/* M2 - Parachute */}
      <div className={questionCard}>
        <p className={questionTitle}>Er dronen utstyrt med godkjent fallskjerm?</p>
        <div className="flex gap-3">
          <button className={`${btnBase} ${mitigations.hasParachute ? btnActive : btnInactive}`} onClick={() => onChange({ hasParachute: true })}>Ja</button>
          <button className={`${btnBase} ${!mitigations.hasParachute ? btnActive : btnInactive}`} onClick={() => onChange({ hasParachute: false })}>Nei</button>
        </div>
        <div className="mt-2 flex items-start gap-2 text-xs text-sora-text-dim">
          <Info className="w-3 h-3 shrink-0 mt-0.5" />
          <span>Fallskjerm reduserer treffenergi (M2), som gir −1 på GRC.</span>
        </div>
      </div>

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
        <p className={questionTitle}>Skal flyging foregå på dagtid?</p>
        <div className="flex gap-3">
          <button className={`${btnBase} ${mitigations.dayNight === 'day' ? btnActive : btnInactive}`} onClick={() => onChange({ dayNight: 'day' })}>Dagtid</button>
          <button className={`${btnBase} ${mitigations.dayNight === 'night' ? btnActive : btnInactive}`} onClick={() => onChange({ dayNight: 'night' })}>Natt</button>
          <button className={`${btnBase} ${mitigations.dayNight === 'both' ? btnActive : btnInactive}`} onClick={() => onChange({ dayNight: 'both' })}>Begge deler</button>
        </div>
      </div>

      {/* Observers (BVLOS only) */}
      {isBVLOS && (
        <div className={questionCard}>
          <p className={questionTitle}>Har dere observatørnettverk langs ruten?</p>
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
  );
}
