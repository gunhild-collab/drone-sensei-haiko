import { useState, useMemo, useCallback } from "react";
import { Link } from "react-router-dom";
import { ArrowLeft, ArrowRight, Check } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { SoraInputs, calculateAll } from "@/lib/soraCalculations";
import { DroneSpec } from "@/data/droneDatabase";
import { ConOpsFields } from "@/components/sora/SoraStep6";
import PreStep from "@/components/sora/PreStep";
import NewStep1Municipality, { MunicipalityData } from "@/components/sora/NewStep1Municipality";
import NewStep2Drone from "@/components/sora/NewStep2Drone";
import NewStep3FlightArea, { FlightAreaData } from "@/components/sora/NewStep3FlightArea";
import NewStep4RiskCalc from "@/components/sora/NewStep4RiskCalc";
import NewStep5OSO from "@/components/sora/NewStep5OSO";
import NewStep6Documents from "@/components/sora/NewStep6Documents";
import LiveSummary from "@/components/sora/LiveSummary";

const STEPS = [
  { label: 'Kommune', short: '1' },
  { label: 'Drone', short: '2' },
  { label: 'Flygeområde', short: '3' },
  { label: 'Risiko', short: '4' },
  { label: 'OSO', short: '5' },
  { label: 'Dokumenter', short: '6' },
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
  airspaceClass: 'uncontrolled_low',
  hasTransponder: false,
  hasAirspaceObservers: false,
};

const defaultConops: ConOpsFields = {
  operatorName: '',
  maxSpeed: '15',
  propulsion: 'elektrisk',
  hasRemoteId: 'ja',
  flightGeography: '',
  contingencyBuffer: '50',
  grbMeters: '30',
  operationDuration: '',
  terrain: '',
  nearestAirport: '',
  restrictions: '',
};

export default function SoraWizard() {
  // Pre-step
  const [started, setStarted] = useState(false);
  const [applicantName, setApplicantName] = useState('');
  const [applicantEmail, setApplicantEmail] = useState('');

  // Step state
  const [step, setStep] = useState(0);
  const [inputs, setInputs] = useState<SoraInputs>(defaultInputs);
  const [osoTexts, setOsoTexts] = useState<Record<number, string>>({});
  const [conopsFields, setConopsFields] = useState<ConOpsFields>(defaultConops);

  // Step 1 - Municipality
  const [municipality, setMunicipality] = useState('');
  const [municipalityData, setMunicipalityData] = useState<MunicipalityData | null>(null);

  // Step 2 - Drone
  const [selectedDrone, setSelectedDrone] = useState<DroneSpec | null>(null);

  // Step 3 - Flight area
  const [flightAreaData, setFlightAreaData] = useState<FlightAreaData | null>(null);

  const results = useMemo(() => calculateAll(inputs), [inputs]);

  const updateInputs = useCallback((updates: Partial<SoraInputs>) => setInputs(prev => ({ ...prev, ...updates })), []);
  const updateOso = useCallback((id: number, text: string) => setOsoTexts(prev => ({ ...prev, [id]: text })), []);
  const updateConops = useCallback((updates: Partial<ConOpsFields>) => setConopsFields(prev => ({ ...prev, ...updates })), []);

  const handleMunicipalitySelect = useCallback((name: string, data: MunicipalityData) => {
    setMunicipality(name);
    setMunicipalityData(data);
    if (data) {
      updateInputs({ populationDensity: data.densityClass });
    }
  }, [updateInputs]);

  const handleDroneSelect = useCallback((drone: DroneSpec) => {
    setSelectedDrone(drone);
    updateInputs({
      droneName: drone.name,
      mtom: drone.mtom,
      characteristicDimension: drone.characteristicDimension,
    });
    updateConops({
      maxSpeed: String(drone.maxSpeed),
      propulsion: drone.propulsion,
      hasRemoteId: drone.hasRemoteId ? 'ja' : 'nei',
    });
  }, [updateInputs, updateConops]);

  const handleFlightAreaUpdate = useCallback((data: FlightAreaData) => {
    setFlightAreaData(data);
    updateInputs({
      operationType: data.operationType,
      populationDensity: data.populationDensityClass,
      airspaceClass: data.airspaceClass,
    });
    updateConops({ flightGeography: data.flightDescription });
  }, [updateInputs, updateConops]);

  // Pre-step screen
  if (!started) {
    return (
      <PreStep
        applicantName={applicantName}
        applicantEmail={applicantEmail}
        onChangeName={setApplicantName}
        onChangeEmail={setApplicantEmail}
        onContinue={() => {
          setStarted(true);
          setConopsFields(prev => ({ ...prev, operatorName: applicantName }));
        }}
      />
    );
  }

  return (
    <div className="min-h-screen bg-[#0f0f17] text-white" style={{ fontFamily: "'DM Sans', sans-serif" }}>
      {/* Header */}
      <div className="border-b border-[#1a1a2e] px-6 py-4">
        <div className="max-w-6xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Link to="/" className="text-gray-400 hover:text-white transition-colors">
              <ArrowLeft className="w-5 h-5" />
            </Link>
            <div>
              <h1 className="text-xl font-bold bg-gradient-to-r from-[#7c3aed] to-[#ec4899] bg-clip-text text-transparent">SORA DMA</h1>
              <p className="text-gray-500 text-xs">SORA 2.5 Risk Assessment • {applicantName}</p>
            </div>
          </div>
          <div className="text-sm text-gray-500 hidden md:block">
            SAIL {results.sailRoman} | GRC {results.finalGrc} | {results.residualArc}
          </div>
        </div>
      </div>

      {/* Progress bar */}
      <div className="border-b border-[#1a1a2e] px-6 py-3">
        <div className="max-w-6xl mx-auto flex items-center gap-1">
          {STEPS.map((s, i) => (
            <button key={i} onClick={() => setStep(i)} className="flex items-center gap-1 flex-1">
              <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold transition-all ${
                i === step ? 'bg-[#7c3aed] text-white scale-110' :
                i < step ? 'bg-[#7c3aed]/30 text-[#7c3aed]' :
                'bg-[#1a1a2e] text-gray-500'
              }`}>
                {i < step ? <Check className="w-4 h-4" /> : s.short}
              </div>
              <span className={`text-xs hidden md:block ${i === step ? 'text-white' : 'text-gray-500'}`}>{s.label}</span>
              {i < STEPS.length - 1 && <div className={`flex-1 h-px mx-1 ${i < step ? 'bg-[#7c3aed]/50' : 'bg-[#1a1a2e]'}`} />}
            </button>
          ))}
        </div>
      </div>

      {/* Main content with sidebar */}
      <div className="max-w-6xl mx-auto px-6 py-8 flex gap-8 pb-24">
        {/* Main content */}
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
                <NewStep1Municipality
                  municipality={municipality}
                  municipalityData={municipalityData}
                  onSelect={handleMunicipalitySelect}
                />
              )}
              {step === 1 && (
                <NewStep2Drone
                  selectedDrone={selectedDrone}
                  onSelect={handleDroneSelect}
                />
              )}
              {step === 2 && (
                <NewStep3FlightArea
                  municipality={municipality || 'Trondheim'}
                  municipalityDensity={municipalityData?.densityPerKm2 || 30}
                  drone={selectedDrone}
                  flightAreaData={flightAreaData}
                  onUpdate={handleFlightAreaUpdate}
                />
              )}
              {step === 3 && (
                <NewStep4RiskCalc
                  inputs={inputs}
                  results={results}
                  onChange={updateInputs}
                />
              )}
              {step === 4 && (
                <NewStep5OSO
                  sail={results.sail}
                  osoTexts={osoTexts}
                  onOsoChange={updateOso}
                  applicantName={applicantName}
                  droneName={inputs.droneName}
                  municipality={municipality}
                  operationType={inputs.operationType}
                  dayNight={inputs.dayNight}
                  flightAreaDescription={flightAreaData?.flightDescription || ''}
                />
              )}
              {step === 5 && (
                <NewStep6Documents
                  inputs={inputs}
                  results={results}
                  osoTexts={osoTexts}
                  conopsFields={conopsFields}
                  applicantName={applicantName}
                  applicantEmail={applicantEmail}
                  municipality={municipality}
                  flightAreaDescription={flightAreaData?.flightDescription || ''}
                />
              )}
            </motion.div>
          </AnimatePresence>
        </div>

        {/* Live Summary Sidebar */}
        <LiveSummary
          applicantName={applicantName}
          municipality={municipality}
          droneName={inputs.droneName}
          results={results}
          step={step + 1}
        />
      </div>

      {/* Navigation */}
      <div className="fixed bottom-0 left-0 right-0 border-t border-[#1a1a2e] bg-[#0f0f17]/95 backdrop-blur-sm px-6 py-4 z-50">
        <div className="max-w-6xl mx-auto flex items-center justify-between">
          <button
            onClick={() => setStep(Math.max(0, step - 1))}
            disabled={step === 0}
            className="flex items-center gap-2 px-5 py-2.5 rounded-lg bg-[#1a1a2e] text-gray-300 hover:bg-[#2a2a3e] disabled:opacity-30 disabled:cursor-not-allowed transition-colors text-sm"
          >
            <ArrowLeft className="w-4 h-4" /> Forrige
          </button>
          <span className="text-gray-500 text-sm">Steg {step + 1} av {STEPS.length}</span>
          <button
            onClick={() => setStep(Math.min(STEPS.length - 1, step + 1))}
            disabled={step === STEPS.length - 1}
            className="flex items-center gap-2 px-5 py-2.5 rounded-lg bg-[#7c3aed] text-white hover:bg-[#6d28d9] disabled:opacity-30 disabled:cursor-not-allowed transition-colors text-sm"
          >
            Neste <ArrowRight className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
}
