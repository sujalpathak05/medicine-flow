
DROP POLICY "Authenticated can insert sale_items" ON public.sale_items;
CREATE POLICY "Authenticated can insert sale_items" ON public.sale_items FOR INSERT TO authenticated WITH CHECK (
  EXISTS (SELECT 1 FROM public.sales WHERE sales.id = sale_items.sale_id AND sales.sold_by = auth.uid())
);
