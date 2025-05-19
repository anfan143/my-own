/*
  # Add INSERT policy for project_providers table

  1. Changes
    - Add RLS policy to allow customers to insert project_provider records for their own projects
    
  2. Security
    - Only allows customers to create project_provider records for projects they own
    - Validates the project ownership through the customer_projects table
*/

CREATE POLICY "Customers can create project_provider records for their projects"
  ON project_providers
  FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 
      FROM customer_projects 
      WHERE customer_projects.id = project_providers.project_id 
      AND customer_projects.customer_id = auth.uid()
    )
  );