/*
  # Add customer projects table and related features

  1. New Tables
    - `customer_projects`
      - `id` (uuid, primary key)
      - `customer_id` (uuid, foreign key to profiles)
      - `name` (text)
      - `description` (text)
      - `start_date` (date)
      - `end_date` (date)
      - `location` (text)
      - `category` (text)
      - `budget_min` (numeric)
      - `budget_max` (numeric)
      - `status` (text)
      - `created_at` (timestamp)
      - `updated_at` (timestamp)

  2. Security
    - Enable RLS
    - Add policies for customer access
    - Ensure privacy (only project owner can access)
*/

-- Create customer_projects table
CREATE TABLE IF NOT EXISTS public.customer_projects (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id uuid REFERENCES public.profiles(id) ON DELETE CASCADE,
  name text NOT NULL,
  description text,
  start_date date NOT NULL,
  end_date date NOT NULL,
  location text NOT NULL,
  category text NOT NULL CHECK (category IN (
    'General Renovation',
    'Kitchen Remodeling',
    'Bathroom Remodeling',
    'Room Addition',
    'Outdoor Space',
    'Roofing',
    'Electrical Work',
    'Plumbing',
    'Flooring',
    'Painting',
    'Windows and Doors',
    'HVAC',
    'Other'
  )),
  budget_min numeric NOT NULL,
  budget_max numeric NOT NULL,
  status text NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'published', 'in_progress', 'completed', 'cancelled')),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  CONSTRAINT budget_range_check CHECK (budget_max >= budget_min)
);

-- Enable RLS
ALTER TABLE public.customer_projects ENABLE ROW LEVEL SECURITY;

-- Policies for customer_projects
CREATE POLICY "Customers can manage their own projects"
  ON public.customer_projects
  FOR ALL
  TO authenticated
  USING (customer_id = auth.uid())
  WITH CHECK (customer_id = auth.uid());

-- Create trigger for updating updated_at
CREATE TRIGGER update_customer_projects_updated_at
  BEFORE UPDATE ON public.customer_projects
  FOR EACH ROW
  EXECUTE FUNCTION handle_updated_at();