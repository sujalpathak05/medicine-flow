
-- Sales table
CREATE TABLE public.sales (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  invoice_number text NOT NULL,
  branch_id uuid REFERENCES public.branches(id) NOT NULL,
  sold_by uuid NOT NULL,
  customer_name text DEFAULT '',
  customer_phone text DEFAULT '',
  total_amount numeric NOT NULL DEFAULT 0,
  discount numeric NOT NULL DEFAULT 0,
  net_amount numeric NOT NULL DEFAULT 0,
  payment_method text NOT NULL DEFAULT 'cash',
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Sale items table
CREATE TABLE public.sale_items (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  sale_id uuid REFERENCES public.sales(id) ON DELETE CASCADE NOT NULL,
  medicine_id uuid REFERENCES public.medicines(id) NOT NULL,
  medicine_name text NOT NULL,
  quantity integer NOT NULL,
  unit_price numeric NOT NULL,
  total_price numeric NOT NULL,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

-- RLS
ALTER TABLE public.sales ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sale_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated can view sales" ON public.sales FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated can insert sales" ON public.sales FOR INSERT TO authenticated WITH CHECK (auth.uid() = sold_by);
CREATE POLICY "Admins can delete sales" ON public.sales FOR DELETE TO authenticated USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Authenticated can view sale_items" ON public.sale_items FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated can insert sale_items" ON public.sale_items FOR INSERT TO authenticated WITH CHECK (true);

-- Sequence for invoice numbers
CREATE SEQUENCE public.invoice_seq START 1001;

-- Enable realtime
ALTER PUBLICATION supabase_realtime ADD TABLE public.sales;
