/*
  # Update RLS Policies for User Registration

  1. Changes
    - Add IF NOT EXISTS checks for all table creation
    - Add IF NOT EXISTS for policies
    - Ensure proper RLS policies for user registration
  
  2. Security
    - Enable RLS on all tables
    - Update policies for authenticated users
    - Allow profile creation during registration
*/

-- Create profiles table if it doesn't exist
CREATE TABLE IF NOT EXISTS profiles (
  id uuid PRIMARY KEY REFERENCES auth.users(id),
  user_type text NOT NULL CHECK (user_type IN ('customer', 'provider')),
  full_name text,
  email text,
  phone text,
  location text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create provider_profiles table if it doesn't exist
CREATE TABLE IF NOT EXISTS provider_profiles (
  id uuid PRIMARY KEY REFERENCES profiles(id),
  skills text[],
  experience_level text,
  description text,
  hourly_rate numeric,
  available boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Enable RLS
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE provider_profiles ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist
DO $$ 
BEGIN
  DROP POLICY IF EXISTS "Users can read own profile" ON profiles;
  DROP POLICY IF EXISTS "Users can update own profile" ON profiles;
  DROP POLICY IF EXISTS "Users can insert own profile" ON profiles;
  DROP POLICY IF EXISTS "Enable insert for authenticated users only" ON profiles;
  DROP POLICY IF EXISTS "Public can view provider profiles" ON provider_profiles;
  DROP POLICY IF EXISTS "Providers can update own profile" ON provider_profiles;
  DROP POLICY IF EXISTS "Providers can insert own profile" ON provider_profiles;
EXCEPTION
  WHEN undefined_object THEN
    NULL;
END $$;

-- Recreate profiles policies
CREATE POLICY "Users can read own profile"
  ON profiles
  FOR SELECT
  TO authenticated
  USING (auth.uid() = id);

CREATE POLICY "Users can update own profile"
  ON profiles
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = id);

CREATE POLICY "Users can insert own profile"
  ON profiles
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = id);

CREATE POLICY "Enable insert for authenticated users only"
  ON profiles
  FOR INSERT
  TO authenticated
  WITH CHECK (true);

-- Recreate provider profiles policies
CREATE POLICY "Public can view provider profiles"
  ON provider_profiles
  FOR SELECT
  TO anon
  USING (true);

CREATE POLICY "Providers can update own profile"
  ON provider_profiles
  FOR UPDATE
  TO authenticated
  USING (id = auth.uid());

CREATE POLICY "Providers can insert own profile"
  ON provider_profiles
  FOR INSERT
  TO authenticated
  WITH CHECK (id = auth.uid());

-- Create or replace function to handle profile updates
CREATE OR REPLACE FUNCTION handle_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ language 'plpgsql';

-- Drop existing triggers if they exist
DROP TRIGGER IF EXISTS update_profiles_updated_at ON profiles;
DROP TRIGGER IF EXISTS update_provider_profiles_updated_at ON provider_profiles;

-- Recreate triggers for updated_at
CREATE TRIGGER update_profiles_updated_at
  BEFORE UPDATE ON profiles
  FOR EACH ROW
  EXECUTE PROCEDURE handle_updated_at();

CREATE TRIGGER update_provider_profiles_updated_at
  BEFORE UPDATE ON provider_profiles
  FOR EACH ROW
  EXECUTE PROCEDURE handle_updated_at();