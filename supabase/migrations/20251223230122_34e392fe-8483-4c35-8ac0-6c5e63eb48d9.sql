-- Make the issue-files bucket private
UPDATE storage.buckets 
SET public = false 
WHERE id = 'issue-files';

-- Drop the public access policy
DROP POLICY IF EXISTS "Anyone can view issue files" ON storage.objects;

-- Create authenticated-only view policy
CREATE POLICY "Authenticated users can view issue files"
ON storage.objects
FOR SELECT
TO authenticated
USING (
  bucket_id = 'issue-files' AND
  (
    -- Owner can view their files
    (storage.foldername(name))[1] = auth.uid()::text
    OR
    -- Admin can view all files
    public.has_role(auth.uid(), 'admin'::app_role)
  )
);