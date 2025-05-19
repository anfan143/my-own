/*
  # Rename project name column

  1. Changes
    - Rename 'name' column to 'project_name' in customer_projects table
    - Update all references to maintain data integrity
  
  2. Security
    - Maintain existing constraints and policies
*/

-- Rename the column
ALTER TABLE customer_projects RENAME COLUMN name TO project_name;

-- Update any functions or triggers that reference the column name
CREATE OR REPLACE FUNCTION generate_project_number()
RETURNS TRIGGER AS $$
BEGIN
  NEW.project_number := LPAD(nextval('project_number_seq')::text, 6, '0');
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Recreate trigger to ensure it uses the new column name
DROP TRIGGER IF EXISTS set_project_number ON customer_projects;
CREATE TRIGGER set_project_number
  BEFORE INSERT ON customer_projects
  FOR EACH ROW
  EXECUTE FUNCTION generate_project_number();