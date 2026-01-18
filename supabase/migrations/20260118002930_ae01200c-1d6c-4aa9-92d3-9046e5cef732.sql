-- Make site-maps bucket public so uploaded maps display correctly
UPDATE storage.buckets SET public = true WHERE name = 'site-maps';

-- Add site_id column to OdourIncident type alignment
-- The odour_incidents table already has site_id, just need to ensure it's queryable
-- No schema changes needed - just confirming the column exists