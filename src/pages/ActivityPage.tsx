import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { Card } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Loader2 } from "lucide-react";
import type { Tables } from "@/integrations/supabase/types";

type ActivityLog = Tables<"activity_logs">;
type Profile = Tables<"profiles">;

export default function ActivityPage() {
  const [logs, setLogs] = useState<ActivityLog[]>([]);
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      const [{ data: l }, { data: p }] = await Promise.all([
        supabase.from("activity_logs").select("*").order("created_at", { ascending: false }).limit(100),
        supabase.from("profiles").select("*"),
      ]);
      setLogs(l ?? []);
      setProfiles(p ?? []);
      setLoading(false);
    };
    fetchData();

    const channel = supabase
      .channel("activity-realtime")
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "activity_logs" }, () => fetchData())
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, []);

  const getUserName = (userId: string) => profiles.find((p) => p.user_id === userId)?.full_name || "Unknown";

  return (
    <DashboardLayout>
      <div className="space-y-6 animate-fade-in">
        <div>
          <h1 className="text-2xl font-display font-bold">Activity Log</h1>
          <p className="text-sm text-muted-foreground">Track all inventory changes</p>
        </div>

        <Card className="glass-card overflow-hidden">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>User</TableHead>
                  <TableHead>Action</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Date & Time</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading ? (
                  <TableRow><TableCell colSpan={4} className="text-center py-8"><Loader2 className="h-5 w-5 animate-spin mx-auto" /></TableCell></TableRow>
                ) : logs.length === 0 ? (
                  <TableRow><TableCell colSpan={4} className="text-center py-8 text-muted-foreground">No activity yet</TableCell></TableRow>
                ) : (
                  logs.map((log) => (
                    <TableRow key={log.id}>
                      <TableCell className="font-medium">{getUserName(log.user_id)}</TableCell>
                      <TableCell>{log.action}</TableCell>
                      <TableCell className="text-sm text-muted-foreground capitalize">{log.entity_type ?? "-"}</TableCell>
                      <TableCell className="text-sm text-muted-foreground">{new Date(log.created_at).toLocaleString()}</TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </Card>
      </div>
    </DashboardLayout>
  );
}
