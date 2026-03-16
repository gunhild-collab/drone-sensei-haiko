import { useNavigate } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { FileText, ArrowRight } from "lucide-react";

interface Props { org: any; }

export default function OrgReportTab({ org }: Props) {
  const report = org.dmv_report || {};
  const hasReport = Object.keys(report).length > 0 && report.municipality_name;

  if (!hasReport) {
    return (
      <Card className="border-dashed">
        <CardContent className="flex flex-col items-center py-12 text-center">
          <FileText className="w-12 h-12 text-muted-foreground mb-4" />
          <h3 className="font-display font-semibold text-foreground text-lg">Ingen DMV-rapport enda</h3>
          <p className="text-sm text-muted-foreground mt-2 max-w-sm">
            Kjør en DMV-vurdering fra verktøyet for å generere en rapport som kobles hit.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="font-display text-lg">DMV-rapport: {report.municipality_name}</CardTitle>
            {report.maturity_level && <Badge variant="outline">Nivå {report.maturity_level}</Badge>}
          </div>
        </CardHeader>
        <CardContent>
          {report.total_score != null && (
            <div className="text-3xl font-display font-bold text-primary mb-4">{report.total_score}/100</div>
          )}
          {report.easa_evaluation?.summary && (
            <div className="prose prose-sm max-w-none text-foreground">
              <h4 className="font-display">EASA-evaluering</h4>
              <p className="text-muted-foreground">{report.easa_evaluation.summary}</p>
            </div>
          )}
          {report.kostra_enrichment && (
            <div className="mt-4">
              <h4 className="font-display text-sm font-semibold mb-2">KOSTRA-data</h4>
              <pre className="text-xs bg-secondary p-3 rounded-lg overflow-auto max-h-48 text-muted-foreground">
                {JSON.stringify(report.kostra_enrichment, null, 2)}
              </pre>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
