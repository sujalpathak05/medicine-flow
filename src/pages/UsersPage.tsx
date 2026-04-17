import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Shield, User, Loader2, Plus, Copy, Check, Trash2, KeyRound } from "lucide-react";
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

  // Create user state
  const [createOpen, setCreateOpen] = useState(false);
  const [creating, setCreating] = useState(false);
  const [newEmail, setNewEmail] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [newFullName, setNewFullName] = useState("");
  const [newRole, setNewRole] = useState<"user" | "admin" | "staff" | "cashier">("user");
  const [createdCredentials, setCreatedCredentials] = useState<{ email: string; password: string; loginUrl: string } | null>(null);
  const [copied, setCopied] = useState(false);

  // Reset password state
  const [resetOpen, setResetOpen] = useState(false);
  const [resetUserId, setResetUserId] = useState("");
  const [resetUserEmail, setResetUserEmail] = useState("");
  const [resetPassword, setResetPassword] = useState("");
  const [resetting, setResetting] = useState(false);

  // Delete user state
  const [deleting, setDeleting] = useState<string | null>(null);

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

  const handleCreateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    setCreating(true);
    try {
      const { data, error } = await supabase.functions.invoke("manage-users", {
        body: { action: "create_user", email: newEmail, password: newPassword, full_name: newFullName, role: newRole },
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);

      const loginUrl = `${window.location.origin}/auth`;
      setCreatedCredentials({ email: newEmail, password: newPassword, loginUrl });
      toast.success("User created successfully!");
      fetchData();
    } catch (err: any) {
      toast.error(err.message || "Failed to create user");
    } finally {
      setCreating(false);
    }
  };

  const handleCopyCredentials = async () => {
    if (!createdCredentials) return;
    const text = `🏥 MedInventory Login Details\n\n📧 Email: ${createdCredentials.email}\n🔑 Password: ${createdCredentials.password}\n🔗 Login URL: ${createdCredentials.loginUrl}\n\nPlease login and change your password.`;
    await navigator.clipboard.writeText(text);
    setCopied(true);
    toast.success("Credentials copied to clipboard!");
    setTimeout(() => setCopied(false), 2000);
  };

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setResetting(true);
    try {
      const { data, error } = await supabase.functions.invoke("manage-users", {
        body: { action: "reset_password", user_id: resetUserId, new_password: resetPassword },
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      toast.success("Password reset successfully!");
      setResetOpen(false);
      setResetPassword("");
    } catch (err: any) {
      toast.error(err.message || "Failed to reset password");
    } finally {
      setResetting(false);
    }
  };

  const handleDeleteUser = async (userId: string) => {
    if (!confirm("Are you sure you want to delete this user?")) return;
    setDeleting(userId);
    try {
      const { data, error } = await supabase.functions.invoke("manage-users", {
        body: { action: "delete_user", user_id: userId },
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      toast.success("User deleted");
      fetchData();
    } catch (err: any) {
      toast.error(err.message || "Failed to delete user");
    } finally {
      setDeleting(null);
    }
  };

  const resetCreateForm = () => {
    setNewEmail("");
    setNewPassword("");
    setNewFullName("");
    setNewRole("user");
    setCreatedCredentials(null);
    setCopied(false);
  };

  return (
    <DashboardLayout>
      <div className="space-y-6 animate-fade-in">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-display font-bold">Users</h1>
            <p className="text-sm text-muted-foreground">Manage users, roles, and credentials</p>
          </div>

          <Dialog open={createOpen} onOpenChange={(o) => { setCreateOpen(o); if (!o) resetCreateForm(); }}>
            <DialogTrigger asChild>
              <Button><Plus className="h-4 w-4 mr-2" />Create User</Button>
            </DialogTrigger>
            <DialogContent className="max-w-md">
              <DialogHeader>
                <DialogTitle className="font-display">
                  {createdCredentials ? "User Created!" : "Create New User"}
                </DialogTitle>
              </DialogHeader>

              {createdCredentials ? (
                <div className="space-y-4">
                  <div className="rounded-lg border bg-muted/50 p-4 space-y-2">
                    <p className="text-sm font-medium">Login Credentials:</p>
                    <div className="text-sm space-y-1">
                      <p><span className="text-muted-foreground">Email:</span> {createdCredentials.email}</p>
                      <p><span className="text-muted-foreground">Password:</span> {createdCredentials.password}</p>
                      <p><span className="text-muted-foreground">Login URL:</span> {createdCredentials.loginUrl}</p>
                    </div>
                  </div>
                  <Button onClick={handleCopyCredentials} className="w-full" variant="outline">
                    {copied ? <Check className="h-4 w-4 mr-2" /> : <Copy className="h-4 w-4 mr-2" />}
                    {copied ? "Copied!" : "Copy Credentials"}
                  </Button>
                  <Button onClick={() => { resetCreateForm(); }} className="w-full">
                    Create Another User
                  </Button>
                </div>
              ) : (
                <form onSubmit={handleCreateUser} className="space-y-4">
                  <div className="space-y-2">
                    <Label>Full Name</Label>
                    <Input value={newFullName} onChange={(e) => setNewFullName(e.target.value)} placeholder="User name" required />
                  </div>
                  <div className="space-y-2">
                    <Label>Email</Label>
                    <Input type="email" value={newEmail} onChange={(e) => setNewEmail(e.target.value)} placeholder="user@example.com" required />
                  </div>
                  <div className="space-y-2">
                    <Label>Password</Label>
                    <Input type="text" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} placeholder="Set a password" required minLength={6} />
                  </div>
                  <div className="space-y-2">
                    <Label>Role</Label>
                    <Select value={newRole} onValueChange={(v) => setNewRole(v as any)}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="admin">Admin (Full access)</SelectItem>
                        <SelectItem value="staff">Staff (Inventory + Billing)</SelectItem>
                        <SelectItem value="cashier">Cashier (Billing only)</SelectItem>
                        <SelectItem value="user">User (Basic)</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <Button type="submit" className="w-full" disabled={creating}>
                    {creating && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                    Create User
                  </Button>
                </form>
              )}
            </DialogContent>
          </Dialog>
        </div>

        {/* Reset Password Dialog */}
        <Dialog open={resetOpen} onOpenChange={(o) => { setResetOpen(o); if (!o) setResetPassword(""); }}>
          <DialogContent className="max-w-sm">
            <DialogHeader>
              <DialogTitle className="font-display">Reset Password</DialogTitle>
            </DialogHeader>
            <p className="text-sm text-muted-foreground">Set new password for {resetUserEmail}</p>
            <form onSubmit={handleResetPassword} className="space-y-4">
              <div className="space-y-2">
                <Label>New Password</Label>
                <Input type="text" value={resetPassword} onChange={(e) => setResetPassword(e.target.value)} placeholder="New password" required minLength={6} />
              </div>
              <Button type="submit" className="w-full" disabled={resetting}>
                {resetting && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                Reset Password
              </Button>
            </form>
          </DialogContent>
        </Dialog>

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
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading ? (
                  <TableRow><TableCell colSpan={6} className="text-center py-8"><Loader2 className="h-5 w-5 animate-spin mx-auto" /></TableCell></TableRow>
                ) : profiles.length === 0 ? (
                  <TableRow><TableCell colSpan={6} className="text-center py-8 text-muted-foreground">No users yet</TableCell></TableRow>
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
                        <TableCell>
                          <div className="flex gap-1">
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8"
                              title="Reset Password"
                              onClick={() => {
                                setResetUserId(p.user_id);
                                setResetUserEmail(p.email || "");
                                setResetOpen(true);
                              }}
                            >
                              <KeyRound className="h-4 w-4" />
                            </Button>
                            {!isCurrentUser && (
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-8 w-8 text-destructive hover:text-destructive"
                                title="Delete User"
                                disabled={deleting === p.user_id}
                                onClick={() => handleDeleteUser(p.user_id)}
                              >
                                {deleting === p.user_id ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
                              </Button>
                            )}
                          </div>
                        </TableCell>
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
