/*
  # Storage Policies for Provider Portfolio Images

  1. Changes
    - Create storage bucket for provider portfolio images
    - Set up policies for authenticated providers to manage their images
    - Allow public read access to all portfolio images
  
  2. Security
    - Enable public access to view images
    - Restrict upload/delete operations to authenticated providers
    - Ensure providers can only manage their own images
*/

-- Create the storage bucket if it doesn't exist
DO $$
BEGIN
  INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
  VALUES (
    'provider-portfolio',
    'provider-portfolio',
    true,
    5242880, -- 5MB limit
    ARRAY['image/jpeg', 'image/png', 'image/gif', 'image/webp']
  )
  ON CONFLICT (id) DO NOTHING;
END $$;

-- Enable RLS on the storage.objects table
ALTER TABLE storage.objects ENABLE ROW LEVEL SECURITY;

-- Policy for public read access to all portfolio images
CREATE POLICY "Public can view all portfolio images"
ON storage.objects FOR SELECT
TO public
USING (bucket_id = 'provider-portfolio');

-- Policy for providers to upload their own images
CREATE POLICY "Providers can upload portfolio images"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'provider-portfolio' AND
  (storage.foldername(name))[1] = auth.uid()::text
);

-- Policy for providers to update their own images
CREATE POLICY "Providers can update their own images"
ON storage.objects FOR UPDATE
TO authenticated
USING (
  bucket_id = 'provider-portfolio' AND
  (storage.foldername(name))[1] = auth.uid()::text
)
WITH CHECK (
  bucket_id = 'provider-portfolio' AND
  (storage.foldername(name))[1] = auth.uid()::text
);

-- Policy for providers to delete their own images
CREATE POLICY "Providers can delete their own images"
ON storage.objects FOR DELETE
TO authenticated
USING (
  bucket_id = 'provider-portfolio' AND
  (storage.foldername(name))[1] = auth.uid()::text
);

-- Function to extract folder name from storage path
CREATE OR REPLACE FUNCTION storage.foldername(name text)
RETURNS text[]
LANGUAGE plpgsql
AS $$
BEGIN
    RETURN string_to_array(name, '/');
END
$$;