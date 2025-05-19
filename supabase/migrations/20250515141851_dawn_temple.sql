-- Update role switching functionality for seamless transitions

-- Update validate_role_switch function to handle subsequent switches
CREATE OR REPLACE FUNCTION validate_role_switch()
RETURNS trigger AS $$
DECLARE
  missing_fields text[];
  has_provider_profile boolean;
BEGIN
  -- Check if user already has a provider profile
  SELECT EXISTS (
    SELECT 1 FROM provider_profiles WHERE id = NEW.id
  ) INTO has_provider_profile;

  -- For first-time switch to provider, validate required fields
  IF NEW.user_type = 'provider' AND OLD.user_type = 'customer' AND NOT has_provider_profile THEN
    -- Build array of missing required fields
    SELECT ARRAY_AGG(field)
    INTO missing_fields
    FROM (
      SELECT field
      FROM unnest(ARRAY['name', 'email', 'phone', 'location']) AS field
      WHERE NOT EXISTS (
        SELECT 1
        FROM jsonb_each_text(to_jsonb(NEW))
        WHERE key = field AND value IS NOT NULL AND value != ''
      )
    ) AS missing;

    -- Raise exception if any required fields are missing
    IF missing_fields IS NOT NULL THEN
      RAISE EXCEPTION 'Missing required fields: %', array_to_string(missing_fields, ', ');
    END IF;
  END IF;

  -- For subsequent switches, ensure role_type is 'both'
  IF NEW.user_type != OLD.user_type AND OLD.role_type != 'both' THEN
    RAISE EXCEPTION 'Cannot switch roles without dual role type';
  END IF;

  -- Set role_type to 'both' on first successful switch
  IF NEW.user_type != OLD.user_type AND OLD.role_type = 'single' THEN
    NEW.role_type := 'both';
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Update sync_shared_profile_data function to maintain data consistency
CREATE OR REPLACE FUNCTION sync_shared_profile_data()
RETURNS trigger AS $$
BEGIN
  -- Only sync if role_type is 'both'
  IF NEW.role_type = 'both' THEN
    -- Store current values before sync
    INSERT INTO permission_error_logs (
      user_id,
      error_type,
      error_message,
      attempted_action,
      context
    ) VALUES (
      NEW.id,
      'DATA_SYNC',
      'Storing profile data before sync',
      TG_OP,
      jsonb_build_object(
        'old_data', to_jsonb(OLD),
        'new_data', to_jsonb(NEW)
      )
    );

    -- Update shared fields while preserving existing data
    UPDATE profiles
    SET
      name = COALESCE(NEW.name, name),
      email = COALESCE(NEW.email, email),
      phone = COALESCE(NEW.phone, phone),
      location = COALESCE(NEW.location, location),
      updated_at = now()
    WHERE id = NEW.id;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Update prefill_provider_data function to preserve existing data
CREATE OR REPLACE FUNCTION prefill_provider_data()
RETURNS trigger AS $$
DECLARE
  existing_profile provider_profiles%ROWTYPE;
BEGIN
  -- Check for existing provider profile
  SELECT * INTO existing_profile
  FROM provider_profiles
  WHERE id = NEW.id;

  -- Only create/update if switching to provider role
  IF NEW.user_type = 'provider' AND OLD.user_type = 'customer' THEN
    -- Insert or update provider profile
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
      COALESCE(existing_profile.business_name, NEW.name || '''s Business', 'New Business'),
      COALESCE(existing_profile.business_description, 'Business description pending...'),
      COALESCE(existing_profile.years_in_business, 0),
      COALESCE(existing_profile.website, NULL),
      COALESCE(existing_profile.available, true),
      COALESCE(existing_profile.profile_completion_percentage, 20)
    )
    ON CONFLICT (id) DO UPDATE SET
      business_name = EXCLUDED.business_name,
      business_description = EXCLUDED.business_description,
      years_in_business = EXCLUDED.years_in_business,
      website = EXCLUDED.website,
      available = EXCLUDED.available,
      profile_completion_percentage = EXCLUDED.profile_completion_percentage,
      updated_at = now()
    WHERE provider_profiles.business_name IS NULL;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;