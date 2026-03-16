
-- Function to create org and add creator as admin atomically
CREATE OR REPLACE FUNCTION public.create_organization(
  _name TEXT,
  _org_type public.org_type DEFAULT 'municipality'
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _org_id UUID;
BEGIN
  INSERT INTO public.organizations (name, org_type)
  VALUES (_name, _org_type)
  RETURNING id INTO _org_id;

  INSERT INTO public.organization_members (organization_id, user_id, role)
  VALUES (_org_id, auth.uid(), 'admin');

  RETURN _org_id;
END;
$$;
