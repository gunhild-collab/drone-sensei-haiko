import React from "react";

interface Props {
  municipalityName: string;
  iksPartners: string[];
  fireDeptName: string | null;
  population: number;
  totalFleetCostNOK: number;
  totalSoftwareCostNOK: number;
}

export default function CoUseSection({
  municipalityName,
  iksPartners,
  fireDeptName,
  population,
  totalFleetCostNOK,
  totalSoftwareCostNOK,
}: Props) {
  if (iksPartners.length === 0) return null;

  const totalMunicipalities = iksPartners.length + 1;
  const totalCost = totalFleetCostNOK + totalSoftwareCostNOK;
  const costPerMunicipality = Math.round(totalCost / totalMunicipalities);
  const savingsPct = Math.round(((totalCost - costPerMunicipality) / totalCost) * 100);

  // Simple distribution by equal share (could be improved with pop-based)
  const allMunicipalities = [municipalityName, ...iksPartners];

  return (
    <section id="sambruk-iks" className="scroll-mt-16 space-y-6">
      <div>
        <h2 className="text-xl md:text-2xl font-display font-bold" style={{ color: "#1C0059" }}>
          Sambruksmodell — {fireDeptName || "interkommunalt samarbeid"}
        </h2>
        <p className="text-sm mt-1" style={{ color: "#555555" }}>
          Delt dronehub mellom {totalMunicipalities} kommuner reduserer kostnad per kommune
        </p>
      </div>

      {/* Key metrics */}
      <div className="rounded-2xl p-6" style={{ backgroundColor: "#1C0059" }}>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-center">
          <div>
            <p className="text-3xl font-display font-bold text-white">{totalMunicipalities}</p>
            <p className="text-xs text-white/60">kommuner</p>
          </div>
          <div>
            <p className="text-3xl font-display font-bold" style={{ color: "#34D399" }}>{savingsPct}%</p>
            <p className="text-xs text-white/60">kostnadsreduksjon per kommune</p>
          </div>
          <div>
            <p className="text-3xl font-display font-bold text-white">1</p>
            <p className="text-xs text-white/60">operatør dekker alle</p>
          </div>
          <div>
            <p className="text-3xl font-display font-bold" style={{ color: "#FF66C4" }}>
              {(costPerMunicipality / 1000).toFixed(0)}k
            </p>
            <p className="text-xs text-white/60">kr per kommune</p>
          </div>
        </div>
      </div>

      {/* How it works */}
      <div className="bg-card rounded-2xl border border-border p-6 space-y-4" style={{ boxShadow: "0 1px 3px rgba(0,0,0,0.06)" }}>
        <p className="text-sm font-display font-semibold" style={{ color: "#1C0059" }}>Slik fungerer det</p>
        <div className="space-y-3">
          {[
            "Dronehub stasjoneres sentralt i regionen, typisk ved brannstasjonen",
            "Én operatør styrer dronen remote og dekker alle eierkommuner",
            "Dronen reposisjoneres mellom kommuner etter behov og oppdragsplan",
            "Rammeavtale-modell gir forutsigbar månedskostnad for hver kommune",
            "Software-lisenser deles — én Pix4D-konto dekker hele IKS-et",
          ].map((item, i) => (
            <div key={i} className="flex items-start gap-3">
              <div className="w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold text-white flex-shrink-0" style={{ backgroundColor: "#685BF8" }}>
                {i + 1}
              </div>
              <p className="text-sm" style={{ color: "#555" }}>{item}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Cost distribution */}
      <div className="bg-card rounded-2xl border border-border overflow-hidden" style={{ boxShadow: "0 1px 3px rgba(0,0,0,0.06)" }}>
        <div className="p-4 border-b border-border">
          <p className="text-sm font-display font-semibold" style={{ color: "#1C0059" }}>Kostnadsfordeling (likt fordelt)</p>
        </div>
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b bg-muted/20">
              <th className="text-left py-2.5 px-4 font-medium text-xs" style={{ color: "#999" }}>Kommune</th>
              <th className="text-center py-2.5 px-4 font-medium text-xs" style={{ color: "#999" }}>Andel</th>
              <th className="text-right py-2.5 px-4 font-medium text-xs" style={{ color: "#999" }}>Estimert kostnad</th>
            </tr>
          </thead>
          <tbody>
            {allMunicipalities.map((m, i) => (
              <tr key={i} className="border-b border-border/50 last:border-0">
                <td className="py-2.5 px-4 font-medium" style={{ color: i === 0 ? "#1C0059" : "#555" }}>
                  {m} {i === 0 && <span className="text-xs" style={{ color: "#685BF8" }}>(vertskap)</span>}
                </td>
                <td className="py-2.5 px-4 text-center" style={{ color: "#999" }}>
                  {(100 / totalMunicipalities).toFixed(0)}%
                </td>
                <td className="py-2.5 px-4 text-right font-medium" style={{ color: "#1C0059" }}>
                  {costPerMunicipality.toLocaleString("nb-NO")} kr
                </td>
              </tr>
            ))}
          </tbody>
          <tfoot>
            <tr className="bg-muted/20">
              <td className="py-2.5 px-4 font-semibold" style={{ color: "#1C0059" }}>Totalt</td>
              <td className="py-2.5 px-4 text-center" style={{ color: "#999" }}>100%</td>
              <td className="py-2.5 px-4 text-right font-bold" style={{ color: "#1C0059" }}>
                {totalCost.toLocaleString("nb-NO")} kr
              </td>
            </tr>
          </tfoot>
        </table>
      </div>
    </section>
  );
}
