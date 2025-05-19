/*
  # Provider Availability Management

  1. New Tables
    - `provider_availability`
      - `id` (uuid, primary key)
      - `provider_id` (uuid, foreign key to provider_profiles)
      - `start_time` (timestamptz)
      - `end_time` (timestamptz)
      - `is_recurring` (boolean)
      - `recurrence_pattern` (jsonb) - stores weekly pattern
      - `max_concurrent_projects` (integer)
      - `created_at` (timestamptz)
      - `updated_at` (timestamptz)

  2. Security
    - Enable RLS
    - Add policies for provider access
    - Allow public read access for availability data
*/

-- Create provider_availability table
CREATE TABLE IF NOT EXISTS public.provider_availability (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  provider_id uuid REFERENCES public.provider_profiles(id) ON DELETE CASCADE,
  start_time timestamptz NOT NULL,
  end_time timestamptz NOT NULL,
  is_recurring boolean DEFAULT false,
  recurrence_pattern jsonb,
  max_concurrent_projects integer DEFAULT 1,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  CONSTRAINT valid_time_range CHECK (end_time > start_time),
  CONSTRAINT valid_max_concurrent_projects CHECK (max_concurrent_projects > 0)
);

-- Enable RLS
ALTER TABLE public.provider_availability ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Providers can manage their own availability"
  ON public.provider_availability
  FOR ALL
  TO authenticated
  USING (provider_id = auth.uid())
  WITH CHECK (provider_id = auth.uid());

CREATE POLICY "Public can view provider availability"
  ON public.provider_availability
  FOR SELECT
  TO public
  USING (true);

-- Create trigger for updating updated_at
CREATE TRIGGER update_provider_availability_updated_at
  BEFORE UPDATE ON public.provider_availability
  FOR EACH ROW
  EXECUTE FUNCTION handle_updated_at();

-- Remove availability column from provider_profiles
ALTER TABLE public.provider_profiles DROP COLUMN IF EXISTS available;