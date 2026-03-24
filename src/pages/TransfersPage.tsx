import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { ArrowLeftRight, Plus, Check, X, Loader2 } from "lucide-react";
import { toast } from "sonner";
import type { Tables } from "@/integrations/supabase/types";

type Transfer = Tables<"stock_transfers">;
type Medicine = Tables<"medicines">;
type Branch = Tables<"branches">;

const statusColors: Record<string, string> = {
  pending: "bg-warning/10 text-warning border-warning/30",
  approved: "bg-primary/10 text-primary border-primary/30",
  rejected: "bg-destructive/10 text-destructive border-destructive/30",
  completed: "bg-success/10 text-success border-success/30",
};

export default function TransfersPage() {
  const { role, user } = useAuth();
  const isAdmin = role === "admin";
  const [transfers, setTransfers] = useState<Transfer[]>([]);
  const [medicines, setMedicines] = useState<Medicine[]>([]);
  const [branches, setBranches] = useState<Branch[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({ medicine_id: "", from_branch_id: "", to_branch_id: "", quantity: "1", notes: "" });

  const fetchData = async () => {
    const [{ data: t }, { data: m }, { data: b }] = await Promise.all([
      supabase.from("stock_transfers").select("*").order("created_at", { ascending: false }),
      supabase.from("medicines").select("*"),
      supabase.from("branches").select("*"),
    ]);
    setTransfers(t ?? []);
    setMedicines(m ?? []);
    setBranches(b ?? []);
    setLoading(false);
  };

  useEffect(() => {
    fetchData();
    const channel = supabase
      .channel("transfers-realtime")
      .on("postgres_changes", { event: "*", schema: "public", table: "stock_transfers" }, () => fetchData())
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, []);

  const getMedName = (id: string) => medicines.find((m) => m.id === id)?.name ?? "Unknown";
  const getBranchName = (id: string) => branches.find((b) => b.id === id)?.name ?? "Unknown";

  const handleCreate = async () => {
    if (!form.medicine_id || !form.from_branch_id || !form.to_branch_id || !user) {
      toast.error("Fill all required fields");
      return;
    }
    if (form.from_branch_id === form.to_branch_id) {
      toast.error("Source and destination must be different");
      return;
    }
    setSaving(true);
    const { error } = await supabase.from("stock_transfers").insert({
      medicine_id: form.medicine_id,
      from_branch_id: form.from_branch_id,
      to_branch_id: form.to_branch_id,
      quantity: parseInt(form.quantity),
      requested_by: user.id,
      notes: form.notes || null,
    });
    if (error) toast.error(error.message);
    else { toast.success("Transfer requested"); setDialogOpen(false); setForm({ medicine_id: "", from_branch_id: "", to_branch_id: "", quantity: "1", notes: "" }); }
    setSaving(false);
  };

  const handleApprove = async (t: Transfer) => {
    if (!user) return;
    const { error } = await supabase.from("stock_transfers").update({ status: "approved", approved_by: user.id }).eq("id", t.id);
    if (error) toast.error(error.message); else toast.success("Transfer approved");
  };

  const handleReject = async (t: Transfer) => {
    if (!user) return;
    const { error } = await supabase.from("stock_transfers").update({ status: "rejected", approved_by: user.id }).eq("id", t.id);
    if (error) toast.error(error.message); else toast.success("Transfer rejected");
  };

  return (
    <DashboardLayout>
      <div className="space-y-6 animate-fade-in">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-display font-bold">Stock Transfers</h1>
            <p className="text-sm text-muted-foreground">Transfer stock between branches</p>
          </div>
          <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
            <DialogTrigger asChild>
              <Button><Plus className="h-4 w-4 mr-2" />New Transfer</Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader><DialogTitle className="font-display">Request Transfer</DialogTitle></DialogHeader>
              <div className="grid gap-4 py-2">
                <div className="space-y-2">
                  <Label>Medicine *</Label>
                  <Select value={form.medicine_id} onValueChange={(v) => setForm({ ...form, medicine_id: v })}>
                    <SelectTrigger><SelectValue placeholder="Select medicine" /></SelectTrigger>
                    <SelectContent>
                      {medicines.map((m) => <SelectItem key={m.id} value={m.id}>{m.name} (Qty: {m.quantity})</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>From Branch *</Label>
                    <Select value={form.from_branch_id} onValueChange={(v) => setForm({ ...form, from_branch_id: v })}>
                      <SelectTrigger><SelectValue placeholder="Source" /></SelectTrigger>
                      <SelectContent>{branches.map((b) => <SelectItem key={b.id} value={b.id}>{b.name}</SelectItem>)}</SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>To Branch *</Label>
                    <Select value={form.to_branch_id} onValueChange={(v) => setForm({ ...form, to_branch_id: v })}>
                      <SelectTrigger><SelectValue placeholder="Destination" /></SelectTrigger>
                      <SelectContent>{branches.map((b) => <SelectItem key={b.id} value={b.id}>{b.name}</SelectItem>)}</SelectContent>
                    </Select>
                  </div>
                </div>
                <div className="space-y-2">
                  <Label>Quantity</Label>
                  <Input type="number" min="1" value={form.quantity} onChange={(e) => setForm({ ...form, quantity: e.target.value })} />
                </div>
                <div className="space-y-2">
                  <Label>Notes</Label>
                  <Input value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} placeholder="Optional notes..." />
                </div>
                <Button onClick={handleCreate} disabled={saving}>
                  {saving && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}Request Transfer
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>

        <Card className="glass-card overflow-hidden">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Medicine</TableHead>
                  <TableHead>From → To</TableHead>
                  <TableHead className="text-right">Qty</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Date</TableHead>
                  {isAdmin && <TableHead className="text-right">Actions</TableHead>}
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading ? (
                  <TableRow><TableCell colSpan={6} className="text-center py-8"><Loader2 className="h-5 w-5 animate-spin mx-auto" /></TableCell></TableRow>
                ) : transfers.length === 0 ? (
                  <TableRow><TableCell colSpan={6} className="text-center py-8 text-muted-foreground">No transfers yet</TableCell></TableRow>
                ) : (
                  transfers.map((t) => (
                    <TableRow key={t.id}>
                      <TableCell className="font-medium">{getMedName(t.medicine_id)}</TableCell>
                      <TableCell className="text-sm">
                        {getBranchName(t.from_branch_id)} <ArrowLeftRight className="h-3 w-3 inline mx-1" /> {getBranchName(t.to_branch_id)}
                      </TableCell>
                      <TableCell className="text-right">{t.quantity}</TableCell>
                      <TableCell>
                        <Badge variant="outline" className={`capitalize ${statusColors[t.status]}`}>{t.status}</Badge>
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">{new Date(t.created_at).toLocaleDateString()}</TableCell>
                      {isAdmin && (
                        <TableCell className="text-right">
                          {t.status === "pending" && (
                            <div className="flex justify-end gap-1">
                              <Button variant="ghost" size="icon" className="h-8 w-8 text-success" onClick={() => handleApprove(t)}><Check className="h-4 w-4" /></Button>
                              <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive" onClick={() => handleReject(t)}><X className="h-4 w-4" /></Button>
                            </div>
                          )}
                        </TableCell>
                      )}
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
