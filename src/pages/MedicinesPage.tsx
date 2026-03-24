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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Plus, Search, Pencil, Trash2, Loader2 } from "lucide-react";
import { toast } from "sonner";
import type { Tables, TablesInsert } from "@/integrations/supabase/types";
import { Constants } from "@/integrations/supabase/types";

type Medicine = Tables<"medicines">;
type Branch = Tables<"branches">;

const categories = Constants.public.Enums.medicine_category;

export default function MedicinesPage() {
  const { role, user } = useAuth();
  const isAdmin = role === "admin";
  const [medicines, setMedicines] = useState<Medicine[]>([]);
  const [branches, setBranches] = useState<Branch[]>([]);
  const [search, setSearch] = useState("");
  const [categoryFilter, setCategoryFilter] = useState<string>("all");
  const [branchFilter, setBranchFilter] = useState<string>("all");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingMed, setEditingMed] = useState<Medicine | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [form, setForm] = useState({
    name: "", category: "tablet" as any, batch_number: "", expiry_date: "",
    price: "0", quantity: "0", min_quantity: "10", branch_id: "", description: "", manufacturer: "",
  });

  const fetchData = async () => {
    const [{ data: meds }, { data: brs }] = await Promise.all([
      supabase.from("medicines").select("*").order("name"),
      supabase.from("branches").select("*"),
    ]);
    setMedicines(meds ?? []);
    setBranches(brs ?? []);
    setLoading(false);
  };

  useEffect(() => {
    fetchData();
    const channel = supabase
      .channel("medicines-realtime")
      .on("postgres_changes", { event: "*", schema: "public", table: "medicines" }, () => fetchData())
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, []);

  const resetForm = () => {
    setForm({ name: "", category: "tablet", batch_number: "", expiry_date: "", price: "0", quantity: "0", min_quantity: "10", branch_id: branches[0]?.id ?? "", description: "", manufacturer: "" });
    setEditingMed(null);
  };

  const openEdit = (m: Medicine) => {
    setEditingMed(m);
    setForm({
      name: m.name, category: m.category, batch_number: m.batch_number,
      expiry_date: m.expiry_date, price: String(m.price), quantity: String(m.quantity),
      min_quantity: String(m.min_quantity), branch_id: m.branch_id,
      description: m.description ?? "", manufacturer: m.manufacturer ?? "",
    });
    setDialogOpen(true);
  };

  const handleSave = async () => {
    if (!form.name || !form.batch_number || !form.expiry_date || !form.branch_id) {
      toast.error("Please fill required fields");
      return;
    }
    setSaving(true);
    const payload: TablesInsert<"medicines"> = {
      name: form.name, category: form.category, batch_number: form.batch_number,
      expiry_date: form.expiry_date, price: parseFloat(form.price), quantity: parseInt(form.quantity),
      min_quantity: parseInt(form.min_quantity), branch_id: form.branch_id,
      description: form.description || null, manufacturer: form.manufacturer || null,
    };

    if (editingMed) {
      const { error } = await supabase.from("medicines").update(payload).eq("id", editingMed.id);
      if (error) toast.error(error.message);
      else {
        toast.success("Medicine updated");
        await logActivity("Updated medicine: " + form.name, "medicine", editingMed.id);
      }
    } else {
      const { error } = await supabase.from("medicines").insert(payload);
      if (error) toast.error(error.message);
      else {
        toast.success("Medicine added");
        await logActivity("Added medicine: " + form.name, "medicine");
      }
    }
    setSaving(false);
    setDialogOpen(false);
    resetForm();
  };

  const handleDelete = async (m: Medicine) => {
    if (!confirm(`Delete ${m.name}?`)) return;
    const { error } = await supabase.from("medicines").delete().eq("id", m.id);
    if (error) toast.error(error.message);
    else {
      toast.success("Medicine deleted");
      await logActivity("Deleted medicine: " + m.name, "medicine", m.id);
    }
  };

  const logActivity = async (action: string, entityType: string, entityId?: string) => {
    if (!user) return;
    await supabase.from("activity_logs").insert({
      user_id: user.id, action, entity_type: entityType, entity_id: entityId,
    });
  };

  const filtered = medicines.filter((m) => {
    const matchSearch = m.name.toLowerCase().includes(search.toLowerCase()) || m.batch_number.toLowerCase().includes(search.toLowerCase());
    const matchCat = categoryFilter === "all" || m.category === categoryFilter;
    const matchBranch = branchFilter === "all" || m.branch_id === branchFilter;
    return matchSearch && matchCat && matchBranch;
  });

  const getBranchName = (id: string) => branches.find((b) => b.id === id)?.name ?? "Unknown";

  return (
    <DashboardLayout>
      <div className="space-y-6 animate-fade-in">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-display font-bold">Medicines</h1>
            <p className="text-sm text-muted-foreground">{filtered.length} medicines found</p>
          </div>
          {isAdmin && (
            <Dialog open={dialogOpen} onOpenChange={(o) => { setDialogOpen(o); if (!o) resetForm(); }}>
              <DialogTrigger asChild>
                <Button><Plus className="h-4 w-4 mr-2" />Add Medicine</Button>
              </DialogTrigger>
              <DialogContent className="max-w-lg max-h-[85vh] overflow-auto">
                <DialogHeader>
                  <DialogTitle className="font-display">{editingMed ? "Edit Medicine" : "Add Medicine"}</DialogTitle>
                </DialogHeader>
                <div className="grid gap-4 py-2">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>Name *</Label>
                      <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
                    </div>
                    <div className="space-y-2">
                      <Label>Category</Label>
                      <Select value={form.category} onValueChange={(v) => setForm({ ...form, category: v as any })}>
                        <SelectTrigger><SelectValue /></SelectTrigger>
                        <SelectContent>
                          {categories.map((c) => <SelectItem key={c} value={c} className="capitalize">{c}</SelectItem>)}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>Batch Number *</Label>
                      <Input value={form.batch_number} onChange={(e) => setForm({ ...form, batch_number: e.target.value })} />
                    </div>
                    <div className="space-y-2">
                      <Label>Expiry Date *</Label>
                      <Input type="date" value={form.expiry_date} onChange={(e) => setForm({ ...form, expiry_date: e.target.value })} />
                    </div>
                  </div>
                  <div className="grid grid-cols-3 gap-4">
                    <div className="space-y-2">
                      <Label>Price</Label>
                      <Input type="number" step="0.01" value={form.price} onChange={(e) => setForm({ ...form, price: e.target.value })} />
                    </div>
                    <div className="space-y-2">
                      <Label>Quantity</Label>
                      <Input type="number" value={form.quantity} onChange={(e) => setForm({ ...form, quantity: e.target.value })} />
                    </div>
                    <div className="space-y-2">
                      <Label>Min Qty</Label>
                      <Input type="number" value={form.min_quantity} onChange={(e) => setForm({ ...form, min_quantity: e.target.value })} />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label>Branch *</Label>
                    <Select value={form.branch_id} onValueChange={(v) => setForm({ ...form, branch_id: v })}>
                      <SelectTrigger><SelectValue placeholder="Select branch" /></SelectTrigger>
                      <SelectContent>
                        {branches.map((b) => <SelectItem key={b.id} value={b.id}>{b.name}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>Manufacturer</Label>
                      <Input value={form.manufacturer} onChange={(e) => setForm({ ...form, manufacturer: e.target.value })} />
                    </div>
                    <div className="space-y-2">
                      <Label>Description</Label>
                      <Input value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />
                    </div>
                  </div>
                  <Button onClick={handleSave} disabled={saving}>
                    {saving && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                    {editingMed ? "Update" : "Add"} Medicine
                  </Button>
                </div>
              </DialogContent>
            </Dialog>
          )}
        </div>

        <div className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input placeholder="Search medicines..." className="pl-9" value={search} onChange={(e) => setSearch(e.target.value)} />
          </div>
          <Select value={categoryFilter} onValueChange={setCategoryFilter}>
            <SelectTrigger className="w-40"><SelectValue placeholder="Category" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Categories</SelectItem>
              {categories.map((c) => <SelectItem key={c} value={c} className="capitalize">{c}</SelectItem>)}
            </SelectContent>
          </Select>
          <Select value={branchFilter} onValueChange={setBranchFilter}>
            <SelectTrigger className="w-40"><SelectValue placeholder="Branch" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Branches</SelectItem>
              {branches.map((b) => <SelectItem key={b.id} value={b.id}>{b.name}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>

        <Card className="glass-card overflow-hidden">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Category</TableHead>
                  <TableHead>Batch</TableHead>
                  <TableHead>Expiry</TableHead>
                  <TableHead className="text-right">Price</TableHead>
                  <TableHead className="text-right">Qty</TableHead>
                  <TableHead>Branch</TableHead>
                  {isAdmin && <TableHead className="text-right">Actions</TableHead>}
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading ? (
                  <TableRow><TableCell colSpan={8} className="text-center py-8"><Loader2 className="h-5 w-5 animate-spin mx-auto" /></TableCell></TableRow>
                ) : filtered.length === 0 ? (
                  <TableRow><TableCell colSpan={8} className="text-center py-8 text-muted-foreground">No medicines found</TableCell></TableRow>
                ) : (
                  filtered.map((m) => {
                    const isLow = m.quantity <= m.min_quantity;
                    const isExpiring = new Date(m.expiry_date) <= new Date(Date.now() + 30 * 86400000);
                    return (
                      <TableRow key={m.id}>
                        <TableCell className="font-medium">{m.name}</TableCell>
                        <TableCell><Badge variant="secondary" className="capitalize">{m.category}</Badge></TableCell>
                        <TableCell className="text-sm text-muted-foreground">{m.batch_number}</TableCell>
                        <TableCell>
                          <span className={isExpiring ? "text-destructive font-medium" : ""}>
                            {new Date(m.expiry_date).toLocaleDateString()}
                          </span>
                        </TableCell>
                        <TableCell className="text-right">${m.price}</TableCell>
                        <TableCell className="text-right">
                          <span className={isLow ? "text-warning font-bold" : ""}>{m.quantity}</span>
                        </TableCell>
                        <TableCell className="text-sm">{getBranchName(m.branch_id)}</TableCell>
                        {isAdmin && (
                          <TableCell className="text-right">
                            <div className="flex justify-end gap-1">
                              <Button variant="ghost" size="icon" onClick={() => openEdit(m)}><Pencil className="h-4 w-4" /></Button>
                              <Button variant="ghost" size="icon" onClick={() => handleDelete(m)} className="text-destructive"><Trash2 className="h-4 w-4" /></Button>
                            </div>
                          </TableCell>
                        )}
                      </TableRow>
                    );
                  })
                )}
              </TableBody>
            </Table>
          </div>
        </Card>
      </div>
    </DashboardLayout>
  );
}
