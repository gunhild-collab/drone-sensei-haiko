import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const { answers, municipality_name, maturity_level, use_case_ids } = await req.json();

    // 1. Fetch all EASA rules
    const { data: allRules } = await supabase
      .from('easa_rules')
      .select('*')
      .order('category');

    // 2. Evaluate which rules apply based on assessment answers
    const d2Answers = Object.entries(answers || {}).filter(([k]) => k.startsWith('D2.'));
    const regulatoryScore = d2Answers.reduce((sum, [, v]) => sum + (v as number), 0);
    const maxRegScore = d2Answers.length * 4;
    const regPercent = maxRegScore > 0 ? (regulatoryScore / maxRegScore) * 100 : 0;

    // Determine which EASA categories the municipality can operate in
    let allowedCategories: string[] = [];
    let requiredCerts: string[] = [];
    let recommendations: string[] = [];

    if (regPercent < 25) {
      allowedCategories = ['Open A1'];
      requiredCerts = ['A1/A3 nettbasert opplæring'];
      recommendations = [
        'Start med A1/A3 online-eksamen via Luftfartstilsynet',
        'Registrer kommunen som droneoperatør',
        'Bruk kun C0-droner (<250g) for å minimere regulatorisk byrde',
      ];
    } else if (regPercent < 50) {
      allowedCategories = ['Open A1', 'Open A2'];
      requiredCerts = ['A1/A3', 'A2 tilleggssertifikat'];
      recommendations = [
        'Oppgrader til A2-kompetanse for bredere bruksområder',
        'Utarbeid operasjonsmanual (OM)',
        'Kartlegg luftromsbegrensninger for kommunen',
      ];
    } else if (regPercent < 75) {
      allowedCategories = ['Open A1', 'Open A2', 'Open A3', 'Specific STS-01'];
      requiredCerts = ['A1/A3', 'A2', 'STS-opplæring'];
      recommendations = [
        'Vurder STS-sertifisering for utvidede operasjoner',
        'Etabler fast dialog med Luftfartstilsynet',
        'Utarbeid beredskaps- og nødprosedyrer',
      ];
    } else {
      allowedCategories = ['Open A1', 'Open A2', 'Open A3', 'Specific STS-01', 'Specific STS-02', 'Specific PDRA'];
      requiredCerts = ['A1/A3', 'A2', 'STS', 'SORA-kompetanse'];
      recommendations = [
        'Utforsk BVLOS-operasjoner under STS-02',
        'Vurder SORA for avanserte bruksområder',
        'Delta aktivt i U-space-forberedelser',
        'Vurder LUC-sertifisering for operatøren',
      ];
    }

    // 3. Map relevant rules for requested use cases
    const relevantRules = (allRules || []).filter(rule => {
      if (!use_case_ids || use_case_ids.length === 0) return true;
      return rule.use_case_ids?.some((ucId: string) => use_case_ids.includes(ucId));
    });

    // 4. Identify regulatory gaps
    const gaps = [];
    const hasOperatorReg = (answers?.['D2.3'] ?? 0) >= 2;
    const hasPilotCert = (answers?.['D2.2'] ?? 0) >= 2;
    const hasOM = (answers?.['D2.4'] ?? 0) >= 2;
    const hasAirspaceMap = (answers?.['D2.5'] ?? 0) >= 2;

    if (!hasOperatorReg) gaps.push({ area: 'Operatørregistrering', severity: 'critical', action: 'Registrer kommunen hos Luftfartstilsynet' });
    if (!hasPilotCert) gaps.push({ area: 'Pilotbevis', severity: 'critical', action: 'Send ansatte på A1/A3 eller A2 kurs' });
    if (!hasOM) gaps.push({ area: 'Operasjonsmanual', severity: 'high', action: 'Utarbeid operasjonsmanual iht. EASA-krav' });
    if (!hasAirspaceMap) gaps.push({ area: 'Luftromskartlegging', severity: 'medium', action: 'Kartlegg droneflyforbud- og restriksjonsoner i kommunen' });

    return new Response(
      JSON.stringify({
        success: true,
        evaluation: {
          regulatory_maturity_percent: Math.round(regPercent),
          allowed_categories: allowedCategories,
          required_certifications: requiredCerts,
          recommendations,
          gaps,
          applicable_rules: relevantRules,
        },
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('EASA evaluation error:', error);
    return new Response(
      JSON.stringify({ success: false, error: error instanceof Error ? error.message : 'EASA evaluation failed' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
