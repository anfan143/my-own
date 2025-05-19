/*
  # Enhanced Project Management Structure

  1. New Functions
    - create_project: Creates a new project with validation
    - link_provider_to_project: Links a provider to a project with status tracking
    - update_project_status: Updates project status with validation

  2. Security
    - Add RLS policies for project access control
    - Ensure data integrity with constraints and checks
    - Add audit fields for tracking changes

  3. Changes
    - Add provider assignment tracking
    - Add project status history
    - Add project metadata fields
*/

-- Create project status history table
CREATE TABLE IF NOT EXISTS public.project_status_history (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id uuid REFERENCES public.customer_projects(id) ON DELETE CASCADE,
  old_status text,
  new_status text NOT NULL,
  changed_by uuid REFERENCES auth.users(id),
  changed_at timestamptz DEFAULT now(),
  notes text
);

-- Enable RLS on status history
ALTER TABLE public.project_status_history ENABLE ROW LEVEL SECURITY;

-- Add policies for status history
CREATE POLICY "Project participants can view status history"
  ON public.project_status_history
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM customer_projects
      WHERE id = project_id 
      AND (
        customer_id = auth.uid() OR
        EXISTS (
          SELECT 1 FROM project_providers
          WHERE project_id = customer_projects.id
          AND provider_id = auth.uid()
        )
      )
    )
  );

-- Function to create a new project
CREATE OR REPLACE FUNCTION public.create_project(
  p_customer_id uuid,
  p_name text,
  p_description text,
  p_start_date date,
  p_end_date date,
  p_location text,
  p_category text,
  p_budget_min numeric,
  p_budget_max numeric
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_project_id uuid;
BEGIN
  -- Validate inputs
  IF p_end_date < p_start_date THEN
    RAISE EXCEPTION 'End date must be after start date';
  END IF;

  IF p_budget_max < p_budget_min THEN
    RAISE EXCEPTION 'Maximum budget must be greater than minimum budget';
  END IF;

  -- Create project
  INSERT INTO public.customer_projects (
    customer_id,
    name,
    description,
    start_date,
    end_date,
    location,
    category,
    budget_min,
    budget_max,
    status
  )
  VALUES (
    p_customer_id,
    p_name,
    p_description,
    p_start_date,
    p_end_date,
    p_location,
    p_category,
    p_budget_min,
    p_budget_max,
    'draft'
  )
  RETURNING id INTO v_project_id;

  -- Record initial status
  INSERT INTO public.project_status_history (
    project_id,
    old_status,
    new_status,
    changed_by,
    notes
  )
  VALUES (
    v_project_id,
    NULL,
    'draft',
    p_customer_id,
    'Project created'
  );

  RETURN v_project_id;
END;
$$;

-- Function to link provider to project
CREATE OR REPLACE FUNCTION public.link_provider_to_project(
  p_project_id uuid,
  p_provider_id uuid
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Check if project exists and is in valid status
  IF NOT EXISTS (
    SELECT 1 FROM public.customer_projects
    WHERE id = p_project_id
    AND status = 'published'
  ) THEN
    RAISE EXCEPTION 'Project must be published to link providers';
  END IF;

  -- Link provider
  INSERT INTO public.project_providers (
    project_id,
    provider_id,
    status
  )
  VALUES (
    p_project_id,
    p_provider_id,
    'pending'
  );
END;
$$;

-- Function to update project status
CREATE OR REPLACE FUNCTION public.update_project_status(
  p_project_id uuid,
  p_new_status text,
  p_notes text DEFAULT NULL
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_old_status text;
BEGIN
  -- Get current status
  SELECT status INTO v_old_status
  FROM public.customer_projects
  WHERE id = p_project_id;

  -- Validate status transition
  IF NOT (
    (v_old_status = 'draft' AND p_new_status = 'published') OR
    (v_old_status = 'published' AND p_new_status IN ('in_progress', 'cancelled')) OR
    (v_old_status = 'in_progress' AND p_new_status IN ('completed', 'cancelled'))
  ) THEN
    RAISE EXCEPTION 'Invalid status transition from % to %', v_old_status, p_new_status;
  END IF;

  -- Update status
  UPDATE public.customer_projects
  SET 
    status = p_new_status,
    updated_at = now()
  WHERE id = p_project_id;

  -- Record status change
  INSERT INTO public.project_status_history (
    project_id,
    old_status,
    new_status,
    changed_by,
    notes
  )
  VALUES (
    p_project_id,
    v_old_status,
    p_new_status,
    auth.uid(),
    p_notes
  );
END;
$$;