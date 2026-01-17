-- Create waterops-private storage bucket
INSERT INTO storage.buckets (id, name, public)
VALUES ('waterops-private', 'waterops-private', false)
ON CONFLICT (id) DO NOTHING;

-- Simpler RLS policies using path prefix matching
CREATE POLICY "waterops_private_select"
ON storage.objects FOR SELECT
USING (
  bucket_id = 'waterops-private'
  AND (
    public.is_support()
    OR EXISTS (
      SELECT 1
      FROM public.org_members m
      WHERE name LIKE 'org/' || m.org_id::text || '/%'
        AND m.user_id = auth.uid()
    )
  )
);

CREATE POLICY "waterops_private_insert"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'waterops-private'
  AND (
    public.is_support()
    OR EXISTS (
      SELECT 1
      FROM public.org_members m
      WHERE name LIKE 'org/' || m.org_id::text || '/%'
        AND m.user_id = auth.uid()
    )
  )
);

CREATE POLICY "waterops_private_update"
ON storage.objects FOR UPDATE
USING (
  bucket_id = 'waterops-private'
  AND (
    public.is_support()
    OR EXISTS (
      SELECT 1
      FROM public.org_members m
      WHERE name LIKE 'org/' || m.org_id::text || '/%'
        AND m.user_id = auth.uid()
    )
  )
);

CREATE POLICY "waterops_private_delete"
ON storage.objects FOR DELETE
USING (
  bucket_id = 'waterops-private'
  AND (
    public.is_support()
    OR EXISTS (
      SELECT 1
      FROM public.org_members m
      WHERE name LIKE 'org/' || m.org_id::text || '/%'
        AND has_org_role(auth.uid(), m.org_id, ARRAY['owner', 'admin'])
    )
  )
);