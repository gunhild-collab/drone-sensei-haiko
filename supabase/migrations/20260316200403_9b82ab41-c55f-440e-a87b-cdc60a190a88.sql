
-- Organization types
CREATE TYPE public.org_type AS ENUM ('municipality', 'iks');
CREATE TYPE public.org_role AS ENUM ('admin', 'member', 'viewer');
CREATE TYPE public.resource_status AS ENUM ('active', 'inactive');

-- Organizations table
CREATE TABLE public.organizations (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  org_type public.org_type NOT NULL DEFAULT 'municipality',
  municipality_number TEXT,
  dmv_report JSONB DEFAULT '{}',
  config JSONB DEFAULT '{"hourly_rate_nok": 700}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Organization members (links users to orgs)
CREATE TABLE public.organization_members (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role public.org_role NOT NULL DEFAULT 'member',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(organization_id, user_id)
);

-- Pilots
CREATE TABLE public.pilots (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  role TEXT,
  phone TEXT,
  email TEXT,
  status public.resource_status NOT NULL DEFAULT 'active',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Drones
CREATE TABLE public.org_drones (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  model TEXT,
  serial_number TEXT,
  owner_type TEXT NOT NULL DEFAULT 'organization',
  status public.resource_status NOT NULL DEFAULT 'active',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Documents
CREATE TABLE public.org_documents (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  drone_id UUID REFERENCES public.org_drones(id) ON DELETE SET NULL,
  title TEXT NOT NULL,
  doc_type TEXT NOT NULL DEFAULT 'other',
  file_url TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Flight Logs (core MVP object)
CREATE TABLE public.flight_logs (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  pilot_id UUID REFERENCES public.pilots(id) ON DELETE SET NULL,
  drone_id UUID REFERENCES public.org_drones(id) ON DELETE SET NULL,
  flight_date DATE NOT NULL DEFAULT CURRENT_DATE,
  start_time TIME,
  end_time TIME,
  mission_type TEXT NOT NULL DEFAULT 'annet',
  location_description TEXT,
  manual_reference_time_minutes INTEGER,
  drone_time_minutes INTEGER,
  notes TEXT,
  cost_model_version INTEGER NOT NULL DEFAULT 1,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Profiles table for user display info
CREATE TABLE public.profiles (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  display_name TEXT,
  email TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Enable RLS on all tables
ALTER TABLE public.organizations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.organization_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pilots ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.org_drones ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.org_documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.flight_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- Helper: check if user is member of an org (security definer to avoid recursion)
CREATE OR REPLACE FUNCTION public.is_org_member(_user_id UUID, _org_id UUID)
RETURNS BOOLEAN
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.organization_members
    WHERE user_id = _user_id AND organization_id = _org_id
  )
$$;

-- Profiles policies
CREATE POLICY "Users can view own profile" ON public.profiles FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own profile" ON public.profiles FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own profile" ON public.profiles FOR UPDATE USING (auth.uid() = user_id);

-- Organization policies (members can read their orgs)
CREATE POLICY "Members can view their orgs" ON public.organizations FOR SELECT TO authenticated
  USING (public.is_org_member(auth.uid(), id));
CREATE POLICY "Admins can update their orgs" ON public.organizations FOR UPDATE TO authenticated
  USING (public.is_org_member(auth.uid(), id));
CREATE POLICY "Authenticated users can create orgs" ON public.organizations FOR INSERT TO authenticated
  WITH CHECK (true);

-- Organization members policies
CREATE POLICY "Members can view org members" ON public.organization_members FOR SELECT TO authenticated
  USING (public.is_org_member(auth.uid(), organization_id));
CREATE POLICY "Members can be added" ON public.organization_members FOR INSERT TO authenticated
  WITH CHECK (true);
CREATE POLICY "Members can be removed" ON public.organization_members FOR DELETE TO authenticated
  USING (public.is_org_member(auth.uid(), organization_id));

-- Pilots policies
CREATE POLICY "Members can view pilots" ON public.pilots FOR SELECT TO authenticated
  USING (public.is_org_member(auth.uid(), organization_id));
CREATE POLICY "Members can manage pilots" ON public.pilots FOR INSERT TO authenticated
  WITH CHECK (public.is_org_member(auth.uid(), organization_id));
CREATE POLICY "Members can update pilots" ON public.pilots FOR UPDATE TO authenticated
  USING (public.is_org_member(auth.uid(), organization_id));
CREATE POLICY "Members can delete pilots" ON public.pilots FOR DELETE TO authenticated
  USING (public.is_org_member(auth.uid(), organization_id));

-- Drones policies
CREATE POLICY "Members can view drones" ON public.org_drones FOR SELECT TO authenticated
  USING (public.is_org_member(auth.uid(), organization_id));
CREATE POLICY "Members can manage drones" ON public.org_drones FOR INSERT TO authenticated
  WITH CHECK (public.is_org_member(auth.uid(), organization_id));
CREATE POLICY "Members can update drones" ON public.org_drones FOR UPDATE TO authenticated
  USING (public.is_org_member(auth.uid(), organization_id));
CREATE POLICY "Members can delete drones" ON public.org_drones FOR DELETE TO authenticated
  USING (public.is_org_member(auth.uid(), organization_id));

-- Documents policies
CREATE POLICY "Members can view docs" ON public.org_documents FOR SELECT TO authenticated
  USING (public.is_org_member(auth.uid(), organization_id));
CREATE POLICY "Members can manage docs" ON public.org_documents FOR INSERT TO authenticated
  WITH CHECK (public.is_org_member(auth.uid(), organization_id));
CREATE POLICY "Members can update docs" ON public.org_documents FOR UPDATE TO authenticated
  USING (public.is_org_member(auth.uid(), organization_id));
CREATE POLICY "Members can delete docs" ON public.org_documents FOR DELETE TO authenticated
  USING (public.is_org_member(auth.uid(), organization_id));

-- Flight logs policies
CREATE POLICY "Members can view flight logs" ON public.flight_logs FOR SELECT TO authenticated
  USING (public.is_org_member(auth.uid(), organization_id));
CREATE POLICY "Members can create flight logs" ON public.flight_logs FOR INSERT TO authenticated
  WITH CHECK (public.is_org_member(auth.uid(), organization_id));
CREATE POLICY "Members can update flight logs" ON public.flight_logs FOR UPDATE TO authenticated
  USING (public.is_org_member(auth.uid(), organization_id));
CREATE POLICY "Members can delete flight logs" ON public.flight_logs FOR DELETE TO authenticated
  USING (public.is_org_member(auth.uid(), organization_id));

-- Triggers for updated_at
CREATE TRIGGER update_organizations_updated_at BEFORE UPDATE ON public.organizations
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_flight_logs_updated_at BEFORE UPDATE ON public.flight_logs
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Auto-create profile on signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (user_id, email, display_name)
  VALUES (NEW.id, NEW.email, COALESCE(NEW.raw_user_meta_data->>'display_name', split_part(NEW.email, '@', 1)));
  RETURN NEW;
END;
$$;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();
