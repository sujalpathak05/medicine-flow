-- Multi-pharmacy tenancy:
-- - Every public signup receives an isolated pharmacy workspace.
-- - The signup user becomes that workspace's admin.
-- - Existing rows are backfilled into one default pharmacy.
-- - RLS policies are narrowed from "all authenticated users" to the user's pharmacy.

CREATE TABLE IF NOT EXISTS public.pharmacies (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL DEFAULT 'Medi Inventory',
  owner_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.pharmacies ENABLE ROW LEVEL SECURITY;

DROP TRIGGER IF EXISTS update_pharmacies_updated_at ON public.pharmacies;
CREATE TRIGGER update_pharmacies_updated_at
  BEFORE UPDATE ON public.pharmacies
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS pharmacy_id UUID REFERENCES public.pharmacies(id) ON DELETE CASCADE;
ALTER TABLE public.user_roles ADD COLUMN IF NOT EXISTS pharmacy_id UUID REFERENCES public.pharmacies(id) ON DELETE CASCADE;
ALTER TABLE public.branches ADD COLUMN IF NOT EXISTS pharmacy_id UUID REFERENCES public.pharmacies(id) ON DELETE CASCADE;
ALTER TABLE public.pharmacy_settings ADD COLUMN IF NOT EXISTS pharmacy_id UUID REFERENCES public.pharmacies(id) ON DELETE CASCADE;
ALTER TABLE public.suppliers ADD COLUMN IF NOT EXISTS pharmacy_id UUID REFERENCES public.pharmacies(id) ON DELETE CASCADE;
ALTER TABLE public.customers ADD COLUMN IF NOT EXISTS pharmacy_id UUID REFERENCES public.pharmacies(id) ON DELETE CASCADE;
ALTER TABLE public.activity_logs ADD COLUMN IF NOT EXISTS pharmacy_id UUID REFERENCES public.pharmacies(id) ON DELETE CASCADE;
ALTER TABLE public.expenses ADD COLUMN IF NOT EXISTS pharmacy_id UUID REFERENCES public.pharmacies(id) ON DELETE CASCADE;

DO $$
DECLARE
  default_pharmacy_id UUID;
  default_owner_id UUID;
BEGIN
  SELECT id INTO default_pharmacy_id
  FROM public.pharmacies
  ORDER BY created_at
  LIMIT 1;

  IF default_pharmacy_id IS NULL THEN
    SELECT user_id INTO default_owner_id
    FROM public.user_roles
    WHERE role = 'admin'::public.app_role
    LIMIT 1;

    IF default_owner_id IS NULL THEN
      SELECT id INTO default_owner_id
      FROM auth.users
      ORDER BY created_at
      LIMIT 1;
    END IF;

    INSERT INTO public.pharmacies (name, owner_id)
    VALUES ('Medi Inventory', default_owner_id)
    RETURNING id INTO default_pharmacy_id;
  END IF;

  UPDATE public.profiles
  SET pharmacy_id = default_pharmacy_id
  WHERE pharmacy_id IS NULL;

  UPDATE public.user_roles
  SET pharmacy_id = default_pharmacy_id
  WHERE pharmacy_id IS NULL;

  UPDATE public.branches
  SET pharmacy_id = default_pharmacy_id
  WHERE pharmacy_id IS NULL;

  UPDATE public.pharmacy_settings
  SET pharmacy_id = default_pharmacy_id
  WHERE pharmacy_id IS NULL;

  UPDATE public.suppliers
  SET pharmacy_id = default_pharmacy_id
  WHERE pharmacy_id IS NULL;

  UPDATE public.customers
  SET pharmacy_id = default_pharmacy_id
  WHERE pharmacy_id IS NULL;

  UPDATE public.activity_logs al
  SET pharmacy_id = p.pharmacy_id
  FROM public.profiles p
  WHERE al.user_id = p.user_id
    AND al.pharmacy_id IS NULL;

  UPDATE public.activity_logs
  SET pharmacy_id = default_pharmacy_id
  WHERE pharmacy_id IS NULL;

  UPDATE public.expenses e
  SET pharmacy_id = b.pharmacy_id
  FROM public.branches b
  WHERE e.branch_id = b.id
    AND e.pharmacy_id IS NULL;

  UPDATE public.expenses
  SET pharmacy_id = default_pharmacy_id
  WHERE pharmacy_id IS NULL;
END $$;

UPDATE public.pharmacy_settings
SET name = 'Medi Inventory'
WHERE name = 'Sharma Pharmacy';

ALTER TABLE public.pharmacy_settings ALTER COLUMN name SET DEFAULT 'Medi Inventory';

CREATE OR REPLACE FUNCTION public.get_user_pharmacy_id(_user_id UUID)
RETURNS UUID
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT pharmacy_id
  FROM public.profiles
  WHERE user_id = _user_id
  LIMIT 1
$$;

CREATE OR REPLACE FUNCTION public.get_my_pharmacy_id()
RETURNS UUID
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT public.get_user_pharmacy_id(auth.uid())
$$;

CREATE OR REPLACE FUNCTION public.branch_in_my_pharmacy(_branch_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.branches
    WHERE id = _branch_id
      AND pharmacy_id = public.get_my_pharmacy_id()
  )
$$;

CREATE OR REPLACE FUNCTION public.user_in_my_pharmacy(_user_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT public.get_user_pharmacy_id(_user_id) = public.get_my_pharmacy_id()
$$;

CREATE OR REPLACE FUNCTION public.supplier_in_my_pharmacy(_supplier_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.suppliers
    WHERE id = _supplier_id
      AND pharmacy_id = public.get_my_pharmacy_id()
  )
$$;

CREATE OR REPLACE FUNCTION public.customer_in_my_pharmacy(_customer_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.customers
    WHERE id = _customer_id
      AND pharmacy_id = public.get_my_pharmacy_id()
  )
$$;

CREATE OR REPLACE FUNCTION public.sale_in_my_pharmacy(_sale_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.sales
    WHERE id = _sale_id
      AND public.branch_in_my_pharmacy(branch_id)
  )
$$;

CREATE OR REPLACE FUNCTION public.purchase_order_in_my_pharmacy(_purchase_order_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.purchase_orders
    WHERE id = _purchase_order_id
      AND public.branch_in_my_pharmacy(branch_id)
  )
$$;

CREATE OR REPLACE FUNCTION public.sales_return_in_my_pharmacy(_sales_return_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.sales_returns
    WHERE id = _sales_return_id
      AND public.branch_in_my_pharmacy(branch_id)
  )
$$;

ALTER TABLE public.profiles ALTER COLUMN pharmacy_id SET NOT NULL;
ALTER TABLE public.user_roles ALTER COLUMN pharmacy_id SET NOT NULL;
ALTER TABLE public.branches ALTER COLUMN pharmacy_id SET NOT NULL;
ALTER TABLE public.pharmacy_settings ALTER COLUMN pharmacy_id SET NOT NULL;
ALTER TABLE public.suppliers ALTER COLUMN pharmacy_id SET NOT NULL;
ALTER TABLE public.customers ALTER COLUMN pharmacy_id SET NOT NULL;
ALTER TABLE public.activity_logs ALTER COLUMN pharmacy_id SET NOT NULL;
ALTER TABLE public.expenses ALTER COLUMN pharmacy_id SET NOT NULL;

ALTER TABLE public.branches ALTER COLUMN pharmacy_id SET DEFAULT public.get_my_pharmacy_id();
ALTER TABLE public.pharmacy_settings ALTER COLUMN pharmacy_id SET DEFAULT public.get_my_pharmacy_id();
ALTER TABLE public.suppliers ALTER COLUMN pharmacy_id SET DEFAULT public.get_my_pharmacy_id();
ALTER TABLE public.customers ALTER COLUMN pharmacy_id SET DEFAULT public.get_my_pharmacy_id();
ALTER TABLE public.activity_logs ALTER COLUMN pharmacy_id SET DEFAULT public.get_my_pharmacy_id();
ALTER TABLE public.expenses ALTER COLUMN pharmacy_id SET DEFAULT public.get_my_pharmacy_id();

CREATE INDEX IF NOT EXISTS idx_profiles_pharmacy ON public.profiles(pharmacy_id);
CREATE INDEX IF NOT EXISTS idx_user_roles_pharmacy ON public.user_roles(pharmacy_id);
CREATE INDEX IF NOT EXISTS idx_branches_pharmacy ON public.branches(pharmacy_id);
CREATE INDEX IF NOT EXISTS idx_pharmacy_settings_pharmacy ON public.pharmacy_settings(pharmacy_id);
CREATE INDEX IF NOT EXISTS idx_suppliers_pharmacy ON public.suppliers(pharmacy_id);
CREATE INDEX IF NOT EXISTS idx_customers_pharmacy ON public.customers(pharmacy_id);
CREATE INDEX IF NOT EXISTS idx_activity_logs_pharmacy ON public.activity_logs(pharmacy_id);
CREATE INDEX IF NOT EXISTS idx_expenses_pharmacy ON public.expenses(pharmacy_id);

CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role app_role)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = _user_id
      AND role = _role
      AND pharmacy_id = public.get_user_pharmacy_id(_user_id)
  )
$$;

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
DECLARE
  new_pharmacy_id UUID;
  default_branch_id UUID;
  new_pharmacy_name TEXT;
BEGIN
  new_pharmacy_name := COALESCE(NULLIF(NEW.raw_user_meta_data->>'pharmacy_name', ''), 'Medi Inventory');

  INSERT INTO public.pharmacies (name, owner_id)
  VALUES (new_pharmacy_name, NEW.id)
  RETURNING id INTO new_pharmacy_id;

  INSERT INTO public.profiles (user_id, full_name, email, pharmacy_id)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'full_name', ''),
    NEW.email,
    new_pharmacy_id
  );

  INSERT INTO public.user_roles (user_id, role, pharmacy_id)
  VALUES (NEW.id, 'admin', new_pharmacy_id);

  INSERT INTO public.branches (name, pharmacy_id)
  VALUES ('Main Branch', new_pharmacy_id)
  RETURNING id INTO default_branch_id;

  INSERT INTO public.branch_users (branch_id, user_id)
  VALUES (default_branch_id, NEW.id);

  INSERT INTO public.pharmacy_settings (name, tagline, pharmacy_id)
  VALUES (new_pharmacy_name, 'Your Trusted Health Partner', new_pharmacy_id);

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

DROP POLICY IF EXISTS "Users can view own pharmacy" ON public.pharmacies;
DROP POLICY IF EXISTS "Admins can update own pharmacy" ON public.pharmacies;
DROP POLICY IF EXISTS "Authenticated can insert own pharmacy" ON public.pharmacies;

CREATE POLICY "Users can view own pharmacy"
  ON public.pharmacies FOR SELECT TO authenticated
  USING (id = public.get_my_pharmacy_id());

CREATE POLICY "Admins can update own pharmacy"
  ON public.pharmacies FOR UPDATE TO authenticated
  USING (id = public.get_my_pharmacy_id() AND public.has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (id = public.get_my_pharmacy_id());

CREATE POLICY "Authenticated can insert own pharmacy"
  ON public.pharmacies FOR INSERT TO authenticated
  WITH CHECK (owner_id = auth.uid());

DROP POLICY IF EXISTS "Users can view all profiles" ON public.profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can insert own profile" ON public.profiles;

CREATE POLICY "Users can view pharmacy profiles"
  ON public.profiles FOR SELECT TO authenticated
  USING (pharmacy_id = public.get_my_pharmacy_id());

CREATE POLICY "Users can update own profile"
  ON public.profiles FOR UPDATE TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id AND pharmacy_id = public.get_my_pharmacy_id());

CREATE POLICY "Users can insert own profile"
  ON public.profiles FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id AND pharmacy_id = public.get_my_pharmacy_id());

DROP POLICY IF EXISTS "Authenticated users can view roles" ON public.user_roles;
DROP POLICY IF EXISTS "Admins can insert roles" ON public.user_roles;
DROP POLICY IF EXISTS "Admins can update roles" ON public.user_roles;
DROP POLICY IF EXISTS "Admins can delete roles" ON public.user_roles;

CREATE POLICY "Authenticated users can view pharmacy roles"
  ON public.user_roles FOR SELECT TO authenticated
  USING (pharmacy_id = public.get_my_pharmacy_id());

CREATE POLICY "Admins can insert roles"
  ON public.user_roles FOR INSERT TO authenticated
  WITH CHECK (public.has_role(auth.uid(), 'admin'::app_role) AND pharmacy_id = public.get_my_pharmacy_id());

CREATE POLICY "Admins can update roles"
  ON public.user_roles FOR UPDATE TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::app_role) AND pharmacy_id = public.get_my_pharmacy_id())
  WITH CHECK (pharmacy_id = public.get_my_pharmacy_id());

CREATE POLICY "Admins can delete roles"
  ON public.user_roles FOR DELETE TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::app_role) AND pharmacy_id = public.get_my_pharmacy_id());

DROP POLICY IF EXISTS "Authenticated can view branches" ON public.branches;
DROP POLICY IF EXISTS "Admins can insert branches" ON public.branches;
DROP POLICY IF EXISTS "Admins can update branches" ON public.branches;
DROP POLICY IF EXISTS "Admins can delete branches" ON public.branches;

CREATE POLICY "Authenticated can view pharmacy branches"
  ON public.branches FOR SELECT TO authenticated
  USING (pharmacy_id = public.get_my_pharmacy_id());

CREATE POLICY "Admins can insert branches"
  ON public.branches FOR INSERT TO authenticated
  WITH CHECK (public.has_role(auth.uid(), 'admin'::app_role) AND pharmacy_id = public.get_my_pharmacy_id());

CREATE POLICY "Admins can update branches"
  ON public.branches FOR UPDATE TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::app_role) AND pharmacy_id = public.get_my_pharmacy_id())
  WITH CHECK (pharmacy_id = public.get_my_pharmacy_id());

CREATE POLICY "Admins can delete branches"
  ON public.branches FOR DELETE TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::app_role) AND pharmacy_id = public.get_my_pharmacy_id());

DROP POLICY IF EXISTS "Authenticated can view branch_users" ON public.branch_users;
DROP POLICY IF EXISTS "Admins can insert branch_users" ON public.branch_users;
DROP POLICY IF EXISTS "Admins can update branch_users" ON public.branch_users;
DROP POLICY IF EXISTS "Admins can delete branch_users" ON public.branch_users;

CREATE POLICY "Authenticated can view pharmacy branch_users"
  ON public.branch_users FOR SELECT TO authenticated
  USING (public.branch_in_my_pharmacy(branch_id));

CREATE POLICY "Admins can insert branch_users"
  ON public.branch_users FOR INSERT TO authenticated
  WITH CHECK (
    public.has_role(auth.uid(), 'admin'::app_role)
    AND public.branch_in_my_pharmacy(branch_id)
    AND public.user_in_my_pharmacy(user_id)
  );

CREATE POLICY "Admins can update branch_users"
  ON public.branch_users FOR UPDATE TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::app_role) AND public.branch_in_my_pharmacy(branch_id))
  WITH CHECK (public.branch_in_my_pharmacy(branch_id) AND public.user_in_my_pharmacy(user_id));

CREATE POLICY "Admins can delete branch_users"
  ON public.branch_users FOR DELETE TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::app_role) AND public.branch_in_my_pharmacy(branch_id));

DROP POLICY IF EXISTS "Authenticated can view medicines" ON public.medicines;
DROP POLICY IF EXISTS "Admins can insert medicines" ON public.medicines;
DROP POLICY IF EXISTS "Admins can update medicines" ON public.medicines;
DROP POLICY IF EXISTS "Admins can delete medicines" ON public.medicines;
DROP POLICY IF EXISTS "Branch users can update stock" ON public.medicines;

CREATE POLICY "Authenticated can view medicines"
  ON public.medicines FOR SELECT TO authenticated
  USING (public.branch_in_my_pharmacy(branch_id));

CREATE POLICY "Admins can insert medicines"
  ON public.medicines FOR INSERT TO authenticated
  WITH CHECK (public.has_role(auth.uid(), 'admin'::app_role) AND public.branch_in_my_pharmacy(branch_id));

CREATE POLICY "Admins can update medicines"
  ON public.medicines FOR UPDATE TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::app_role) AND public.branch_in_my_pharmacy(branch_id))
  WITH CHECK (public.branch_in_my_pharmacy(branch_id));

CREATE POLICY "Admins can delete medicines"
  ON public.medicines FOR DELETE TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::app_role) AND public.branch_in_my_pharmacy(branch_id));

CREATE POLICY "Branch users can update stock"
  ON public.medicines FOR UPDATE TO authenticated
  USING (
    public.branch_in_my_pharmacy(branch_id)
    AND EXISTS (
      SELECT 1 FROM public.branch_users
      WHERE branch_users.branch_id = medicines.branch_id
        AND branch_users.user_id = auth.uid()
    )
  )
  WITH CHECK (public.branch_in_my_pharmacy(branch_id));

DROP POLICY IF EXISTS "Authenticated can view transfers" ON public.stock_transfers;
DROP POLICY IF EXISTS "Authenticated can create transfers" ON public.stock_transfers;
DROP POLICY IF EXISTS "Admins can update transfers" ON public.stock_transfers;

CREATE POLICY "Authenticated can view transfers"
  ON public.stock_transfers FOR SELECT TO authenticated
  USING (public.branch_in_my_pharmacy(from_branch_id) OR public.branch_in_my_pharmacy(to_branch_id));

CREATE POLICY "Authenticated can create transfers"
  ON public.stock_transfers FOR INSERT TO authenticated
  WITH CHECK (
    auth.uid() = requested_by
    AND public.branch_in_my_pharmacy(from_branch_id)
    AND public.branch_in_my_pharmacy(to_branch_id)
  );

CREATE POLICY "Admins can update transfers"
  ON public.stock_transfers FOR UPDATE TO authenticated
  USING (
    public.has_role(auth.uid(), 'admin'::app_role)
    AND public.branch_in_my_pharmacy(from_branch_id)
    AND public.branch_in_my_pharmacy(to_branch_id)
  )
  WITH CHECK (public.branch_in_my_pharmacy(from_branch_id) AND public.branch_in_my_pharmacy(to_branch_id));

DROP POLICY IF EXISTS "Authenticated can view logs" ON public.activity_logs;
DROP POLICY IF EXISTS "Authenticated can insert logs" ON public.activity_logs;

CREATE POLICY "Authenticated can view logs"
  ON public.activity_logs FOR SELECT TO authenticated
  USING (pharmacy_id = public.get_my_pharmacy_id());

CREATE POLICY "Authenticated can insert logs"
  ON public.activity_logs FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id AND pharmacy_id = public.get_my_pharmacy_id());

DROP POLICY IF EXISTS "Authenticated can view sales" ON public.sales;
DROP POLICY IF EXISTS "Authenticated can insert sales" ON public.sales;
DROP POLICY IF EXISTS "Admins can delete sales" ON public.sales;

CREATE POLICY "Authenticated can view sales"
  ON public.sales FOR SELECT TO authenticated
  USING (public.branch_in_my_pharmacy(branch_id));

CREATE POLICY "Authenticated can insert sales"
  ON public.sales FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = sold_by AND public.branch_in_my_pharmacy(branch_id));

CREATE POLICY "Admins can delete sales"
  ON public.sales FOR DELETE TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::app_role) AND public.branch_in_my_pharmacy(branch_id));

DROP POLICY IF EXISTS "Authenticated can view sale_items" ON public.sale_items;
DROP POLICY IF EXISTS "Authenticated can insert sale_items" ON public.sale_items;

CREATE POLICY "Authenticated can view sale_items"
  ON public.sale_items FOR SELECT TO authenticated
  USING (public.sale_in_my_pharmacy(sale_id));

CREATE POLICY "Authenticated can insert sale_items"
  ON public.sale_items FOR INSERT TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.sales
      WHERE sales.id = sale_items.sale_id
        AND sales.sold_by = auth.uid()
        AND public.branch_in_my_pharmacy(sales.branch_id)
    )
  );

DROP POLICY IF EXISTS "Authenticated can view suppliers" ON public.suppliers;
DROP POLICY IF EXISTS "Admins can insert suppliers" ON public.suppliers;
DROP POLICY IF EXISTS "Admins can update suppliers" ON public.suppliers;
DROP POLICY IF EXISTS "Admins can delete suppliers" ON public.suppliers;

CREATE POLICY "Authenticated can view suppliers"
  ON public.suppliers FOR SELECT TO authenticated
  USING (pharmacy_id = public.get_my_pharmacy_id());

CREATE POLICY "Admins can insert suppliers"
  ON public.suppliers FOR INSERT TO authenticated
  WITH CHECK (public.has_role(auth.uid(), 'admin'::app_role) AND pharmacy_id = public.get_my_pharmacy_id());

CREATE POLICY "Admins can update suppliers"
  ON public.suppliers FOR UPDATE TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::app_role) AND pharmacy_id = public.get_my_pharmacy_id())
  WITH CHECK (pharmacy_id = public.get_my_pharmacy_id());

CREATE POLICY "Admins can delete suppliers"
  ON public.suppliers FOR DELETE TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::app_role) AND pharmacy_id = public.get_my_pharmacy_id());

DROP POLICY IF EXISTS "Authenticated can view purchase_orders" ON public.purchase_orders;
DROP POLICY IF EXISTS "Authenticated can insert purchase_orders" ON public.purchase_orders;
DROP POLICY IF EXISTS "Admins can update purchase_orders" ON public.purchase_orders;
DROP POLICY IF EXISTS "Admins can delete purchase_orders" ON public.purchase_orders;

CREATE POLICY "Authenticated can view purchase_orders"
  ON public.purchase_orders FOR SELECT TO authenticated
  USING (public.branch_in_my_pharmacy(branch_id));

CREATE POLICY "Authenticated can insert purchase_orders"
  ON public.purchase_orders FOR INSERT TO authenticated
  WITH CHECK (
    auth.uid() = created_by
    AND public.branch_in_my_pharmacy(branch_id)
    AND public.supplier_in_my_pharmacy(supplier_id)
  );

CREATE POLICY "Admins can update purchase_orders"
  ON public.purchase_orders FOR UPDATE TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::app_role) AND public.branch_in_my_pharmacy(branch_id))
  WITH CHECK (public.branch_in_my_pharmacy(branch_id) AND public.supplier_in_my_pharmacy(supplier_id));

CREATE POLICY "Admins can delete purchase_orders"
  ON public.purchase_orders FOR DELETE TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::app_role) AND public.branch_in_my_pharmacy(branch_id));

DROP POLICY IF EXISTS "Authenticated can view purchase_items" ON public.purchase_items;
DROP POLICY IF EXISTS "Authenticated can insert purchase_items" ON public.purchase_items;
DROP POLICY IF EXISTS "Admins can update purchase_items" ON public.purchase_items;
DROP POLICY IF EXISTS "Admins can delete purchase_items" ON public.purchase_items;

CREATE POLICY "Authenticated can view purchase_items"
  ON public.purchase_items FOR SELECT TO authenticated
  USING (public.purchase_order_in_my_pharmacy(purchase_order_id));

CREATE POLICY "Authenticated can insert purchase_items"
  ON public.purchase_items FOR INSERT TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.purchase_orders po
      WHERE po.id = purchase_order_id
        AND po.created_by = auth.uid()
        AND public.branch_in_my_pharmacy(po.branch_id)
    )
  );

CREATE POLICY "Admins can update purchase_items"
  ON public.purchase_items FOR UPDATE TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::app_role) AND public.purchase_order_in_my_pharmacy(purchase_order_id))
  WITH CHECK (public.purchase_order_in_my_pharmacy(purchase_order_id));

CREATE POLICY "Admins can delete purchase_items"
  ON public.purchase_items FOR DELETE TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::app_role) AND public.purchase_order_in_my_pharmacy(purchase_order_id));

DROP POLICY IF EXISTS "Authenticated can view sales_returns" ON public.sales_returns;
DROP POLICY IF EXISTS "Authenticated can insert sales_returns" ON public.sales_returns;
DROP POLICY IF EXISTS "Admins can update sales_returns" ON public.sales_returns;

CREATE POLICY "Authenticated can view sales_returns"
  ON public.sales_returns FOR SELECT TO authenticated
  USING (public.branch_in_my_pharmacy(branch_id));

CREATE POLICY "Authenticated can insert sales_returns"
  ON public.sales_returns FOR INSERT TO authenticated
  WITH CHECK (
    auth.uid() = created_by
    AND public.branch_in_my_pharmacy(branch_id)
    AND public.sale_in_my_pharmacy(sale_id)
  );

CREATE POLICY "Admins can update sales_returns"
  ON public.sales_returns FOR UPDATE TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::app_role) AND public.branch_in_my_pharmacy(branch_id))
  WITH CHECK (public.branch_in_my_pharmacy(branch_id) AND public.sale_in_my_pharmacy(sale_id));

DROP POLICY IF EXISTS "Authenticated can view sales_return_items" ON public.sales_return_items;
DROP POLICY IF EXISTS "Authenticated can insert sales_return_items" ON public.sales_return_items;

CREATE POLICY "Authenticated can view sales_return_items"
  ON public.sales_return_items FOR SELECT TO authenticated
  USING (public.sales_return_in_my_pharmacy(sales_return_id));

CREATE POLICY "Authenticated can insert sales_return_items"
  ON public.sales_return_items FOR INSERT TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.sales_returns sr
      WHERE sr.id = sales_return_id
        AND sr.created_by = auth.uid()
        AND public.branch_in_my_pharmacy(sr.branch_id)
    )
  );

DROP POLICY IF EXISTS "Authenticated can view credit_notes" ON public.credit_notes;
DROP POLICY IF EXISTS "Authenticated can insert credit_notes" ON public.credit_notes;

CREATE POLICY "Authenticated can view credit_notes"
  ON public.credit_notes FOR SELECT TO authenticated
  USING (public.branch_in_my_pharmacy(branch_id));

CREATE POLICY "Authenticated can insert credit_notes"
  ON public.credit_notes FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = created_by AND public.branch_in_my_pharmacy(branch_id));

DROP POLICY IF EXISTS "Authenticated can view customers" ON public.customers;
DROP POLICY IF EXISTS "Authenticated can insert customers" ON public.customers;
DROP POLICY IF EXISTS "Admins can update customers" ON public.customers;
DROP POLICY IF EXISTS "Admins can delete customers" ON public.customers;

CREATE POLICY "Authenticated can view customers"
  ON public.customers FOR SELECT TO authenticated
  USING (pharmacy_id = public.get_my_pharmacy_id());

CREATE POLICY "Authenticated can insert customers"
  ON public.customers FOR INSERT TO authenticated
  WITH CHECK (pharmacy_id = public.get_my_pharmacy_id());

CREATE POLICY "Admins can update customers"
  ON public.customers FOR UPDATE TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::app_role) AND pharmacy_id = public.get_my_pharmacy_id())
  WITH CHECK (pharmacy_id = public.get_my_pharmacy_id());

CREATE POLICY "Admins can delete customers"
  ON public.customers FOR DELETE TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::app_role) AND pharmacy_id = public.get_my_pharmacy_id());

DROP POLICY IF EXISTS "Authenticated can view expenses" ON public.expenses;
DROP POLICY IF EXISTS "Authenticated can insert expenses" ON public.expenses;
DROP POLICY IF EXISTS "Admins can update expenses" ON public.expenses;
DROP POLICY IF EXISTS "Admins can delete expenses" ON public.expenses;

CREATE POLICY "Authenticated can view expenses"
  ON public.expenses FOR SELECT TO authenticated
  USING (pharmacy_id = public.get_my_pharmacy_id());

CREATE POLICY "Authenticated can insert expenses"
  ON public.expenses FOR INSERT TO authenticated
  WITH CHECK (
    auth.uid() = created_by
    AND pharmacy_id = public.get_my_pharmacy_id()
    AND (branch_id IS NULL OR public.branch_in_my_pharmacy(branch_id))
  );

CREATE POLICY "Admins can update expenses"
  ON public.expenses FOR UPDATE TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::app_role) AND pharmacy_id = public.get_my_pharmacy_id())
  WITH CHECK (pharmacy_id = public.get_my_pharmacy_id() AND (branch_id IS NULL OR public.branch_in_my_pharmacy(branch_id)));

CREATE POLICY "Admins can delete expenses"
  ON public.expenses FOR DELETE TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::app_role) AND pharmacy_id = public.get_my_pharmacy_id());

DROP POLICY IF EXISTS "Authenticated can view customer_payments" ON public.customer_payments;
DROP POLICY IF EXISTS "Authenticated can insert customer_payments" ON public.customer_payments;
DROP POLICY IF EXISTS "Admins can delete customer_payments" ON public.customer_payments;

CREATE POLICY "Authenticated can view customer_payments"
  ON public.customer_payments FOR SELECT TO authenticated
  USING (public.customer_in_my_pharmacy(customer_id));

CREATE POLICY "Authenticated can insert customer_payments"
  ON public.customer_payments FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = created_by AND public.customer_in_my_pharmacy(customer_id));

CREATE POLICY "Admins can delete customer_payments"
  ON public.customer_payments FOR DELETE TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::app_role) AND public.customer_in_my_pharmacy(customer_id));

DROP POLICY IF EXISTS "Authenticated can view pharmacy_settings" ON public.pharmacy_settings;
DROP POLICY IF EXISTS "Admins can insert pharmacy_settings" ON public.pharmacy_settings;
DROP POLICY IF EXISTS "Admins can update pharmacy_settings" ON public.pharmacy_settings;

CREATE POLICY "Authenticated can view pharmacy_settings"
  ON public.pharmacy_settings FOR SELECT TO authenticated
  USING (pharmacy_id = public.get_my_pharmacy_id());

CREATE POLICY "Admins can insert pharmacy_settings"
  ON public.pharmacy_settings FOR INSERT TO authenticated
  WITH CHECK (public.has_role(auth.uid(), 'admin'::app_role) AND pharmacy_id = public.get_my_pharmacy_id());

CREATE POLICY "Admins can update pharmacy_settings"
  ON public.pharmacy_settings FOR UPDATE TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::app_role) AND pharmacy_id = public.get_my_pharmacy_id())
  WITH CHECK (pharmacy_id = public.get_my_pharmacy_id());
