-- Create storage bucket for reading attachments
INSERT INTO storage.buckets (id, name, public)
VALUES ('reading-attachments', 'reading-attachments', true);

-- Allow authenticated users to upload files to the bucket
CREATE POLICY "Authenticated users can upload reading attachments"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'reading-attachments');

-- Allow authenticated users to view attachments
CREATE POLICY "Anyone can view reading attachments"
ON storage.objects FOR SELECT
USING (bucket_id = 'reading-attachments');

-- Allow users to update their own uploads
CREATE POLICY "Users can update their own reading attachments"
ON storage.objects FOR UPDATE
TO authenticated
USING (bucket_id = 'reading-attachments' AND auth.uid()::text = (storage.foldername(name))[1]);

-- Allow users to delete their own uploads
CREATE POLICY "Users can delete their own reading attachments"
ON storage.objects FOR DELETE
TO authenticated
USING (bucket_id = 'reading-attachments' AND auth.uid()::text = (storage.foldername(name))[1]);