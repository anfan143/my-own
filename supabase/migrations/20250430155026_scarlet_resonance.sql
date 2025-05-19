/*
  # Update Project Workflow

  1. Changes
    - Update project_providers status enum
    - Add performance index
    - Update RLS policies
    - Add trigger for proposal acceptance
  
  2. Security
    - Maintain RLS policies
    - Add proper status transition checks
*/

-- Update project_providers status enum
ALTER TABLE project_providers 
DROP CONSTRAINT IF EXISTS project_providers_status_check;

ALTER TABLE project_providers 
ADD CONSTRAINT project_providers_status_check 
CHECK (status IN ('pending', 'proposal_submitted', 'accepted', 'rejected', 'completed'));

-- Add index for performance
CREATE INDEX IF NOT EXISTS idx_project_providers_status 
ON project_providers(status);

-- Update RLS policies
DROP POLICY IF EXISTS "Providers can view their linked projects" ON project_providers;
DROP POLICY IF EXISTS "Providers can update their project status" ON project_providers;
DROP POLICY IF EXISTS "Customers can create project_provider records" ON project_providers;

CREATE POLICY "Providers can view their linked projects"
  ON project_providers
  FOR SELECT
  TO authenticated
  USING (
    provider_id = auth.uid() OR
    EXISTS (
      SELECT 1 FROM customer_projects
      WHERE id = project_id AND customer_id = auth.uid()
    )
  );

CREATE POLICY "Providers can update their project status"
  ON project_providers
  FOR UPDATE
  TO authenticated
  USING (provider_id = auth.uid())
  WITH CHECK (provider_id = auth.uid());

CREATE POLICY "Customers can create project_provider records"
  ON project_providers
  FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM customer_projects
      WHERE id = project_id AND customer_id = auth.uid()
    )
  );

-- Add trigger to handle proposal acceptance
CREATE OR REPLACE FUNCTION handle_proposal_acceptance()
RETURNS TRIGGER AS $$
BEGIN
  -- When a proposal is accepted, reject all other proposals
  IF NEW.status = 'accepted' AND TG_OP = 'UPDATE' THEN
    UPDATE project_proposals
    SET status = 'rejected'
    WHERE project_id = NEW.project_id
    AND id != NEW.id;

    -- Update project status to in_progress
    UPDATE customer_projects
    SET status = 'in_progress'
    WHERE id = NEW.project_id;

    -- Update project_providers status
    UPDATE project_providers
    SET status = 'accepted'
    WHERE project_id = NEW.project_id
    AND provider_id = NEW.provider_id;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS on_proposal_acceptance ON project_proposals;

CREATE TRIGGER on_proposal_acceptance
  AFTER UPDATE ON project_proposals
  FOR EACH ROW
  EXECUTE FUNCTION handle_proposal_acceptance();