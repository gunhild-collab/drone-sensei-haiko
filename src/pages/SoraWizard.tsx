import { useState, useMemo } from "react";
import { Link } from "react-router-dom";
import { ArrowLeft, ArrowRight, Check } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { SoraInputs, calculateAll, OSO_DEFINITIONS } from "@/lib/soraCalculations";
import SoraStep1 from "@/components/sora/SoraStep1";
import SoraStep2 from "@/components/sora/SoraStep2";
import SoraStep3 from "@/components/sora/SoraStep3";
import SoraStep4 from "@/components/sora/SoraStep4";
import SoraStep5 from "@/components/sora/SoraStep5";
import SoraStep6, { ConOpsFields } from "@/components/sora/SoraStep6";
import SoraStep7 from "@/components/sora/SoraStep7";

const STEPS = [
  { label: 'Drone & operasjon', short: '1' },
  { label: 'GRC', short: '2' },
  { label: 'ARC', short: '3' },
  { label: 'SAIL', short: '4' },
  { label: 'OSO', short: '5' },
  { label: 'ConOps', short: '6' },
  { label: 'Dokumenter', short: '7' },
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
  const [step, setStep] = useState(0);
  const [inputs, setInputs] = useState<SoraInputs>(defaultInputs);
  const [osoTexts, setOsoTexts] = useState<Record<number, string>>({});
  const [conopsFields, setConopsFields] = useState<ConOpsFields>(defaultConops);

  const results = useMemo(() => calculateAll(inputs), [inputs]);

  const updateInputs = (updates: Partial<SoraInputs>) => setInputs(prev => ({ ...prev, ...updates }));
  const updateOso = (id: number, text: string) => setOsoTexts(prev => ({ ...prev, [id]: text }));
  const updateConops = (updates: Partial<ConOpsFields>) => setConopsFields(prev => ({ ...prev, ...updates }));

  return (
    <div className="min-h-screen bg-[#0f0f17] text-white" style={{ fontFamily: "'DM Sans', sans-serif" }}>
      {/* Header */}
      <div className="border-b border-[#1a1a2e] px-6 py-4">
        <div className="max-w-4xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Link to="/" className="text-gray-400 hover:text-white transition-colors">
              <ArrowLeft className="w-5 h-5" />
            </Link>
            <div>
              <h1 className="text-xl font-bold bg-gradient-to-r from-[#7c3aed] to-[#ec4899] bg-clip-text text-transparent">SORA Builder</h1>
              <p className="text-gray-500 text-xs">SORA 2.5 Risk Assessment Wizard</p>
            </div>
          </div>
          <div className="text-sm text-gray-500">
            SAIL {results.sailRoman} | GRC {results.finalGrc} | {results.residualArc}
          </div>
        </div>
      </div>

      {/* Progress */}
      <div className="border-b border-[#1a1a2e] px-6 py-3">
        <div className="max-w-4xl mx-auto flex items-center gap-1">
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

      {/* Content */}
      <div className="max-w-4xl mx-auto px-6 py-8">
        <AnimatePresence mode="wait">
          <motion.div
            key={step}
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            transition={{ duration: 0.2 }}
          >
            {step === 0 && <SoraStep1 inputs={inputs} onChange={updateInputs} />}
            {step === 1 && <SoraStep2 inputs={inputs} onChange={updateInputs} />}
            {step === 2 && <SoraStep3 inputs={inputs} onChange={updateInputs} />}
            {step === 3 && <SoraStep4 results={results} />}
            {step === 4 && <SoraStep5 sail={results.sail} osoTexts={osoTexts} onOsoChange={updateOso} />}
            {step === 5 && <SoraStep6 inputs={inputs} results={results} osoTexts={osoTexts} conopsFields={conopsFields} onConopsChange={updateConops} />}
          </motion.div>
        </AnimatePresence>
      </div>

      {/* Navigation */}
      <div className="fixed bottom-0 left-0 right-0 border-t border-[#1a1a2e] bg-[#0f0f17]/95 backdrop-blur-sm px-6 py-4">
        <div className="max-w-4xl mx-auto flex items-center justify-between">
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
