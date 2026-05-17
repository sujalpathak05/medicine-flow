import { useEffect, useMemo, useState } from "react";
import { format, subDays, startOfDay, endOfDay, startOfMonth } from "date-fns";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Pill, Building2, AlertTriangle, TrendingUp, ShoppingCart, PackagePlus, PackageX, IndianRupee, Calendar as CalendarIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import type { DateRange } from "react-day-picker";
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

type PresetKey = "today" | "7d" | "30d" | "mtd" | "custom";
const PRESETS: { key: PresetKey; label: string }[] = [
  { key: "today", label: "Today" },
  { key: "7d", label: "Last 7 days" },
  { key: "30d", label: "Last 30 days" },
  { key: "mtd", label: "This month" },
];

function rangeForPreset(preset: PresetKey): DateRange {
  const now = new Date();
  switch (preset) {
    case "today": return { from: startOfDay(now), to: endOfDay(now) };
    case "7d": return { from: startOfDay(subDays(now, 6)), to: endOfDay(now) };
    case "30d": return { from: startOfDay(subDays(now, 29)), to: endOfDay(now) };
    case "mtd": return { from: startOfMonth(now), to: endOfDay(now) };
    default: return { from: startOfDay(now), to: endOfDay(now) };
  }
}

export default function Dashboard() {
  const { role } = useAuth();
  const [medicines, setMedicines] = useState<Medicine[]>([]);
  const [branches, setBranches] = useState<Branch[]>([]);
  const [loading, setLoading] = useState(true);
  const [rangeSales, setRangeSales] = useState({ count: 0, amount: 0 });
  const [rangePurchase, setRangePurchase] = useState({ count: 0, amount: 0 });
  const [topSelling, setTopSelling] = useState<{ name: string; qty: number; revenue: number }[]>([]);
  const [salesTrend, setSalesTrend] = useState<{ date: string; sales: number; purchase: number }[]>([]);
  const [saleItemMedicineIds, setSaleItemMedicineIds] = useState<Set<string>>(new Set());

  const [preset, setPreset] = useState<PresetKey>("today");
  const [customRange, setCustomRange] = useState<DateRange | undefined>(undefined);
  const [calOpen, setCalOpen] = useState(false);

  const activeRange: DateRange = useMemo(() => {
    if (preset === "custom" && customRange?.from) {
      return { from: startOfDay(customRange.from), to: endOfDay(customRange.to ?? customRange.from) };
    }
    return rangeForPreset(preset);
  }, [preset, customRange]);

  const rangeLabel = useMemo(() => {
    if (!activeRange.from || !activeRange.to) return "";
    const f = format(activeRange.from, "dd MMM yyyy");
    const t = format(activeRange.to, "dd MMM yyyy");
    return f === t ? f : `${f} – ${t}`;
  }, [activeRange]);

  useEffect(() => {
    const fetchData = async () => {
      const fromISO = activeRange.from!.toISOString();
      const toISO = activeRange.to!.toISOString();

      const [
        { data: meds },
        { data: brs },
        { data: rangeSalesData },
        { data: rangePOData },
        { data: saleItems },
        { data: salesTrendData },
        { data: purchaseTrendData },
      ] = await Promise.all([
        supabase.from("medicines").select("*"),
        supabase.from("branches").select("*"),
        supabase.from("sales").select("id, net_amount, created_at").gte("created_at", fromISO).lte("created_at", toISO),
        supabase.from("purchase_orders").select("id, total_amount, created_at").gte("created_at", fromISO).lte("created_at", toISO),
        supabase.from("sale_items").select("medicine_id, medicine_name, quantity, total_price"),
        supabase.from("sales").select("net_amount, created_at").gte("created_at", fromISO).lte("created_at", toISO),
        supabase.from("purchase_orders").select("total_amount, created_at").gte("created_at", fromISO).lte("created_at", toISO),
      ]);

      setMedicines(meds ?? []);
      setBranches(brs ?? []);

      // Range totals
      setRangeSales({
        count: rangeSalesData?.length ?? 0,
        amount: rangeSalesData?.reduce((s, r) => s + (r.net_amount || 0), 0) ?? 0,
      });
      setRangePurchase({
        count: rangePOData?.length ?? 0,
        amount: rangePOData?.reduce((s, r) => s + (r.total_amount || 0), 0) ?? 0,
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

      // Sales trend across selected range (bucketed by day)
      const trendMap = new Map<string, { sales: number; purchase: number }>();
      const dayMs = 86400000;
      const startDay = startOfDay(activeRange.from!).getTime();
      const endDay = startOfDay(activeRange.to!).getTime();
      for (let t = startDay; t <= endDay; t += dayMs) {
        const d = new Date(t).toISOString().split("T")[0];
        trendMap.set(d, { sales: 0, purchase: 0 });
      }
      salesTrendData?.forEach((s) => {
        const d = s.created_at.split("T")[0];
        const entry = trendMap.get(d);
        if (entry) entry.sales += s.net_amount || 0;
      });
      purchaseTrendData?.forEach((p) => {
        const d = p.created_at.split("T")[0];
        const entry = trendMap.get(d);
        if (entry) entry.purchase += p.total_amount || 0;
      });
      setSalesTrend(
        Array.from(trendMap.entries()).map(([date, v]) => ({
          date: date.slice(5),
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
  }, [activeRange.from?.getTime(), activeRange.to?.getTime()]);

  const totalStock = medicines.reduce((sum, m) => sum + m.quantity, 0);
  const totalValue = medicines.reduce((sum, m) => sum + m.price * m.quantity, 0);
  const outOfStock = medicines.filter((m) => m.quantity === 0).length;
  const lowStock = medicines.filter((m) => m.quantity > 0 && m.quantity <= m.min_quantity).length;

  const stats = [
    { label: "Total Medicines", value: medicines.length, icon: Pill, color: "text-primary" },
    { label: "Total Stock", value: totalStock.toLocaleString(), icon: TrendingUp, color: "text-primary" },
    { label: "Sales", value: `₹${rangeSales.amount.toLocaleString("en-IN")}`, icon: ShoppingCart, color: "text-success", subtext: `${rangeSales.count} invoices` },
    { label: "Purchase", value: `₹${rangePurchase.amount.toLocaleString("en-IN")}`, icon: PackagePlus, color: "text-primary", subtext: `${rangePurchase.count} orders` },
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
        <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-3">
          <div>
            <h1 className="text-2xl font-display font-bold">Dashboard</h1>
            <p className="text-sm text-muted-foreground">Real-time inventory & sales overview</p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <Popover open={calOpen} onOpenChange={setCalOpen}>
              <PopoverTrigger asChild>
                <Button variant="outline" size="sm" className="h-9">
                  <CalendarIcon className="h-4 w-4 mr-2" />
                  {rangeLabel}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="end">
                <div className="p-2 border-b flex flex-wrap gap-1">
                  {PRESETS.map(p => (
                    <Button
                      key={p.key}
                      size="sm"
                      variant={preset === p.key ? "default" : "ghost"}
                      className="h-7 text-xs"
                      onClick={() => { setPreset(p.key); setCustomRange(undefined); }}
                    >
                      {p.label}
                    </Button>
                  ))}
                </div>
                <Calendar
                  mode="range"
                  selected={customRange ?? { from: activeRange.from, to: activeRange.to }}
                  onSelect={(r) => {
                    setCustomRange(r);
                    if (r?.from && r?.to) {
                      setPreset("custom");
                      setCalOpen(false);
                    }
                  }}
                  numberOfMonths={1}
                />
              </PopoverContent>
            </Popover>
          </div>
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
