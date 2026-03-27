import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Pill, Building2, AlertTriangle, TrendingUp, Clock } from "lucide-react";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from "recharts";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { useAuth } from "@/contexts/AuthContext";
import type { Tables } from "@/integrations/supabase/types";

type Medicine = Tables<"medicines">;
type Branch = Tables<"branches">;

const CHART_COLORS = ["hsl(168, 80%, 36%)", "hsl(168, 60%, 50%)", "hsl(168, 40%, 65%)", "hsl(38, 92%, 50%)", "hsl(0, 84%, 60%)"];

export default function Dashboard() {
  const { role } = useAuth();
  const [medicines, setMedicines] = useState<Medicine[]>([]);
  const [branches, setBranches] = useState<Branch[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      const [{ data: meds }, { data: brs }] = await Promise.all([
        supabase.from("medicines").select("*"),
        supabase.from("branches").select("*"),
      ]);
      setMedicines(meds ?? []);
      setBranches(brs ?? []);
      setLoading(false);
    };
    fetchData();

    const channel = supabase
      .channel("dashboard-realtime")
      .on("postgres_changes", { event: "*", schema: "public", table: "medicines" }, () => fetchData())
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, []);

  const totalStock = medicines.reduce((sum, m) => sum + m.quantity, 0);
  const lowStockItems = medicines.filter((m) => m.quantity <= m.min_quantity);
  const expiringItems = medicines.filter((m) => {
    const expiry = new Date(m.expiry_date);
    const thirtyDays = new Date();
    thirtyDays.setDate(thirtyDays.getDate() + 30);
    return expiry <= thirtyDays;
  });
  const totalValue = medicines.reduce((sum, m) => sum + m.price * m.quantity, 0);

  const branchData = branches.map((b) => {
    const branchMeds = medicines.filter((m) => m.branch_id === b.id);
    return { name: b.name.substring(0, 12), stock: branchMeds.reduce((s, m) => s + m.quantity, 0) };
  });

  const categoryData = medicines.reduce((acc, m) => {
    const existing = acc.find((a) => a.name === m.category);
    if (existing) existing.value += m.quantity;
    else acc.push({ name: m.category, value: m.quantity });
    return acc;
  }, [] as { name: string; value: number }[]);

  const stats = [
    { label: "Total Medicines", value: medicines.length, icon: Pill, color: "text-primary" },
    { label: "Total Stock", value: totalStock.toLocaleString(), icon: TrendingUp, color: "text-success" },
    { label: "Low Stock Alerts", value: lowStockItems.length, icon: AlertTriangle, color: "text-warning" },
    { label: "Branches", value: branches.length, icon: Building2, color: "text-primary" },
  ];

  return (
    <DashboardLayout>
      <div className="space-y-6 animate-fade-in">
        <div>
          <h1 className="text-2xl font-display font-bold">Dashboard</h1>
          <p className="text-sm text-muted-foreground">Real-time inventory overview</p>
        </div>

        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {stats.map((s) => (
            <Card key={s.label} className="glass-card">
              <CardContent className="p-4 flex items-center gap-3">
                <div className={`h-10 w-10 rounded-lg bg-accent flex items-center justify-center shrink-0 ${s.color}`}>
                  <s.icon className="h-5 w-5" />
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">{s.label}</p>
                  <p className="text-xl font-display font-bold">{loading ? "..." : s.value}</p>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        <div className="grid lg:grid-cols-2 gap-6">
          <Card className="glass-card">
            <CardHeader>
              <CardTitle className="text-base font-display">Stock by Branch</CardTitle>
            </CardHeader>
            <CardContent>
              {branchData.length > 0 ? (
                <ResponsiveContainer width="100%" height={250}>
                  <BarChart data={branchData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(168, 25%, 88%)" />
                    <XAxis dataKey="name" tick={{ fontSize: 11 }} />
                    <YAxis tick={{ fontSize: 11 }} />
                    <Tooltip />
                    <Bar dataKey="stock" fill="hsl(168, 80%, 36%)" radius={[6, 6, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              ) : (
                <p className="text-sm text-muted-foreground text-center py-8">No branch data yet</p>
              )}
            </CardContent>
          </Card>

          <Card className="glass-card">
            <CardHeader>
              <CardTitle className="text-base font-display">Stock by Category</CardTitle>
            </CardHeader>
            <CardContent>
              {categoryData.length > 0 ? (
                <ResponsiveContainer width="100%" height={250}>
                  <PieChart>
                    <Pie data={categoryData} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={90} label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}>
                      {categoryData.map((_, i) => (
                        <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>
              ) : (
                <p className="text-sm text-muted-foreground text-center py-8">No medicine data yet</p>
              )}
            </CardContent>
          </Card>
        </div>

        <div className="grid lg:grid-cols-2 gap-6">
          <Card className="glass-card">
            <CardHeader>
              <CardTitle className="text-base font-display flex items-center gap-2">
                <AlertTriangle className="h-4 w-4 text-warning" /> Low Stock Alerts
              </CardTitle>
            </CardHeader>
            <CardContent>
              {lowStockItems.length === 0 ? (
                <p className="text-sm text-muted-foreground">All stock levels are healthy ✓</p>
              ) : (
                <div className="space-y-2 max-h-48 overflow-auto">
                  {lowStockItems.map((m) => (
                    <div key={m.id} className="flex items-center justify-between p-2 rounded-md bg-warning/10">
                      <span className="text-sm font-medium">{m.name}</span>
                      <Badge variant="outline" className="text-warning border-warning">
                        {m.quantity} / {m.min_quantity} min
                      </Badge>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          <Card className="glass-card">
            <CardHeader>
              <CardTitle className="text-base font-display flex items-center gap-2">
                <Clock className="h-4 w-4 text-destructive" /> Expiry Alerts (30 days)
              </CardTitle>
            </CardHeader>
            <CardContent>
              {expiringItems.length === 0 ? (
                <p className="text-sm text-muted-foreground">No medicines expiring soon ✓</p>
              ) : (
                <div className="space-y-2 max-h-48 overflow-auto">
                  {expiringItems.map((m) => (
                    <div key={m.id} className="flex items-center justify-between p-2 rounded-md bg-destructive/10">
                      <span className="text-sm font-medium">{m.name}</span>
                      <Badge variant="outline" className="text-destructive border-destructive">
                        {new Date(m.expiry_date).toLocaleDateString()}
                      </Badge>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {role === "admin" && (
          <Card className="glass-card">
            <CardContent className="p-4">
              <p className="text-sm text-muted-foreground">
                Total Inventory Value: <span className="text-foreground font-display font-bold text-lg">₹{totalValue.toLocaleString("en-IN", { minimumFractionDigits: 2 })}</span>
              </p>
            </CardContent>
          </Card>
        )}
      </div>
    </DashboardLayout>
  );
}
