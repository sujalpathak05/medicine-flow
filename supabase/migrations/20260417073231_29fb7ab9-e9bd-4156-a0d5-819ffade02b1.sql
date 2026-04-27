-- Add new roles to existing enum
ALTER TYPE public.app_role ADD VALUE IF NOT EXISTS 'staff';
ALTER TYPE public.app_role ADD VALUE IF NOT EXISTS 'cashier';

-- Pharmacy settings table (single-row config for invoice header)
CREATE TABLE IF NOT EXISTS public.pharmacy_settings (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL DEFAULT 'Medi Inventory',
  address TEXT NOT NULL DEFAULT '',
  phone TEXT NOT NULL DEFAULT '',
  gstin TEXT NOT NULL DEFAULT '',
  email TEXT NOT NULL DEFAULT '',
  tagline TEXT NOT NULL DEFAULT 'Your Trusted Health Partner',
  footer_note TEXT NOT NULL DEFAULT 'Thank you for your visit. Get well soon!',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.pharmacy_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated can view pharmacy_settings"
  ON public.pharmacy_settings FOR SELECT TO authenticated USING (true);

CREATE POLICY "Admins can insert pharmacy_settings"
  ON public.pharmacy_settings FOR INSERT TO authenticated
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can update pharmacy_settings"
  ON public.pharmacy_settings FOR UPDATE TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role));

CREATE TRIGGER update_pharmacy_settings_updated_at
  BEFORE UPDATE ON public.pharmacy_settings
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Seed one default row
INSERT INTO public.pharmacy_settings (name, tagline) 
VALUES ('Medi Inventory', 'Your Trusted Health Partner');

-- Add doctor_name column to sales for invoice
ALTER TABLE public.sales ADD COLUMN IF NOT EXISTS doctor_name TEXT DEFAULT '';
