import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";
import { TrendingUp } from "lucide-react";

interface SalesTrendData {
  date: string;
  sales: number;
  purchase: number;
}

export function SalesTrendChart({ data }: { data: SalesTrendData[] }) {
  return (
    <Card className="glass-card">
      <CardHeader>
        <CardTitle className="text-base font-display flex items-center gap-2">
          <TrendingUp className="h-4 w-4 text-primary" /> Sales vs Purchase Trend
        </CardTitle>
      </CardHeader>
      <CardContent>
        {data.length > 0 ? (
          <ResponsiveContainer width="100%" height={250}>
            <AreaChart data={data}>
              <defs>
                <linearGradient id="salesGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="hsl(168, 80%, 36%)" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="hsl(168, 80%, 36%)" stopOpacity={0} />
                </linearGradient>
                <linearGradient id="purchaseGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="hsl(38, 92%, 50%)" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="hsl(38, 92%, 50%)" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(168, 25%, 88%)" />
              <XAxis dataKey="date" tick={{ fontSize: 10 }} />
              <YAxis tick={{ fontSize: 10 }} />
              <Tooltip formatter={(val: number) => `₹${val.toLocaleString("en-IN")}`} />
              <Area type="monotone" dataKey="sales" stroke="hsl(168, 80%, 36%)" fill="url(#salesGrad)" name="Sales" />
              <Area type="monotone" dataKey="purchase" stroke="hsl(38, 92%, 50%)" fill="url(#purchaseGrad)" name="Purchase" />
            </AreaChart>
          </ResponsiveContainer>
        ) : (
          <p className="text-sm text-muted-foreground text-center py-8">No trend data yet</p>
        )}
      </CardContent>
    </Card>
  );
}
