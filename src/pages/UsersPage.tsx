import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Shield, User, Loader2 } from "lucide-react";
import { toast } from "sonner";
import type { Tables } from "@/integrations/supabase/types";

type Profile = Tables<"profiles">;
type UserRole = Tables<"user_roles">;
type Branch = Tables<"branches">;
type BranchUser = Tables<"branch_users">;

export default function UsersPage() {
  const { user: currentUser } = useAuth();
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [roles, setRoles] = useState<UserRole[]>([]);
  const [branches, setBranches] = useState<Branch[]>([]);
  const [branchUsers, setBranchUsers] = useState<BranchUser[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchData = async () => {
    const [{ data: p }, { data: r }, { data: b }, { data: bu }] = await Promise.all([
      supabase.from("profiles").select("*").order("full_name"),
      supabase.from("user_roles").select("*"),
      supabase.from("branches").select("*"),
      supabase.from("branch_users").select("*"),
    ]);
    setProfiles(p ?? []);
    setRoles(r ?? []);
    setBranches(b ?? []);
    setBranchUsers(bu ?? []);
    setLoading(false);
  };

  useEffect(() => { fetchData(); }, []);

  const getUserRole = (userId: string) => roles.find((r) => r.user_id === userId)?.role ?? "user";
  const getUserBranch = (userId: string) => {
    const bu = branchUsers.find((b) => b.user_id === userId);
    return bu ? branches.find((b) => b.id === bu.branch_id)?.name : "Unassigned";
  };
  const getUserBranchId = (userId: string) => branchUsers.find((b) => b.user_id === userId)?.branch_id ?? "";

  const handleRoleChange = async (userId: string, newRole: string) => {
    const existing = roles.find((r) => r.user_id === userId);
    if (existing) {
      const { error } = await supabase.from("user_roles").update({ role: newRole as any }).eq("id", existing.id);
      if (error) toast.error(error.message); else { toast.success("Role updated"); fetchData(); }
    }
  };

  const handleBranchAssign = async (userId: string, branchId: string) => {
    const existing = branchUsers.find((b) => b.user_id === userId);
    if (branchId === "none") {
      if (existing) {
        await supabase.from("branch_users").delete().eq("id", existing.id);
        toast.success("Branch unassigned");
        fetchData();
      }
      return;
    }
    if (existing) {
      const { error } = await supabase.from("branch_users").update({ branch_id: branchId }).eq("id", existing.id);
      if (error) toast.error(error.message); else { toast.success("Branch updated"); fetchData(); }
    } else {
      const { error } = await supabase.from("branch_users").insert({ user_id: userId, branch_id: branchId });
      if (error) toast.error(error.message); else { toast.success("Branch assigned"); fetchData(); }
    }
  };

  return (
    <DashboardLayout>
      <div className="space-y-6 animate-fade-in">
        <div>
          <h1 className="text-2xl font-display font-bold">Users</h1>
          <p className="text-sm text-muted-foreground">Manage users and their roles</p>
        </div>

        <Card className="glass-card overflow-hidden">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>User</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>Role</TableHead>
                  <TableHead>Branch</TableHead>
                  <TableHead>Joined</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading ? (
                  <TableRow><TableCell colSpan={5} className="text-center py-8"><Loader2 className="h-5 w-5 animate-spin mx-auto" /></TableCell></TableRow>
                ) : profiles.length === 0 ? (
                  <TableRow><TableCell colSpan={5} className="text-center py-8 text-muted-foreground">No users yet</TableCell></TableRow>
                ) : (
                  profiles.map((p) => {
                    const isCurrentUser = p.user_id === currentUser?.id;
                    const userRole = getUserRole(p.user_id);
                    return (
                      <TableRow key={p.id}>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <div className="h-8 w-8 rounded-full bg-accent flex items-center justify-center">
                              {userRole === "admin" ? <Shield className="h-4 w-4 text-primary" /> : <User className="h-4 w-4 text-muted-foreground" />}
                            </div>
                            <span className="font-medium">{p.full_name || "Unnamed"}</span>
                            {isCurrentUser && <Badge variant="outline" className="text-[10px]">You</Badge>}
                          </div>
                        </TableCell>
                        <TableCell className="text-sm text-muted-foreground">{p.email}</TableCell>
                        <TableCell>
                          <Select value={userRole} onValueChange={(v) => handleRoleChange(p.user_id, v)} disabled={isCurrentUser}>
                            <SelectTrigger className="w-28 h-8"><SelectValue /></SelectTrigger>
                            <SelectContent>
                              <SelectItem value="admin">Admin</SelectItem>
                              <SelectItem value="user">User</SelectItem>
                            </SelectContent>
                          </Select>
                        </TableCell>
                        <TableCell>
                          <Select value={getUserBranchId(p.user_id) || "none"} onValueChange={(v) => handleBranchAssign(p.user_id, v)}>
                            <SelectTrigger className="w-36 h-8"><SelectValue placeholder="Assign branch" /></SelectTrigger>
                            <SelectContent>
                              <SelectItem value="none">Unassigned</SelectItem>
                              {branches.map((b) => <SelectItem key={b.id} value={b.id}>{b.name}</SelectItem>)}
                            </SelectContent>
                          </Select>
                        </TableCell>
                        <TableCell className="text-sm text-muted-foreground">{new Date(p.created_at).toLocaleDateString()}</TableCell>
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
