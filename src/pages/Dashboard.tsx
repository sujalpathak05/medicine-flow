import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Pill, Building2, AlertTriangle, TrendingUp, ShoppingCart, PackagePlus, PackageX, Archive, IndianRupee } from "lucide-react";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { useAuth } from "@/contexts/AuthContext";
import { StatCards } from "@/components/dashboard/StatCards";
import { SalesTrendChart } from "@/components/dashboard/SalesTrendChart";
import { TopSellingTable } from "@/components/dashboard/TopSellingTable";
import { LowStockPanel, ExpiryPanel, OutOfStockPanel, DeadStockPanel } from "@/components/dashboard/AlertsPanel";
import { StockByBranchChart, StockByCategoryChart } from "@/components/dashboard/StockCharts";
import type { Tables } from "@/integrations/supabase/types";

type Medicine = Tables<"medicines">;
type Branch = Tables<"branches">;

export default function Dashboard() {
  const { role } = useAuth();
  const [medicines, setMedicines] = useState<Medicine[]>([]);
  const [branches, setBranches] = useState<Branch[]>([]);
  const [loading, setLoading] = useState(true);
  const [todaySales, setTodaySales] = useState({ count: 0, amount: 0 });
  const [todayPurchase, setTodayPurchase] = useState({ count: 0, amount: 0 });
  const [topSelling, setTopSelling] = useState<{ name: string; qty: number; revenue: number }[]>([]);
  const [salesTrend, setSalesTrend] = useState<{ date: string; sales: number; purchase: number }[]>([]);
  const [saleItemMedicineIds, setSaleItemMedicineIds] = useState<Set<string>>(new Set());

  useEffect(() => {
    const fetchData = async () => {
      const today = new Date().toISOString().split("T")[0];

      const [
        { data: meds },
        { data: brs },
        { data: todaySalesData },
        { data: todayPOData },
        { data: saleItems },
        { data: salesLast30 },
        { data: purchaseLast30 },
      ] = await Promise.all([
        supabase.from("medicines").select("*"),
        supabase.from("branches").select("*"),
        supabase.from("sales").select("id, net_amount, created_at").gte("created_at", `${today}T00:00:00`),
        supabase.from("purchase_orders").select("id, total_amount, created_at").gte("created_at", `${today}T00:00:00`),
        supabase.from("sale_items").select("medicine_id, medicine_name, quantity, total_price"),
        supabase.from("sales").select("net_amount, created_at").gte("created_at", new Date(Date.now() - 30 * 86400000).toISOString()),
        supabase.from("purchase_orders").select("total_amount, created_at").gte("created_at", new Date(Date.now() - 30 * 86400000).toISOString()),
      ]);

      setMedicines(meds ?? []);
      setBranches(brs ?? []);

      // Today's totals
      setTodaySales({
        count: todaySalesData?.length ?? 0,
        amount: todaySalesData?.reduce((s, r) => s + (r.net_amount || 0), 0) ?? 0,
      });
      setTodayPurchase({
        count: todayPOData?.length ?? 0,
        amount: todayPOData?.reduce((s, r) => s + (r.total_amount || 0), 0) ?? 0,
      });

      // Top selling
      if (saleItems?.length) {
        const map = new Map<string, { name: string; qty: number; revenue: number }>();
        const medIds = new Set<string>();
        for (const si of saleItems) {
          medIds.add(si.medicine_id);
          const existing = map.get(si.medicine_id);
          if (existing) {
            existing.qty += si.quantity;
            existing.revenue += si.total_price;
          } else {
            map.set(si.medicine_id, { name: si.medicine_name, qty: si.quantity, revenue: si.total_price });
          }
        }
        setSaleItemMedicineIds(medIds);
        setTopSelling(Array.from(map.values()).sort((a, b) => b.qty - a.qty).slice(0, 10));
      }

      // Sales trend (last 30 days)
      const trendMap = new Map<string, { sales: number; purchase: number }>();
      for (let i = 29; i >= 0; i--) {
        const d = new Date(Date.now() - i * 86400000).toISOString().split("T")[0];
        trendMap.set(d, { sales: 0, purchase: 0 });
      }
      salesLast30?.forEach((s) => {
        const d = s.created_at.split("T")[0];
        const entry = trendMap.get(d);
        if (entry) entry.sales += s.net_amount || 0;
      });
      purchaseLast30?.forEach((p) => {
        const d = p.created_at.split("T")[0];
        const entry = trendMap.get(d);
        if (entry) entry.purchase += p.total_amount || 0;
      });
      setSalesTrend(
        Array.from(trendMap.entries()).map(([date, v]) => ({
          date: date.slice(5), // MM-DD
          ...v,
        }))
      );

      setLoading(false);
    };

    fetchData();

    const channel = supabase
      .channel("dashboard-realtime")
      .on("postgres_changes", { event: "*", schema: "public", table: "medicines" }, () => fetchData())
      .on("postgres_changes", { event: "*", schema: "public", table: "sales" }, () => fetchData())
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, []);

  const totalStock = medicines.reduce((sum, m) => sum + m.quantity, 0);
  const totalValue = medicines.reduce((sum, m) => sum + m.price * m.quantity, 0);
  const outOfStock = medicines.filter((m) => m.quantity === 0).length;
  const lowStock = medicines.filter((m) => m.quantity > 0 && m.quantity <= m.min_quantity).length;

  const stats = [
    { label: "Total Medicines", value: medicines.length, icon: Pill, color: "text-primary" },
    { label: "Total Stock", value: totalStock.toLocaleString(), icon: TrendingUp, color: "text-primary" },
    { label: "Today Sales", value: `₹${todaySales.amount.toLocaleString("en-IN")}`, icon: ShoppingCart, color: "text-success", subtext: `${todaySales.count} invoices` },
    { label: "Today Purchase", value: `₹${todayPurchase.amount.toLocaleString("en-IN")}`, icon: PackagePlus, color: "text-primary", subtext: `${todayPurchase.count} orders` },
    { label: "Low Stock", value: lowStock, icon: AlertTriangle, color: "text-warning" },
    { label: "Out of Stock", value: outOfStock, icon: PackageX, color: "text-destructive" },
    { label: "Branches", value: branches.length, icon: Building2, color: "text-primary" },
    { label: "Stock Value", value: `₹${totalValue.toLocaleString("en-IN", { maximumFractionDigits: 0 })}`, icon: IndianRupee, color: "text-success" },
  ];

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

  return (
    <DashboardLayout>
      <div className="space-y-6 animate-fade-in">
        <div>
          <h1 className="text-2xl font-display font-bold">Dashboard</h1>
          <p className="text-sm text-muted-foreground">Real-time inventory & sales overview</p>
        </div>

        <StatCards stats={stats} loading={loading} />

        <SalesTrendChart data={salesTrend} />

        <div className="grid lg:grid-cols-2 gap-6">
          <TopSellingTable items={topSelling} />
          <DeadStockPanel medicines={medicines} saleItemMedicineIds={saleItemMedicineIds} />
        </div>

        <div className="grid lg:grid-cols-2 gap-6">
          <StockByBranchChart data={branchData} />
          <StockByCategoryChart data={categoryData} />
        </div>

        <div className="grid lg:grid-cols-2 gap-6">
          <LowStockPanel medicines={medicines} />
          <ExpiryPanel medicines={medicines} />
        </div>

        <div className="grid lg:grid-cols-2 gap-6">
          <OutOfStockPanel medicines={medicines} />
          {role === "admin" && (
            <Card className="glass-card">
              <CardContent className="p-4 flex items-center justify-between">
                <p className="text-sm text-muted-foreground">Total Inventory Value</p>
                <span className="text-foreground font-display font-bold text-lg">₹{totalValue.toLocaleString("en-IN", { minimumFractionDigits: 2 })}</span>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </DashboardLayout>
  );
}
