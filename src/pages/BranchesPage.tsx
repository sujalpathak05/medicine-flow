import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Plus, Building2, MapPin, Phone, Pencil, Trash2, Loader2 } from "lucide-react";
import { toast } from "sonner";
import type { Tables } from "@/integrations/supabase/types";

type Branch = Tables<"branches">;

export default function BranchesPage() {
  const { role, user } = useAuth();
  const isAdmin = role === "admin";
  const [branches, setBranches] = useState<Branch[]>([]);
  const [medCounts, setMedCounts] = useState<Record<string, number>>({});
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<Branch | null>(null);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({ name: "", address: "", phone: "" });

  const fetchData = async () => {
    const [{ data: brs }, { data: meds }] = await Promise.all([
      supabase.from("branches").select("*").order("name"),
      supabase.from("medicines").select("branch_id, quantity"),
    ]);
    setBranches(brs ?? []);
    const counts: Record<string, number> = {};
    (meds ?? []).forEach((m) => { counts[m.branch_id] = (counts[m.branch_id] ?? 0) + m.quantity; });
    setMedCounts(counts);
    setLoading(false);
  };

  useEffect(() => { fetchData(); }, []);

  const resetForm = () => { setForm({ name: "", address: "", phone: "" }); setEditing(null); };

  const openEdit = (b: Branch) => {
    setEditing(b);
    setForm({ name: b.name, address: b.address ?? "", phone: b.phone ?? "" });
    setDialogOpen(true);
  };

  const handleSave = async () => {
    if (!form.name) { toast.error("Name is required"); return; }
    setSaving(true);
    const payload = { name: form.name, address: form.address || null, phone: form.phone || null };
    if (editing) {
      const { error } = await supabase.from("branches").update(payload).eq("id", editing.id);
      if (error) toast.error(error.message); else toast.success("Branch updated");
    } else {
      const { error } = await supabase.from("branches").insert(payload);
      if (error) toast.error(error.message); else toast.success("Branch added");
    }
    setSaving(false);
    setDialogOpen(false);
    resetForm();
    fetchData();
  };

  const handleDelete = async (b: Branch) => {
    if (!confirm(`Delete branch "${b.name}"? This will also delete all medicines in this branch.`)) return;
    const { error } = await supabase.from("branches").delete().eq("id", b.id);
    if (error) toast.error(error.message); else { toast.success("Branch deleted"); fetchData(); }
  };

  return (
    <DashboardLayout>
      <div className="space-y-6 animate-fade-in">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-display font-bold">Branches</h1>
            <p className="text-sm text-muted-foreground">{branches.length} branches</p>
          </div>
          {isAdmin && (
            <Dialog open={dialogOpen} onOpenChange={(o) => { setDialogOpen(o); if (!o) resetForm(); }}>
              <DialogTrigger asChild>
                <Button><Plus className="h-4 w-4 mr-2" />Add Branch</Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader><DialogTitle className="font-display">{editing ? "Edit" : "Add"} Branch</DialogTitle></DialogHeader>
                <div className="grid gap-4 py-2">
                  <div className="space-y-2"><Label>Name *</Label><Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} /></div>
                  <div className="space-y-2"><Label>Address</Label><Input value={form.address} onChange={(e) => setForm({ ...form, address: e.target.value })} /></div>
                  <div className="space-y-2"><Label>Phone</Label><Input value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} /></div>
                  <Button onClick={handleSave} disabled={saving}>
                    {saving && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}{editing ? "Update" : "Add"} Branch
                  </Button>
                </div>
              </DialogContent>
            </Dialog>
          )}
        </div>

        {loading ? (
          <div className="flex justify-center py-12"><Loader2 className="h-6 w-6 animate-spin" /></div>
        ) : (
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {branches.map((b) => (
              <Card key={b.id} className="glass-card">
                <CardHeader className="pb-2">
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-2">
                      <div className="h-9 w-9 rounded-lg bg-accent flex items-center justify-center">
                        <Building2 className="h-4 w-4 text-primary" />
                      </div>
                      <div>
                        <CardTitle className="text-base font-display">{b.name}</CardTitle>
                        <Badge variant={b.is_active ? "default" : "secondary"} className="text-[10px] mt-1">
                          {b.is_active ? "Active" : "Inactive"}
                        </Badge>
                      </div>
                    </div>
                    {isAdmin && (
                      <div className="flex gap-1">
                        <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => openEdit(b)}><Pencil className="h-3 w-3" /></Button>
                        <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive" onClick={() => handleDelete(b)}><Trash2 className="h-3 w-3" /></Button>
                      </div>
                    )}
                  </div>
                </CardHeader>
                <CardContent className="space-y-2 text-sm">
                  {b.address && <div className="flex items-center gap-2 text-muted-foreground"><MapPin className="h-3 w-3" />{b.address}</div>}
                  {b.phone && <div className="flex items-center gap-2 text-muted-foreground"><Phone className="h-3 w-3" />{b.phone}</div>}
                  <div className="pt-2 border-t">
                    <span className="text-muted-foreground">Total Stock: </span>
                    <span className="font-display font-bold">{(medCounts[b.id] ?? 0).toLocaleString()}</span>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}
