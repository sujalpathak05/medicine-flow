
-- Fix purchase_items insert policy
DROP POLICY IF EXISTS "Authenticated can insert purchase_items" ON public.purchase_items;
CREATE POLICY "Authenticated can insert purchase_items" ON public.purchase_items FOR INSERT TO authenticated 
WITH CHECK (EXISTS (
  SELECT 1 FROM public.purchase_orders po WHERE po.id = purchase_order_id AND po.created_by = auth.uid()
));

-- Fix sales_return_items insert policy
DROP POLICY IF EXISTS "Authenticated can insert sales_return_items" ON public.sales_return_items;
CREATE POLICY "Authenticated can insert sales_return_items" ON public.sales_return_items FOR INSERT TO authenticated 
WITH CHECK (EXISTS (
  SELECT 1 FROM public.sales_returns sr WHERE sr.id = sales_return_id AND sr.created_by = auth.uid()
));
