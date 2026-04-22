import { useMemo, useState } from "react";
import { useLocation } from "wouter";
import { useMutation } from "@tanstack/react-query";
import { format } from "date-fns";
import {
  ChevronRight,
  Mail,
  MoreHorizontal,
  Pencil,
  Search,
  ShieldCheck,
  Trash2,
  UserCog,
} from "lucide-react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
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
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useAdminUsersWithGroups, type UserWithGroups } from "@/hooks/use-admin";
import { ProposalNav } from "@/components/proposal/proposal-nav";
import { EditUserDialog } from "@/components/admin/edit-user-dialog";
import { STATUS_OPTIONS, TIER_CONFIG, type RiskTier } from "./constants";
import { cn } from "@/lib/utils";
import type { Group, User } from "@shared/schema";

// Single unified admin page. Shows every user with their groups nested
// beneath. Clicking a group routes to /admin/groups/:id which renders
// the same cockpit the customer sees, with an admin banner overlaid.
// Replaces the old dashboard, groups-list, group-detail, users, and
// generator pages.
export default function AdminHome() {
  const { toast } = useToast();
  const [, navigate] = useLocation();
  const { users, isLoading } = useAdminUsersWithGroups();
  const [search, setSearch] = useState("");
  const [editUser, setEditUser] = useState<User | null>(null);
  const [deleteUserId, setDeleteUserId] = useState<string | null>(null);

  const deleteUser = useMutation({
    mutationFn: async (id: string) => apiRequest("DELETE", `/api/admin/users/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/users"] });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/groups"] });
      toast({ title: "User deleted" });
      setDeleteUserId(null);
    },
    onError: (err: any) => {
      toast({ title: "Delete failed", description: err.message, variant: "destructive" });
    },
  });

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return users;
    return users.filter((u) => {
      if (
        u.fullName?.toLowerCase().includes(q) ||
        u.email?.toLowerCase().includes(q) ||
        u.companyName?.toLowerCase().includes(q)
      ) return true;
      return u.groups.some((g) => g.companyName?.toLowerCase().includes(q));
    });
  }, [users, search]);

  const totalGroups = users.reduce((sum, u) => sum + u.groups.length, 0);

  return (
    <div className="min-h-screen bg-background">
      <ProposalNav />
      <div className="mx-auto max-w-[1280px] px-6 py-8">
        <div className="mb-6 flex flex-wrap items-end justify-between gap-3">
          <div>
            <div className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.14em] text-primary">
              <ShieldCheck className="h-3.5 w-3.5" />
              Admin
            </div>
            <h1 className="mt-1 text-3xl font-bold tracking-tight">Users &amp; Groups</h1>
            <p className="mt-1 text-sm text-muted-foreground">
              Click any group to open it in the customer view and take action.
            </p>
          </div>
          <div className="flex items-center gap-3">
            <Badge variant="secondary" className="px-3 py-1">
              {users.length} {users.length === 1 ? "user" : "users"} · {totalGroups}{" "}
              {totalGroups === 1 ? "group" : "groups"}
            </Badge>
          </div>
        </div>

        <div className="mb-5">
          <div className="relative max-w-md">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Search by name, email, or company…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9"
              data-testid="input-admin-search"
            />
          </div>
        </div>

        {isLoading ? (
          <div className="space-y-3">
            {[0, 1, 2].map((i) => (
              <Skeleton key={i} className="h-24 w-full" />
            ))}
          </div>
        ) : filtered.length === 0 ? (
          <Card className="p-10 text-center text-muted-foreground">
            {search ? "No users match your search." : "No users yet."}
          </Card>
        ) : (
          <div className="space-y-3">
            {filtered.map((u) => (
              <UserCard
                key={u.id}
                user={u}
                onOpenGroup={(g) => navigate(`/admin/groups/${g.id}`)}
                onEdit={() => setEditUser(u)}
                onDelete={() => setDeleteUserId(u.id)}
              />
            ))}
          </div>
        )}
      </div>

      <EditUserDialog
        user={editUser}
        open={Boolean(editUser)}
        onOpenChange={(o) => !o && setEditUser(null)}
      />

      <AlertDialog open={Boolean(deleteUserId)} onOpenChange={(o) => !o && setDeleteUserId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete this user?</AlertDialogTitle>
            <AlertDialogDescription>
              Cascades to all of their groups, census entries, and proposals. Cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => deleteUserId && deleteUser.mutate(deleteUserId)}
              className="bg-destructive hover:bg-destructive/90"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

function UserCard({
  user,
  onOpenGroup,
  onEdit,
  onDelete,
}: {
  user: UserWithGroups;
  onOpenGroup: (g: Group) => void;
  onEdit: () => void;
  onDelete: () => void;
}) {
  const initial = (user.fullName || user.email || "?").trim().charAt(0).toUpperCase();
  return (
    <Card data-testid={`card-user-${user.id}`} className="overflow-hidden">
      <div className="flex items-center gap-4 border-b bg-muted/30 px-5 py-4">
        <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10 text-sm font-semibold text-primary">
          {initial}
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <div className="truncate text-base font-semibold" data-testid="text-user-name">
              {user.fullName || "Unknown"}
            </div>
            {user.role === "admin" && (
              <Badge variant="secondary" className="bg-blue-500/10 text-blue-700 dark:text-blue-400">
                Admin
              </Badge>
            )}
            {user.verified ? (
              <Badge variant="secondary" className="bg-green-500/10 text-green-700 dark:text-green-400">
                Verified
              </Badge>
            ) : (
              <Badge variant="secondary" className="text-muted-foreground">
                Unverified
              </Badge>
            )}
          </div>
          <div className="mt-0.5 flex flex-wrap items-center gap-x-3 gap-y-0.5 text-xs text-muted-foreground">
            <a
              href={`mailto:${user.email}`}
              className="inline-flex items-center gap-1 hover:text-foreground"
            >
              <Mail className="h-3 w-3" />
              {user.email}
            </a>
            {user.companyName && (
              <>
                <span aria-hidden>·</span>
                <span>{user.companyName}</span>
              </>
            )}
            {user.phone && (
              <>
                <span aria-hidden>·</span>
                <span>{user.phone}</span>
              </>
            )}
            {user.createdAt && (
              <>
                <span aria-hidden>·</span>
                <span>Joined {format(new Date(user.createdAt), "MMM d, yyyy")}</span>
              </>
            )}
          </div>
        </div>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="sm" className="h-8 w-8 p-0" data-testid={`button-user-menu-${user.id}`}>
              <MoreHorizontal className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-48">
            <DropdownMenuItem onSelect={onEdit}>
              <Pencil className="mr-2 h-4 w-4" />
              Edit user
            </DropdownMenuItem>
            <DropdownMenuItem onSelect={() => window.open(`mailto:${user.email}`)}>
              <UserCog className="mr-2 h-4 w-4" />
              Email user
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              onSelect={onDelete}
              className="text-destructive focus:text-destructive"
            >
              <Trash2 className="mr-2 h-4 w-4" />
              Delete user
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      {user.groups.length === 0 ? (
        <div className="px-5 py-4 text-xs text-muted-foreground">
          No groups yet.
        </div>
      ) : (
        <div className="divide-y">
          {user.groups.map((g) => (
            <GroupRow key={g.id} group={g} onOpen={() => onOpenGroup(g)} />
          ))}
        </div>
      )}
    </Card>
  );
}

function GroupRow({ group, onOpen }: { group: Group; onOpen: () => void }) {
  const tier = group.riskTier as RiskTier | null | undefined;
  const tierConfig = tier && TIER_CONFIG[tier];
  const status = STATUS_OPTIONS.find((s) => s.value === group.status);
  const submittedLabel = group.submittedAt
    ? format(new Date(group.submittedAt), "MMM d, yyyy")
    : null;

  return (
    <button
      type="button"
      onClick={onOpen}
      className="flex w-full items-center gap-4 px-5 py-3 text-left transition hover-elevate"
      data-testid={`row-group-${group.id}`}
    >
      {tierConfig ? (
        <span
          className="h-2 w-2 shrink-0 rounded-full"
          style={{ background: tierConfig.hsl }}
          aria-hidden
        />
      ) : (
        <span className="h-2 w-2 shrink-0 rounded-full bg-muted-foreground/40" aria-hidden />
      )}
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2 truncate text-sm font-semibold">
          {group.companyName}
          {tierConfig && (
            <span className={cn("text-[11px] font-semibold uppercase tracking-wide", tierConfig.className)}>
              {tierConfig.label}
            </span>
          )}
        </div>
        <div className="mt-0.5 flex flex-wrap items-center gap-x-3 gap-y-0.5 text-xs text-muted-foreground">
          {status && <span>{status.label}</span>}
          <span aria-hidden>·</span>
          <span>{group.totalLives ?? 0} lives</span>
          {submittedLabel && (
            <>
              <span aria-hidden>·</span>
              <span>Submitted {submittedLabel}</span>
            </>
          )}
        </div>
      </div>
      <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground" />
    </button>
  );
}
