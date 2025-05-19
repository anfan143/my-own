/*
  # Fix Provider Profiles RLS Policies

  1. Changes
    - Add RLS policies for provider_profiles table to allow:
      - Providers to insert their own profile
      - Providers to update their own profile
      - Public to view provider profiles
      - System-level operations for initial profile creation

  2. Security
    - Maintains data security while allowing necessary operations
    - Ensures providers can only manage their own profiles
    - Allows public read access for provider discovery
*/

-- Drop existing policies if any to avoid conflicts
DROP POLICY IF EXISTS "Providers can insert own profile" ON provider_profiles;
DROP POLICY IF EXISTS "Providers can update own profile" ON provider_profiles;
DROP POLICY IF EXISTS "Public can view provider profiles" ON provider_profiles;

-- Create new policies
CREATE POLICY "Providers can insert own profile"
ON provider_profiles
FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = id);

CREATE POLICY "Providers can update own profile"
ON provider_profiles
FOR UPDATE
TO authenticated
USING (auth.uid() = id)
WITH CHECK (auth.uid() = id);

CREATE POLICY "Public can view provider profiles"
ON provider_profiles
FOR SELECT
TO public
USING (true);

-- Enable RLS if not already enabled
ALTER TABLE provider_profiles ENABLE ROW LEVEL SECURITY;