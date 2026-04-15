import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { useAuth } from "@/contexts/AuthContext";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus, Search, Users, IndianRupee, Loader2, CreditCard, History, Trash2 } from "lucide-react";
import { toast } from "sonner";

export default function CustomersPage() {
  const { user, role } = useAuth();
  const isAdmin = role === "admin";
  const [customers, setCustomers] = useState<any[]>([]);
  const [sales, setSales] = useState<any[]>([]);
  const [payments, setPayments] = useState<any[]>([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [paymentDialogOpen, setPaymentDialogOpen] = useState(false);
  const [historyDialogOpen, setHistoryDialogOpen] = useState(false);
  const [selectedCustomer, setSelectedCustomer] = useState<any>(null);
  const [form, setForm] = useState({ name: "", phone: "", email: "", address: "", notes: "" });
  const [paymentForm, setPaymentForm] = useState({ amount: "", payment_method: "cash", notes: "" });

  const fetchData = async () => {
    const [{ data: c }, { data: s }, { data: p }] = await Promise.all([
      supabase.from("customers").select("*").order("created_at", { ascending: false }),
      supabase.from("sales").select("id, invoice_number, customer_name, customer_id, net_amount, created_at, payment_method").order("created_at", { ascending: false }),
      supabase.from("customer_payments").select("*").order("created_at", { ascending: false }),
    ]);
    setCustomers(c ?? []);
    setSales(s ?? []);
    setPayments(p ?? []);
    setLoading(false);
  };

  useEffect(() => { fetchData(); }, []);

  const handleSaveCustomer = async () => {
    if (!form.name.trim()) { toast.error("Customer name is required"); return; }
    setSaving(true);
    const { error } = await supabase.from("customers").insert({ ...form });
    if (error) toast.error(error.message);
    else { toast.success("Customer added"); setDialogOpen(false); setForm({ name: "", phone: "", email: "", address: "", notes: "" }); fetchData(); }
    setSaving(false);
  };

  const handleDeleteCustomer = async (id: string) => {
    if (!confirm("Delete this customer?")) return;
    const { error } = await supabase.from("customers").delete().eq("id", id);
    if (error) toast.error(error.message);
    else { toast.success("Customer deleted"); fetchData(); }
  };

  const handlePayment = async () => {
    if (!selectedCustomer || !paymentForm.amount) return;
    setSaving(true);
    const amount = parseFloat(paymentForm.amount);
    const { error: payErr } = await supabase.from("customer_payments").insert({
      customer_id: selectedCustomer.id,
      amount,
      payment_method: paymentForm.payment_method,
      notes: paymentForm.notes,
      created_by: user!.id,
    });
    if (payErr) { toast.error(payErr.message); setSaving(false); return; }

    const newBalance = Number(selectedCustomer.credit_balance) - amount;
    await supabase.from("customers").update({ credit_balance: newBalance }).eq("id", selectedCustomer.id);
    toast.success(`₹${amount} payment recorded`);
    setPaymentDialogOpen(false);
    setPaymentForm({ amount: "", payment_method: "cash", notes: "" });
    fetchData();
    setSaving(false);
  };

  const openHistory = (customer: any) => {
    setSelectedCustomer(customer);
    setHistoryDialogOpen(true);
  };

  const openPayment = (customer: any) => {
    setSelectedCustomer(customer);
    setPaymentDialogOpen(true);
  };

  const filtered = customers.filter((c) =>
    c.name.toLowerCase().includes(search.toLowerCase()) || c.phone?.includes(search)
  );

  const totalCredit = customers.reduce((s, c) => s + Number(c.credit_balance), 0);
  const customerSales = selectedCustomer ? sales.filter((s) => s.customer_id === selectedCustomer.id || (s.customer_name && s.customer_name === selectedCustomer.name)) : [];
  const customerPayments = selectedCustomer ? payments.filter((p) => p.customer_id === selectedCustomer.id) : [];

  if (loading) return <DashboardLayout><div className="flex items-center justify-center h-64"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div></DashboardLayout>;

  return (
    <DashboardLayout>
      <div className="space-y-6 animate-fade-in">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-display font-bold flex items-center gap-2">
              <Users className="h-6 w-6 text-primary" /> Customers
            </h1>
            <p className="text-sm text-muted-foreground">Manage customers, credit & purchase history</p>
          </div>
          <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
            <DialogTrigger asChild>
              <Button><Plus className="h-4 w-4 mr-2" /> Add Customer</Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader><DialogTitle>Add New Customer</DialogTitle></DialogHeader>
              <div className="space-y-3">
                <div><Label>Name *</Label><Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} /></div>
                <div><Label>Phone</Label><Input value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} /></div>
                <div><Label>Email</Label><Input value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} /></div>
                <div><Label>Address</Label><Input value={form.address} onChange={(e) => setForm({ ...form, address: e.target.value })} /></div>
                <div><Label>Notes</Label><Input value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} /></div>
                <Button className="w-full" onClick={handleSaveCustomer} disabled={saving}>
                  {saving ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null} Save Customer
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>

        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <Card className="glass-card"><CardContent className="p-4">
            <p className="text-xs text-muted-foreground">Total Customers</p>
            <p className="text-xl font-bold">{customers.length}</p>
          </CardContent></Card>
          <Card className="glass-card"><CardContent className="p-4">
            <p className="text-xs text-muted-foreground">Total Credit (Udhaar)</p>
            <p className="text-xl font-bold text-warning">₹{totalCredit.toLocaleString("en-IN", { minimumFractionDigits: 2 })}</p>
          </CardContent></Card>
          <Card className="glass-card"><CardContent className="p-4">
            <p className="text-xs text-muted-foreground">With Credit</p>
            <p className="text-xl font-bold text-destructive">{customers.filter(c => Number(c.credit_balance) > 0).length}</p>
          </CardContent></Card>
          <Card className="glass-card"><CardContent className="p-4">
            <p className="text-xs text-muted-foreground">Total Payments</p>
            <p className="text-xl font-bold text-primary">{payments.length}</p>
          </CardContent></Card>
        </div>

        <div className="relative max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input placeholder="Search by name or phone..." className="pl-9" value={search} onChange={(e) => setSearch(e.target.value)} />
        </div>

        <Card className="glass-card">
          <CardContent className="p-0">
            <Table>
              <TableHeader><TableRow>
                <TableHead>Name</TableHead><TableHead>Phone</TableHead><TableHead>Email</TableHead>
                <TableHead className="text-right">Credit (₹)</TableHead><TableHead>Actions</TableHead>
              </TableRow></TableHeader>
              <TableBody>
                {filtered.map((c) => (
                  <TableRow key={c.id}>
                    <TableCell className="font-medium">{c.name}</TableCell>
                    <TableCell>{c.phone || "-"}</TableCell>
                    <TableCell>{c.email || "-"}</TableCell>
                    <TableCell className="text-right">
                      {Number(c.credit_balance) > 0 ? (
                        <Badge variant="destructive">₹{Number(c.credit_balance).toLocaleString("en-IN", { minimumFractionDigits: 2 })}</Badge>
                      ) : (
                        <span className="text-muted-foreground">₹0.00</span>
                      )}
                    </TableCell>
                    <TableCell>
                      <div className="flex gap-1">
                        <Button size="sm" variant="outline" onClick={() => openHistory(c)}><History className="h-3 w-3" /></Button>
                        <Button size="sm" variant="outline" onClick={() => openPayment(c)}><CreditCard className="h-3 w-3" /></Button>
                        {isAdmin && <Button size="sm" variant="ghost" className="text-destructive" onClick={() => handleDeleteCustomer(c.id)}><Trash2 className="h-3 w-3" /></Button>}
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
                {filtered.length === 0 && <TableRow><TableCell colSpan={5} className="text-center text-muted-foreground py-8">No customers found</TableCell></TableRow>}
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        {/* History Dialog */}
        <Dialog open={historyDialogOpen} onOpenChange={setHistoryDialogOpen}>
          <DialogContent className="max-w-2xl max-h-[80vh] overflow-auto">
            <DialogHeader><DialogTitle>{selectedCustomer?.name} - History</DialogTitle></DialogHeader>
            <Tabs defaultValue="purchases">
              <TabsList><TabsTrigger value="purchases">Purchases</TabsTrigger><TabsTrigger value="payments">Payments</TabsTrigger></TabsList>
              <TabsContent value="purchases">
                <Table>
                  <TableHeader><TableRow>
                    <TableHead>Invoice</TableHead><TableHead className="text-right">Amount</TableHead><TableHead>Payment</TableHead><TableHead>Date</TableHead>
                  </TableRow></TableHeader>
                  <TableBody>
                    {customerSales.map((s) => (
                      <TableRow key={s.id}>
                        <TableCell className="font-mono text-sm">{s.invoice_number}</TableCell>
                        <TableCell className="text-right font-semibold">₹{Number(s.net_amount).toLocaleString("en-IN", { minimumFractionDigits: 2 })}</TableCell>
                        <TableCell><Badge variant="secondary">{s.payment_method}</Badge></TableCell>
                        <TableCell>{new Date(s.created_at).toLocaleDateString("en-IN")}</TableCell>
                      </TableRow>
                    ))}
                    {customerSales.length === 0 && <TableRow><TableCell colSpan={4} className="text-center text-muted-foreground">No purchases</TableCell></TableRow>}
                  </TableBody>
                </Table>
              </TabsContent>
              <TabsContent value="payments">
                <Table>
                  <TableHeader><TableRow>
                    <TableHead className="text-right">Amount</TableHead><TableHead>Method</TableHead><TableHead>Notes</TableHead><TableHead>Date</TableHead>
                  </TableRow></TableHeader>
                  <TableBody>
                    {customerPayments.map((p) => (
                      <TableRow key={p.id}>
                        <TableCell className="text-right font-semibold text-primary">₹{Number(p.amount).toLocaleString("en-IN", { minimumFractionDigits: 2 })}</TableCell>
                        <TableCell><Badge variant="secondary">{p.payment_method}</Badge></TableCell>
                        <TableCell>{p.notes || "-"}</TableCell>
                        <TableCell>{new Date(p.created_at).toLocaleDateString("en-IN")}</TableCell>
                      </TableRow>
                    ))}
                    {customerPayments.length === 0 && <TableRow><TableCell colSpan={4} className="text-center text-muted-foreground">No payments</TableCell></TableRow>}
                  </TableBody>
                </Table>
              </TabsContent>
            </Tabs>
          </DialogContent>
        </Dialog>

        {/* Payment Dialog */}
        <Dialog open={paymentDialogOpen} onOpenChange={setPaymentDialogOpen}>
          <DialogContent>
            <DialogHeader><DialogTitle>Record Payment - {selectedCustomer?.name}</DialogTitle></DialogHeader>
            <div className="space-y-3">
              <p className="text-sm text-muted-foreground">
                Current Credit: <span className="font-bold text-warning">₹{Number(selectedCustomer?.credit_balance || 0).toLocaleString("en-IN", { minimumFractionDigits: 2 })}</span>
              </p>
              <div><Label>Amount (₹)</Label><Input type="number" value={paymentForm.amount} onChange={(e) => setPaymentForm({ ...paymentForm, amount: e.target.value })} /></div>
              <div>
                <Label>Payment Method</Label>
                <Select value={paymentForm.payment_method} onValueChange={(v) => setPaymentForm({ ...paymentForm, payment_method: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="cash">Cash</SelectItem>
                    <SelectItem value="upi">UPI</SelectItem>
                    <SelectItem value="card">Card</SelectItem>
                    <SelectItem value="bank_transfer">Bank Transfer</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div><Label>Notes</Label><Input value={paymentForm.notes} onChange={(e) => setPaymentForm({ ...paymentForm, notes: e.target.value })} /></div>
              <Button className="w-full" onClick={handlePayment} disabled={saving}>
                {saving ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <IndianRupee className="h-4 w-4 mr-2" />} Record Payment
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </DashboardLayout>
  );
}
