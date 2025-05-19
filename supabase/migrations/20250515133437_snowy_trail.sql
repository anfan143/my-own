/*
  # Add Permission Error Logging and Role Validation

  1. Changes
    - Add permission error logging table
    - Add role validation functions
    - Update RLS policies to use role validation
  
  2. Security
    - Enable RLS on error logs
    - Add policies for error log access
    - Add role-based permission checks
*/

-- Create permission error log table if it doesn't exist
DO $$ 
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'permission_error_logs') THEN
    CREATE TABLE permission_error_logs (
      id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
      user_id uuid REFERENCES auth.users(id),
      error_type text NOT NULL,
      error_message text NOT NULL,
      attempted_action text NOT NULL,
      context jsonb,
      created_at timestamptz DEFAULT now()
    );

    -- Enable RLS on error logs
    ALTER TABLE permission_error_logs ENABLE ROW LEVEL SECURITY;
  END IF;
END $$;

-- Drop existing policies if they exist
DO $$ 
BEGIN
  DROP POLICY IF EXISTS "System can insert error logs" ON permission_error_logs;
  DROP POLICY IF EXISTS "Users can view their own error logs" ON permission_error_logs;
EXCEPTION 
  WHEN undefined_object THEN NULL;
END $$;

-- Add policies for error log access
CREATE POLICY "System can insert error logs"
  ON permission_error_logs
  FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Users can view their own error logs"
  ON permission_error_logs
  FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

-- Function to log permission errors
CREATE OR REPLACE FUNCTION log_permission_error(
  p_user_id uuid,
  p_error_type text,
  p_error_message text,
  p_attempted_action text,
  p_context jsonb DEFAULT NULL
)
RETURNS void AS $$
BEGIN
  INSERT INTO permission_error_logs (
    user_id,
    error_type,
    error_message,
    attempted_action,
    context
  ) VALUES (
    p_user_id,
    p_error_type,
    p_error_message,
    p_attempted_action,
    p_context
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to validate permissions based on role
CREATE OR REPLACE FUNCTION check_role_permission(
  p_user_id uuid,
  p_required_role text,
  p_action text
)
RETURNS boolean AS $$
DECLARE
  v_user_type text;
  v_role_type text;
BEGIN
  -- Get user's current role information
  SELECT user_type, role_type
  INTO v_user_type, v_role_type
  FROM profiles
  WHERE id = p_user_id;

  -- Handle dual-role users
  IF v_role_type = 'both' THEN
    RETURN true;
  END IF;

  -- Check if user has required role
  IF v_user_type = p_required_role THEN
    RETURN true;
  END IF;

  -- Log permission error
  PERFORM log_permission_error(
    p_user_id,
    'ROLE_PERMISSION',
    format('User does not have required role: %s', p_required_role),
    p_action,
    jsonb_build_object(
      'required_role', p_required_role,
      'user_role', v_user_type
    )
  );

  RETURN false;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Drop existing policies if they exist
DO $$ 
BEGIN
  DROP POLICY IF EXISTS "Providers can manage their services" ON provider_services;
  DROP POLICY IF EXISTS "Customers can manage their projects" ON customer_projects;
EXCEPTION 
  WHEN undefined_object THEN NULL;
END $$;

-- Update provider services policy
CREATE POLICY "Providers can manage their services"
  ON provider_services
  FOR ALL
  TO authenticated
  USING (
    provider_id = auth.uid() AND
    check_role_permission(auth.uid(), 'provider', 'access')
  )
  WITH CHECK (
    provider_id = auth.uid() AND
    check_role_permission(auth.uid(), 'provider', 'access')
  );

-- Update customer projects policy
CREATE POLICY "Customers can manage their projects"
  ON customer_projects
  FOR ALL
  TO authenticated
  USING (
    customer_id = auth.uid() AND
    check_role_permission(auth.uid(), 'customer', 'access')
  )
  WITH CHECK (
    customer_id = auth.uid() AND
    check_role_permission(auth.uid(), 'customer', 'access')
  );

-- Function to handle permission-related errors
CREATE OR REPLACE FUNCTION handle_permission_error()
RETURNS trigger AS $$
BEGIN
  IF NEW.user_type != OLD.user_type THEN
    -- Log role switch attempt
    INSERT INTO role_switch_history (
      user_id,
      old_role,
      new_role
    ) VALUES (
      NEW.id,
      OLD.user_type,
      NEW.user_type
    );
  END IF;

  -- Handle permission validation
  IF NOT check_role_permission(NEW.id, NEW.user_type, 'role_switch') THEN
    -- Log error and provide friendly message
    PERFORM log_permission_error(
      NEW.id,
      'INVALID_ROLE_SWITCH',
      'Cannot switch to this role without proper permissions',
      'role_switch',
      jsonb_build_object(
        'attempted_role', NEW.user_type,
        'current_role', OLD.user_type
      )
    );
    
    RAISE EXCEPTION 'Cannot switch roles. Please complete your profile and ensure you have the necessary permissions.';
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;