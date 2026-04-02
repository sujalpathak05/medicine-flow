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
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Plus, Search, Pencil, Trash2, Loader2, Truck } from "lucide-react";
import { toast } from "sonner";

interface Supplier {
  id: string;
  name: string;
  contact_person: string;
  phone: string;
  email: string;
  gst_number: string;
  address: string;
  is_active: boolean;
  created_at: string;
}

export default function SuppliersPage() {
  const { role, user } = useAuth();
  const isAdmin = role === "admin";
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [search, setSearch] = useState("");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<Supplier | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({ name: "", contact_person: "", phone: "", email: "", gst_number: "", address: "" });

  const fetchData = async () => {
    const { data } = await supabase.from("suppliers").select("*").order("name") as any;
    setSuppliers(data ?? []);
    setLoading(false);
  };

  useEffect(() => { fetchData(); }, []);

  const resetForm = () => {
    setForm({ name: "", contact_person: "", phone: "", email: "", gst_number: "", address: "" });
    setEditing(null);
  };

  const openEdit = (s: Supplier) => {
    setEditing(s);
    setForm({ name: s.name, contact_person: s.contact_person, phone: s.phone, email: s.email, gst_number: s.gst_number, address: s.address });
    setDialogOpen(true);
  };

  const handleSave = async () => {
    if (!form.name) { toast.error("Name is required"); return; }
    setSaving(true);
    if (editing) {
      const { error } = await supabase.from("suppliers").update(form as any).eq("id", editing.id);
      if (error) toast.error(error.message);
      else toast.success("Supplier updated");
    } else {
      const { error } = await supabase.from("suppliers").insert(form as any);
      if (error) toast.error(error.message);
      else toast.success("Supplier added");
    }
    setSaving(false);
    setDialogOpen(false);
    resetForm();
    fetchData();
  };

  const handleDelete = async (s: Supplier) => {
    if (!confirm(`Delete supplier ${s.name}?`)) return;
    const { error } = await supabase.from("suppliers").delete().eq("id", s.id);
    if (error) toast.error(error.message);
    else { toast.success("Supplier deleted"); fetchData(); }
  };

  const filtered = suppliers.filter(s =>
    s.name.toLowerCase().includes(search.toLowerCase()) ||
    s.gst_number.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <DashboardLayout>
      <div className="space-y-6 animate-fade-in">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-display font-bold flex items-center gap-2">
              <Truck className="h-6 w-6 text-primary" /> Suppliers
            </h1>
            <p className="text-sm text-muted-foreground">{filtered.length} suppliers</p>
          </div>
          {isAdmin && (
            <Dialog open={dialogOpen} onOpenChange={(o) => { setDialogOpen(o); if (!o) resetForm(); }}>
              <DialogTrigger asChild>
                <Button><Plus className="h-4 w-4 mr-2" />Add Supplier</Button>
              </DialogTrigger>
              <DialogContent className="max-w-lg">
                <DialogHeader>
                  <DialogTitle>{editing ? "Edit Supplier" : "Add Supplier"}</DialogTitle>
                </DialogHeader>
                <div className="grid gap-4 py-2">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2"><Label>Name *</Label><Input value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} /></div>
                    <div className="space-y-2"><Label>Contact Person</Label><Input value={form.contact_person} onChange={e => setForm({ ...form, contact_person: e.target.value })} /></div>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2"><Label>Phone</Label><Input value={form.phone} onChange={e => setForm({ ...form, phone: e.target.value })} /></div>
                    <div className="space-y-2"><Label>Email</Label><Input value={form.email} onChange={e => setForm({ ...form, email: e.target.value })} /></div>
                  </div>
                  <div className="space-y-2"><Label>GST Number</Label><Input value={form.gst_number} onChange={e => setForm({ ...form, gst_number: e.target.value })} placeholder="e.g. 07AABCU9603R1ZM" /></div>
                  <div className="space-y-2"><Label>Address</Label><Input value={form.address} onChange={e => setForm({ ...form, address: e.target.value })} /></div>
                  <Button onClick={handleSave} disabled={saving}>
                    {saving && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                    {editing ? "Update" : "Add"} Supplier
                  </Button>
                </div>
              </DialogContent>
            </Dialog>
          )}
        </div>

        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input placeholder="Search by name or GST number..." className="pl-9 max-w-md" value={search} onChange={e => setSearch(e.target.value)} />
        </div>

        <Card className="glass-card overflow-hidden">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Contact</TableHead>
                  <TableHead>Phone</TableHead>
                  <TableHead>GST No.</TableHead>
                  <TableHead>Status</TableHead>
                  {isAdmin && <TableHead className="text-right">Actions</TableHead>}
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading ? (
                  <TableRow><TableCell colSpan={6} className="text-center py-8"><Loader2 className="h-5 w-5 animate-spin mx-auto" /></TableCell></TableRow>
                ) : filtered.length === 0 ? (
                  <TableRow><TableCell colSpan={6} className="text-center py-8 text-muted-foreground">No suppliers found</TableCell></TableRow>
                ) : filtered.map(s => (
                  <TableRow key={s.id}>
                    <TableCell className="font-medium">{s.name}</TableCell>
                    <TableCell className="text-sm">{s.contact_person}</TableCell>
                    <TableCell className="text-sm">{s.phone}</TableCell>
                    <TableCell className="text-sm font-mono">{s.gst_number}</TableCell>
                    <TableCell><Badge variant={s.is_active ? "default" : "secondary"}>{s.is_active ? "Active" : "Inactive"}</Badge></TableCell>
                    {isAdmin && (
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-1">
                          <Button variant="ghost" size="icon" onClick={() => openEdit(s)}><Pencil className="h-4 w-4" /></Button>
                          <Button variant="ghost" size="icon" onClick={() => handleDelete(s)} className="text-destructive"><Trash2 className="h-4 w-4" /></Button>
                        </div>
                      </TableCell>
                    )}
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </Card>
      </div>
    </DashboardLayout>
  );
}
