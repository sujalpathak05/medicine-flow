import { Card, CardContent } from "@/components/ui/card";
import { LucideIcon } from "lucide-react";

interface StatItem {
  label: string;
  value: string | number;
  icon: LucideIcon;
  color: string;
  subtext?: string;
}

export function StatCards({ stats, loading }: { stats: StatItem[]; loading: boolean }) {
  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
      {stats.map((s) => (
        <Card key={s.label} className="glass-card">
          <CardContent className="p-4 flex items-center gap-3">
            <div className={`h-10 w-10 rounded-lg bg-accent flex items-center justify-center shrink-0 ${s.color}`}>
              <s.icon className="h-5 w-5" />
            </div>
            <div className="min-w-0">
              <p className="text-xs text-muted-foreground truncate">{s.label}</p>
              <p className="text-xl font-display font-bold">{loading ? "..." : s.value}</p>
              {s.subtext && <p className="text-[10px] text-muted-foreground">{s.subtext}</p>}
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
