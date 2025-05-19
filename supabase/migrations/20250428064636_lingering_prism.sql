/*
  # Add Project Proposals Table

  1. New Tables
    - `project_proposals`
      - `id` (uuid, primary key)
      - `project_id` (uuid, foreign key to customer_projects)
      - `provider_id` (uuid, foreign key to provider_profiles)
      - `quote_amount` (numeric)
      - `start_date` (date)
      - `comments` (text)
      - `portfolio_items` (text[])
      - `status` (text)
      - `created_at` (timestamp)
      - `updated_at` (timestamp)

  2. Security
    - Enable RLS
    - Add policies for provider and customer access
*/

-- Create project_proposals table
CREATE TABLE IF NOT EXISTS project_proposals (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id uuid REFERENCES customer_projects(id) ON DELETE CASCADE,
  provider_id uuid REFERENCES provider_profiles(id) ON DELETE CASCADE,
  quote_amount numeric NOT NULL,
  start_date date NOT NULL,
  comments text NOT NULL,
  portfolio_items text[] NOT NULL DEFAULT '{}',
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'rejected')),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  CONSTRAINT unique_project_provider UNIQUE (project_id, provider_id)
);

-- Enable RLS
ALTER TABLE project_proposals ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Providers can create and view their own proposals"
  ON project_proposals
  FOR ALL
  TO authenticated
  USING (provider_id = auth.uid())
  WITH CHECK (provider_id = auth.uid());

CREATE POLICY "Customers can view proposals for their projects"
  ON project_proposals
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM customer_projects
      WHERE id = project_id
      AND customer_id = auth.uid()
    )
  );

-- Create trigger for updating updated_at
CREATE TRIGGER update_project_proposals_updated_at
  BEFORE UPDATE ON project_proposals
  FOR EACH ROW
  EXECUTE FUNCTION handle_updated_at();