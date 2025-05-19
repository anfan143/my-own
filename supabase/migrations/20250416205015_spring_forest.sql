/*
  # Initial Schema Setup for Remeselnik

  1. New Tables
    - `profiles`
      - `id` (uuid, primary key) - matches auth.users id
      - `user_type` (text) - 'customer' or 'provider'
      - `full_name` (text)
      - `email` (text)
      - `phone` (text)
      - `location` (text)
      - `created_at` (timestamp)
      - `updated_at` (timestamp)
    
    - `provider_profiles` (extends profiles for providers)
      - `id` (uuid, primary key) - matches profiles.id
      - `skills` (text[])
      - `experience_level` (text)
      - `description` (text)
      - `hourly_rate` (numeric)
      - `available` (boolean)

  2. Security
    - Enable RLS on all tables
    - Add policies for authenticated users to read/write their own data
    - Allow public read access to provider profiles
*/

-- Create profiles table
CREATE TABLE profiles (
  id uuid PRIMARY KEY REFERENCES auth.users(id),
  user_type text NOT NULL CHECK (user_type IN ('customer', 'provider')),
  full_name text,
  email text,
  phone text,
  location text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create provider_profiles table
CREATE TABLE provider_profiles (
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

-- Profiles policies
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

-- Provider profiles policies
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

-- Create function to handle profile updates
CREATE OR REPLACE FUNCTION handle_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ language 'plpgsql';

-- Create triggers for updated_at
CREATE TRIGGER update_profiles_updated_at
  BEFORE UPDATE ON profiles
  FOR EACH ROW
  EXECUTE PROCEDURE handle_updated_at();

CREATE TRIGGER update_provider_profiles_updated_at
  BEFORE UPDATE ON provider_profiles
  FOR EACH ROW
  EXECUTE PROCEDURE handle_updated_at();