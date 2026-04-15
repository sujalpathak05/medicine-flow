import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { AlertTriangle, Clock, PackageX, Archive } from "lucide-react";
import type { Tables } from "@/integrations/supabase/types";

type Medicine = Tables<"medicines">;

interface AlertsPanelProps {
  medicines: Medicine[];
}

export function LowStockPanel({ medicines }: AlertsPanelProps) {
  const items = medicines.filter((m) => m.quantity > 0 && m.quantity <= m.min_quantity);
  return (
    <Card className="glass-card">
      <CardHeader>
        <CardTitle className="text-base font-display flex items-center gap-2">
          <AlertTriangle className="h-4 w-4 text-warning" /> Low Stock ({items.length})
        </CardTitle>
      </CardHeader>
      <CardContent>
        {items.length === 0 ? (
          <p className="text-sm text-muted-foreground">All stock levels healthy ✓</p>
        ) : (
          <div className="space-y-2 max-h-48 overflow-auto">
            {items.map((m) => (
              <div key={m.id} className="flex items-center justify-between p-2 rounded-md bg-warning/10">
                <span className="text-sm font-medium truncate">{m.name}</span>
                <Badge variant="outline" className="text-warning border-warning shrink-0">
                  {m.quantity} / {m.min_quantity}
                </Badge>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

export function ExpiryPanel({ medicines }: AlertsPanelProps) {
  const now = new Date();
  const d30 = new Date(); d30.setDate(d30.getDate() + 30);
  const items = medicines.filter((m) => new Date(m.expiry_date) <= d30 && new Date(m.expiry_date) >= now);
  const expired = medicines.filter((m) => new Date(m.expiry_date) < now);
  const all = [...expired, ...items];
  return (
    <Card className="glass-card">
      <CardHeader>
        <CardTitle className="text-base font-display flex items-center gap-2">
          <Clock className="h-4 w-4 text-destructive" /> Expiry Alerts ({all.length})
        </CardTitle>
      </CardHeader>
      <CardContent>
        {all.length === 0 ? (
          <p className="text-sm text-muted-foreground">No expiry issues ✓</p>
        ) : (
          <div className="space-y-2 max-h-48 overflow-auto">
            {all.map((m) => {
              const isExpired = new Date(m.expiry_date) < now;
              return (
                <div key={m.id} className={`flex items-center justify-between p-2 rounded-md ${isExpired ? "bg-destructive/15" : "bg-destructive/10"}`}>
                  <span className="text-sm font-medium truncate">{m.name}</span>
                  <Badge variant="outline" className={`shrink-0 ${isExpired ? "text-destructive border-destructive" : "text-warning border-warning"}`}>
                    {isExpired ? "EXPIRED" : new Date(m.expiry_date).toLocaleDateString()}
                  </Badge>
                </div>
              );
            })}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

export function OutOfStockPanel({ medicines }: AlertsPanelProps) {
  const items = medicines.filter((m) => m.quantity === 0);
  return (
    <Card className="glass-card">
      <CardHeader>
        <CardTitle className="text-base font-display flex items-center gap-2">
          <PackageX className="h-4 w-4 text-destructive" /> Out of Stock ({items.length})
        </CardTitle>
      </CardHeader>
      <CardContent>
        {items.length === 0 ? (
          <p className="text-sm text-muted-foreground">No out-of-stock items ✓</p>
        ) : (
          <div className="space-y-2 max-h-48 overflow-auto">
            {items.slice(0, 10).map((m) => (
              <div key={m.id} className="flex items-center justify-between p-2 rounded-md bg-destructive/10">
                <span className="text-sm font-medium truncate">{m.name}</span>
                <Badge variant="outline" className="text-destructive border-destructive shrink-0">0 units</Badge>
              </div>
            ))}
            {items.length > 10 && <p className="text-xs text-muted-foreground text-center">+{items.length - 10} more</p>}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

export function DeadStockPanel({ medicines, saleItemMedicineIds }: AlertsPanelProps & { saleItemMedicineIds: Set<string> }) {
  const items = medicines.filter((m) => m.quantity > 0 && !saleItemMedicineIds.has(m.id));
  return (
    <Card className="glass-card">
      <CardHeader>
        <CardTitle className="text-base font-display flex items-center gap-2">
          <Archive className="h-4 w-4 text-muted-foreground" /> Dead Stock ({items.length})
        </CardTitle>
      </CardHeader>
      <CardContent>
        {items.length === 0 ? (
          <p className="text-sm text-muted-foreground">No dead stock ✓</p>
        ) : (
          <div className="space-y-2 max-h-48 overflow-auto">
            {items.slice(0, 10).map((m) => (
              <div key={m.id} className="flex items-center justify-between p-2 rounded-md bg-muted">
                <span className="text-sm font-medium truncate">{m.name}</span>
                <Badge variant="outline" className="shrink-0">{m.quantity} units</Badge>
              </div>
            ))}
            {items.length > 10 && <p className="text-xs text-muted-foreground text-center">+{items.length - 10} more</p>}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
