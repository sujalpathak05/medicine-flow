import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, LineChart, Line, PieChart, Pie, Cell } from "recharts";
import { FileBarChart, Loader2, TrendingUp, TrendingDown, AlertTriangle, Clock, IndianRupee } from "lucide-react";

const COLORS = ["hsl(168, 80%, 36%)", "hsl(168, 60%, 50%)", "hsl(38, 92%, 50%)", "hsl(0, 84%, 60%)", "hsl(220, 70%, 50%)"];

export default function ReportsPage() {
  const [medicines, setMedicines] = useState<any[]>([]);
  const [sales, setSales] = useState<any[]>([]);
  const [saleItems, setSaleItems] = useState<any[]>([]);
  const [branches, setBranches] = useState<any[]>([]);
  const [branchFilter, setBranchFilter] = useState("all");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetch = async () => {
      const [{ data: m }, { data: s }, { data: si }, { data: b }] = await Promise.all([
        supabase.from("medicines").select("*"),
        supabase.from("sales").select("*").order("created_at", { ascending: false }),
        supabase.from("sale_items").select("*"),
        supabase.from("branches").select("*"),
      ]);
      setMedicines(m ?? []);
      setSales(s ?? []);
      setSaleItems(si ?? []);
      setBranches(b ?? []);
      setLoading(false);
    };
    fetch();
  }, []);

  if (loading) return <DashboardLayout><div className="flex items-center justify-center h-64"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div></DashboardLayout>;

  const filteredMeds = branchFilter === "all" ? medicines : medicines.filter(m => m.branch_id === branchFilter);
  const filteredSales = branchFilter === "all" ? sales : sales.filter(s => s.branch_id === branchFilter);

  // Stock Report
  const totalStock = filteredMeds.reduce((s, m) => s + m.quantity, 0);
  const totalValue = filteredMeds.reduce((s, m) => s + m.price * m.quantity, 0);
  const lowStock = filteredMeds.filter(m => m.quantity <= m.min_quantity);

  // Sales Report
  const totalSalesAmount = filteredSales.reduce((s, sale) => s + Number(sale.net_amount), 0);
  const totalDiscount = filteredSales.reduce((s, sale) => s + Number(sale.discount), 0);

  // Daily sales trend (last 30 days)
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

  // Expiry report
  const now = new Date();
  const expired = filteredMeds.filter(m => new Date(m.expiry_date) < now);
  const expiring30 = filteredMeds.filter(m => {
    const exp = new Date(m.expiry_date);
    return exp >= now && exp <= new Date(now.getTime() + 30 * 86400000);
  });
  const expiring90 = filteredMeds.filter(m => {
    const exp = new Date(m.expiry_date);
    return exp >= now && exp <= new Date(now.getTime() + 90 * 86400000);
  });

  // P&L
  const costOfGoods = filteredMeds.reduce((s, m) => s + (m.price * 0.7 * (m.quantity > 0 ? 1 : 0)), 0); // Estimated
  const grossProfit = totalSalesAmount - costOfGoods;

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

        {/* Summary Cards */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <Card className="glass-card"><CardContent className="p-4">
            <p className="text-xs text-muted-foreground">Total Sales</p>
            <p className="text-xl font-bold flex items-center gap-1"><IndianRupee className="h-4 w-4" />{totalSalesAmount.toLocaleString("en-IN", { minimumFractionDigits: 2 })}</p>
          </CardContent></Card>
          <Card className="glass-card"><CardContent className="p-4">
            <p className="text-xs text-muted-foreground">Inventory Value</p>
            <p className="text-xl font-bold flex items-center gap-1"><IndianRupee className="h-4 w-4" />{totalValue.toLocaleString("en-IN", { minimumFractionDigits: 2 })}</p>
          </CardContent></Card>
          <Card className="glass-card"><CardContent className="p-4">
            <p className="text-xs text-muted-foreground">Low Stock Items</p>
            <p className="text-xl font-bold text-warning">{lowStock.length}</p>
          </CardContent></Card>
          <Card className="glass-card"><CardContent className="p-4">
            <p className="text-xs text-muted-foreground">Expiring (30d)</p>
            <p className="text-xl font-bold text-destructive">{expiring30.length}</p>
          </CardContent></Card>
        </div>

        <Tabs defaultValue="sales" className="space-y-4">
          <TabsList className="grid grid-cols-5 w-full max-w-2xl">
            <TabsTrigger value="sales">Sales</TabsTrigger>
            <TabsTrigger value="stock">Stock</TabsTrigger>
            <TabsTrigger value="expiry">Expiry</TabsTrigger>
            <TabsTrigger value="movement">Movement</TabsTrigger>
            <TabsTrigger value="pnl">P&L</TabsTrigger>
          </TabsList>

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
                    <TableHead className="text-right">Amount</TableHead><TableHead className="text-right">Discount</TableHead>
                    <TableHead className="text-right">Net</TableHead><TableHead>Date</TableHead>
                  </TableRow></TableHeader>
                  <TableBody>
                    {filteredSales.slice(0, 20).map(s => (
                      <TableRow key={s.id}>
                        <TableCell className="font-mono text-sm">{s.invoice_number}</TableCell>
                        <TableCell>{s.customer_name || "-"}</TableCell>
                        <TableCell>{getBranchName(s.branch_id)}</TableCell>
                        <TableCell className="text-right">₹{Number(s.total_amount).toFixed(2)}</TableCell>
                        <TableCell className="text-right text-green-600">₹{Number(s.discount).toFixed(2)}</TableCell>
                        <TableCell className="text-right font-semibold">₹{Number(s.net_amount).toFixed(2)}</TableCell>
                        <TableCell className="text-sm">{new Date(s.created_at).toLocaleDateString("en-IN")}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </TabsContent>

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

          <TabsContent value="expiry" className="space-y-4">
            {[{ title: "Expired", items: expired, color: "destructive" }, { title: "Expiring in 30 days", items: expiring30, color: "warning" }, { title: "Expiring in 90 days", items: expiring90, color: "secondary" }].map(group => (
              <Card key={group.title} className="glass-card">
                <CardHeader><CardTitle className="text-base flex items-center gap-2">
                  <Clock className="h-4 w-4" />{group.title} ({group.items.length})
                </CardTitle></CardHeader>
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
                      <Tooltip />
                      <Bar dataKey="sold" fill="hsl(168, 80%, 36%)" radius={[0, 6, 6, 0]} />
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
                      <Tooltip />
                      <Bar dataKey="sold" fill="hsl(0, 84%, 60%)" radius={[0, 6, 6, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="pnl" className="space-y-4">
            <Card className="glass-card">
              <CardHeader><CardTitle className="text-base">Profit & Loss Summary</CardTitle></CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                    <div className="p-4 rounded-lg bg-green-50 dark:bg-green-950/30">
                      <p className="text-xs text-muted-foreground">Total Revenue</p>
                      <p className="text-lg font-bold text-green-600">₹{totalSalesAmount.toLocaleString("en-IN", { minimumFractionDigits: 2 })}</p>
                    </div>
                    <div className="p-4 rounded-lg bg-red-50 dark:bg-red-950/30">
                      <p className="text-xs text-muted-foreground">Total Discounts</p>
                      <p className="text-lg font-bold text-red-500">₹{totalDiscount.toLocaleString("en-IN", { minimumFractionDigits: 2 })}</p>
                    </div>
                    <div className="p-4 rounded-lg bg-blue-50 dark:bg-blue-950/30">
                      <p className="text-xs text-muted-foreground">Inventory Value</p>
                      <p className="text-lg font-bold text-blue-600">₹{totalValue.toLocaleString("en-IN", { minimumFractionDigits: 2 })}</p>
                    </div>
                    <div className="p-4 rounded-lg bg-primary/10">
                      <p className="text-xs text-muted-foreground">Est. Gross Profit</p>
                      <p className="text-lg font-bold text-primary">₹{grossProfit.toLocaleString("en-IN", { minimumFractionDigits: 2 })}</p>
                    </div>
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
