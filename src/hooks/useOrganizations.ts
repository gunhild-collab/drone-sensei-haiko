import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";

export interface Organization {
  id: string;
  name: string;
  org_type: "municipality" | "iks";
  municipality_number: string | null;
  dmv_report: any;
  config: any;
  created_at: string;
}

// Fix type casts
const castOrgs = (data: any[]): Organization[] => data as unknown as Organization[];
const castOrg = (data: any): Organization => data as unknown as Organization;
  dmv_report: any;
  config: { hourly_rate_nok: number };
  created_at: string;
}

export function useOrganizations(userId: string | undefined) {
  const [orgs, setOrgs] = useState<Organization[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!userId) { setOrgs([]); setLoading(false); return; }
    setLoading(true);
    supabase
      .from("organizations")
      .select("*")
      .then(({ data }) => {
        setOrgs((data as Organization[]) || []);
        setLoading(false);
      });
  }, [userId]);

  const createOrg = async (name: string, orgType: "municipality" | "iks") => {
    const { data, error } = await supabase
      .from("organizations")
      .insert([{ name, org_type: orgType }])
      .select()
      .single();
    if (error) throw error;
    // Add self as admin
    await supabase.from("organization_members").insert([{
      organization_id: data.id,
      user_id: userId,
      role: "admin",
    }]);
    setOrgs(prev => [...prev, data as Organization]);
    return data as Organization;
  };

  return { orgs, loading, createOrg, refetch: () => {
    if (!userId) return;
    supabase.from("organizations").select("*").then(({ data }) => setOrgs((data as Organization[]) || []));
  }};
}
