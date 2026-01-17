-- Create support audit log table
CREATE TABLE IF NOT EXISTS public.support_audit_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  acted_by uuid NOT NULL,
  org_id uuid,
  site_id uuid,
  action text NOT NULL,
  details jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.support_audit_log ENABLE ROW LEVEL SECURITY;

-- Only support staff can insert their own audit entries
CREATE POLICY "support_audit_insert_support_only"
ON public.support_audit_log
FOR INSERT
WITH CHECK (public.is_support() AND acted_by = auth.uid());

-- Only support staff can view audit logs
CREATE POLICY "support_audit_select_support_only"
ON public.support_audit_log
FOR SELECT
USING (public.is_support());