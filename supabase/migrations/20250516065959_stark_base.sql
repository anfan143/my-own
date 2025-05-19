-- Set search paths for all functions
ALTER FUNCTION check_role_access SET search_path = '';
ALTER FUNCTION check_role_permission SET search_path = '';
ALTER FUNCTION check_provider_access SET search_path = '';
ALTER FUNCTION check_total_payment_percentage SET search_path = '';
ALTER FUNCTION calculate_provider_completion SET search_path = '';
ALTER FUNCTION generate_project_number SET search_path = '';
ALTER FUNCTION handle_permission_error SET search_path = '';
ALTER FUNCTION handle_proposal_acceptance SET search_path = '';
ALTER FUNCTION handle_updated_at SET search_path = '';
ALTER FUNCTION log_permission_error SET search_path = '';
ALTER FUNCTION prefill_provider_data SET search_path = '';
ALTER FUNCTION refresh_provider_completion_status SET search_path = '';
ALTER FUNCTION storage.foldername SET search_path = '';
ALTER FUNCTION sync_shared_profile_data SET search_path = '';
ALTER FUNCTION track_role_switch SET search_path = '';
ALTER FUNCTION validate_profile_data SET search_path = '';
ALTER FUNCTION validate_provider_data SET search_path = '';
ALTER FUNCTION validate_provider_update SET search_path = '';
ALTER FUNCTION validate_role_switch SET search_path = '';

-- Optimize recursive functions to prevent stack depth issues
CREATE OR REPLACE FUNCTION check_role_permission(
  p_user_id uuid,
  p_required_role text,
  p_action text
)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
STABLE
SET search_path = ''
AS $$
DECLARE
  v_user_type text;
  v_role_type text;
BEGIN
  -- Get user's current role information directly
  SELECT user_type, role_type
  INTO v_user_type, v_role_type
  FROM public.profiles
  WHERE id = p_user_id;

  -- Handle dual-role users
  IF v_role_type = 'both' THEN
    RETURN true;
  END IF;

  -- Check if user has required role
  IF v_user_type = p_required_role THEN
    RETURN true;
  END IF;

  -- Log permission error without recursion
  INSERT INTO public.permission_error_logs (
    user_id,
    error_type,
    error_message,
    attempted_action,
    context
  ) VALUES (
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
$$;

-- Optimize role switch validation
CREATE OR REPLACE FUNCTION validate_role_switch()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  missing_fields text[];
BEGIN
  -- Build array of missing required fields without recursion
  SELECT array_agg(field)
  INTO missing_fields
  FROM (
    SELECT field
    FROM unnest(ARRAY['name', 'email', 'phone', 'location']) AS field
    WHERE NOT EXISTS (
      SELECT 1
      FROM jsonb_each_text(to_jsonb(NEW))
      WHERE key = field AND value IS NOT NULL AND trim(value) != ''
    )
  ) AS missing;

  -- Validate required fields before role switch
  IF NEW.user_type != OLD.user_type AND missing_fields IS NOT NULL THEN
    RAISE EXCEPTION 'Missing required fields: %', array_to_string(missing_fields, ', ');
  END IF;

  -- Only allow switching if role_type is 'both' or changing to 'both'
  IF OLD.user_type != NEW.user_type AND OLD.role_type = 'single' AND NEW.role_type != 'both' THEN
    RAISE EXCEPTION 'Cannot switch roles without dual role type';
  END IF;

  -- Log validation result without recursion
  INSERT INTO public.permission_error_logs (
    user_id,
    error_type,
    error_message,
    attempted_action,
    context
  ) VALUES (
    NEW.id,
    'ROLE_SWITCH_VALIDATION',
    'Validating role switch requirements',
    TG_OP,
    jsonb_build_object(
      'old_role', OLD.user_type,
      'new_role', NEW.user_type,
      'missing_fields', missing_fields,
      'role_type', NEW.role_type
    )
  );

  RETURN NEW;
END;
$$;

-- Update configuration parameter for stack depth
ALTER SYSTEM SET max_stack_depth = '4MB';
SELECT pg_reload_conf();