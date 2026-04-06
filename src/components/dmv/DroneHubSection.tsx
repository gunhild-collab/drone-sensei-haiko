import React from "react";

interface Props {
  municipalityName: string;
  areaKm2: number | null;
  selectedDepartments: string[];
}

const MISSION_POINTS = [
  { id: "fire", emoji: "🔥", label: "Brannstasjon", detail: "Situasjonsvurdering < 2 min", color: "#EF4444", angle: -30, dept: "Brann" },
  { id: "bridge", emoji: "🌉", label: "Bro", detail: "Inspeksjon", color: "#F97316", angle: 30, dept: "Vei" },
  { id: "building", emoji: "🏢", label: "Kommunalt bygg", detail: "Fasadeinspeksjon", color: "#3B82F6", angle: 90, dept: "Bygg" },
  { id: "farm", emoji: "🌾", label: "Jordbruksareal", detail: "Tilskuddskontroll", color: "#22C55E", angle: 150, dept: "Landbruk" },
  { id: "water", emoji: "💧", label: "Vannverk", detail: "VA-inspeksjon", color: "#06B6D4", angle: 210, dept: "Vann" },
  { id: "env", emoji: "🌲", label: "Vassdrag", detail: "Miljøovervåking", color: "#10B981", angle: -90, dept: "Miljø" },
];

function deptMatch(dept: string, target: string) {
  return dept.toLowerCase().includes(target.toLowerCase());
}

export default function DroneHubSection({ municipalityName, areaKm2, selectedDepartments }: Props) {
  const activePoints = MISSION_POINTS.filter(p =>
    selectedDepartments.some(d => deptMatch(d, p.dept))
  );

  // Zone radii based on area
  const maxRange = Math.min(50, Math.max(15, Math.sqrt((areaKm2 || 100) / Math.PI)));

  const CX = 300, CY = 250;
  const zones = [
    { r: 70, label: "VLOS (0–5 km)", color: "#34D399", opacity: 0.12 },
    { r: 130, label: "BVLOS kort (5–15 km)", color: "#FBBF24", opacity: 0.08 },
    { r: 200, label: "BVLOS lang (15–50 km)", color: "#F87171", opacity: 0.06 },
  ];

  return (
    <section id="dronehub" className="scroll-mt-16 space-y-6">
      <div>
        <h2 className="text-xl md:text-2xl font-display font-bold" style={{ color: "#1C0059" }}>
          Sentralisert dronehub
        </h2>
        <p className="text-sm mt-1" style={{ color: "#555555" }}>
          Én drone-in-a-box stasjon plassert sentralt betjener hele kommunen
        </p>
      </div>

      {/* SVG Map */}
      <div className="bg-card rounded-2xl border border-border p-4 overflow-hidden" style={{ boxShadow: "0 1px 3px rgba(0,0,0,0.06)" }}>
        <svg viewBox="0 0 600 500" className="w-full max-w-[600px] mx-auto" style={{ height: "auto" }}>
          <defs>
            {activePoints.map(p => (
              <linearGradient key={`grad-${p.id}`} id={`line-${p.id}`} x1="0%" y1="0%" x2="100%" y2="0%">
                <stop offset="0%" stopColor="#685BF8" stopOpacity="0.6" />
                <stop offset="100%" stopColor={p.color} stopOpacity="0.8" />
              </linearGradient>
            ))}
          </defs>

          {/* Concentric zones */}
          {zones.slice().reverse().map((zone, i) => (
            <g key={i}>
              <circle cx={CX} cy={CY} r={zone.r} fill={zone.color} fillOpacity={zone.opacity} stroke={zone.color} strokeOpacity={0.3} strokeWidth={1} strokeDasharray="4 4" />
              <text x={CX + zone.r - 5} y={CY - 6} fontSize={9} fill="#999" textAnchor="end">{zone.label}</text>
            </g>
          ))}

          {/* Lines from hub to mission points */}
          {activePoints.map((p, i) => {
            const angle = (p.angle * Math.PI) / 180;
            const dist = 140 + (i % 2) * 40;
            const x = CX + Math.cos(angle) * dist;
            const y = CY + Math.sin(angle) * dist;
            return (
              <g key={p.id}>
                <line x1={CX} y1={CY} x2={x} y2={y} stroke={`url(#line-${p.id})`} strokeWidth={2} strokeDasharray="6 4">
                  <animate attributeName="stroke-dashoffset" from="20" to="0" dur="2s" repeatCount="indefinite" />
                </line>
                {/* Mission point */}
                <circle cx={x} cy={y} r={28} fill="white" stroke={p.color} strokeWidth={1.5} />
                <text x={x} y={y - 4} textAnchor="middle" fontSize={16}>{p.emoji}</text>
                <text x={x} y={y + 10} textAnchor="middle" fontSize={8} fill="#1C0059" fontWeight="600">{p.label}</text>
                <text x={x} y={y + 40} textAnchor="middle" fontSize={7.5} fill="#999">{p.detail}</text>
              </g>
            );
          })}

          {/* Central hub */}
          <circle cx={CX} cy={CY} r={32} fill="url(#hubGrad)" stroke="#685BF8" strokeWidth={2} />
          <defs>
            <radialGradient id="hubGrad">
              <stop offset="0%" stopColor="#685BF8" stopOpacity="0.15" />
              <stop offset="100%" stopColor="#FF66C4" stopOpacity="0.08" />
            </radialGradient>
          </defs>
          <text x={CX} y={CY - 6} textAnchor="middle" fontSize={18}>🏠</text>
          <text x={CX} y={CY + 10} textAnchor="middle" fontSize={7} fill="#1C0059" fontWeight="700">Dronehub</text>
          <text x={CX} y={CY + 50} textAnchor="middle" fontSize={8} fill="#685BF8" fontWeight="600">Haiko Dronehub — {municipalityName}</text>
        </svg>
      </div>

      {/* Key points */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {[
          { emoji: "🏢", text: "Én dronehub kan betjene alle avdelinger i kommunen" },
          { emoji: "🔄", text: "Dronen kan fly til brann og inspisere en bro på veien tilbake" },
          { emoji: "👤", text: "Sentralisert drift = én operatør, fjernstyrert fra kontrollrom" },
        ].map((item, i) => (
          <div key={i} className="bg-card rounded-2xl border border-border p-5 flex items-start gap-3" style={{ boxShadow: "0 1px 3px rgba(0,0,0,0.06)" }}>
            <span className="text-2xl flex-shrink-0">{item.emoji}</span>
            <p className="text-sm" style={{ color: "#555" }}>{item.text}</p>
          </div>
        ))}
      </div>

      {/* Text block */}
      <div className="rounded-2xl p-6" style={{ background: "linear-gradient(135deg, rgba(255,102,196,0.06), rgba(104,91,248,0.06))" }}>
        <h3 className="text-base font-display font-semibold mb-2" style={{ color: "#1C0059" }}>Sentralisert dronedrift</h3>
        <p className="text-sm leading-relaxed" style={{ color: "#555" }}>
          En drone-in-a-box stasjon plassert sentralt i kommunen kan betjene alle avdelinger uten dedikert personale. Operatøren styrer dronen remote fra et kontrollrom — det kan være kommunens eget eller Haikos nasjonale operasjonssenter.
        </p>
        <p className="text-sm leading-relaxed mt-2" style={{ color: "#555" }}>
          Når dronen ikke er på akuttoppdrag, flyr den planlagte inspeksjonsruter automatisk: bygningsfasader, VA-anlegg, veier. Data lastes opp og analyseres med AI.
        </p>
      </div>
    </section>
  );
}
