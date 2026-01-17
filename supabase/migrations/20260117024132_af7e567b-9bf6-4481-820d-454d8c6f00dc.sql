
-- Enable pg_net extension for HTTP calls from triggers
CREATE EXTENSION IF NOT EXISTS pg_net WITH SCHEMA extensions;

-- Create function to trigger plume prediction generation
CREATE OR REPLACE FUNCTION public.trigger_plume_predictions()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  service_role_key text;
  supabase_url text;
BEGIN
  -- Get the service role key and URL from vault or use environment
  supabase_url := current_setting('app.settings.supabase_url', true);
  service_role_key := current_setting('app.settings.service_role_key', true);
  
  -- If settings not available, use hardcoded project URL (anon key is safe to use)
  IF supabase_url IS NULL THEN
    supabase_url := 'https://pzbyierrmmxcktpjfiac.supabase.co';
  END IF;

  -- Make async HTTP call to generate predictions
  PERFORM net.http_post(
    url := supabase_url || '/functions/v1/generate-plume-predictions',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InB6YnlpZXJybW14Y2t0cGpmaWFjIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njg0MzYzMzEsImV4cCI6MjA4NDAxMjMzMX0.O7dbJt9QQ_SAFW51KckDln-750msn4gHD5QeHo0vmgY'
    ),
    body := jsonb_build_object(
      'site_id', NEW.site_id,
      'validity_hours', 1
    )
  );

  RETURN NEW;
END;
$$;

-- Create trigger on weather_snapshots table
DROP TRIGGER IF EXISTS on_weather_snapshot_generate_predictions ON public.weather_snapshots;

CREATE TRIGGER on_weather_snapshot_generate_predictions
  AFTER INSERT ON public.weather_snapshots
  FOR EACH ROW
  EXECUTE FUNCTION public.trigger_plume_predictions();
