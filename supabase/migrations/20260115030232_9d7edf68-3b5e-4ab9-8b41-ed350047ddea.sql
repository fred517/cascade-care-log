-- Create email_recipients table for storing alert notification recipients
CREATE TABLE public.email_recipients (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    site_id UUID,
    email TEXT NOT NULL,
    name TEXT NOT NULL,
    alert_types TEXT[] DEFAULT ARRAY['all']::TEXT[],
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create email_logs table for tracking sent emails
CREATE TABLE public.email_logs (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    alert_event_id UUID,
    recipient_email TEXT NOT NULL,
    recipient_name TEXT,
    subject TEXT NOT NULL,
    body TEXT,
    status TEXT NOT NULL DEFAULT 'pending',
    provider_id TEXT,
    sent_at TIMESTAMP WITH TIME ZONE,
    fail_reason TEXT,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create alert_events table for storing triggered alerts
CREATE TABLE public.alert_events (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    site_id UUID,
    metric_id TEXT NOT NULL,
    metric_name TEXT NOT NULL,
    value DECIMAL NOT NULL,
    threshold_min DECIMAL,
    threshold_max DECIMAL,
    severity TEXT NOT NULL DEFAULT 'warning',
    status TEXT NOT NULL DEFAULT 'active',
    triggered_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    acknowledged_by UUID,
    acknowledged_at TIMESTAMP WITH TIME ZONE,
    resolved_at TIMESTAMP WITH TIME ZONE,
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE public.email_recipients ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.email_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.alert_events ENABLE ROW LEVEL SECURITY;

-- Create policies for email_recipients (public read for now, will restrict after auth is added)
CREATE POLICY "Allow public read access to email_recipients"
ON public.email_recipients
FOR SELECT
USING (true);

CREATE POLICY "Allow public insert to email_recipients"
ON public.email_recipients
FOR INSERT
WITH CHECK (true);

CREATE POLICY "Allow public update to email_recipients"
ON public.email_recipients
FOR UPDATE
USING (true);

CREATE POLICY "Allow public delete from email_recipients"
ON public.email_recipients
FOR DELETE
USING (true);

-- Create policies for email_logs (public read for now)
CREATE POLICY "Allow public read access to email_logs"
ON public.email_logs
FOR SELECT
USING (true);

CREATE POLICY "Allow public insert to email_logs"
ON public.email_logs
FOR INSERT
WITH CHECK (true);

-- Create policies for alert_events
CREATE POLICY "Allow public read access to alert_events"
ON public.alert_events
FOR SELECT
USING (true);

CREATE POLICY "Allow public insert to alert_events"
ON public.alert_events
FOR INSERT
WITH CHECK (true);

CREATE POLICY "Allow public update to alert_events"
ON public.alert_events
FOR UPDATE
USING (true);

-- Create function to update timestamps
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

-- Create trigger for email_recipients
CREATE TRIGGER update_email_recipients_updated_at
BEFORE UPDATE ON public.email_recipients
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();