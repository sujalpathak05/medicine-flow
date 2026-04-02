import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Plus, Loader2, PackagePlus, Trash2, ClipboardCheck } from "lucide-react";
import { toast } from "sonner";

interface PurchaseItem {
  medicine_name: string;
  batch_number: string;
  expiry_date: string;
  quantity: number;
  unit_price: number;
  gst_rate: number;
  total_price: number;
}

export default function PurchasePage() {
  const { user, role } = useAuth();
  const isAdmin = role === "admin";
  const [suppliers, setSuppliers] = useState<any[]>([]);
  const [branches, setBranches] = useState<any[]>([]);
  const [orders, setOrders] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [saving, setSaving] = useState(false);

  const [form, setForm] = useState({
    supplier_id: "", branch_id: "", notes: "",
  });
  const [items, setItems] = useState<PurchaseItem[]>([{
    medicine_name: "", batch_number: "", expiry_date: "", quantity: 0, unit_price: 0, gst_rate: 12, total_price: 0,
  }]);

  const fetchData = async () => {
    const [{ data: s }, { data: b }, { data: o }] = await Promise.all([
      supabase.from("suppliers").select("*").eq("is_active", true) as any,
      supabase.from("branches").select("*").eq("is_active", true),
      supabase.from("purchase_orders").select("*, suppliers(name), branches(name)").order("created_at", { ascending: false }) as any,
    ]);
    setSuppliers(s ?? []);
    setBranches(b ?? []);
    setOrders(o ?? []);
    setLoading(false);
  };

  useEffect(() => { fetchData(); }, []);

  const addItem = () => setItems([...items, { medicine_name: "", batch_number: "", expiry_date: "", quantity: 0, unit_price: 0, gst_rate: 12, total_price: 0 }]);
  const removeItem = (i: number) => setItems(items.filter((_, idx) => idx !== i));

  const updateItem = (index: number, field: string, value: any) => {
    const updated = [...items];
    (updated[index] as any)[field] = value;
    const item = updated[index];
    const base = item.quantity * item.unit_price;
    item.total_price = base + (base * item.gst_rate / 100);
    setItems(updated);
  };

  const totalAmount = items.reduce((s, i) => s + (i.quantity * i.unit_price), 0);
  const gstAmount = items.reduce((s, i) => s + (i.quantity * i.unit_price * i.gst_rate / 100), 0);
  const netAmount = totalAmount + gstAmount;

  const handleSave = async () => {
    if (!form.supplier_id || !form.branch_id || items.length === 0) {
      toast.error("Supplier, branch और कम से कम 1 item required है");
      return;
    }
    if (items.some(i => !i.medicine_name || i.quantity <= 0)) {
      toast.error("सभी items में name और quantity भरें");
      return;
    }
    setSaving(true);
    const orderNumber = `PO-${Date.now()}`;
    const { data: order, error } = await supabase.from("purchase_orders").insert({
      order_number: orderNumber,
      supplier_id: form.supplier_id,
      branch_id: form.branch_id,
      total_amount: totalAmount,
      gst_amount: gstAmount,
      net_amount: netAmount,
      notes: form.notes,
      created_by: user!.id,
      status: "draft",
    } as any).select().single();

    if (error) { toast.error(error.message); setSaving(false); return; }

    const purchaseItems = items.map(i => ({
      purchase_order_id: (order as any).id,
      medicine_name: i.medicine_name,
      batch_number: i.batch_number,
      expiry_date: i.expiry_date || null,
      quantity: i.quantity,
      unit_price: i.unit_price,
      gst_rate: i.gst_rate,
      total_price: i.total_price,
    }));

    const { error: itemsErr } = await supabase.from("purchase_items").insert(purchaseItems as any);
    if (itemsErr) toast.error(itemsErr.message);
    else {
      toast.success(`Purchase Order ${orderNumber} created!`);
      await supabase.from("activity_logs").insert({
        user_id: user!.id, action: "Created purchase order: " + orderNumber,
        entity_type: "purchase_order", entity_id: (order as any).id,
      });
    }

    setSaving(false);
    setDialogOpen(false);
    setForm({ supplier_id: "", branch_id: "", notes: "" });
    setItems([{ medicine_name: "", batch_number: "", expiry_date: "", quantity: 0, unit_price: 0, gst_rate: 12, total_price: 0 }]);
    fetchData();
  };

  const handleReceive = async (orderId: string) => {
    if (!isAdmin) return;
    const { error } = await supabase.from("purchase_orders").update({ status: "received", received_at: new Date().toISOString() } as any).eq("id", orderId);
    if (error) toast.error(error.message);
    else { toast.success("Order marked as received (GRN)"); fetchData(); }
  };

  const statusColor = (s: string) => {
    if (s === "draft") return "secondary";
    if (s === "received") return "default";
    return "outline";
  };

  return (
    <DashboardLayout>
      <div className="space-y-6 animate-fade-in">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-display font-bold flex items-center gap-2">
              <PackagePlus className="h-6 w-6 text-primary" /> Purchase & GRN
            </h1>
            <p className="text-sm text-muted-foreground">Purchase orders & goods receipt</p>
          </div>
          <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
            <DialogTrigger asChild>
              <Button><Plus className="h-4 w-4 mr-2" />New Purchase Order</Button>
            </DialogTrigger>
            <DialogContent className="max-w-3xl max-h-[90vh] overflow-auto">
              <DialogHeader>
                <DialogTitle>New Purchase Order</DialogTitle>
              </DialogHeader>
              <div className="grid gap-4 py-2">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Supplier *</Label>
                    <Select value={form.supplier_id} onValueChange={v => setForm({ ...form, supplier_id: v })}>
                      <SelectTrigger><SelectValue placeholder="Select supplier" /></SelectTrigger>
                      <SelectContent>{suppliers.map(s => <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>)}</SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>Branch *</Label>
                    <Select value={form.branch_id} onValueChange={v => setForm({ ...form, branch_id: v })}>
                      <SelectTrigger><SelectValue placeholder="Select branch" /></SelectTrigger>
                      <SelectContent>{branches.map(b => <SelectItem key={b.id} value={b.id}>{b.name}</SelectItem>)}</SelectContent>
                    </Select>
                  </div>
                </div>
                <div className="space-y-2"><Label>Notes</Label><Input value={form.notes} onChange={e => setForm({ ...form, notes: e.target.value })} /></div>

                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <Label className="text-base font-semibold">Items</Label>
                    <Button size="sm" variant="outline" onClick={addItem}><Plus className="h-3 w-3 mr-1" />Add Item</Button>
                  </div>
                  {items.map((item, i) => (
                    <Card key={i} className="p-3">
                      <div className="grid grid-cols-6 gap-2 items-end">
                        <div className="col-span-2 space-y-1">
                          <Label className="text-xs">Medicine Name *</Label>
                          <Input className="h-8 text-sm" value={item.medicine_name} onChange={e => updateItem(i, "medicine_name", e.target.value)} />
                        </div>
                        <div className="space-y-1">
                          <Label className="text-xs">Batch</Label>
                          <Input className="h-8 text-sm" value={item.batch_number} onChange={e => updateItem(i, "batch_number", e.target.value)} />
                        </div>
                        <div className="space-y-1">
                          <Label className="text-xs">Expiry</Label>
                          <Input type="date" className="h-8 text-sm" value={item.expiry_date} onChange={e => updateItem(i, "expiry_date", e.target.value)} />
                        </div>
                        <div className="space-y-1">
                          <Label className="text-xs">Qty *</Label>
                          <Input type="number" className="h-8 text-sm" value={item.quantity} onChange={e => updateItem(i, "quantity", Number(e.target.value))} />
                        </div>
                        <div className="flex items-end gap-1">
                          <div className="flex-1 space-y-1">
                            <Label className="text-xs">Price</Label>
                            <Input type="number" step="0.01" className="h-8 text-sm" value={item.unit_price} onChange={e => updateItem(i, "unit_price", Number(e.target.value))} />
                          </div>
                          {items.length > 1 && (
                            <Button size="icon" variant="ghost" className="h-8 w-8 text-destructive" onClick={() => removeItem(i)}><Trash2 className="h-3 w-3" /></Button>
                          )}
                        </div>
                      </div>
                      <div className="flex justify-between mt-1 text-xs text-muted-foreground">
                        <span>GST: {item.gst_rate}%</span>
                        <span>Total: ₹{item.total_price.toFixed(2)}</span>
                      </div>
                    </Card>
                  ))}
                </div>

                <div className="border-t pt-3 space-y-1 text-sm">
                  <div className="flex justify-between"><span>Subtotal</span><span>₹{totalAmount.toFixed(2)}</span></div>
                  <div className="flex justify-between"><span>GST</span><span>₹{gstAmount.toFixed(2)}</span></div>
                  <div className="flex justify-between font-bold text-lg"><span>Net Total</span><span className="text-primary">₹{netAmount.toFixed(2)}</span></div>
                </div>

                <Button onClick={handleSave} disabled={saving}>
                  {saving && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                  Create Purchase Order
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>

        <Card className="glass-card overflow-hidden">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Order #</TableHead>
                  <TableHead>Supplier</TableHead>
                  <TableHead>Branch</TableHead>
                  <TableHead className="text-right">Amount</TableHead>
                  <TableHead className="text-right">GST</TableHead>
                  <TableHead className="text-right">Net</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Date</TableHead>
                  {isAdmin && <TableHead className="text-right">Actions</TableHead>}
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading ? (
                  <TableRow><TableCell colSpan={9} className="text-center py-8"><Loader2 className="h-5 w-5 animate-spin mx-auto" /></TableCell></TableRow>
                ) : orders.length === 0 ? (
                  <TableRow><TableCell colSpan={9} className="text-center py-8 text-muted-foreground">No purchase orders</TableCell></TableRow>
                ) : orders.map((o: any) => (
                  <TableRow key={o.id}>
                    <TableCell className="font-mono text-sm">{o.order_number}</TableCell>
                    <TableCell>{o.suppliers?.name}</TableCell>
                    <TableCell>{o.branches?.name}</TableCell>
                    <TableCell className="text-right">₹{Number(o.total_amount).toFixed(2)}</TableCell>
                    <TableCell className="text-right">₹{Number(o.gst_amount).toFixed(2)}</TableCell>
                    <TableCell className="text-right font-semibold">₹{Number(o.net_amount).toFixed(2)}</TableCell>
                    <TableCell><Badge variant={statusColor(o.status) as any} className="capitalize">{o.status}</Badge></TableCell>
                    <TableCell className="text-sm">{new Date(o.created_at).toLocaleDateString("en-IN")}</TableCell>
                    {isAdmin && (
                      <TableCell className="text-right">
                        {o.status === "draft" && (
                          <Button size="sm" variant="outline" onClick={() => handleReceive(o.id)}>
                            <ClipboardCheck className="h-3 w-3 mr-1" />GRN
                          </Button>
                        )}
                      </TableCell>
                    )}
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </Card>
      </div>
    </DashboardLayout>
  );
}
