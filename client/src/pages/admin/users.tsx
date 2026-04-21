import { useEffect, useMemo, useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { format } from "date-fns";
import {
  CheckCircle2,
  KeyRound,
  Loader2,
  Pencil,
  Trash2,
  Users as UsersIcon,
  XCircle,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import type { User } from "@shared/schema";
import { useGroupsFocus } from "./groups-focus-context";
import { AdminLayout } from "./layout";
import { useUsers } from "./hooks";

function EditUserDialog({
  user,
  open,
  onOpenChange,
  onSave,
  isSaving,
}: {
  user: User | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSave: (data: Partial<User>) => void;
  isSaving: boolean;
}) {
  const { toast } = useToast();
  const [formData, setFormData] = useState({
    fullName: "",
    email: "",
    companyName: "",
    phone: "",
    role: "client",
    verified: false,
  });
  const [isResetting, setIsResetting] = useState(false);

  useEffect(() => {
    if (user) {
      setFormData({
        fullName: user.fullName ?? "",
        email: user.email ?? "",
        companyName: user.companyName ?? "",
        phone: user.phone ?? "",
        role: user.role ?? "client",
        verified: user.verified ?? false,
      });
    }
  }, [user]);

  async function handleReset() {
    if (!user) return;
    setIsResetting(true);
    try {
      const res = await fetch(`/api/admin/users/${user.id}/reset-password`, {
        method: "POST",
        credentials: "include",
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.message ?? "Failed to send reset email");
      }
      toast({
        title: "Password reset sent",
        description: `Reset email sent to ${user.email}`,
      });
    } catch (err: any) {
      toast({
        title: "Failed to send reset email",
        description: err.message,
        variant: "destructive",
      });
    } finally {
      setIsResetting(false);
    }
  }

  if (!user) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Edit User</DialogTitle>
          <DialogDescription>Update user details and permissions.</DialogDescription>
        </DialogHeader>
        <div className="space-y-4 py-2">
          <div className="space-y-2">
            <Label htmlFor="fullName">Full Name</Label>
            <Input
              id="fullName"
              value={formData.fullName}
              onChange={(e) => setFormData({ ...formData, fullName: e.target.value })}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="email">Email</Label>
            <Input
              id="email"
              type="email"
              value={formData.email}
              onChange={(e) => setFormData({ ...formData, email: e.target.value })}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="companyName">Company Name</Label>
            <Input
              id="companyName"
              value={formData.companyName}
              onChange={(e) => setFormData({ ...formData, companyName: e.target.value })}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="phone">Phone</Label>
            <Input
              id="phone"
              value={formData.phone}
              onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="role">Role</Label>
            <Select value={formData.role} onValueChange={(v) => setFormData({ ...formData, role: v })}>
              <SelectTrigger id="role">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="client">Client</SelectItem>
                <SelectItem value="admin">Admin</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              id="verified"
              checked={formData.verified}
              onChange={(e) => setFormData({ ...formData, verified: e.target.checked })}
              className="h-4 w-4 rounded border-input"
            />
            <Label htmlFor="verified" className="cursor-pointer">Verified</Label>
          </div>
          <div className="flex items-center justify-between border-t pt-4">
            <div>
              <p className="text-sm font-medium">Password Reset</p>
              <p className="text-xs text-muted-foreground">Email a password-reset link to this user.</p>
            </div>
            <Button variant="outline" size="sm" onClick={handleReset} disabled={isResetting || isSaving}>
              {isResetting ? (
                <>
                  <Loader2 className="mr-2 h-3 w-3 animate-spin" />
                  Sending…
                </>
              ) : (
                <>
                  <KeyRound className="mr-2 h-3 w-3" />
                  Send Reset Email
                </>
              )}
            </Button>
          </div>
        </div>
        <div className="flex justify-end gap-2">
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={isSaving}>
            Cancel
          </Button>
          <Button onClick={() => onSave(formData)} disabled={isSaving}>
            {isSaving ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Saving…
              </>
            ) : (
              "Save Changes"
            )}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

export default function AdminUsersPage() {
  return (
    <AdminLayout
      crumbs={[{ label: "Admin", href: "/admin/dashboard" }, { label: "Users" }]}
    >
      <UsersPageContent />
    </AdminLayout>
  );
}

function UsersPageContent() {
  const { toast } = useToast();
  const { data: users, isLoading } = useUsers();
  const { searchRef } = useGroupsFocus();
  const [searchValue, setSearchValue] = useState("");
  const [selected, setSelected] = useState<User | null>(null);
  const [editOpen, setEditOpen] = useState(false);
  const [deleteId, setDeleteId] = useState<string | null>(null);

  useEffect(() => {
    const input = searchRef.current;
    if (!input) return;
    const onInput = () => setSearchValue(input.value);
    input.addEventListener("input", onInput);
    setSearchValue(input.value);
    return () => input.removeEventListener("input", onInput);
  }, [searchRef]);

  const updateMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: Partial<User> }) => {
      return await apiRequest("PATCH", `/api/admin/users/${id}`, data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/users"] });
      toast({ title: "User updated" });
      setEditOpen(false);
      setSelected(null);
    },
    onError: (err: any) => {
      toast({ title: "Update failed", description: err.message, variant: "destructive" });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      await apiRequest("DELETE", `/api/admin/users/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/users"] });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/groups"] });
      toast({ title: "User deleted" });
      setDeleteId(null);
    },
    onError: (err: any) => {
      toast({ title: "Delete failed", description: err.message, variant: "destructive" });
    },
  });

  const filtered = useMemo(() => {
    if (!users) return [];
    const q = searchValue.trim().toLowerCase();
    if (!q) return users;
    return users.filter(
      (u) =>
        u.fullName?.toLowerCase().includes(q) ||
        u.email?.toLowerCase().includes(q) ||
        u.companyName?.toLowerCase().includes(q),
    );
  }, [users, searchValue]);

  return (
    <>
      <div className="mb-6 flex items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-[-0.02em]">Users</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Manage broker and client accounts, roles, and verification.
          </p>
        </div>
        <Badge variant="secondary" className="px-3 py-1 text-xs font-medium">
          {filtered.length} {filtered.length === 1 ? "user" : "users"}
        </Badge>
      </div>

      <Card className="overflow-hidden border-card-border">
        {isLoading ? (
          <div className="space-y-2 p-4">
            {[0, 1, 2, 3].map((i) => (
              <Skeleton key={i} className="h-12 w-full" />
            ))}
          </div>
        ) : filtered.length === 0 ? (
          <div className="p-10 text-center">
            <UsersIcon className="mx-auto h-10 w-10 text-muted-foreground" />
            <h3 className="mt-3 font-semibold">No users found</h3>
            <p className="mt-1 text-sm text-muted-foreground">
              {searchValue ? "Adjust the search above." : "No registered users yet."}
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-muted/30">
                <tr className="border-b border-card-border text-muted-foreground">
                  <th className="px-4 py-3 text-left text-[11px] font-medium uppercase tracking-wide">Name</th>
                  <th className="px-4 py-3 text-left text-[11px] font-medium uppercase tracking-wide">Email</th>
                  <th className="px-4 py-3 text-left text-[11px] font-medium uppercase tracking-wide">Company</th>
                  <th className="px-4 py-3 text-left text-[11px] font-medium uppercase tracking-wide">Phone</th>
                  <th className="px-4 py-3 text-left text-[11px] font-medium uppercase tracking-wide">Role</th>
                  <th className="px-4 py-3 text-center text-[11px] font-medium uppercase tracking-wide">Verified</th>
                  <th className="px-4 py-3 text-left text-[11px] font-medium uppercase tracking-wide">Joined</th>
                  <th className="px-4 py-3 text-right text-[11px] font-medium uppercase tracking-wide">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((u) => (
                  <tr key={u.id} className="border-b border-card-border last:border-0 hover:bg-muted/30">
                    <td className="px-4 py-3 font-medium">{u.fullName}</td>
                    <td className="px-4 py-3 text-muted-foreground">{u.email}</td>
                    <td className="px-4 py-3">{u.companyName || "—"}</td>
                    <td className="px-4 py-3 text-muted-foreground">{u.phone || "—"}</td>
                    <td className="px-4 py-3">
                      <Badge
                        variant="secondary"
                        className={
                          u.role === "admin"
                            ? "bg-blue-500/10 text-blue-700 dark:text-blue-400 border-blue-500/20"
                            : "bg-muted text-muted-foreground"
                        }
                      >
                        {u.role}
                      </Badge>
                    </td>
                    <td className="px-4 py-3 text-center">
                      {u.verified ? (
                        <CheckCircle2 className="mx-auto h-4 w-4 text-green-700 dark:text-green-400" />
                      ) : (
                        <XCircle className="mx-auto h-4 w-4 text-muted-foreground" />
                      )}
                    </td>
                    <td className="px-4 py-3 text-muted-foreground">
                      {u.createdAt ? format(new Date(u.createdAt), "MMM d, yyyy") : "—"}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center justify-end gap-1">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => {
                            setSelected(u);
                            setEditOpen(true);
                          }}
                          data-testid={`button-edit-user-${u.id}`}
                        >
                          <Pencil className="h-3.5 w-3.5" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => setDeleteId(u.id)}
                          data-testid={`button-delete-user-${u.id}`}
                        >
                          <Trash2 className="h-3.5 w-3.5 text-destructive" />
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      <EditUserDialog
        user={selected}
        open={editOpen}
        onOpenChange={(open) => {
          setEditOpen(open);
          if (!open) setSelected(null);
        }}
        onSave={(data) => {
          if (selected) updateMutation.mutate({ id: selected.id, data });
        }}
        isSaving={updateMutation.isPending}
      />

      <AlertDialog open={!!deleteId} onOpenChange={(open) => !open && setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete user</AlertDialogTitle>
            <AlertDialogDescription>
              This cascades to their groups, census entries, and proposals. This action can't be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => deleteId && deleteMutation.mutate(deleteId)}
              className="bg-destructive hover:bg-destructive/90"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
