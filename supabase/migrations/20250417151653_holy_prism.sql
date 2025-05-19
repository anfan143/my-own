/*
  # Add project_providers table for linking customers and providers

  1. New Tables
    - `project_providers`
      - `id` (uuid, primary key)
      - `project_id` (uuid, foreign key to customer_projects)
      - `provider_id` (uuid, foreign key to provider_profiles)
      - `status` (text)
      - `created_at` (timestamp)
      - `updated_at` (timestamp)

  2. Security
    - Enable RLS
    - Add policies for provider and customer access
*/

CREATE TABLE IF NOT EXISTS public.project_providers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id uuid REFERENCES public.customer_projects(id) ON DELETE CASCADE,
  provider_id uuid REFERENCES public.provider_profiles(id) ON DELETE CASCADE,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'rejected', 'completed')),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(project_id, provider_id)
);

-- Enable RLS
ALTER TABLE public.project_providers ENABLE ROW LEVEL SECURITY;

-- Policies for project_providers
CREATE POLICY "Providers can view their linked projects"
  ON public.project_providers
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
  ON public.project_providers
  FOR UPDATE
  TO authenticated
  USING (provider_id = auth.uid())
  WITH CHECK (provider_id = auth.uid());

-- Create trigger for updating updated_at
CREATE TRIGGER update_project_providers_updated_at
  BEFORE UPDATE ON public.project_providers
  FOR EACH ROW
  EXECUTE FUNCTION handle_updated_at();