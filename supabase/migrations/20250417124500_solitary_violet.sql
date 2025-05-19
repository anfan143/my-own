/*
  # Fix storage policies for provider portfolio

  1. Changes
    - Drop existing policies to ensure clean state
    - Recreate storage bucket with proper configuration
    - Add improved storage policies
  
  2. Security
    - Ensure proper access control
    - Fix folder structure validation
*/

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Public can view all portfolio images" ON storage.objects;
DROP POLICY IF EXISTS "Providers can upload portfolio images" ON storage.objects;
DROP POLICY IF EXISTS "Providers can update their own images" ON storage.objects;
DROP POLICY IF EXISTS "Providers can delete their own images" ON storage.objects;

-- Recreate the storage bucket with proper configuration
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'provider-portfolio',
  'provider-portfolio',
  true,
  5242880, -- 5MB limit
  ARRAY['image/jpeg', 'image/png', 'image/gif', 'image/webp']
)
ON CONFLICT (id) DO UPDATE
SET 
  public = EXCLUDED.public,
  file_size_limit = EXCLUDED.file_size_limit,
  allowed_mime_types = EXCLUDED.allowed_mime_types;

-- Enable RLS
ALTER TABLE storage.objects ENABLE ROW LEVEL SECURITY;

-- Public read access
CREATE POLICY "Public can view all portfolio images"
ON storage.objects FOR SELECT
TO public
USING (bucket_id = 'provider-portfolio');

-- Provider upload access
CREATE POLICY "Providers can upload portfolio images"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'provider-portfolio' AND
  (SELECT user_type FROM profiles WHERE id = auth.uid()) = 'provider'
);

-- Provider update access
CREATE POLICY "Providers can update their own images"
ON storage.objects FOR UPDATE
TO authenticated
USING (
  bucket_id = 'provider-portfolio' AND
  (storage.foldername(name))[1] = auth.uid()::text AND
  (SELECT user_type FROM profiles WHERE id = auth.uid()) = 'provider'
);

-- Provider delete access
CREATE POLICY "Providers can delete their own images"
ON storage.objects FOR DELETE
TO authenticated
USING (
  bucket_id = 'provider-portfolio' AND
  (storage.foldername(name))[1] = auth.uid()::text AND
  (SELECT user_type FROM profiles WHERE id = auth.uid()) = 'provider'
);