import { useState } from "react";
import { CheckCircle, AlertTriangle, FileText } from "lucide-react";
import { PdraScenario } from "@/data/pdraScenarios";

export interface ScenarioFormData {
  // Common
  pilotCertNumber: string;
  atoName: string;
  insuranceCompany: string;
  insuranceNumber: string;
  // STS specific
  operationsManualRef: string;
  // SORA ConOps
  conopsDescription: string;
  maxFlightAltitude: string;
  contingencyBuffer: string;
  grbMeters: string;
  terrain: string;
  nearestAirport: string;
  restrictions: string;
}

interface Props {
  matchedScenario: PdraScenario | null;
  sailLevel: number;
  formData: ScenarioFormData;
  applicantName: string;
  municipality: string;
  droneName: string;
  operationType: string;
  flightDate: string;
  onChange: (updates: Partial<ScenarioFormData>) => void;
}

const inputClass = "w-full bg-sora-bg border border-sora-border rounded-lg px-4 py-3 text-sora-text placeholder:text-sora-text-dim focus:outline-none focus:ring-2 focus:ring-sora-purple transition-colors text-sm";
const labelClass = "block text-sm font-medium text-sora-text-muted mb-2";
const textareaClass = "w-full bg-sora-bg border border-sora-border rounded-lg px-4 py-3 text-sora-text placeholder:text-sora-text-dim focus:outline-none focus:ring-2 focus:ring-sora-purple transition-colors text-sm min-h-[80px] resize-y";

function getScenarioType(scenario: PdraScenario | null, sail: number): 'open' | 'sts' | 'pdra' | 'sora' {
  if (!scenario) return sail <= 2 ? 'open' : 'sora';
  if (scenario.id.startsWith('STS')) return 'sts';
  if (scenario.id.startsWith('PDRA')) return 'pdra';
  return 'sora';
}

export default function Step5ScenarioForm({ matchedScenario, sailLevel, formData, applicantName, municipality, droneName, operationType, flightDate, onChange }: Props) {
  const scenarioType = getScenarioType(matchedScenario, sailLevel);

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-sora-text mb-1">Scenariospesifikt skjema</h2>
        <p className="text-sora-text-muted text-sm">
          {matchedScenario
            ? `Basert på ${matchedScenario.id} — ${matchedScenario.name}`
            : `Full SORA-prosess (SAIL ${['', 'I', 'II', 'III', 'IV', 'V', 'VI'][sailLevel]})`}
        </p>
      </div>

      {/* Scenario badge */}
      <div className={`rounded-xl p-4 border ${matchedScenario ? 'bg-sora-success/10 border-sora-success/30' : 'bg-sora-purple/10 border-sora-purple/30'}`}>
        <div className="flex items-center gap-2">
          {matchedScenario ? <CheckCircle className="w-5 h-5 text-sora-success" /> : <FileText className="w-5 h-5 text-sora-purple" />}
          <span className={`font-semibold text-sm ${matchedScenario ? 'text-sora-success' : 'text-sora-purple'}`}>
            {matchedScenario ? `Standard scenario: ${matchedScenario.id}` : 'Full SORA kreves'}
          </span>
        </div>
        <p className="text-sora-text-muted text-xs mt-1">
          {matchedScenario ? matchedScenario.description : 'Ingen standard scenario matcher din operasjon. Fyll ut alle ConOps-felt.'}
        </p>
      </div>

      {/* Open category - short checklist */}
      {scenarioType === 'open' && (
        <div className="space-y-4">
          <h3 className="text-lg font-semibold text-sora-text">Åpen kategori — sjekkliste</h3>
          <div className="space-y-3">
            <Field label="Pilotsertifikat-nummer" value={formData.pilotCertNumber} onChange={v => onChange({ pilotCertNumber: v })} placeholder="A1/A2/A3 sertifikatnummer" />
            <Field label="Forsikringsselskap" value={formData.insuranceCompany} onChange={v => onChange({ insuranceCompany: v })} placeholder="Selskap" />
            <Field label="Forsikringsnummer" value={formData.insuranceNumber} onChange={v => onChange({ insuranceNumber: v })} placeholder="Polisenummer" />
          </div>
        </div>
      )}

      {/* STS - extended form */}
      {scenarioType === 'sts' && (
        <div className="space-y-4">
          <h3 className="text-lg font-semibold text-sora-text">STS-erklæring</h3>
          <div className="space-y-3">
            <Field label="Pilotsertifikat-nummer" value={formData.pilotCertNumber} onChange={v => onChange({ pilotCertNumber: v })} placeholder="STS-sertifikatnummer" />
            <Field label="ATO (Approved Training Organisation)" value={formData.atoName} onChange={v => onChange({ atoName: v })} placeholder="Navn på treningsorganisasjon" />
            <Field label="Referanse til operasjonsmanual" value={formData.operationsManualRef} onChange={v => onChange({ operationsManualRef: v })} placeholder="Dokumentnavn og versjon" />
            <Field label="Forsikringsselskap" value={formData.insuranceCompany} onChange={v => onChange({ insuranceCompany: v })} placeholder="Selskap" />
            <Field label="Forsikringsnummer" value={formData.insuranceNumber} onChange={v => onChange({ insuranceNumber: v })} placeholder="Polisenummer" />
          </div>
        </div>
      )}

      {/* PDRA - medium form */}
      {scenarioType === 'pdra' && (
        <div className="space-y-4">
          <h3 className="text-lg font-semibold text-sora-text">PDRA-søknad</h3>
          <div className="space-y-3">
            <Field label="Pilotsertifikat-nummer" value={formData.pilotCertNumber} onChange={v => onChange({ pilotCertNumber: v })} placeholder="Sertifikatnummer" />
            <Field label="ATO" value={formData.atoName} onChange={v => onChange({ atoName: v })} placeholder="Treningsorganisasjon" />
            <TextArea label="Operasjonsbeskrivelse" value={formData.conopsDescription} onChange={v => onChange({ conopsDescription: v })} placeholder={`${operationType} operasjon i ${municipality} med ${droneName}...`} />
            <Field label="Maks flygehøyde (m AGL)" value={formData.maxFlightAltitude} onChange={v => onChange({ maxFlightAltitude: v })} placeholder="120" />
            <Field label="Nærmeste flyplass" value={formData.nearestAirport} onChange={v => onChange({ nearestAirport: v })} placeholder="ICAO-kode eller navn" />
            <Field label="Forsikringsselskap" value={formData.insuranceCompany} onChange={v => onChange({ insuranceCompany: v })} />
          </div>
        </div>
      )}

      {/* Full SORA - complete ConOps */}
      {scenarioType === 'sora' && (
        <div className="space-y-4">
          <h3 className="text-lg font-semibold text-sora-text">SORA ConOps</h3>
          <div className="space-y-3">
            <Field label="Pilotsertifikat-nummer" value={formData.pilotCertNumber} onChange={v => onChange({ pilotCertNumber: v })} placeholder="Sertifikatnummer" />
            <Field label="ATO" value={formData.atoName} onChange={v => onChange({ atoName: v })} placeholder="Treningsorganisasjon" />
            <TextArea label="ConOps — operasjonsbeskrivelse" value={formData.conopsDescription} onChange={v => onChange({ conopsDescription: v })} placeholder={`Beskriv operasjonen i detalj: formål, ${operationType}, ${droneName} i ${municipality}...`} />
            <Field label="Maks flygehøyde (m AGL)" value={formData.maxFlightAltitude} onChange={v => onChange({ maxFlightAltitude: v })} placeholder="120" />
            <Field label="Beredskapsvolum (m)" value={formData.contingencyBuffer} onChange={v => onChange({ contingencyBuffer: v })} placeholder="50" />
            <Field label="Bakkerisikobuffer GRB (m)" value={formData.grbMeters} onChange={v => onChange({ grbMeters: v })} placeholder="30" />
            <TextArea label="Terrengbeskrivelse" value={formData.terrain} onChange={v => onChange({ terrain: v })} placeholder="Beskriv terreng, hindringer, bebyggelse..." />
            <Field label="Nærmeste flyplass / helipad" value={formData.nearestAirport} onChange={v => onChange({ nearestAirport: v })} placeholder="ICAO-kode" />
            <TextArea label="Restriksjoner og begrensninger" value={formData.restrictions} onChange={v => onChange({ restrictions: v })} placeholder="Vindgrenser, temperaturer, NOTAMs..." />
            <Field label="Forsikringsselskap" value={formData.insuranceCompany} onChange={v => onChange({ insuranceCompany: v })} />
            <Field label="Forsikringsnummer" value={formData.insuranceNumber} onChange={v => onChange({ insuranceNumber: v })} />
          </div>
        </div>
      )}
    </div>
  );
}

function Field({ label, value, onChange, placeholder }: { label: string; value: string; onChange: (v: string) => void; placeholder?: string }) {
  return (
    <div>
      <label className={labelClass}>{label}</label>
      <input type="text" className={inputClass} value={value} onChange={e => onChange(e.target.value)} placeholder={placeholder} />
    </div>
  );
}

function TextArea({ label, value, onChange, placeholder }: { label: string; value: string; onChange: (v: string) => void; placeholder?: string }) {
  return (
    <div>
      <label className={labelClass}>{label}</label>
      <textarea className={textareaClass} value={value} onChange={e => onChange(e.target.value)} placeholder={placeholder} />
    </div>
  );
}
