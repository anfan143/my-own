/*
  # Simplify Provider Availability Management

  1. Changes
    - Add 'available' column back to provider_profiles
    - Create provider_unavailable_periods table for tracking specific unavailable dates
    - Remove provider_availability table (no longer needed)
  
  2. Security
    - Enable RLS
    - Add policies for provider access
*/

-- Add available column back to provider_profiles
ALTER TABLE provider_profiles ADD COLUMN IF NOT EXISTS available boolean DEFAULT true;

-- Create provider_unavailable_periods table
CREATE TABLE IF NOT EXISTS provider_unavailable_periods (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  provider_id uuid REFERENCES provider_profiles(id) ON DELETE CASCADE,
  start_date date NOT NULL,
  end_date date NOT NULL,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  CONSTRAINT valid_date_range CHECK (end_date >= start_date)
);

-- Enable RLS
ALTER TABLE provider_unavailable_periods ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Providers can manage their unavailable periods"
  ON provider_unavailable_periods
  FOR ALL
  TO authenticated
  USING (provider_id = auth.uid())
  WITH CHECK (provider_id = auth.uid());

-- Create trigger for updating updated_at
CREATE TRIGGER update_provider_unavailable_periods_updated_at
  BEFORE UPDATE ON provider_unavailable_periods
  FOR EACH ROW
  EXECUTE FUNCTION handle_updated_at();

-- Drop old provider_availability table if it exists
DROP TABLE IF EXISTS provider_availability;