-- Drop the existing materialized view if it exists
DROP MATERIALIZED VIEW IF EXISTS public.provider_completion_status;

-- Create a security definer function to refresh the materialized view
CREATE OR REPLACE FUNCTION public.refresh_provider_completion_status()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Recreate the materialized view
  DROP MATERIALIZED VIEW IF EXISTS public.provider_completion_status;
  
  CREATE MATERIALIZED VIEW public.provider_completion_status AS
  SELECT 
    pp.id,
    CASE 
      WHEN pp.business_name IS NOT NULL 
      AND pp.business_description IS NOT NULL 
      AND pp.years_in_business IS NOT NULL 
      AND pp.website IS NOT NULL 
      THEN true 
      ELSE false 
    END as is_complete,
    CASE 
      WHEN pp.business_name IS NOT NULL 
      AND pp.business_description IS NOT NULL 
      THEN true 
      ELSE false 
    END as has_required_fields
  FROM public.provider_profiles pp;
END;
$$;

-- Create a trigger to refresh the materialized view
CREATE OR REPLACE FUNCTION public.handle_provider_completion()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  PERFORM public.refresh_provider_completion_status();
  RETURN NULL;
END;
$$;

-- Create the trigger on provider_profiles
DROP TRIGGER IF EXISTS refresh_completion_status ON public.provider_profiles;
CREATE TRIGGER refresh_completion_status
  AFTER INSERT OR DELETE OR UPDATE ON public.provider_profiles
  FOR EACH STATEMENT
  EXECUTE FUNCTION public.handle_provider_completion();

-- Update the provider_profiles policy
DROP POLICY IF EXISTS "Provider profile access control" ON public.provider_profiles;

CREATE POLICY "Provider profile access control" ON public.provider_profiles
  FOR ALL
  TO public
  USING (
    (
      (profile_completion_percentage >= 60 AND business_name IS NOT NULL AND business_description IS NOT NULL)
      OR 
      (id = auth.uid() AND EXISTS (
        SELECT 1 FROM public.profiles 
        WHERE profiles.id = auth.uid() 
        AND (profiles.user_type = 'provider' OR profiles.role_type = 'both')
      ))
    )
  )
  WITH CHECK (
    id = auth.uid() AND EXISTS (
      SELECT 1 FROM public.profiles 
      WHERE profiles.id = auth.uid() 
      AND (profiles.user_type = 'provider' OR profiles.role_type = 'both')
    )
  );

-- Initial refresh of the materialized view
SELECT public.refresh_provider_completion_status();