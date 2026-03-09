import { useState, useMemo, useCallback } from "react";
import { format, parseISO } from "date-fns";
import { Link } from "react-router-dom";
import { ArrowLeft, ArrowRight, Check } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { SoraInputs, calculateAll, matchScenario } from "@/lib/soraCalculations";
import { DroneSpec } from "@/data/droneDatabase";
import { PDRA_SCENARIOS, PdraScenario } from "@/data/pdraScenarios";
import PreStep from "@/components/sora/PreStep";
import { MunicipalityData } from "@/components/sora/Step1Municipality";
import Step2FlightArea, { FlightAreaData } from "@/components/sora/Step2FlightArea";
import Step3Drone from "@/components/sora/Step3Drone";
import Step4Mitigations, { MitigationState } from "@/components/sora/Step4Mitigations";
import Step5ScenarioForm, { ScenarioFormData } from "@/components/sora/Step5ScenarioForm";
import Step6OSO from "@/components/sora/Step6OSO";
import StepOperationsManual from "@/components/sora/StepOperationsManual";
import Step7Explanation from "@/components/sora/Step7Explanation";
import Step8Documents from "@/components/sora/Step8Documents";
import LiveSummary from "@/components/sora/LiveSummary";
import ContactHaiko from "@/components/sora/ContactHaiko";

const STEPS = [
  { label: 'Adresse & Kart', short: '1' },
  { label: 'Drone', short: '2' },
  { label: 'Mitigrasjoner', short: '3' },
  { label: 'Scenario', short: '4' },
  { label: 'OSO', short: '5' },
  { label: 'Manual', short: '6' },
  { label: 'Forklaring', short: '7' },
  { label: 'Dokumenter', short: '8' },
];

const defaultInputs: SoraInputs = {
  droneName: '',
  mtom: 0,
  characteristicDimension: 0,
  operationType: 'VLOS',
  dayNight: 'day',
  maxAltitude: 120,
  populationDensity: 'sparsely',
  m1: 0,
  m2: 0,
  nearAirport: false,
  airspaceClass: 'uncontrolled_low',
  hasTransponder: false,
  hasAirspaceObservers: false,
};

const defaultMitigations: MitigationState = {
  areaControlled: false,
  hasWrittenProcedure: false,
  hasParachute: false,
  hasTransponder: false,
  dayNight: 'day',
  hasObservers: false,
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
  // Pre-step
  const [started, setStarted] = useState(false);
  const [applicantName, setApplicantName] = useState('');
  const [applicantEmail, setApplicantEmail] = useState('');
  const [flightDate, setFlightDate] = useState('');
  const [timeFrom, setTimeFrom] = useState('');
  const [timeTo, setTimeTo] = useState('');

  // Step state
  const [step, setStep] = useState(0);
  const [inputs, setInputs] = useState<SoraInputs>(defaultInputs);
  const [osoTexts, setOsoTexts] = useState<Record<number, string>>({});
  const [manualTexts, setManualTexts] = useState<Record<string, string>>({});
  const updateManualText = useCallback((key: string, value: string) => setManualTexts(prev => ({ ...prev, [key]: value })), []);
  const [mitigations, setMitigations] = useState<MitigationState>(defaultMitigations);
  const [scenarioFormData, setScenarioFormData] = useState<ScenarioFormData>(defaultScenarioForm);

  // Step 1 - Municipality
  const [municipality, setMunicipality] = useState('');
  const [municipalityData, setMunicipalityData] = useState<MunicipalityData | null>(null);

  // Step 2 - Flight area
  const [flightAreaData, setFlightAreaData] = useState<FlightAreaData | null>(null);

  // Step 3 - Drone
  const [selectedDrone, setSelectedDrone] = useState<DroneSpec | null>(null);

  const updateInputs = useCallback((updates: Partial<SoraInputs>) => setInputs(prev => ({ ...prev, ...updates })), []);
  const updateOso = useCallback((id: number, text: string) => setOsoTexts(prev => ({ ...prev, [id]: text })), []);
  const updateMitigations = useCallback((updates: Partial<MitigationState>) => setMitigations(prev => ({ ...prev, ...updates })), []);
  const updateScenarioForm = useCallback((updates: Partial<ScenarioFormData>) => setScenarioFormData(prev => ({ ...prev, ...updates })), []);

  // Derive SoraInputs from mitigations
  const derivedInputs = useMemo(() => {
    const m1 = mitigations.areaControlled ? (mitigations.hasWrittenProcedure ? -2 : -1) : 0;
    const m2 = mitigations.hasParachute ? -1 : 0;
    return {
      ...inputs,
      m1: m1 as SoraInputs['m1'],
      m2: m2 as SoraInputs['m2'],
      hasTransponder: mitigations.hasTransponder,
      hasAirspaceObservers: mitigations.hasObservers,
      dayNight: mitigations.dayNight,
    };
  }, [inputs, mitigations]);

  const results = useMemo(() => calculateAll(derivedInputs), [derivedInputs]);

  // Scenario matching using new exact SORA 2.5 logic
  const bestScenarioId = useMemo(() => {
    if (!results.sailRoman || !derivedInputs.operationType) return null;
    return matchScenario(
      results.sailRoman,
      derivedInputs.operationType,
      derivedInputs.mtom,
      selectedDrone?.categoryClass || '',
      derivedInputs.populationDensity,
    );
  }, [results.sailRoman, derivedInputs, selectedDrone]);

  // Create compatible PdraScenario object for child components
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

  // Determine if OSO step should be shown
  const osoRequired = !bestScenario || results.sail >= 3;

  const handleMunicipalitySelect = useCallback((name: string, data: MunicipalityData) => {
    setMunicipality(name);
    setMunicipalityData(data);
  }, []);

  const handleDroneSelect = useCallback((drone: DroneSpec) => {
    setSelectedDrone(drone);
    updateInputs({
      droneName: drone.name,
      mtom: drone.mtom,
      characteristicDimension: drone.characteristicDimension,
    });
  }, [updateInputs]);

  const handleFlightAreaUpdate = useCallback((data: FlightAreaData) => {
    setFlightAreaData(data);
    updateInputs({
      operationType: data.operationType || 'VLOS',
      populationDensity: data.populationDensityClass,
      airspaceClass: data.airspaceClass,
    });
  }, [updateInputs]);

  // Pre-step screen
  if (!started) {
    return (
      <PreStep
        applicantName={applicantName}
        applicantEmail={applicantEmail}
        flightDate={flightDate}
        timeFrom={timeFrom}
        timeTo={timeTo}
        onChangeName={setApplicantName}
        onChangeEmail={setApplicantEmail}
        onChangeFlightDate={setFlightDate}
        onChangeTimeFrom={setTimeFrom}
        onChangeTimeTo={setTimeTo}
        onContinue={() => setStarted(true)}
      />
    );
  }

  return (
    <div className="min-h-screen bg-sora-bg text-sora-text font-sora">
      {/* Top bar with applicant info */}
      <div className="border-b border-sora-border px-6 py-3">
        <div className="max-w-6xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Link to="/" className="text-sora-text-muted hover:text-sora-text transition-colors">
              <ArrowLeft className="w-5 h-5" />
            </Link>
            <div>
              <h1 className="text-xl font-bold bg-gradient-to-r from-sora-purple to-sora-pink bg-clip-text text-transparent">SORA DMA</h1>
              <p className="text-sora-text-dim text-xs">
                {applicantName} · {applicantEmail}
                {flightDate && ` · ${format(parseISO(flightDate), 'dd/MM/yyyy')}`}
                {timeFrom && timeTo && ` · ${timeFrom}–${timeTo}`}
              </p>
            </div>
          </div>
          <div className="text-sm text-sora-text-dim hidden md:flex items-center gap-3">
            <span>SAIL <span className="text-sora-purple font-bold">{results.sailRoman || '—'}</span></span>
            <span className="text-sora-border">|</span>
            <span>GRC <span className="text-sora-pink font-bold">{results.finalGrc || '—'}</span></span>
            <span className="text-sora-border">|</span>
            <span>ARC <span className="text-sora-purple font-bold">{results.residualArc || '—'}</span></span>
            {bestScenario && (
              <>
                <span className="text-sora-border">|</span>
                <span className="text-sora-success font-bold">{bestScenario.id}</span>
              </>
            )}
          </div>
        </div>
      </div>

      {/* Progress bar */}
      <div className="border-b border-sora-border px-6 py-3">
        <div className="max-w-6xl mx-auto flex items-center gap-1">
          {STEPS.map((s, i) => (
            <button key={i} onClick={() => setStep(i)} className="flex items-center gap-1 flex-1">
              <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold transition-all ${
                i === step ? 'bg-sora-purple text-sora-text scale-110' :
                i < step ? 'bg-sora-purple/30 text-sora-purple' :
                'bg-sora-surface text-sora-text-dim'
              }`}>
                {i < step ? <Check className="w-4 h-4" /> : s.short}
              </div>
              <span className={`text-xs hidden lg:block ${i === step ? 'text-sora-text' : 'text-sora-text-dim'}`}>{s.label}</span>
              {i < STEPS.length - 1 && <div className={`flex-1 h-px mx-1 ${i < step ? 'bg-sora-purple/50' : 'bg-sora-border'}`} />}
            </button>
          ))}
        </div>
      </div>

      {/* Main content with sidebar */}
      <div className="max-w-6xl mx-auto px-6 py-8 flex gap-8 pb-24">
        <div className="flex-1 min-w-0">
          <AnimatePresence mode="wait">
            <motion.div
              key={step}
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              transition={{ duration: 0.2 }}
            >
              {step === 0 && (
                <Step2FlightArea
                  municipality={municipality || 'Trondheim'}
                  municipalityDensity={0}
                  drone={selectedDrone}
                  flightAreaData={flightAreaData}
                  maxAltitude={derivedInputs.maxAltitude}
                  onUpdate={handleFlightAreaUpdate}
                  onMunicipalitySelect={handleMunicipalitySelect}
                  initialCoords={municipalityData ? { lat: municipalityData.lat, lon: municipalityData.lon } : null}
                />
              )}
              {step === 1 && (
                <Step3Drone
                  selectedDrone={selectedDrone}
                  onSelect={handleDroneSelect}
                />
              )}
              {step === 2 && (
                <Step4Mitigations
                  mitigations={mitigations}
                  isBVLOS={derivedInputs.operationType === 'BVLOS'}
                  onChange={updateMitigations}
                />
              )}
              {step === 3 && (
                <Step5ScenarioForm
                  matchedScenario={bestScenario}
                  sailLevel={results.sail}
                  formData={scenarioFormData}
                  applicantName={applicantName}
                  municipality={municipality}
                  droneName={derivedInputs.droneName}
                  operationType={derivedInputs.operationType}
                  flightDate={flightDate}
                  onChange={updateScenarioForm}
                />
              )}
              {step === 4 && (
                <Step6OSO
                  sail={results.sail}
                  osoTexts={osoTexts}
                  onOsoChange={updateOso}
                  applicantName={applicantName}
                  droneName={derivedInputs.droneName}
                  municipality={municipality}
                  operationType={derivedInputs.operationType}
                  dayNight={derivedInputs.dayNight}
                  flightAreaDescription={flightAreaData?.flightDescription || ''}
                />
              )}
              {step === 5 && (
                <StepOperationsManual
                  applicantName={applicantName}
                  applicantEmail={applicantEmail}
                  flightDate={flightDate}
                  municipality={municipality}
                  selectedDrone={selectedDrone}
                  results={results}
                  flightAreaData={flightAreaData}
                  derivedInputs={derivedInputs}
                  scenario={bestScenarioId}
                  manualTexts={manualTexts}
                  onManualTextChange={updateManualText}
                />
              )}
              {step === 6 && (
                <Step7Explanation
                  sailLevel={results.sail}
                  matchedScenario={bestScenario}
                />
              )}
              {step === 7 && (
                <Step8Documents
                  scenario={bestScenarioId}
                />
              )}
            </motion.div>
          </AnimatePresence>
        </div>

      </div>

      {/* Navigation */}
      <div className="fixed bottom-0 left-0 right-0 border-t border-sora-border bg-sora-bg/95 backdrop-blur-sm px-6 py-4 z-50">
        <div className="max-w-6xl mx-auto flex items-center justify-between">
          <button
            onClick={() => setStep(Math.max(0, step - 1))}
            disabled={step === 0}
            className="flex items-center gap-2 px-5 py-2.5 rounded-lg bg-sora-surface text-sora-text-muted hover:bg-sora-surface-hover disabled:opacity-30 disabled:cursor-not-allowed transition-colors text-sm"
          >
            <ArrowLeft className="w-4 h-4" /> Forrige
          </button>
          <span className="text-sora-text-dim text-sm">Steg {step + 1} av {STEPS.length}</span>
          <button
            onClick={() => setStep(Math.min(STEPS.length - 1, step + 1))}
            disabled={step === STEPS.length - 1}
            className="flex items-center gap-2 px-5 py-2.5 rounded-lg bg-sora-purple text-sora-text hover:opacity-90 disabled:opacity-30 disabled:cursor-not-allowed transition-colors text-sm"
          >
            Neste <ArrowRight className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Contact Haiko */}
      <ContactHaiko prominent={step === 4 || step === 7} />
    </div>
  );
}
