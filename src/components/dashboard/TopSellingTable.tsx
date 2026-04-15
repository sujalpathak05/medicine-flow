import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Star } from "lucide-react";

interface TopItem {
  name: string;
  qty: number;
  revenue: number;
}

export function TopSellingTable({ items }: { items: TopItem[] }) {
  return (
    <Card className="glass-card">
      <CardHeader>
        <CardTitle className="text-base font-display flex items-center gap-2">
          <Star className="h-4 w-4 text-warning" /> Top Selling Medicines
        </CardTitle>
      </CardHeader>
      <CardContent>
        {items.length === 0 ? (
          <p className="text-sm text-muted-foreground">No sales data yet</p>
        ) : (
          <div className="space-y-2 max-h-56 overflow-auto">
            {items.map((item, i) => (
              <div key={i} className="flex items-center justify-between p-2 rounded-md bg-accent/50">
                <div className="flex items-center gap-2 min-w-0">
                  <span className="text-xs font-bold text-primary w-5">{i + 1}</span>
                  <span className="text-sm font-medium truncate">{item.name}</span>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <Badge variant="secondary" className="text-xs">{item.qty} sold</Badge>
                  <span className="text-xs font-medium text-muted-foreground">₹{item.revenue.toLocaleString("en-IN")}</span>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
