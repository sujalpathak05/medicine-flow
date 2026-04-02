
-- Add GST fields to medicines table
ALTER TABLE public.medicines ADD COLUMN IF NOT EXISTS hsn_code text DEFAULT '';
ALTER TABLE public.medicines ADD COLUMN IF NOT EXISTS gst_rate numeric DEFAULT 12;
ALTER TABLE public.medicines ADD COLUMN IF NOT EXISTS mrp numeric DEFAULT 0;

-- Add GST fields to sales table
ALTER TABLE public.sales ADD COLUMN IF NOT EXISTS cgst numeric DEFAULT 0;
ALTER TABLE public.sales ADD COLUMN IF NOT EXISTS sgst numeric DEFAULT 0;
ALTER TABLE public.sales ADD COLUMN IF NOT EXISTS igst numeric DEFAULT 0;
ALTER TABLE public.sales ADD COLUMN IF NOT EXISTS gst_amount numeric DEFAULT 0;

-- Add GST fields to sale_items
ALTER TABLE public.sale_items ADD COLUMN IF NOT EXISTS hsn_code text DEFAULT '';
ALTER TABLE public.sale_items ADD COLUMN IF NOT EXISTS gst_rate numeric DEFAULT 12;
ALTER TABLE public.sale_items ADD COLUMN IF NOT EXISTS cgst numeric DEFAULT 0;
ALTER TABLE public.sale_items ADD COLUMN IF NOT EXISTS sgst numeric DEFAULT 0;

-- Suppliers table
CREATE TABLE public.suppliers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  contact_person text DEFAULT '',
  phone text DEFAULT '',
  email text DEFAULT '',
  gst_number text DEFAULT '',
  address text DEFAULT '',
  is_active boolean DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.suppliers ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Authenticated can view suppliers" ON public.suppliers FOR SELECT TO authenticated USING (true);
CREATE POLICY "Admins can insert suppliers" ON public.suppliers FOR INSERT TO authenticated WITH CHECK (has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins can update suppliers" ON public.suppliers FOR UPDATE TO authenticated USING (has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins can delete suppliers" ON public.suppliers FOR DELETE TO authenticated USING (has_role(auth.uid(), 'admin'));

-- Purchase Orders table
CREATE TABLE public.purchase_orders (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  order_number text NOT NULL,
  supplier_id uuid REFERENCES public.suppliers(id) NOT NULL,
  branch_id uuid REFERENCES public.branches(id) NOT NULL,
  status text NOT NULL DEFAULT 'draft',
  total_amount numeric DEFAULT 0,
  gst_amount numeric DEFAULT 0,
  net_amount numeric DEFAULT 0,
  notes text DEFAULT '',
  created_by uuid NOT NULL,
  received_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.purchase_orders ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Authenticated can view purchase_orders" ON public.purchase_orders FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated can insert purchase_orders" ON public.purchase_orders FOR INSERT TO authenticated WITH CHECK (auth.uid() = created_by);
CREATE POLICY "Admins can update purchase_orders" ON public.purchase_orders FOR UPDATE TO authenticated USING (has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins can delete purchase_orders" ON public.purchase_orders FOR DELETE TO authenticated USING (has_role(auth.uid(), 'admin'));

-- Purchase Order Items
CREATE TABLE public.purchase_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  purchase_order_id uuid REFERENCES public.purchase_orders(id) ON DELETE CASCADE NOT NULL,
  medicine_name text NOT NULL,
  batch_number text DEFAULT '',
  expiry_date date,
  quantity integer NOT NULL DEFAULT 0,
  unit_price numeric NOT NULL DEFAULT 0,
  gst_rate numeric DEFAULT 12,
  total_price numeric DEFAULT 0,
  medicine_id uuid REFERENCES public.medicines(id),
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.purchase_items ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Authenticated can view purchase_items" ON public.purchase_items FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated can insert purchase_items" ON public.purchase_items FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Admins can update purchase_items" ON public.purchase_items FOR UPDATE TO authenticated USING (has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins can delete purchase_items" ON public.purchase_items FOR DELETE TO authenticated USING (has_role(auth.uid(), 'admin'));

-- Sales Returns table
CREATE TABLE public.sales_returns (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  return_number text NOT NULL,
  sale_id uuid REFERENCES public.sales(id) NOT NULL,
  branch_id uuid REFERENCES public.branches(id) NOT NULL,
  reason text DEFAULT '',
  total_amount numeric DEFAULT 0,
  status text DEFAULT 'pending',
  created_by uuid NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.sales_returns ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Authenticated can view sales_returns" ON public.sales_returns FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated can insert sales_returns" ON public.sales_returns FOR INSERT TO authenticated WITH CHECK (auth.uid() = created_by);
CREATE POLICY "Admins can update sales_returns" ON public.sales_returns FOR UPDATE TO authenticated USING (has_role(auth.uid(), 'admin'));

-- Sales Return Items
CREATE TABLE public.sales_return_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  sales_return_id uuid REFERENCES public.sales_returns(id) ON DELETE CASCADE NOT NULL,
  medicine_id uuid REFERENCES public.medicines(id) NOT NULL,
  medicine_name text NOT NULL,
  quantity integer NOT NULL,
  unit_price numeric NOT NULL,
  total_price numeric NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.sales_return_items ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Authenticated can view sales_return_items" ON public.sales_return_items FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated can insert sales_return_items" ON public.sales_return_items FOR INSERT TO authenticated WITH CHECK (true);

-- Credit/Debit Notes
CREATE TABLE public.credit_notes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  note_number text NOT NULL,
  type text NOT NULL DEFAULT 'credit',
  reference_type text NOT NULL DEFAULT 'sale_return',
  reference_id uuid,
  amount numeric NOT NULL DEFAULT 0,
  reason text DEFAULT '',
  branch_id uuid REFERENCES public.branches(id) NOT NULL,
  created_by uuid NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.credit_notes ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Authenticated can view credit_notes" ON public.credit_notes FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated can insert credit_notes" ON public.credit_notes FOR INSERT TO authenticated WITH CHECK (auth.uid() = created_by);

-- Enable realtime for new tables
ALTER PUBLICATION supabase_realtime ADD TABLE public.suppliers;
ALTER PUBLICATION supabase_realtime ADD TABLE public.purchase_orders;
ALTER PUBLICATION supabase_realtime ADD TABLE public.sales_returns;
