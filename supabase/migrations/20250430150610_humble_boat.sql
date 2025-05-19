/*
  # Add Project Milestones

  1. New Tables
    - `project_milestones`
      - `id` (uuid, primary key)
      - `project_id` (uuid, foreign key)
      - `title` (text)
      - `description` (text)
      - `due_date` (date)
      - `payment_percentage` (numeric)
      - `status` (text)
      - `completion_date` (timestamptz)
      - `created_at` (timestamptz)
      - `updated_at` (timestamptz)

  2. Security
    - Enable RLS
    - Add policies for customer and provider access
    - Enforce payment percentage constraints via trigger
*/

-- Create project_milestones table
CREATE TABLE IF NOT EXISTS project_milestones (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id uuid REFERENCES customer_projects(id) ON DELETE CASCADE,
  title text NOT NULL,
  description text,
  due_date date NOT NULL,
  payment_percentage numeric NOT NULL CHECK (payment_percentage >= 0 AND payment_percentage <= 100),
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'in_progress', 'completed')),
  completion_date timestamptz,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create function to validate total payment percentage
CREATE OR REPLACE FUNCTION check_total_payment_percentage()
RETURNS TRIGGER AS $$
DECLARE
  total_percentage numeric;
BEGIN
  SELECT COALESCE(SUM(payment_percentage), 0) INTO total_percentage
  FROM project_milestones
  WHERE project_id = NEW.project_id
  AND id != NEW.id;  -- Exclude current row for updates

  IF (total_percentage + NEW.payment_percentage) > 100 THEN
    RAISE EXCEPTION 'Total payment percentage cannot exceed 100%%';
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to enforce total payment percentage
CREATE TRIGGER enforce_total_payment_percentage
  BEFORE INSERT OR UPDATE ON project_milestones
  FOR EACH ROW
  EXECUTE FUNCTION check_total_payment_percentage();

-- Enable RLS
ALTER TABLE project_milestones ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Customers can manage milestones for their projects"
  ON project_milestones
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM customer_projects
      WHERE id = project_id
      AND customer_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM customer_projects
      WHERE id = project_id
      AND customer_id = auth.uid()
    )
  );

CREATE POLICY "Providers can view milestones for their projects"
  ON project_milestones
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM project_providers
      WHERE project_id = project_milestones.project_id
      AND provider_id = auth.uid()
      AND status = 'accepted'
    )
  );

-- Create trigger for updating updated_at
CREATE TRIGGER update_project_milestones_updated_at
  BEFORE UPDATE ON project_milestones
  FOR EACH ROW
  EXECUTE FUNCTION handle_updated_at();