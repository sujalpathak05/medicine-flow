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
import { Textarea } from "@/components/ui/textarea";
import { Plus, Loader2, RotateCcw, CheckCircle } from "lucide-react";
import { toast } from "sonner";

export default function ReturnsPage() {
  const { user, role } = useAuth();
  const isAdmin = role === "admin";
  const [returns, setReturns] = useState<any[]>([]);
  const [sales, setSales] = useState<any[]>([]);
  const [saleItems, setSaleItems] = useState<any[]>([]);
  const [branches, setBranches] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [saving, setSaving] = useState(false);

  const [selectedSale, setSelectedSale] = useState("");
  const [reason, setReason] = useState("");
  const [returnItems, setReturnItems] = useState<{ medicine_id: string; medicine_name: string; quantity: number; unit_price: number; max_qty: number }[]>([]);

  const fetchData = async () => {
    const [{ data: r }, { data: s }, { data: b }] = await Promise.all([
      supabase.from("sales_returns").select("*, sales(invoice_number), branches(name)").order("created_at", { ascending: false }) as any,
      supabase.from("sales").select("id, invoice_number, branch_id").order("created_at", { ascending: false }),
      supabase.from("branches").select("*"),
    ]);
    setReturns(r ?? []);
    setSales(s ?? []);
    setBranches(b ?? []);
    setLoading(false);
  };

  useEffect(() => { fetchData(); }, []);

  const onSaleSelect = async (saleId: string) => {
    setSelectedSale(saleId);
    const { data } = await supabase.from("sale_items").select("*").eq("sale_id", saleId);
    setSaleItems(data ?? []);
    setReturnItems((data ?? []).map((i: any) => ({
      medicine_id: i.medicine_id,
      medicine_name: i.medicine_name,
      quantity: 0,
      unit_price: Number(i.unit_price),
      max_qty: i.quantity,
    })));
  };

  const updateReturnQty = (index: number, qty: number) => {
    const updated = [...returnItems];
    updated[index].quantity = Math.min(qty, updated[index].max_qty);
    setReturnItems(updated);
  };

  const handleSubmit = async () => {
    const validItems = returnItems.filter(i => i.quantity > 0);
    if (!selectedSale || validItems.length === 0) {
      toast.error("Sale select करें और return quantity डालें");
      return;
    }
    setSaving(true);
    const sale = sales.find(s => s.id === selectedSale);
    const totalAmount = validItems.reduce((s, i) => s + i.quantity * i.unit_price, 0);
    const returnNumber = `RET-${Date.now()}`;

    const { data: ret, error } = await supabase.from("sales_returns").insert({
      return_number: returnNumber,
      sale_id: selectedSale,
      branch_id: sale?.branch_id,
      reason,
      total_amount: totalAmount,
      status: "pending",
      created_by: user!.id,
    } as any).select().single();

    if (error) { toast.error(error.message); setSaving(false); return; }

    const items = validItems.map(i => ({
      sales_return_id: (ret as any).id,
      medicine_id: i.medicine_id,
      medicine_name: i.medicine_name,
      quantity: i.quantity,
      unit_price: i.unit_price,
      total_price: i.quantity * i.unit_price,
    }));

    await supabase.from("sales_return_items").insert(items as any);
    await supabase.from("activity_logs").insert({
      user_id: user!.id, action: "Created sales return: " + returnNumber,
      entity_type: "sales_return", entity_id: (ret as any).id,
    });

    toast.success(`Return ${returnNumber} created!`);
    setSaving(false);
    setDialogOpen(false);
    setSelectedSale("");
    setReason("");
    setReturnItems([]);
    fetchData();
  };

  const handleApprove = async (id: string) => {
    const { error } = await supabase.from("sales_returns").update({ status: "approved" } as any).eq("id", id);
    if (error) toast.error(error.message);
    else { toast.success("Return approved & credit note generated"); fetchData(); }
  };

  return (
    <DashboardLayout>
      <div className="space-y-6 animate-fade-in">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-display font-bold flex items-center gap-2">
              <RotateCcw className="h-6 w-6 text-primary" /> Sales Returns & Credit Notes
            </h1>
            <p className="text-sm text-muted-foreground">Manage returns and generate credit/debit notes</p>
          </div>
          <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
            <DialogTrigger asChild>
              <Button><Plus className="h-4 w-4 mr-2" />New Return</Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl max-h-[85vh] overflow-auto">
              <DialogHeader>
                <DialogTitle>New Sales Return</DialogTitle>
              </DialogHeader>
              <div className="grid gap-4 py-2">
                <div className="space-y-2">
                  <Label>Select Invoice *</Label>
                  <Select value={selectedSale} onValueChange={onSaleSelect}>
                    <SelectTrigger><SelectValue placeholder="Choose invoice" /></SelectTrigger>
                    <SelectContent>
                      {sales.map(s => <SelectItem key={s.id} value={s.id}>{s.invoice_number}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Reason</Label>
                  <Textarea value={reason} onChange={e => setReason(e.target.value)} placeholder="Return reason..." />
                </div>

                {returnItems.length > 0 && (
                  <div className="space-y-2">
                    <Label>Return Items (enter quantity to return)</Label>
                    {returnItems.map((item, i) => (
                      <div key={i} className="flex items-center gap-3 p-2 bg-muted/50 rounded">
                        <span className="flex-1 text-sm font-medium">{item.medicine_name}</span>
                        <span className="text-xs text-muted-foreground">Max: {item.max_qty}</span>
                        <Input type="number" className="w-20 h-8 text-sm" min={0} max={item.max_qty} value={item.quantity} onChange={e => updateReturnQty(i, Number(e.target.value))} />
                        <span className="text-sm">₹{(item.quantity * item.unit_price).toFixed(2)}</span>
                      </div>
                    ))}
                    <div className="text-right font-bold text-primary">
                      Total: ₹{returnItems.reduce((s, i) => s + i.quantity * i.unit_price, 0).toFixed(2)}
                    </div>
                  </div>
                )}

                <Button onClick={handleSubmit} disabled={saving}>
                  {saving && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                  Submit Return
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
                  <TableHead>Return #</TableHead>
                  <TableHead>Invoice</TableHead>
                  <TableHead>Branch</TableHead>
                  <TableHead>Reason</TableHead>
                  <TableHead className="text-right">Amount</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Date</TableHead>
                  {isAdmin && <TableHead className="text-right">Actions</TableHead>}
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading ? (
                  <TableRow><TableCell colSpan={8} className="text-center py-8"><Loader2 className="h-5 w-5 animate-spin mx-auto" /></TableCell></TableRow>
                ) : returns.length === 0 ? (
                  <TableRow><TableCell colSpan={8} className="text-center py-8 text-muted-foreground">No returns found</TableCell></TableRow>
                ) : returns.map((r: any) => (
                  <TableRow key={r.id}>
                    <TableCell className="font-mono text-sm">{r.return_number}</TableCell>
                    <TableCell>{r.sales?.invoice_number}</TableCell>
                    <TableCell>{r.branches?.name}</TableCell>
                    <TableCell className="text-sm max-w-[200px] truncate">{r.reason}</TableCell>
                    <TableCell className="text-right font-semibold">₹{Number(r.total_amount).toFixed(2)}</TableCell>
                    <TableCell>
                      <Badge variant={r.status === "approved" ? "default" : "secondary"} className="capitalize">{r.status}</Badge>
                    </TableCell>
                    <TableCell className="text-sm">{new Date(r.created_at).toLocaleDateString("en-IN")}</TableCell>
                    {isAdmin && (
                      <TableCell className="text-right">
                        {r.status === "pending" && (
                          <Button size="sm" variant="outline" onClick={() => handleApprove(r.id)}>
                            <CheckCircle className="h-3 w-3 mr-1" />Approve
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
