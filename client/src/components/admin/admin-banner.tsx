import { useState } from "react";
import { useLocation } from "wouter";
import { useMutation } from "@tanstack/react-query";
import {
  ArrowLeft,
  ChevronDown,
  FileText,
  MoreHorizontal,
  ShieldCheck,
  Trash2,
  UserCog,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
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
import { useAllUsers } from "@/hooks/use-admin";
import { STATUS_OPTIONS } from "@/pages/admin/constants";
import { GenerateProposalDialog } from "./generate-proposal-dialog";
import { EditUserDialog } from "./edit-user-dialog";
import type { Group } from "@shared/schema";

type Props = {
  group: Group;
};

// Pinned below the top nav when an admin views a customer group. Shows
// who they're viewing and the primary admin actions (approve, status,
// generate, notes, delete). Keeps admin powers visible without
// cluttering the customer-facing cockpit below it.
export function AdminBanner({ group }: Props) {
  const { toast } = useToast();
  const [, navigate] = useLocation();
  const { data: users } = useAllUsers();
  const owner = users?.find((u) => u.id === group.userId);

  const [generateOpen, setGenerateOpen] = useState(false);
  const [editUserOpen, setEditUserOpen] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);

  const isApproved = group.status === "approved" || group.status === "proposal_sent" ||
    group.status === "proposal_accepted" || group.status === "client";

  const toggleApprove = useMutation({
    mutationFn: async () => {
      const path = isApproved
        ? `/api/admin/groups/${group.id}/unapprove`
        : `/api/admin/groups/${group.id}/approve`;
      await apiRequest("POST", path);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/groups"] });
      queryClient.invalidateQueries({ queryKey: ["/api/groups", group.id] });
      toast({ title: isApproved ? "Group unapproved" : "Group approved" });
    },
    onError: (err: any) => {
      toast({ title: "Action failed", description: err.message, variant: "destructive" });
    },
  });

  const patchStatus = useMutation({
    mutationFn: async (status: string) => {
      await apiRequest("PATCH", `/api/admin/groups/${group.id}`, { status });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/groups"] });
      queryClient.invalidateQueries({ queryKey: ["/api/groups", group.id] });
      toast({ title: "Status updated" });
    },
    onError: (err: any) => {
      toast({ title: "Update failed", description: err.message, variant: "destructive" });
    },
  });

  const deleteGroup = useMutation({
    mutationFn: async () => {
      await apiRequest("DELETE", `/api/admin/groups/${group.id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/groups"] });
      toast({ title: "Group deleted" });
      navigate("/admin");
    },
    onError: (err: any) => {
      toast({ title: "Delete failed", description: err.message, variant: "destructive" });
    },
  });

  return (
    <>
      <div className="border-b border-primary/20 bg-primary/5">
        <div className="mx-auto flex max-w-[1280px] flex-wrap items-center gap-3 px-6 py-2.5">
          <button
            type="button"
            onClick={() => navigate("/admin")}
            className="inline-flex items-center gap-1.5 text-xs font-medium text-muted-foreground hover-elevate rounded-md px-1.5 py-0.5"
            data-testid="button-admin-back"
          >
            <ArrowLeft className="h-3.5 w-3.5" />
            All users
          </button>
          <span aria-hidden className="text-muted-foreground">·</span>
          <div className="flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-[0.14em] text-primary">
            <ShieldCheck className="h-3.5 w-3.5" />
            Admin view
          </div>
          {owner && (
            <div className="text-xs text-muted-foreground">
              <span className="font-semibold text-foreground">{owner.fullName}</span>
              <span className="mx-1.5" aria-hidden>·</span>
              <a href={`mailto:${owner.email}`} className="hover:text-foreground">
                {owner.email}
              </a>
            </div>
          )}
          <div className="flex-1" />

          <div className="flex flex-wrap items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => toggleApprove.mutate()}
              disabled={toggleApprove.isPending}
              data-testid="button-toggle-approve"
            >
              {isApproved ? "Unapprove" : "Approve"}
            </Button>

            <Select
              value={group.status ?? "census_uploaded"}
              onValueChange={(v) => patchStatus.mutate(v)}
            >
              <SelectTrigger className="h-8 w-[170px] text-xs">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {STATUS_OPTIONS.map((s) => (
                  <SelectItem key={s.value} value={s.value} className="text-xs">
                    {s.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Button
              size="sm"
              onClick={() => setGenerateOpen(true)}
              className="gap-1.5"
              data-testid="button-generate-proposal"
            >
              <FileText className="h-3.5 w-3.5" />
              Generate Proposal
            </Button>

            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" size="sm" className="px-2" data-testid="button-admin-more">
                  <MoreHorizontal className="h-4 w-4" />
                  <ChevronDown className="ml-1 h-3 w-3" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onSelect={() => setEditUserOpen(true)}>
                  <UserCog className="mr-2 h-4 w-4" />
                  Edit user
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  onSelect={() => setConfirmDelete(true)}
                  className="text-destructive focus:text-destructive"
                >
                  <Trash2 className="mr-2 h-4 w-4" />
                  Delete group
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      </div>

      <GenerateProposalDialog group={group} open={generateOpen} onOpenChange={setGenerateOpen} />
      <EditUserDialog
        user={owner ?? null}
        open={editUserOpen}
        onOpenChange={setEditUserOpen}
      />

      <AlertDialog open={confirmDelete} onOpenChange={setConfirmDelete}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete this group?</AlertDialogTitle>
            <AlertDialogDescription>
              Removes the census, proposals, and all scoring data for {group.companyName}.
              The user's account is not affected.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => deleteGroup.mutate()}
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
