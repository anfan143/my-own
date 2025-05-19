/*
  # Add service areas and portfolio tables

  1. New Tables
    - `service_areas`
      - `id` (uuid, primary key)
      - `provider_id` (uuid, foreign key to provider_profiles)
      - `city` (text)
      - `state` (text)
      - `postal_code` (text)
      - `radius_km` (integer)
      - `created_at` (timestamp)
      - `updated_at` (timestamp)
    
    - `provider_portfolio`
      - `id` (uuid, primary key)
      - `provider_id` (uuid, foreign key to provider_profiles)
      - `title` (text)
      - `description` (text)
      - `image_url` (text)
      - `created_at` (timestamp)
      - `updated_at` (timestamp)

  2. Security
    - Enable RLS on both tables
    - Add policies for authenticated users to manage their own data
    - Add policies for public read access to portfolio items
*/

-- Create service_areas table
CREATE TABLE IF NOT EXISTS public.service_areas (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  provider_id uuid REFERENCES public.provider_profiles(id) ON DELETE CASCADE,
  city text NOT NULL,
  state text NOT NULL,
  postal_code text NOT NULL,
  radius_km integer NOT NULL,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Enable RLS for service_areas
ALTER TABLE public.service_areas ENABLE ROW LEVEL SECURITY;

-- Create policies for service_areas
DROP POLICY IF EXISTS "Providers can manage their own service areas" ON public.service_areas;
CREATE POLICY "Providers can manage their own service areas"
  ON public.service_areas
  FOR ALL
  TO authenticated
  USING (provider_id = auth.uid())
  WITH CHECK (provider_id = auth.uid());

DROP POLICY IF EXISTS "Public can view service areas" ON public.service_areas;
CREATE POLICY "Public can view service areas"
  ON public.service_areas
  FOR SELECT
  TO anon
  USING (true);

-- Create provider_portfolio table
CREATE TABLE IF NOT EXISTS public.provider_portfolio (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  provider_id uuid REFERENCES public.provider_profiles(id) ON DELETE CASCADE,
  title text NOT NULL,
  description text,
  image_url text NOT NULL,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Enable RLS for provider_portfolio
ALTER TABLE public.provider_portfolio ENABLE ROW LEVEL SECURITY;

-- Create policies for provider_portfolio
DROP POLICY IF EXISTS "Providers can manage their own portfolio" ON public.provider_portfolio;
CREATE POLICY "Providers can manage their own portfolio"
  ON public.provider_portfolio
  FOR ALL
  TO authenticated
  USING (provider_id = auth.uid())
  WITH CHECK (provider_id = auth.uid());

DROP POLICY IF EXISTS "Public can view portfolio items" ON public.provider_portfolio;
CREATE POLICY "Public can view portfolio items"
  ON public.provider_portfolio
  FOR SELECT
  TO anon
  USING (true);

-- Create trigger for updating updated_at
CREATE OR REPLACE FUNCTION public.handle_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Add triggers for updating updated_at
DROP TRIGGER IF EXISTS update_service_areas_updated_at ON public.service_areas;
CREATE TRIGGER update_service_areas_updated_at
  BEFORE UPDATE ON public.service_areas
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_updated_at();

DROP TRIGGER IF EXISTS update_provider_portfolio_updated_at ON public.provider_portfolio;
CREATE TRIGGER update_provider_portfolio_updated_at
  BEFORE UPDATE ON public.provider_portfolio
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_updated_at();