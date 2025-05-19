/*
  # Rename full_name column to name

  1. Changes
    - Rename full_name column to name in profiles table
    - Update all functions and triggers that reference full_name
    - Preserve data and constraints
  
  2. Security
    - Maintain existing RLS policies
    - Update function references
*/

-- Rename the column
ALTER TABLE profiles RENAME COLUMN full_name TO name;

-- Update validate_role_switch function
CREATE OR REPLACE FUNCTION validate_role_switch()
RETURNS trigger AS $$
DECLARE
  missing_fields text[];
BEGIN
  -- Build array of missing required fields
  SELECT ARRAY_AGG(field)
  INTO missing_fields
  FROM (
    SELECT unnest(ARRAY['name', 'email', 'phone', 'location']) AS field
    WHERE NOT EXISTS (
      SELECT 1
      FROM jsonb_each_text(to_jsonb(NEW))
      WHERE key = field AND value IS NOT NULL
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

  -- Log validation result
  INSERT INTO permission_error_logs (
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
$$ LANGUAGE plpgsql;

-- Update sync_shared_profile_data function
CREATE OR REPLACE FUNCTION sync_shared_profile_data()
RETURNS trigger AS $$
BEGIN
  -- Only sync if role_type is 'both'
  IF NEW.role_type = 'both' THEN
    -- Log synchronization event
    INSERT INTO permission_error_logs (
      user_id,
      error_type,
      error_message,
      attempted_action,
      context
    ) VALUES (
      NEW.id,
      'DATA_SYNC',
      'Synchronizing shared profile data',
      TG_OP,
      jsonb_build_object(
        'old_role', OLD.user_type,
        'new_role', NEW.user_type,
        'synced_fields', jsonb_build_array(
          'name',
          'email',
          'phone',
          'location'
        )
      )
    );

    -- Update shared fields
    UPDATE profiles
    SET
      name = COALESCE(NEW.name, name),
      email = COALESCE(NEW.email, email),
      phone = COALESCE(NEW.phone, phone),
      location = COALESCE(NEW.location, location),
      updated_at = now()
    WHERE id = NEW.id;

    -- If switching to provider, ensure provider profile exists
    IF NEW.user_type = 'provider' AND NOT EXISTS (
      SELECT 1 FROM provider_profiles WHERE id = NEW.id
    ) THEN
      INSERT INTO provider_profiles (
        id,
        business_name,
        business_description,
        years_in_business,
        website,
        available,
        profile_completion_percentage
      ) VALUES (
        NEW.id,
        COALESCE(NEW.name || '''s Business', 'New Business'),
        'Business description pending...',
        0,
        NULL,
        true,
        20
      );
    END IF;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Update prefill_provider_data function
CREATE OR REPLACE FUNCTION prefill_provider_data()
RETURNS trigger AS $$
BEGIN
  -- Only run when switching to provider role
  IF NEW.user_type = 'provider' AND OLD.user_type = 'customer' THEN
    -- Create or update provider profile with prefilled data
    INSERT INTO provider_profiles (
      id,
      business_name,
      business_description,
      years_in_business,
      website,
      available,
      profile_completion_percentage
    ) VALUES (
      NEW.id,
      COALESCE(NEW.name || '''s Business', 'New Business'),
      'Business description pending...',
      0,
      NULL,
      true,
      20  -- Base completion percentage for prefilled data
    )
    ON CONFLICT (id) DO UPDATE SET
      business_name = EXCLUDED.business_name,
      business_description = EXCLUDED.business_description,
      profile_completion_percentage = 20
    WHERE provider_profiles.business_name IS NULL;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;