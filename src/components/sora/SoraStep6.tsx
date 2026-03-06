import { useState, useMemo } from "react";
import { SoraInputs, SoraResults, OSO_DEFINITIONS, getOsoRobustness } from "@/lib/soraCalculations";
import { Copy, Download, Check } from "lucide-react";
import { Document, Packer, Paragraph, TextRun, HeadingLevel, Table, TableRow, TableCell, WidthType, BorderStyle } from "docx";
import { saveAs } from "file-saver";

interface Props {
  inputs: SoraInputs;
  results: SoraResults;
  osoTexts: Record<number, string>;
  conopsFields: ConOpsFields;
  onConopsChange: (updates: Partial<ConOpsFields>) => void;
}

export interface ConOpsFields {
  operatorName: string;
  maxSpeed: string;
  propulsion: string;
  hasRemoteId: string;
  flightGeography: string;
  contingencyBuffer: string;
  grbMeters: string;
  operationDuration: string;
  terrain: string;
  nearestAirport: string;
  restrictions: string;
}

const sectionClass = "bg-[#1a1a2e] rounded-xl p-5 border border-[#2a2a3e] space-y-3";
const headingClass = "text-lg font-bold text-white";
const textClass = "text-gray-300 text-sm leading-relaxed";
const editableClass = "bg-[#0f0f17] border border-[#2a2a3e] rounded px-3 py-2 text-gray-200 text-sm focus:outline-none focus:ring-1 focus:ring-[#7c3aed] w-full";
const labelClass = "text-gray-400 text-xs font-medium";

const popLabels: Record<string, string> = {
  controlled: 'kontrollert bakkeområde',
  sparsely: 'tynt befolket område',
  populated: 'befolket område',
  gathering: 'forsamling av mennesker',
};

function InlineEdit({ label, value, onChange }: { label: string; value: string; onChange: (v: string) => void }) {
  return (
    <span className="inline-flex items-center gap-1">
      <span className={labelClass}>{label}:</span>
      <input className="bg-transparent border-b border-dashed border-[#7c3aed]/50 text-[#ec4899] text-sm px-1 focus:outline-none focus:border-[#7c3aed] w-auto min-w-[80px]" value={value} onChange={e => onChange(e.target.value)} />
    </span>
  );
}

export default function SoraStep6({ inputs, results, osoTexts, conopsFields, onConopsChange }: Props) {
  const [copied, setCopied] = useState(false);
  const kineticEnergy = useMemo(() => {
    const speed = parseFloat(conopsFields.maxSpeed) || 15;
    return (0.5 * inputs.mtom * speed * speed).toFixed(0);
  }, [inputs.mtom, conopsFields.maxSpeed]);

  const sections = useMemo(() => buildSections(inputs, results, osoTexts, conopsFields, kineticEnergy), [inputs, results, osoTexts, conopsFields, kineticEnergy]);

  const fullText = sections.map(s => `${s.title}\n\n${s.content}`).join('\n\n---\n\n');

  const handleCopy = () => {
    navigator.clipboard.writeText(fullText);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleDownload = async () => {
    const doc = new Document({
      sections: [{
        children: [
          new Paragraph({
            children: [new TextRun({ text: 'SORA 2.5 ConOps — Arbeidsdokument', bold: true, size: 32 })],
            heading: HeadingLevel.TITLE,
          }),
          new Paragraph({
            children: [new TextRun({ text: 'VIKTIG: Dette dokumentet er generert som et arbeidsverktøy og må kvalitetssikres av regulatorisk rådgiver før innsending til Luftfartstilsynet. Dokumentet erstatter ikke profesjonell veiledning.', italics: true, size: 20, color: 'FF0000' })],
            spacing: { after: 400 },
          }),
          ...sections.flatMap(s => [
            new Paragraph({ text: s.title, heading: HeadingLevel.HEADING_1, spacing: { before: 400, after: 200 } }),
            ...s.content.split('\n').map(line => new Paragraph({ children: [new TextRun({ text: line, size: 22 })], spacing: { after: 100 } })),
          ]),
          // OSO compliance table
          new Paragraph({ text: '10. OSO compliance-matrise', heading: HeadingLevel.HEADING_1, spacing: { before: 400, after: 200 } }),
          buildOsoTable(results.sail, osoTexts),
        ],
      }],
    });
    const blob = await Packer.toBlob(doc);
    saveAs(blob, `ConOps_${inputs.droneName || 'drone'}_SAIL_${results.sailRoman}.docx`);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-white mb-1">ConOps-dokument</h2>
          <p className="text-gray-400 text-sm">Auto-generert utkast basert på dine inndata. Rediger direkte i feltene.</p>
        </div>
        <div className="flex gap-2">
          <button onClick={handleCopy} className="flex items-center gap-2 bg-[#2a2a3e] hover:bg-[#3a3a4e] text-white px-4 py-2 rounded-lg text-sm transition-colors">
            {copied ? <Check className="w-4 h-4 text-green-400" /> : <Copy className="w-4 h-4" />}
            {copied ? 'Kopiert!' : 'Kopier alt'}
          </button>
          <button onClick={handleDownload} className="flex items-center gap-2 bg-[#7c3aed] hover:bg-[#6d28d9] text-white px-4 py-2 rounded-lg text-sm transition-colors">
            <Download className="w-4 h-4" />
            Last ned .docx
          </button>
        </div>
      </div>

      {/* Disclaimer */}
      <div className="bg-red-500/10 border border-red-500/30 rounded-xl p-4">
        <p className="text-red-300 text-sm"><strong>VIKTIG:</strong> Dette dokumentet er generert som et arbeidsverktøy og må kvalitetssikres av regulatorisk rådgiver før innsending til Luftfartstilsynet.</p>
      </div>

      {/* Section 1 */}
      <div className={sectionClass}>
        <h3 className={headingClass}>1. Innledning og formål</h3>
        <p className={textClass}>
          Dette dokumentet beskriver konsept for operasjoner (ConOps) for <strong className="text-[#ec4899]">{inputs.droneName || '[dronenavn]'}</strong> operert av{' '}
          <InlineEdit label="" value={conopsFields.operatorName} onChange={v => onConopsChange({ operatorName: v })} />.
          Operasjonen er klassifisert som <strong className="text-[#7c3aed]">{inputs.operationType}</strong> i {popLabels[inputs.populationDensity]}, og er vurdert til <strong className="text-[#ec4899]">SAIL {results.sailRoman}</strong> i henhold til SORA 2.5-metodikken (EASA ED Decision 2025/018/R).
        </p>
      </div>

      {/* Section 2 */}
      <div className={sectionClass}>
        <h3 className={headingClass}>2. Dronesystem</h3>
        <div className="grid grid-cols-2 gap-3 text-sm">
          <div><span className="text-gray-400">Fartøy:</span> <span className="text-white">{inputs.droneName || '[dronenavn]'}</span></div>
          <div><span className="text-gray-400">MTOM:</span> <span className="text-white">{inputs.mtom} kg</span></div>
          <div><span className="text-gray-400">Karakteristisk dim.:</span> <span className="text-white">{inputs.characteristicDimension} m</span></div>
          <div><InlineEdit label="Maks hastighet (m/s)" value={conopsFields.maxSpeed} onChange={v => onConopsChange({ maxSpeed: v })} /></div>
          <div><span className="text-gray-400">Kinetisk energi:</span> <span className="text-[#ec4899]">{kineticEnergy} J</span></div>
          <div>
            <span className="text-gray-400">Propulsjon:</span>{' '}
            <select className="bg-transparent border-b border-dashed border-[#7c3aed]/50 text-white text-sm" value={conopsFields.propulsion} onChange={e => onConopsChange({ propulsion: e.target.value })}>
              <option value="elektrisk">Elektrisk</option>
              <option value="hybrid">Hybrid</option>
              <option value="forbrenning">Forbrenning</option>
            </select>
          </div>
          <div>
            <span className="text-gray-400">Remote ID:</span>{' '}
            <select className="bg-transparent border-b border-dashed border-[#7c3aed]/50 text-white text-sm" value={conopsFields.hasRemoteId} onChange={e => onConopsChange({ hasRemoteId: e.target.value })}>
              <option value="ja">Ja</option>
              <option value="nei">Nei</option>
            </select>
          </div>
        </div>
      </div>

      {/* Section 3 */}
      <div className={sectionClass}>
        <h3 className={headingClass}>3. Operasjonelt volum</h3>
        <div className="space-y-2">
          <div><span className={labelClass}>Flygegeografi (FG):</span> <input className={editableClass} value={conopsFields.flightGeography} onChange={e => onConopsChange({ flightGeography: e.target.value })} placeholder="Beskriv operasjonsområdet" /></div>
          <div><span className={labelClass}>Beredskapsvolum (CV) buffer:</span> <input className={editableClass} value={conopsFields.contingencyBuffer} onChange={e => onConopsChange({ contingencyBuffer: e.target.value })} placeholder="f.eks. 50 meter" /></div>
          <div><span className={labelClass}>Bakkerisikobuffer (GRB):</span> <input className={editableClass} value={conopsFields.grbMeters} onChange={e => onConopsChange({ grbMeters: e.target.value })} placeholder="f.eks. 30 meter" /></div>
          <div><span className="text-gray-400 text-sm">Maks høyde: {inputs.maxAltitude} m AGL | Tid: {inputs.dayNight === 'day' ? 'Dag' : inputs.dayNight === 'night' ? 'Natt' : 'Dag og natt'}</span></div>
          <div><span className={labelClass}>Varighet per operasjon:</span> <input className={editableClass} value={conopsFields.operationDuration} onChange={e => onConopsChange({ operationDuration: e.target.value })} placeholder="f.eks. 30 minutter" /></div>
        </div>
      </div>

      {/* Section 4 */}
      <div className={sectionClass}>
        <h3 className={headingClass}>4. Operasjonsmiljø</h3>
        <div className="space-y-2">
          <p className={textClass}>Operasjonen gjennomføres i {popLabels[inputs.populationDensity]}. Luftromsklasse: {inputs.airspaceClass.replace('_', ' ')}.</p>
          <div><span className={labelClass}>Terreng:</span>
            <select className={editableClass} value={conopsFields.terrain} onChange={e => onConopsChange({ terrain: e.target.value })}>
              <option value="">Velg terreng...</option>
              <option value="flat mark">Flat mark</option>
              <option value="urban">Urban</option>
              <option value="fjell">Fjell</option>
              <option value="kystlinje">Kystlinje</option>
              <option value="over vann">Over vann</option>
            </select>
          </div>
          <div><span className={labelClass}>Nærmeste flyplass (km):</span> <input className={editableClass} value={conopsFields.nearestAirport} onChange={e => onConopsChange({ nearestAirport: e.target.value })} placeholder="f.eks. 15" /></div>
          <div><span className={labelClass}>Relevante restriksjoner:</span> <input className={editableClass} value={conopsFields.restrictions} onChange={e => onConopsChange({ restrictions: e.target.value })} placeholder="f.eks. NOTAM, R-områder" /></div>
        </div>
      </div>

      {/* Section 5 */}
      <div className={sectionClass}>
        <h3 className={headingClass}>5. Risikovurdering — sammendrag</h3>
        <div className="grid grid-cols-2 gap-2 text-sm">
          <div><span className="text-gray-400">Intrinsic GRC:</span> <span className="text-[#7c3aed] font-bold">{results.intrinsicGrc}</span></div>
          <div><span className="text-gray-400">Final GRC:</span> <span className="text-[#ec4899] font-bold">{results.finalGrc}</span></div>
          <div><span className="text-gray-400">Initial ARC:</span> <span className="text-white">{results.initialArc}</span></div>
          <div><span className="text-gray-400">Residual ARC:</span> <span className="text-white">{results.residualArc}</span></div>
          <div><span className="text-gray-400">SAIL:</span> <span className="text-[#ec4899] font-bold">{results.sailRoman}</span></div>
        </div>
      </div>

      {/* Sections 6-9 from OSO texts */}
      <div className={sectionClass}>
        <h3 className={headingClass}>6. Operative prosedyrer</h3>
        <div className="space-y-2">
          <p className="text-gray-400 text-xs font-semibold">Normale prosedyrer (OSO #11):</p>
          <p className={textClass}>{osoTexts[11] || OSO_DEFINITIONS[10].template}</p>
          <p className="text-gray-400 text-xs font-semibold mt-3">Ikke-nominelle prosedyrer (OSO #10):</p>
          <p className={textClass}>{osoTexts[10] || OSO_DEFINITIONS[9].template}</p>
          <p className="text-gray-400 text-xs font-semibold mt-3">Nødprosedyrer (OSO #13):</p>
          <p className={textClass}>{osoTexts[13] || OSO_DEFINITIONS[12].template}</p>
        </div>
      </div>

      <div className={sectionClass}>
        <h3 className={headingClass}>7. Beredskapsplan (ERP)</h3>
        <p className={textClass}>{osoTexts[14] || OSO_DEFINITIONS[13].template}</p>
      </div>

      <div className={sectionClass}>
        <h3 className={headingClass}>8. Besetning og kompetanse</h3>
        <p className={textClass}>{osoTexts[1] || OSO_DEFINITIONS[0].template}</p>
        <p className={textClass}>{osoTexts[6] || OSO_DEFINITIONS[5].template}</p>
        <p className={textClass}>{osoTexts[12] || OSO_DEFINITIONS[11].template}</p>
      </div>

      <div className={sectionClass}>
        <h3 className={headingClass}>9. Vedlikehold</h3>
        <p className={textClass}>{osoTexts[3] || OSO_DEFINITIONS[2].template}</p>
      </div>

      {/* Section 10 - OSO table */}
      <div className={sectionClass}>
        <h3 className={headingClass}>10. OSO compliance-matrise</h3>
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead>
              <tr className="text-gray-400">
                <th className="text-left px-2 py-1">OSO</th>
                <th className="text-left px-2 py-1">Robusthet</th>
                <th className="text-left px-2 py-1">Status</th>
              </tr>
            </thead>
            <tbody>
              {OSO_DEFINITIONS.map(oso => {
                const r = getOsoRobustness(oso, results.sail);
                const text = osoTexts[oso.id];
                const isEdited = text && text !== oso.template;
                return (
                  <tr key={oso.id} className="border-t border-[#2a2a3e]">
                    <td className="px-2 py-1.5 text-gray-300">#{String(oso.id).padStart(2, '0')}</td>
                    <td className={`px-2 py-1.5 ${r === 'H' ? 'text-red-400' : r === 'M' ? 'text-yellow-400' : r === 'L' ? 'text-gray-300' : 'text-gray-600'}`}>{r === 'O' ? '—' : r}</td>
                    <td className={`px-2 py-1.5 ${r === 'O' ? 'text-gray-600' : isEdited ? 'text-green-400' : 'text-gray-500'}`}>{r === 'O' ? 'N/A' : isEdited ? '✓ Utfylt' : '○ Ikke utfylt'}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

function buildSections(inputs: SoraInputs, results: SoraResults, osoTexts: Record<number, string>, fields: ConOpsFields, ke: string) {
  const pop = popLabels[inputs.populationDensity] || inputs.populationDensity;
  return [
    { title: '1. Innledning og formål', content: `Dette dokumentet beskriver konsept for operasjoner (ConOps) for ${inputs.droneName} operert av ${fields.operatorName || '[operatørnavn]'}. Operasjonen er klassifisert som ${inputs.operationType} i ${pop}, og er vurdert til SAIL ${results.sailRoman} i henhold til SORA 2.5-metodikken (EASA ED Decision 2025/018/R).` },
    { title: '2. Dronesystem', content: `Fartøy: ${inputs.droneName}. MTOM: ${inputs.mtom} kg. Karakteristisk dimensjon: ${inputs.characteristicDimension} m. Maks hastighet: ${fields.maxSpeed || '[?]'} m/s. Energi ved impact: ${ke} J. Propulsjon: ${fields.propulsion}. Remote ID: ${fields.hasRemoteId}.` },
    { title: '3. Operasjonelt volum', content: `Flygegeografi (FG): ${fields.flightGeography || '[beskriv]'}. Beredskapsvolum (CV): FG + ${fields.contingencyBuffer || '[?]'} m buffer. Bakkerisikobuffer (GRB): ${fields.grbMeters || '[?]'} m. Maks høyde: ${inputs.maxAltitude} m AGL. Operasjonstid: ${inputs.dayNight === 'day' ? 'Dag' : inputs.dayNight === 'night' ? 'Natt' : 'Dag og natt'}. Varighet: ${fields.operationDuration || '[?]'}.` },
    { title: '4. Operasjonsmiljø', content: `Operasjonen gjennomføres i ${pop}. Luftromsklasse: ${inputs.airspaceClass}. Terreng: ${fields.terrain || '[velg]'}. Nærmeste flyplass: ${fields.nearestAirport || '[?]'} km. Relevante restriksjoner: ${fields.restrictions || '[ingen oppgitt]'}.` },
    { title: '5. Risikovurdering — sammendrag', content: `Intrinsic GRC: ${results.intrinsicGrc}. Mitigasjoner: M1 (${inputs.m1}), M2 (${inputs.m2}). Final GRC: ${results.finalGrc}. Initial ARC: ${results.initialArc}. Residual ARC: ${results.residualArc}. SAIL-nivå: ${results.sailRoman}.` },
    { title: '6. Operative prosedyrer', content: `Normale prosedyrer:\n${osoTexts[11] || OSO_DEFINITIONS[10].template}\n\nIkke-nominelle prosedyrer:\n${osoTexts[10] || OSO_DEFINITIONS[9].template}\n\nNødprosedyrer:\n${osoTexts[13] || OSO_DEFINITIONS[12].template}` },
    { title: '7. Beredskapsplan (ERP)', content: osoTexts[14] || OSO_DEFINITIONS[13].template },
    { title: '8. Besetning og kompetanse', content: `${osoTexts[1] || OSO_DEFINITIONS[0].template}\n\n${osoTexts[6] || OSO_DEFINITIONS[5].template}\n\n${osoTexts[12] || OSO_DEFINITIONS[11].template}` },
    { title: '9. Vedlikehold', content: osoTexts[3] || OSO_DEFINITIONS[2].template },
  ];
}

function buildOsoTable(sail: number, osoTexts: Record<number, string>): Table {
  const rows = OSO_DEFINITIONS.map(oso => {
    const r = getOsoRobustness(oso, sail);
    const edited = osoTexts[oso.id] && osoTexts[oso.id] !== oso.template;
    return new TableRow({
      children: [
        new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: `#${String(oso.id).padStart(2, '0')}`, size: 18 })] })], width: { size: 10, type: WidthType.PERCENTAGE } }),
        new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: oso.description, size: 18 })] })], width: { size: 50, type: WidthType.PERCENTAGE } }),
        new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: r === 'O' ? '—' : r, size: 18 })] })], width: { size: 15, type: WidthType.PERCENTAGE } }),
        new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: r === 'O' ? 'N/A' : edited ? 'Utfylt' : 'Ikke utfylt', size: 18 })] })], width: { size: 25, type: WidthType.PERCENTAGE } }),
      ],
    });
  });

  return new Table({
    rows: [
      new TableRow({
        children: ['OSO', 'Beskrivelse', 'Krav', 'Status'].map(h =>
          new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: h, bold: true, size: 18 })] })], })
        ),
      }),
      ...rows,
    ],
    width: { size: 100, type: WidthType.PERCENTAGE },
  });
}

