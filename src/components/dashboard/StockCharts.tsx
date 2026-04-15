import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from "recharts";

const COLORS = ["hsl(168, 80%, 36%)", "hsl(168, 60%, 50%)", "hsl(168, 40%, 65%)", "hsl(38, 92%, 50%)", "hsl(0, 84%, 60%)", "hsl(220, 70%, 55%)", "hsl(280, 60%, 55%)", "hsl(340, 70%, 55%)"];

export function StockByBranchChart({ data }: { data: { name: string; stock: number }[] }) {
  return (
    <Card className="glass-card">
      <CardHeader><CardTitle className="text-base font-display">Stock by Branch</CardTitle></CardHeader>
      <CardContent>
        {data.length > 0 ? (
          <ResponsiveContainer width="100%" height={250}>
            <BarChart data={data}>
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
  );
}

export function StockByCategoryChart({ data }: { data: { name: string; value: number }[] }) {
  return (
    <Card className="glass-card">
      <CardHeader><CardTitle className="text-base font-display">Stock by Category</CardTitle></CardHeader>
      <CardContent>
        {data.length > 0 ? (
          <ResponsiveContainer width="100%" height={250}>
            <PieChart>
              <Pie data={data} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={90} label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}>
                {data.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
              </Pie>
              <Tooltip />
            </PieChart>
          </ResponsiveContainer>
        ) : (
          <p className="text-sm text-muted-foreground text-center py-8">No medicine data yet</p>
        )}
      </CardContent>
    </Card>
  );
}
