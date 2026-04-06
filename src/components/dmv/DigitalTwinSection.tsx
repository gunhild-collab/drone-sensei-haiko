import React from "react";
import type { SoftwareProduct } from "@/hooks/useSoftwareStack";
import { formatSoftwarePrice } from "@/hooks/useSoftwareStack";

interface Props {
  software: SoftwareProduct[];
}

const STEPS = [
  {
    num: 1,
    title: "BASELINE",
    subtitle: "Førstegangs 3D-skanning",
    desc: "Førstegangs 3D-skanning av kommunens bygninger. Skaper referansemodell for alle fremtidige sammenligninger.",
    color: "#685BF8",
  },
  {
    num: 2,
    title: "AUTONOM FLYGING",
    subtitle: "Gjentatt skanning",
    desc: "Drone flyr samme rute kvartalsvis eller ved behov. Dock-basert operasjon krever ingen manuell inngripen.",
    color: "#FF66C4",
  },
  {
    num: 3,
    title: "AI-ANALYSE",
    subtitle: "Endringsdeteksjon",
    desc: "Software sammenligner nye bilder mot baseline. Endringer — sprekker, deformasjoner, ulovlige tilbygg — detekteres automatisk.",
    color: "#06B6D4",
  },
  {
    num: 4,
    title: "OPPDATERT TVILLING",
    subtitle: "Avviksrapportering",
    desc: "3D-modell oppdateres. Avvik flagges i dashboard med prioritet og lokasjon. Vedlikeholdsavdelingen får varsel.",
    color: "#10B981",
  },
];

const USE_CASES = [
  {
    emoji: "❄️",
    title: "Frostskader på tak",
    desc: "Dronen flyr automatisk etter første frost. AI sammenligner med forrige skanning og flagger avvik. Vedlikeholdsavdelingen får varsel.",
  },
  {
    emoji: "🏗️",
    title: "Ulovlige tilbygg",
    desc: "Kvartalsvis skanning av regulerte områder. Volumendring detekteres automatisk og meldes til plan/byggesak.",
  },
  {
    emoji: "🌡️",
    title: "Energitap i bygg",
    desc: "Termisk skanning av fasader om vinteren. Sammenligning mot digital tvilling identifiserer isolasjonssvikt.",
  },
];

export default function DigitalTwinSection({ software }: Props) {
  // Find relevant software
  const dtSoftware = software.filter(s =>
    ["digital_twin", "photogrammetry", "inspection_analytics"].includes(s.category)
  );

  const softwareGroups = [
    { label: "3D-fangst", cats: ["digital_twin"], fallback: "Skydio 3D Scan / RealityCapture" },
    { label: "Prosessering", cats: ["photogrammetry"], fallback: "Pix4Dmatic / Agisoft Metashape" },
    { label: "Inspeksjons-AI", cats: ["inspection_analytics"], fallback: "Hammer Missions / Percepto AIM" },
  ];

  return (
    <section id="digital-tvilling" className="scroll-mt-16 space-y-6">
      <div>
        <h2 className="text-xl md:text-2xl font-display font-bold" style={{ color: "#1C0059" }}>
          Digital tvilling — autonom bygningsinspeksjon
        </h2>
        <p className="text-sm mt-1" style={{ color: "#555555" }}>
          Hvordan en digital tvilling muliggjør autonome inspeksjoner av kommunens bygningsmasse
        </p>
      </div>

      {/* Pipeline steps */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {STEPS.map((step, i) => (
          <div key={i} className="bg-card rounded-2xl border border-border p-5 relative overflow-hidden" style={{ boxShadow: "0 1px 3px rgba(0,0,0,0.06)" }}>
            <div className="absolute top-0 left-0 right-0 h-1" style={{ backgroundColor: step.color }} />
            <div className="flex items-center gap-2 mb-3">
              <div
                className="w-8 h-8 rounded-full flex items-center justify-center text-white text-sm font-bold"
                style={{ backgroundColor: step.color }}
              >
                {step.num}
              </div>
              <p className="text-xs font-bold uppercase tracking-wider" style={{ color: step.color }}>{step.title}</p>
            </div>
            <p className="text-sm font-display font-semibold mb-1" style={{ color: "#1C0059" }}>{step.subtitle}</p>
            <p className="text-xs leading-relaxed" style={{ color: "#555" }}>{step.desc}</p>
            {i < STEPS.length - 1 && (
              <div className="hidden lg:block absolute top-1/2 -right-3 transform -translate-y-1/2 text-muted-foreground text-lg">→</div>
            )}
          </div>
        ))}
      </div>

      {/* Software stack */}
      <div className="bg-card rounded-2xl border border-border p-6" style={{ boxShadow: "0 1px 3px rgba(0,0,0,0.06)" }}>
        <p className="text-sm font-display font-semibold mb-4" style={{ color: "#1C0059" }}>
          📦 Anbefalt software for digital tvilling
        </p>
        <div className="space-y-3">
          {softwareGroups.map((group, i) => {
            const match = dtSoftware.find(s => group.cats.includes(s.category));
            return (
              <div key={i} className="flex items-center justify-between py-2 border-b border-border/50 last:border-0">
                <div>
                  <p className="text-xs font-medium" style={{ color: "#999" }}>{group.label}</p>
                  <p className="text-sm font-semibold" style={{ color: "#1C0059" }}>
                    {match ? `${match.name} (${match.vendor_country})` : group.fallback}
                  </p>
                </div>
                <p className="text-xs" style={{ color: "#685BF8" }}>
                  {match ? formatSoftwarePrice(match) : "—"}
                </p>
              </div>
            );
          })}
          {/* Always mention open source alternative */}
          <div className="flex items-center justify-between py-2">
            <div>
              <p className="text-xs font-medium" style={{ color: "#999" }}>GIS-integrasjon</p>
              <p className="text-sm font-semibold" style={{ color: "#1C0059" }}>QGIS (International)</p>
            </div>
            <p className="text-xs" style={{ color: "#10B981" }}>Gratis (open source)</p>
          </div>
        </div>
      </div>

      {/* Use case cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {USE_CASES.map((uc, i) => (
          <div key={i} className="rounded-2xl p-5 space-y-2" style={{ backgroundColor: "#F8F7FF", border: "1px solid #e8e5f8" }}>
            <span className="text-2xl">{uc.emoji}</span>
            <p className="text-sm font-display font-semibold" style={{ color: "#1C0059" }}>{uc.title}</p>
            <p className="text-xs leading-relaxed" style={{ color: "#555" }}>{uc.desc}</p>
          </div>
        ))}
      </div>
    </section>
  );
}
