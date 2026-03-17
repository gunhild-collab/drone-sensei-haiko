import { useState, useMemo, useCallback } from "react";
import { format, parseISO } from "date-fns";
import { Link } from "react-router-dom";
import { ArrowLeft, ArrowRight, Check, Info } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { SoraInputs } from "@/lib/soraCalculations";
import type { SoraResults } from "@/lib/soraCalculations";
import soraCalculate from "@/utils/soraCalculate";
import { DroneSpec } from "@/data/droneDatabase";
import { PDRA_SCENARIOS, PdraScenario } from "@/data/pdraScenarios";
import PreStep from "@/components/sora/PreStep";
import { MunicipalityData } from "@/components/sora/Step1Municipality";
import Step2FlightArea, { FlightAreaData } from "@/components/sora/Step2FlightArea";
import Step4Mitigations, { MitigationState } from "@/components/sora/Step4Mitigations";
import Step5ScenarioForm, { ScenarioFormData } from "@/components/sora/Step5ScenarioForm";
import Step6OSO from "@/components/sora/Step6OSO";
import StepRequirements from "@/components/sora/StepRequirements";
import StepActionPlan from "@/components/sora/StepActionPlan";
import ContactHaiko from "@/components/sora/ContactHaiko";
import HaikoLogo from "@/components/sora/HaikoLogo";
import LiveSoraPanel from "@/components/sora/LiveSoraPanel";

const STEPS_FULL = [
  { label: 'Adresse & Kart', short: '1', id: 'flight-area' },
  { label: 'Mitigrasjoner', short: '2', id: 'mitigations' },
  { label: 'Krav', short: '3', id: 'requirements' },
  { label: 'Handlingsplan', short: '4', id: 'action-plan' },
];

const STEPS_OPEN = [
  { label: 'Adresse & Kart', short: '1', id: 'flight-area' },
  { label: 'Forklaring', short: '2', id: 'explanation' },
  { label: 'Dokumenter', short: '3', id: 'documents' },
];

const OPEN_SCENARIOS = ['A1', 'A2', 'A3'];

const defaultInputs: SoraInputs = {
  droneName: '',
  mtom: 0,
  characteristicDimension: 0,
  maxSpeed: 25,
  operationType: 'VLOS',
  dayNight: 'day',
  maxAltitude: 120,
  populationDensity: 'sparsely',
  m1a_sheltering: 'none',
  m1b_restrictions: 'none',
  m1c_ground_observers: false,
  m2_impact: 'none',
  m1: 0,
  m2: 0,
  nearAirport: false,
  ctrDistanceKm: 10,
  isUrbanArea: false,
  ms1_segregation: 'none',
  ms2_time_windows: false,
  ms3_visual_observers: 'none',
  ms4_airspace_coord: false,
  ms5_boundaries: 'none',
  airspaceClass: 'uncontrolled_low',
  hasTransponder: false,
  hasAirspaceObservers: false,
};

const defaultMitigations: MitigationState = {
  m1a_sheltering: 'none',
  m1b_restrictions: 'none',
  m1c_ground_observers: false,
  m2_impact: 'none',
  hasTransponder: false,
  dayNight: 'day',
  hasObservers: false,
  ms1_segregation: 'none',
  ms2_time_windows: false,
  ms3_visual_observers: 'none',
  ms4_airspace_coord: false,
  ms5_boundaries: 'none',
};

const defaultScenarioForm: ScenarioFormData = {
  pilotCertNumber: '',
  atoName: '',
  insuranceCompany: '',
  insuranceNumber: '',
  operationsManualRef: '',
  conopsDescription: '',
  maxFlightAltitude: '120',
  contingencyBuffer: '50',
  grbMeters: '30',
  terrain: '',
  nearestAirport: '',
  restrictions: '',
};

export default function SoraWizard() {
  const [started, setStarted] = useState(false);
  const [applicantName, setApplicantName] = useState('');
  const [applicantEmail, setApplicantEmail] = useState('');
  const [flightDate, setFlightDate] = useState('');

  const [step, setStep] = useState(0);
  const [inputs, setInputs] = useState<SoraInputs>(defaultInputs);
  const [osoTexts, setOsoTexts] = useState<Record<number, string>>({});
  const [mitigations, setMitigations] = useState<MitigationState>(defaultMitigations);
  const [completedRequirements, setCompletedRequirements] = useState<Set<string>>(new Set());

  const [municipality, setMunicipality] = useState('');
  const [municipalityData, setMunicipalityData] = useState<MunicipalityData | null>(null);
  const [flightAreaData, setFlightAreaData] = useState<FlightAreaData | null>(null);
  const [selectedDrone, setSelectedDrone] = useState<DroneSpec | null>(null);

  const updateInputs = useCallback((updates: Partial<SoraInputs>) => setInputs(prev => ({ ...prev, ...updates })), []);
  const updateOso = useCallback((id: number, text: string) => setOsoTexts(prev => ({ ...prev, [id]: text })), []);
  const updateMitigations = useCallback((updates: Partial<MitigationState>) => setMitigations(prev => ({ ...prev, ...updates })), []);

  const derivedInputs = useMemo(() => {
    // Map granular mitigations to legacy M1/M2 for soraCalculate compatibility
    const m1Total = ({ none: 0, low: 0, medium: 1, high: 2 }[mitigations.m1a_sheltering] ?? 0)
      + ({ none: 0, low: 0, medium: 1, high: 2 }[mitigations.m1b_restrictions] ?? 0)
      + (mitigations.m1c_ground_observers ? 1 : 0);
    const m2Total = { none: 0, low: 0, medium: 1, high: 2 }[mitigations.m2_impact] ?? 0;
    return {
      ...inputs,
      m1: Math.min(2, m1Total) as SoraInputs['m1'],
      m2: m2Total >= 1 ? -1 as const : 0 as const,
      hasTransponder: mitigations.hasTransponder,
      hasAirspaceObservers: mitigations.hasObservers,
      dayNight: mitigations.dayNight,
      m1a_sheltering: mitigations.m1a_sheltering,
      m1b_restrictions: mitigations.m1b_restrictions,
      m1c_ground_observers: mitigations.m1c_ground_observers,
      m2_impact: mitigations.m2_impact,
      ms1_segregation: mitigations.ms1_segregation,
      ms2_time_windows: mitigations.ms2_time_windows,
      ms3_visual_observers: mitigations.ms3_visual_observers,
      ms4_airspace_coord: mitigations.ms4_airspace_coord,
      ms5_boundaries: mitigations.ms5_boundaries,
    };
  }, [inputs, mitigations]);

  const popMap: Record<string, string> = { sparsely: 'sparse', controlled: 'controlled', populated: 'populated', gathering: 'gathering' };

  const soraResult = useMemo(() => soraCalculate({
    mtom_kg: derivedInputs.mtom,
    characteristic_dimension: derivedInputs.characteristicDimension,
    max_speed_ms: selectedDrone?.maxSpeed ?? derivedInputs.maxSpeed ?? 25,
    operationType: derivedInputs.operationType,
    populationDensity: popMap[derivedInputs.populationDensity] || derivedInputs.populationDensity,
    altitude_m: derivedInputs.maxAltitude,
    nearControlledAirspace: derivedInputs.nearAirport,
    ctr_distance_km: derivedInputs.ctrDistanceKm,
    isUrbanArea: derivedInputs.isUrbanArea,
    // Granular ground mitigations
    m1a_robustness: derivedInputs.m1a_sheltering,
    m1b_robustness: derivedInputs.m1b_restrictions,
    m1c_ground_observers: derivedInputs.m1c_ground_observers,
    m2_robustness: derivedInputs.m2_impact,
    // Strategic air mitigations
    ms1_segregation: derivedInputs.ms1_segregation,
    ms2_time_windows: derivedInputs.ms2_time_windows,
    ms3_visual_observers: derivedInputs.ms3_visual_observers,
    ms4_airspace_coord: derivedInputs.ms4_airspace_coord,
    ms5_boundaries: derivedInputs.ms5_boundaries,
    // Legacy compat
    m1Reduction: Math.abs(derivedInputs.m1),
    m2Parachute: derivedInputs.m2 === -1,
    c_class: selectedDrone?.categoryClass || 'none',
  }), [derivedInputs, selectedDrone]);

  const ROMAN_TO_NUM: Record<string, number> = { I: 1, II: 2, III: 3, IV: 4, V: 5, VI: 6 };
  const results: SoraResults = useMemo(() => ({
    sizeClass: soraResult.droneClass as SoraResults['sizeClass'],
    intrinsicGrc: soraResult.intrinsicGRC,
    finalGrc: soraResult.finalGRC,
    initialArc: `ARC-${soraResult.iARC || soraResult.arc}` as SoraResults['initialArc'],
    residualArc: `ARC-${soraResult.arc}` as SoraResults['residualArc'],
    sail: ROMAN_TO_NUM[soraResult.sail] || 1,
    sailRoman: soraResult.sail as SoraResults['sailRoman'],
    scenario: soraResult.scenario,
    airMitigationCount: soraResult.airMitigationCount || 0,
    groundMitigationTotal: soraResult.m1Reduction + soraResult.m2Reduction,
  }), [soraResult]);

  const bestScenarioId = soraResult.scenario;
  const isOpenCategory = OPEN_SCENARIOS.includes(bestScenarioId);
  const activeSteps = isOpenCategory ? STEPS_OPEN : STEPS_FULL;

  const bestScenario: PdraScenario | null = useMemo(() => {
    if (!bestScenarioId) return null;
    const found = PDRA_SCENARIOS.find(s => s.id === bestScenarioId);
    if (found) return found;
    return {
      id: bestScenarioId,
      name: bestScenarioId,
      description: `Matched scenario: ${bestScenarioId}`,
      conditions: { operationType: [derivedInputs.operationType] as any, populationDensity: [derivedInputs.populationDensity] },
      sailLevel: results.sailRoman,
    };
  }, [bestScenarioId, derivedInputs, results.sailRoman]);

  const handleMunicipalitySelect = useCallback((name: string, data: MunicipalityData) => {
    setMunicipality(name);
    setMunicipalityData(data);
  }, []);

  const handleDroneSelect = useCallback((drone: DroneSpec) => {
    setSelectedDrone(drone);
    updateInputs({ droneName: drone.name, mtom: drone.mtom, characteristicDimension: drone.characteristicDimension });
  }, [updateInputs]);

  const handleFlightAreaUpdate = useCallback((data: FlightAreaData) => {
    setFlightAreaData(data);
    updateInputs({ operationType: data.operationType || 'VLOS', populationDensity: data.populationDensityClass, airspaceClass: data.airspaceClass });
  }, [updateInputs]);

  // Clamp step to valid range when steps change (e.g. open→specific transition)
  const clampedStep = Math.min(step, activeSteps.length - 1);
  if (clampedStep !== step) setStep(clampedStep);

  const currentStepId = activeSteps[step]?.id;

  if (!started) {
    return (
      <PreStep
        applicantName={applicantName} applicantEmail={applicantEmail} flightDate={flightDate}
        selectedDrone={selectedDrone}
        onChangeName={setApplicantName} onChangeEmail={setApplicantEmail} onChangeFlightDate={setFlightDate}
        onSelectDrone={handleDroneSelect}
        onContinue={() => setStarted(true)}
      />
    );
  }

  const renderStepContent = () => {
    switch (currentStepId) {
      case 'flight-area':
        return (
          <Step2FlightArea
            municipality={municipality || 'Trondheim'} municipalityDensity={0} drone={selectedDrone}
            flightAreaData={flightAreaData} maxAltitude={derivedInputs.maxAltitude}
            onUpdate={handleFlightAreaUpdate} onMunicipalitySelect={handleMunicipalitySelect}
            initialCoords={municipalityData ? { lat: municipalityData.lat, lon: municipalityData.lon } : null}
          />
        );
      case 'mitigations':
        return <Step4Mitigations mitigations={mitigations} isBVLOS={derivedInputs.operationType === 'BVLOS'} onChange={updateMitigations} />;
      case 'requirements':
        return (
          <StepRequirements
            scenario={bestScenarioId}
            sailRoman={results.sailRoman}
            sail={results.sail}
            operationType={derivedInputs.operationType}
            droneName={derivedInputs.droneName}
          />
        );
      case 'action-plan':
        return (
          <StepActionPlan
            scenario={bestScenarioId}
            sailRoman={results.sailRoman}
            sail={results.sail}
            operationType={derivedInputs.operationType}
            droneName={derivedInputs.droneName}
            completedRequirements={completedRequirements}
          />
        );
      default:
        return null;
    }
  };

  return (
    <div className="min-h-screen bg-sora-bg text-sora-text font-sora">
      {/* Top bar */}
      <div className="border-b border-sora-border px-6 py-3">
        <div className="max-w-6xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Link to="/" className="text-sora-text-dim hover:text-sora-text transition-colors">
              <ArrowLeft className="w-5 h-5" strokeWidth={1.5} />
            </Link>
            <HaikoLogo />
            <div className="ml-2">
              <p className="text-sora-text-dim text-xs font-sora">
                {applicantName} · {applicantEmail}
                {flightDate && ` · ${format(parseISO(flightDate), 'dd/MM/yyyy')}`}
              </p>
            </div>
          </div>
          <div className="text-[13px] text-sora-text-dim hidden md:flex items-center gap-3 font-sora">
            <span>SAIL <span className="haiko-badge text-[11px] ml-1">{results.sailRoman || '—'}</span></span>
            <span>GRC <span className="haiko-badge text-[11px] ml-1">{results.finalGrc || '—'}</span></span>
            <span>ARC <span className="haiko-badge text-[11px] ml-1">{results.residualArc || '—'}</span></span>
            {bestScenario && <span className="haiko-badge text-[11px]">{bestScenario.id}</span>}
          </div>
        </div>
      </div>

      {/* Progress bar */}
      <div className="border-b border-sora-border px-6 py-3">
        <div className="max-w-6xl mx-auto flex items-center gap-1">
          {activeSteps.map((s, i) => (
            <button key={s.id} onClick={() => setStep(i)} className="flex items-center gap-1 flex-1">
              <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold transition-all ${
                i === step
                  ? 'bg-white border-2 border-transparent bg-clip-padding shadow-[0_0_0_2px_#6858f8] text-sora-purple scale-110'
                  : i < step
                    ? 'bg-gradient-to-br from-sora-pink to-sora-purple text-white'
                    : 'bg-sora-light text-sora-text-dim'
              }`}>
                {i < step ? <Check className="w-4 h-4" strokeWidth={2} /> : s.short}
              </div>
              <span className={`text-xs hidden lg:block font-sora ${i === step ? 'text-sora-text font-semibold' : 'text-sora-text-dim'}`}>{s.label}</span>
              {i < activeSteps.length - 1 && (
                <div className={`flex-1 h-0.5 mx-1 rounded-full ${i < step ? 'bg-gradient-to-r from-sora-pink to-sora-purple' : 'bg-sora-border'}`} />
              )}
            </button>
          ))}
        </div>
      </div>

      {/* Main content */}
      <div className="max-w-7xl mx-auto px-6 py-8 flex gap-6 pb-24">
        <div className="flex-1 min-w-0">
          <AnimatePresence mode="wait">
            <motion.div key={currentStepId} initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} transition={{ duration: 0.2 }}>
              {renderStepContent()}
            </motion.div>
          </AnimatePresence>
        </div>
        {/* Live risk panel */}
        <div className="hidden lg:block w-72 shrink-0">
          <LiveSoraPanel
            drone={selectedDrone}
            scenario={bestScenarioId}
            sailRoman={results.sailRoman}
            sail={results.sail}
            intrinsicGrc={results.intrinsicGrc}
            finalGrc={results.finalGrc}
            initialArc={results.initialArc}
            residualArc={results.residualArc}
            operationType={derivedInputs.operationType}
            populationDensity={derivedInputs.populationDensity}
            warnings={soraResult.warnings || []}
            groundMitigationTotal={results.groundMitigationTotal}
            airMitigationCount={results.airMitigationCount}
            hasFlightArea={!!flightAreaData}
          />
        </div>
      </div>

      {/* Navigation */}
      <div className="fixed bottom-0 left-0 right-0 border-t border-sora-border bg-sora-bg/95 backdrop-blur-sm px-6 py-4 z-50">
        <div className="max-w-6xl mx-auto flex items-center justify-between">
          <button onClick={() => setStep(Math.max(0, step - 1))} disabled={step === 0} className="haiko-btn-secondary text-sm">
            <ArrowLeft className="w-4 h-4" strokeWidth={1.5} /> Forrige
          </button>
          <span className="text-sora-text-dim text-[13px] font-sora">Steg {step + 1} av {activeSteps.length}</span>
          <button onClick={() => setStep(Math.min(activeSteps.length - 1, step + 1))} disabled={step === activeSteps.length - 1} className="haiko-btn-primary text-sm">
            Neste <ArrowRight className="w-4 h-4" strokeWidth={1.5} />
          </button>
        </div>
      </div>

      <ContactHaiko prominent={currentStepId === 'oso' || currentStepId === 'documents'} />
    </div>
  );
}
