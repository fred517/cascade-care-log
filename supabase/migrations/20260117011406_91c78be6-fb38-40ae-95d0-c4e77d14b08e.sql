-- Add address column to sites table for PDF reports
ALTER TABLE public.sites ADD COLUMN IF NOT EXISTS address text;