import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { useAuth } from "@/contexts/AuthContext";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, LineChart, Line } from "recharts";
import { FileBarChart, Loader2, TrendingUp, TrendingDown, AlertTriangle, Clock, IndianRupee, Plus } from "lucide-react";
import { toast } from "sonner";

const EXPENSE_CATEGORIES = ["rent", "salary", "electricity", "transport", "maintenance", "marketing", "general", "other"];

export default function ReportsPage() {
  const { user, role } = useAuth();
  const isAdmin = role === "admin";
  const [medicines, setMedicines] = useState<any[]>([]);
  const [sales, setSales] = useState<any[]>([]);
  const [saleItems, setSaleItems] = useState<any[]>([]);
  const [branches, setBranches] = useState<any[]>([]);
  const [purchaseOrders, setPurchaseOrders] = useState<any[]>([]);
  const [suppliers, setSuppliers] = useState<any[]>([]);
  const [customers, setCustomers] = useState<any[]>([]);
  const [expenses, setExpenses] = useState<any[]>([]);
  const [customerPayments, setCustomerPayments] = useState<any[]>([]);
  const [branchFilter, setBranchFilter] = useState("all");
  const [loading, setLoading] = useState(true);
  const [expenseDialogOpen, setExpenseDialogOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [expenseForm, setExpenseForm] = useState({ category: "general", amount: "", description: "", expense_date: new Date().toISOString().split("T")[0], branch_id: "", payment_method: "cash" });

  useEffect(() => {
    const fetch = async () => {
      const [{ data: m }, { data: s }, { data: si }, { data: b }, { data: po }, { data: sup }, { data: cust }, { data: exp }, { data: cp }] = await Promise.all([
        supabase.from("medicines").select("*"),
        supabase.from("sales").select("*").order("created_at", { ascending: false }),
        supabase.from("sale_items").select("*"),
        supabase.from("branches").select("*"),
        supabase.from("purchase_orders").select("*").order("created_at", { ascending: false }),
        supabase.from("suppliers").select("*"),
        supabase.from("customers").select("*"),
        supabase.from("expenses").select("*").order("expense_date", { ascending: false }),
        supabase.from("customer_payments").select("*").order("created_at", { ascending: false }),
      ]);
      setMedicines(m ?? []); setSales(s ?? []); setSaleItems(si ?? []);
      setBranches(b ?? []); setPurchaseOrders(po ?? []); setSuppliers(sup ?? []);
      setCustomers(cust ?? []); setExpenses(exp ?? []); setCustomerPayments(cp ?? []);
      setLoading(false);
    };
    fetch();
  }, []);

  const handleAddExpense = async () => {
    if (!expenseForm.amount || !expenseForm.branch_id) { toast.error("Amount and branch required"); return; }
    setSaving(true);
    const { error } = await supabase.from("expenses").insert({
      ...expenseForm,
      amount: parseFloat(expenseForm.amount),
      created_by: user!.id,
    });
    if (error) toast.error(error.message);
    else {
      toast.success("Expense added");
      setExpenseDialogOpen(false);
      setExpenseForm({ category: "general", amount: "", description: "", expense_date: new Date().toISOString().split("T")[0], branch_id: "", payment_method: "cash" });
      const { data } = await supabase.from("expenses").select("*").order("expense_date", { ascending: false });
      setExpenses(data ?? []);
    }
    setSaving(false);
  };

  if (loading) return <DashboardLayout><div className="flex items-center justify-center h-64"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div></DashboardLayout>;

  const filteredMeds = branchFilter === "all" ? medicines : medicines.filter(m => m.branch_id === branchFilter);
  const filteredSales = branchFilter === "all" ? sales : sales.filter(s => s.branch_id === branchFilter);
  const filteredExpenses = branchFilter === "all" ? expenses : expenses.filter(e => e.branch_id === branchFilter);
  const filteredPO = branchFilter === "all" ? purchaseOrders : purchaseOrders.filter(p => p.branch_id === branchFilter);

  const totalStock = filteredMeds.reduce((s, m) => s + m.quantity, 0);
  const totalValue = filteredMeds.reduce((s, m) => s + m.price * m.quantity, 0);
  const lowStock = filteredMeds.filter(m => m.quantity <= m.min_quantity);
  const totalSalesAmount = filteredSales.reduce((s, sale) => s + Number(sale.net_amount), 0);
  const totalDiscount = filteredSales.reduce((s, sale) => s + Number(sale.discount), 0);
  const totalExpenses = filteredExpenses.reduce((s, e) => s + Number(e.amount), 0);

  // Sales trend
  const salesByDay: Record<string, number> = {};
  filteredSales.forEach(s => {
    const day = new Date(s.created_at).toLocaleDateString("en-IN", { day: "2-digit", month: "short" });
    salesByDay[day] = (salesByDay[day] || 0) + Number(s.net_amount);
  });
  const salesTrend = Object.entries(salesByDay).slice(-30).map(([day, amount]) => ({ day, amount }));

  // Fast/Slow moving
  const medicineSales: Record<string, { name: string; sold: number }> = {};
  saleItems.forEach(si => {
    if (!medicineSales[si.medicine_id]) medicineSales[si.medicine_id] = { name: si.medicine_name, sold: 0 };
    medicineSales[si.medicine_id].sold += si.quantity;
  });
  const sorted = Object.values(medicineSales).sort((a, b) => b.sold - a.sold);
  const fastMoving = sorted.slice(0, 10);
  const slowMoving = sorted.slice(-10).reverse();

  // Expiry
  const now = new Date();
  const expired = filteredMeds.filter(m => new Date(m.expiry_date) < now);
  const expiring30 = filteredMeds.filter(m => { const exp = new Date(m.expiry_date); return exp >= now && exp <= new Date(now.getTime() + 30 * 86400000); });
  const expiring90 = filteredMeds.filter(m => { const exp = new Date(m.expiry_date); return exp >= now && exp <= new Date(now.getTime() + 90 * 86400000); });

  // GST data
  const totalGST = filteredSales.reduce((s, sale) => s + Number(sale.gst_amount || 0), 0);
  const totalCGST = filteredSales.reduce((s, sale) => s + Number(sale.cgst || 0), 0);
  const totalSGST = filteredSales.reduce((s, sale) => s + Number(sale.sgst || 0), 0);
  const totalIGST = filteredSales.reduce((s, sale) => s + Number(sale.igst || 0), 0);
  const purchaseGST = filteredPO.reduce((s, po) => s + Number(po.gst_amount || 0), 0);

  // Daily cash summary
  const today = new Date().toISOString().split("T")[0];
  const todaySales = filteredSales.filter(s => s.created_at.startsWith(today));
  const todayCash = todaySales.filter(s => s.payment_method === "cash").reduce((s, sale) => s + Number(sale.net_amount), 0);
  const todayUPI = todaySales.filter(s => s.payment_method === "upi").reduce((s, sale) => s + Number(sale.net_amount), 0);
  const todayCard = todaySales.filter(s => s.payment_method === "card").reduce((s, sale) => s + Number(sale.net_amount), 0);
  const todayCredit = todaySales.filter(s => s.payment_method === "credit").reduce((s, sale) => s + Number(sale.net_amount), 0);
  const todayTotal = todaySales.reduce((s, sale) => s + Number(sale.net_amount), 0);
  const todayExpenses = filteredExpenses.filter(e => e.expense_date === today).reduce((s, e) => s + Number(e.amount), 0);

  // Supplier ledger
  const supplierLedger = suppliers.map(sup => {
    const pos = filteredPO.filter(p => p.supplier_id === sup.id);
    const totalPurchased = pos.reduce((s, p) => s + Number(p.total_amount || 0), 0);
    return { name: sup.name, phone: sup.phone, orders: pos.length, total: totalPurchased };
  }).sort((a, b) => b.total - a.total);

  // Customer ledger
  const customerLedger = customers.map(c => {
    const cSales = sales.filter(s => s.customer_id === c.id);
    const totalPurchased = cSales.reduce((s, sale) => s + Number(sale.net_amount), 0);
    const totalPaid = customerPayments.filter(p => p.customer_id === c.id).reduce((s, p) => s + Number(p.amount), 0);
    return { name: c.name, phone: c.phone, purchases: cSales.length, total: totalPurchased, paid: totalPaid, credit: Number(c.credit_balance) };
  }).sort((a, b) => b.credit - a.credit);

  const grossProfit = totalSalesAmount - (totalValue * 0.7);
  const getBranchName = (id: string) => branches.find(b => b.id === id)?.name ?? "Unknown";

  return (
    <DashboardLayout>
      <div className="space-y-6 animate-fade-in">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-display font-bold flex items-center gap-2">
              <FileBarChart className="h-6 w-6 text-primary" /> Reports & Analytics
            </h1>
            <p className="text-sm text-muted-foreground">Comprehensive business insights</p>
          </div>
          <Select value={branchFilter} onValueChange={setBranchFilter}>
            <SelectTrigger className="w-48"><SelectValue placeholder="All Branches" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Branches</SelectItem>
              {branches.map(b => <SelectItem key={b.id} value={b.id}>{b.name}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>

        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <Card className="glass-card"><CardContent className="p-4">
            <p className="text-xs text-muted-foreground">Total Sales</p>
            <p className="text-xl font-bold flex items-center gap-1"><IndianRupee className="h-4 w-4" />{totalSalesAmount.toLocaleString("en-IN", { minimumFractionDigits: 2 })}</p>
          </CardContent></Card>
          <Card className="glass-card"><CardContent className="p-4">
            <p className="text-xs text-muted-foreground">Total GST Collected</p>
            <p className="text-xl font-bold text-primary">₹{totalGST.toLocaleString("en-IN", { minimumFractionDigits: 2 })}</p>
          </CardContent></Card>
          <Card className="glass-card"><CardContent className="p-4">
            <p className="text-xs text-muted-foreground">Total Expenses</p>
            <p className="text-xl font-bold text-destructive">₹{totalExpenses.toLocaleString("en-IN", { minimumFractionDigits: 2 })}</p>
          </CardContent></Card>
          <Card className="glass-card"><CardContent className="p-4">
            <p className="text-xs text-muted-foreground">Inventory Value</p>
            <p className="text-xl font-bold">₹{totalValue.toLocaleString("en-IN", { minimumFractionDigits: 2 })}</p>
          </CardContent></Card>
        </div>

        <Tabs defaultValue="sales" className="space-y-4">
          <TabsList className="flex flex-wrap w-full max-w-4xl">
            <TabsTrigger value="sales">Sales</TabsTrigger>
            <TabsTrigger value="gst">GST</TabsTrigger>
            <TabsTrigger value="cash">Cash Summary</TabsTrigger>
            <TabsTrigger value="expenses">Expenses</TabsTrigger>
            <TabsTrigger value="stock">Stock</TabsTrigger>
            <TabsTrigger value="expiry">Expiry</TabsTrigger>
            <TabsTrigger value="movement">Movement</TabsTrigger>
            <TabsTrigger value="supplier">Supplier Ledger</TabsTrigger>
            <TabsTrigger value="customer">Customer Ledger</TabsTrigger>
            <TabsTrigger value="pnl">P&L</TabsTrigger>
          </TabsList>

          {/* Sales Tab */}
          <TabsContent value="sales" className="space-y-4">
            <Card className="glass-card">
              <CardHeader><CardTitle className="text-base">Sales Trend</CardTitle></CardHeader>
              <CardContent>
                {salesTrend.length > 0 ? (
                  <ResponsiveContainer width="100%" height={300}>
                    <LineChart data={salesTrend}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="day" tick={{ fontSize: 10 }} />
                      <YAxis tick={{ fontSize: 10 }} />
                      <Tooltip formatter={(v: number) => `₹${v.toFixed(2)}`} />
                      <Line type="monotone" dataKey="amount" stroke="hsl(168, 80%, 36%)" strokeWidth={2} />
                    </LineChart>
                  </ResponsiveContainer>
                ) : <p className="text-center text-muted-foreground py-8">No sales data</p>}
              </CardContent>
            </Card>
            <Card className="glass-card">
              <CardHeader><CardTitle className="text-base">Recent Sales</CardTitle></CardHeader>
              <CardContent>
                <Table>
                  <TableHeader><TableRow>
                    <TableHead>Invoice</TableHead><TableHead>Customer</TableHead><TableHead>Branch</TableHead>
                    <TableHead className="text-right">Amount</TableHead><TableHead className="text-right">GST</TableHead>
                    <TableHead className="text-right">Net</TableHead><TableHead>Date</TableHead>
                  </TableRow></TableHeader>
                  <TableBody>
                    {filteredSales.slice(0, 20).map(s => (
                      <TableRow key={s.id}>
                        <TableCell className="font-mono text-sm">{s.invoice_number}</TableCell>
                        <TableCell>{s.customer_name || "-"}</TableCell>
                        <TableCell>{getBranchName(s.branch_id)}</TableCell>
                        <TableCell className="text-right">₹{Number(s.total_amount).toFixed(2)}</TableCell>
                        <TableCell className="text-right text-primary">₹{Number(s.gst_amount || 0).toFixed(2)}</TableCell>
                        <TableCell className="text-right font-semibold">₹{Number(s.net_amount).toFixed(2)}</TableCell>
                        <TableCell className="text-sm">{new Date(s.created_at).toLocaleDateString("en-IN")}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </TabsContent>

          {/* GST Tab */}
          <TabsContent value="gst" className="space-y-4">
            <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
              {[
                { label: "Total GST (Sales)", value: totalGST },
                { label: "CGST", value: totalCGST },
                { label: "SGST", value: totalSGST },
                { label: "IGST", value: totalIGST },
                { label: "GST (Purchase)", value: purchaseGST },
              ].map(g => (
                <Card key={g.label} className="glass-card"><CardContent className="p-4">
                  <p className="text-xs text-muted-foreground">{g.label}</p>
                  <p className="text-lg font-bold">₹{g.value.toLocaleString("en-IN", { minimumFractionDigits: 2 })}</p>
                </CardContent></Card>
              ))}
            </div>
            <Card className="glass-card">
              <CardHeader><CardTitle className="text-base">GST Net Payable</CardTitle></CardHeader>
              <CardContent>
                <div className="p-4 rounded-lg bg-primary/10">
                  <p className="text-sm text-muted-foreground">Output GST - Input GST</p>
                  <p className="text-2xl font-bold text-primary">₹{(totalGST - purchaseGST).toLocaleString("en-IN", { minimumFractionDigits: 2 })}</p>
                </div>
              </CardContent>
            </Card>
            <Card className="glass-card">
              <CardHeader><CardTitle className="text-base">GST-wise Sales Breakdown</CardTitle></CardHeader>
              <CardContent>
                <Table>
                  <TableHeader><TableRow>
                    <TableHead>Invoice</TableHead><TableHead className="text-right">Taxable</TableHead>
                    <TableHead className="text-right">CGST</TableHead><TableHead className="text-right">SGST</TableHead>
                    <TableHead className="text-right">IGST</TableHead><TableHead className="text-right">Total GST</TableHead>
                    <TableHead>Date</TableHead>
                  </TableRow></TableHeader>
                  <TableBody>
                    {filteredSales.slice(0, 30).map(s => (
                      <TableRow key={s.id}>
                        <TableCell className="font-mono text-sm">{s.invoice_number}</TableCell>
                        <TableCell className="text-right">₹{Number(s.total_amount).toFixed(2)}</TableCell>
                        <TableCell className="text-right">₹{Number(s.cgst || 0).toFixed(2)}</TableCell>
                        <TableCell className="text-right">₹{Number(s.sgst || 0).toFixed(2)}</TableCell>
                        <TableCell className="text-right">₹{Number(s.igst || 0).toFixed(2)}</TableCell>
                        <TableCell className="text-right font-semibold">₹{Number(s.gst_amount || 0).toFixed(2)}</TableCell>
                        <TableCell>{new Date(s.created_at).toLocaleDateString("en-IN")}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Cash Summary Tab */}
          <TabsContent value="cash" className="space-y-4">
            <Card className="glass-card">
              <CardHeader><CardTitle className="text-base">Today's Cash Summary ({new Date().toLocaleDateString("en-IN")})</CardTitle></CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 lg:grid-cols-3 gap-4 mb-6">
                  {[
                    { label: "Cash", value: todayCash, color: "text-green-600" },
                    { label: "UPI", value: todayUPI, color: "text-blue-600" },
                    { label: "Card", value: todayCard, color: "text-purple-600" },
                    { label: "Credit (Udhaar)", value: todayCredit, color: "text-warning" },
                    { label: "Total Sales", value: todayTotal, color: "text-primary" },
                    { label: "Today Expenses", value: todayExpenses, color: "text-destructive" },
                  ].map(item => (
                    <div key={item.label} className="p-4 rounded-lg bg-accent/50">
                      <p className="text-xs text-muted-foreground">{item.label}</p>
                      <p className={`text-lg font-bold ${item.color}`}>₹{item.value.toLocaleString("en-IN", { minimumFractionDigits: 2 })}</p>
                    </div>
                  ))}
                </div>
                <div className="p-4 rounded-lg bg-primary/10">
                  <p className="text-sm text-muted-foreground">Net Cash Position (Sales - Expenses)</p>
                  <p className="text-2xl font-bold text-primary">₹{(todayTotal - todayExpenses).toLocaleString("en-IN", { minimumFractionDigits: 2 })}</p>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Expenses Tab */}
          <TabsContent value="expenses" className="space-y-4">
            <div className="flex justify-end">
              <Dialog open={expenseDialogOpen} onOpenChange={setExpenseDialogOpen}>
                <DialogTrigger asChild><Button><Plus className="h-4 w-4 mr-2" /> Add Expense</Button></DialogTrigger>
                <DialogContent>
                  <DialogHeader><DialogTitle>Add Expense</DialogTitle></DialogHeader>
                  <div className="space-y-3">
                    <div>
                      <Label>Category</Label>
                      <Select value={expenseForm.category} onValueChange={v => setExpenseForm({ ...expenseForm, category: v })}>
                        <SelectTrigger><SelectValue /></SelectTrigger>
                        <SelectContent>{EXPENSE_CATEGORIES.map(c => <SelectItem key={c} value={c}>{c.charAt(0).toUpperCase() + c.slice(1)}</SelectItem>)}</SelectContent>
                      </Select>
                    </div>
                    <div><Label>Amount (₹)</Label><Input type="number" value={expenseForm.amount} onChange={e => setExpenseForm({ ...expenseForm, amount: e.target.value })} /></div>
                    <div><Label>Description</Label><Input value={expenseForm.description} onChange={e => setExpenseForm({ ...expenseForm, description: e.target.value })} /></div>
                    <div><Label>Date</Label><Input type="date" value={expenseForm.expense_date} onChange={e => setExpenseForm({ ...expenseForm, expense_date: e.target.value })} /></div>
                    <div>
                      <Label>Branch</Label>
                      <Select value={expenseForm.branch_id} onValueChange={v => setExpenseForm({ ...expenseForm, branch_id: v })}>
                        <SelectTrigger><SelectValue placeholder="Select branch" /></SelectTrigger>
                        <SelectContent>{branches.map(b => <SelectItem key={b.id} value={b.id}>{b.name}</SelectItem>)}</SelectContent>
                      </Select>
                    </div>
                    <div>
                      <Label>Payment Method</Label>
                      <Select value={expenseForm.payment_method} onValueChange={v => setExpenseForm({ ...expenseForm, payment_method: v })}>
                        <SelectTrigger><SelectValue /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="cash">Cash</SelectItem>
                          <SelectItem value="upi">UPI</SelectItem>
                          <SelectItem value="bank_transfer">Bank Transfer</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <Button className="w-full" onClick={handleAddExpense} disabled={saving}>
                      {saving ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null} Save Expense
                    </Button>
                  </div>
                </DialogContent>
              </Dialog>
            </div>
            <Card className="glass-card">
              <CardHeader><CardTitle className="text-base">Expense Summary by Category</CardTitle></CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-4">
                  {EXPENSE_CATEGORIES.map(cat => {
                    const catTotal = filteredExpenses.filter(e => e.category === cat).reduce((s, e) => s + Number(e.amount), 0);
                    if (catTotal === 0) return null;
                    return (
                      <div key={cat} className="p-3 rounded-lg bg-accent/50">
                        <p className="text-xs text-muted-foreground capitalize">{cat}</p>
                        <p className="text-sm font-bold">₹{catTotal.toLocaleString("en-IN", { minimumFractionDigits: 2 })}</p>
                      </div>
                    );
                  })}
                </div>
              </CardContent>
            </Card>
            <Card className="glass-card">
              <CardHeader><CardTitle className="text-base">All Expenses</CardTitle></CardHeader>
              <CardContent>
                <Table>
                  <TableHeader><TableRow>
                    <TableHead>Date</TableHead><TableHead>Category</TableHead><TableHead>Description</TableHead>
                    <TableHead>Branch</TableHead><TableHead>Payment</TableHead><TableHead className="text-right">Amount</TableHead>
                  </TableRow></TableHeader>
                  <TableBody>
                    {filteredExpenses.slice(0, 50).map(e => (
                      <TableRow key={e.id}>
                        <TableCell>{new Date(e.expense_date).toLocaleDateString("en-IN")}</TableCell>
                        <TableCell><Badge variant="secondary" className="capitalize">{e.category}</Badge></TableCell>
                        <TableCell>{e.description || "-"}</TableCell>
                        <TableCell>{getBranchName(e.branch_id)}</TableCell>
                        <TableCell>{e.payment_method}</TableCell>
                        <TableCell className="text-right font-semibold">₹{Number(e.amount).toLocaleString("en-IN", { minimumFractionDigits: 2 })}</TableCell>
                      </TableRow>
                    ))}
                    {filteredExpenses.length === 0 && <TableRow><TableCell colSpan={6} className="text-center text-muted-foreground">No expenses recorded</TableCell></TableRow>}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Stock Tab */}
          <TabsContent value="stock" className="space-y-4">
            <Card className="glass-card">
              <CardHeader><CardTitle className="text-base flex items-center gap-2"><AlertTriangle className="h-4 w-4 text-warning" />Low Stock Items ({lowStock.length})</CardTitle></CardHeader>
              <CardContent>
                <Table>
                  <TableHeader><TableRow>
                    <TableHead>Medicine</TableHead><TableHead>Branch</TableHead><TableHead className="text-right">Current</TableHead>
                    <TableHead className="text-right">Min Qty</TableHead><TableHead>Status</TableHead>
                  </TableRow></TableHeader>
                  <TableBody>
                    {lowStock.map(m => (
                      <TableRow key={m.id}>
                        <TableCell className="font-medium">{m.name}</TableCell>
                        <TableCell>{getBranchName(m.branch_id)}</TableCell>
                        <TableCell className="text-right font-bold text-warning">{m.quantity}</TableCell>
                        <TableCell className="text-right">{m.min_quantity}</TableCell>
                        <TableCell><Badge variant="destructive">{m.quantity === 0 ? "Out of Stock" : "Low Stock"}</Badge></TableCell>
                      </TableRow>
                    ))}
                    {lowStock.length === 0 && <TableRow><TableCell colSpan={5} className="text-center text-muted-foreground">All stock healthy ✓</TableCell></TableRow>}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Expiry Tab */}
          <TabsContent value="expiry" className="space-y-4">
            {[{ title: "Expired", items: expired, color: "destructive" }, { title: "Expiring in 30 days", items: expiring30, color: "warning" }, { title: "Expiring in 90 days", items: expiring90, color: "secondary" }].map(group => (
              <Card key={group.title} className="glass-card">
                <CardHeader><CardTitle className="text-base flex items-center gap-2"><Clock className="h-4 w-4" />{group.title} ({group.items.length})</CardTitle></CardHeader>
                <CardContent>
                  <Table>
                    <TableHeader><TableRow>
                      <TableHead>Medicine</TableHead><TableHead>Batch</TableHead><TableHead>Branch</TableHead>
                      <TableHead className="text-right">Qty</TableHead><TableHead>Expiry Date</TableHead>
                    </TableRow></TableHeader>
                    <TableBody>
                      {group.items.map(m => (
                        <TableRow key={m.id}>
                          <TableCell className="font-medium">{m.name}</TableCell>
                          <TableCell className="text-sm">{m.batch_number}</TableCell>
                          <TableCell>{getBranchName(m.branch_id)}</TableCell>
                          <TableCell className="text-right">{m.quantity}</TableCell>
                          <TableCell><Badge variant={group.color as any}>{new Date(m.expiry_date).toLocaleDateString("en-IN")}</Badge></TableCell>
                        </TableRow>
                      ))}
                      {group.items.length === 0 && <TableRow><TableCell colSpan={5} className="text-center text-muted-foreground">None ✓</TableCell></TableRow>}
                    </TableBody>
                  </Table>
                </CardContent>
              </Card>
            ))}
          </TabsContent>

          {/* Movement Tab */}
          <TabsContent value="movement" className="space-y-4">
            <div className="grid lg:grid-cols-2 gap-4">
              <Card className="glass-card">
                <CardHeader><CardTitle className="text-base flex items-center gap-2"><TrendingUp className="h-4 w-4 text-green-500" />Fast Moving (Top 10)</CardTitle></CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={300}>
                    <BarChart data={fastMoving} layout="vertical">
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis type="number" tick={{ fontSize: 10 }} />
                      <YAxis dataKey="name" type="category" width={100} tick={{ fontSize: 10 }} />
                      <Tooltip /><Bar dataKey="sold" fill="hsl(168, 80%, 36%)" radius={[0, 6, 6, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>
              <Card className="glass-card">
                <CardHeader><CardTitle className="text-base flex items-center gap-2"><TrendingDown className="h-4 w-4 text-red-500" />Slow Moving (Bottom 10)</CardTitle></CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={300}>
                    <BarChart data={slowMoving} layout="vertical">
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis type="number" tick={{ fontSize: 10 }} />
                      <YAxis dataKey="name" type="category" width={100} tick={{ fontSize: 10 }} />
                      <Tooltip /><Bar dataKey="sold" fill="hsl(0, 84%, 60%)" radius={[0, 6, 6, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          {/* Supplier Ledger Tab */}
          <TabsContent value="supplier" className="space-y-4">
            <Card className="glass-card">
              <CardHeader><CardTitle className="text-base">Supplier Ledger</CardTitle></CardHeader>
              <CardContent>
                <Table>
                  <TableHeader><TableRow>
                    <TableHead>Supplier</TableHead><TableHead>Phone</TableHead><TableHead className="text-right">Orders</TableHead>
                    <TableHead className="text-right">Total Purchase (₹)</TableHead>
                  </TableRow></TableHeader>
                  <TableBody>
                    {supplierLedger.map((s, i) => (
                      <TableRow key={i}>
                        <TableCell className="font-medium">{s.name}</TableCell>
                        <TableCell>{s.phone || "-"}</TableCell>
                        <TableCell className="text-right">{s.orders}</TableCell>
                        <TableCell className="text-right font-semibold">₹{s.total.toLocaleString("en-IN", { minimumFractionDigits: 2 })}</TableCell>
                      </TableRow>
                    ))}
                    {supplierLedger.length === 0 && <TableRow><TableCell colSpan={4} className="text-center text-muted-foreground">No suppliers</TableCell></TableRow>}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Customer Ledger Tab */}
          <TabsContent value="customer" className="space-y-4">
            <Card className="glass-card">
              <CardHeader><CardTitle className="text-base">Customer Ledger</CardTitle></CardHeader>
              <CardContent>
                <Table>
                  <TableHeader><TableRow>
                    <TableHead>Customer</TableHead><TableHead>Phone</TableHead><TableHead className="text-right">Purchases</TableHead>
                    <TableHead className="text-right">Total (₹)</TableHead><TableHead className="text-right">Paid (₹)</TableHead>
                    <TableHead className="text-right">Credit (₹)</TableHead>
                  </TableRow></TableHeader>
                  <TableBody>
                    {customerLedger.map((c, i) => (
                      <TableRow key={i}>
                        <TableCell className="font-medium">{c.name}</TableCell>
                        <TableCell>{c.phone || "-"}</TableCell>
                        <TableCell className="text-right">{c.purchases}</TableCell>
                        <TableCell className="text-right">₹{c.total.toLocaleString("en-IN", { minimumFractionDigits: 2 })}</TableCell>
                        <TableCell className="text-right text-primary">₹{c.paid.toLocaleString("en-IN", { minimumFractionDigits: 2 })}</TableCell>
                        <TableCell className="text-right">
                          {c.credit > 0 ? <Badge variant="destructive">₹{c.credit.toLocaleString("en-IN", { minimumFractionDigits: 2 })}</Badge> : <span className="text-muted-foreground">₹0.00</span>}
                        </TableCell>
                      </TableRow>
                    ))}
                    {customerLedger.length === 0 && <TableRow><TableCell colSpan={6} className="text-center text-muted-foreground">No customers</TableCell></TableRow>}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </TabsContent>

          {/* P&L Tab */}
          <TabsContent value="pnl" className="space-y-4">
            <Card className="glass-card">
              <CardHeader><CardTitle className="text-base">Profit & Loss Summary</CardTitle></CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                  <div className="p-4 rounded-lg bg-green-50 dark:bg-green-950/30">
                    <p className="text-xs text-muted-foreground">Total Revenue</p>
                    <p className="text-lg font-bold text-green-600">₹{totalSalesAmount.toLocaleString("en-IN", { minimumFractionDigits: 2 })}</p>
                  </div>
                  <div className="p-4 rounded-lg bg-red-50 dark:bg-red-950/30">
                    <p className="text-xs text-muted-foreground">Total Expenses</p>
                    <p className="text-lg font-bold text-red-500">₹{totalExpenses.toLocaleString("en-IN", { minimumFractionDigits: 2 })}</p>
                  </div>
                  <div className="p-4 rounded-lg bg-blue-50 dark:bg-blue-950/30">
                    <p className="text-xs text-muted-foreground">Total Discounts</p>
                    <p className="text-lg font-bold text-blue-600">₹{totalDiscount.toLocaleString("en-IN", { minimumFractionDigits: 2 })}</p>
                  </div>
                  <div className="p-4 rounded-lg bg-primary/10">
                    <p className="text-xs text-muted-foreground">Net Profit (Est.)</p>
                    <p className="text-lg font-bold text-primary">₹{(totalSalesAmount - totalExpenses - totalDiscount).toLocaleString("en-IN", { minimumFractionDigits: 2 })}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </DashboardLayout>
  );
}
