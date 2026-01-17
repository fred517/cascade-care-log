-- Drop existing facilities policies
DROP POLICY IF EXISTS "facilities_select_org_member" ON public.facilities;
DROP POLICY IF EXISTS "facilities_insert_org_admin" ON public.facilities;
DROP POLICY IF EXISTS "facilities_update_org_admin" ON public.facilities;
DROP POLICY IF EXISTS "facilities_delete_org_admin" ON public.facilities;

-- Create new policies with support access
CREATE POLICY "facilities_read"
ON public.facilities
FOR SELECT
USING (
  public.is_support()
  OR EXISTS (
    SELECT 1 FROM public.org_members m
    WHERE m.org_id = facilities.org_id
      AND m.user_id = auth.uid()
  )
);

CREATE POLICY "facilities_write"
ON public.facilities
FOR INSERT
WITH CHECK (
  public.is_support()
  OR EXISTS (
    SELECT 1 FROM public.org_members m
    WHERE m.org_id = facilities.org_id
      AND m.user_id = auth.uid()
  )
);

-- Add update policy with same logic
CREATE POLICY "facilities_update"
ON public.facilities
FOR UPDATE
USING (
  public.is_support()
  OR EXISTS (
    SELECT 1 FROM public.org_members m
    WHERE m.org_id = facilities.org_id
      AND m.user_id = auth.uid()
  )
);

-- Add delete policy (org admins or support only)
CREATE POLICY "facilities_delete"
ON public.facilities
FOR DELETE
USING (
  public.is_support()
  OR has_org_role(auth.uid(), org_id, ARRAY['owner', 'admin'])
);