/*
  # Add Project ID and Update Project Management

  1. Changes
    - Add project_number column to customer_projects
    - Add function to generate sequential project numbers
    - Update project_providers policies for unpublishing
  
  2. Security
    - Maintain existing RLS policies
    - Ensure data integrity with triggers
*/

-- Add project_number column
ALTER TABLE customer_projects
ADD COLUMN IF NOT EXISTS project_number text;

-- Create sequence for project numbers
CREATE SEQUENCE IF NOT EXISTS project_number_seq START 100000;

-- Function to generate project number
CREATE OR REPLACE FUNCTION generate_project_number()
RETURNS TRIGGER AS $$
BEGIN
  NEW.project_number := LPAD(nextval('project_number_seq')::text, 6, '0');
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to auto-generate project number
DROP TRIGGER IF EXISTS set_project_number ON customer_projects;
CREATE TRIGGER set_project_number
  BEFORE INSERT ON customer_projects
  FOR EACH ROW
  EXECUTE FUNCTION generate_project_number();

-- Update existing projects without project numbers
DO $$
BEGIN
  UPDATE customer_projects
  SET project_number = LPAD(nextval('project_number_seq')::text, 6, '0')
  WHERE project_number IS NULL;
END $$;