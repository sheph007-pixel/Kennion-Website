import { useEffect, useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { Loader2, Save } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import type { Group } from "@shared/schema";
import { STATUS_OPTIONS } from "../constants";

export function NotesStatusTab({ group }: { group: Group }) {
  const { toast } = useToast();
  const [status, setStatus] = useState(group.status);
  const [notes, setNotes] = useState(group.adminNotes ?? "");

  useEffect(() => {
    setStatus(group.status);
    setNotes(group.adminNotes ?? "");
  }, [group.id, group.status, group.adminNotes]);

  const updateStatus = useMutation({
    mutationFn: async () => {
      await apiRequest("PATCH", `/api/admin/groups/${group.id}`, { status });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/groups"] });
      toast({ title: "Status updated" });
    },
    onError: (err: any) => {
      toast({
        title: "Status update failed",
        description: err.message,
        variant: "destructive",
      });
    },
  });

  const updateNotes = useMutation({
    mutationFn: async () => {
      await apiRequest("PATCH", `/api/admin/groups/${group.id}`, {
        adminNotes: notes,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/groups"] });
      toast({ title: "Notes saved" });
    },
    onError: (err: any) => {
      toast({
        title: "Notes save failed",
        description: err.message,
        variant: "destructive",
      });
    },
  });

  return (
    <div className="grid gap-4 lg:grid-cols-2">
      <Card className="border-card-border p-5">
        <h3 className="font-semibold tracking-tight">Status</h3>
        <p className="mt-0.5 text-xs text-muted-foreground">
          Update where this submission stands in the proposal pipeline.
        </p>
        <div className="mt-4 flex items-center gap-3">
          <Select value={status} onValueChange={setStatus}>
            <SelectTrigger className="flex-1" data-testid="select-status">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {STATUS_OPTIONS.map((o) => (
                <SelectItem key={o.value} value={o.value}>
                  {o.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button
            onClick={() => updateStatus.mutate()}
            disabled={updateStatus.isPending || status === group.status}
            data-testid="button-update-status"
          >
            {updateStatus.isPending ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              "Update Status"
            )}
          </Button>
        </div>
      </Card>

      <Card className="border-card-border p-5">
        <h3 className="font-semibold tracking-tight">Admin Notes</h3>
        <p className="mt-0.5 text-xs text-muted-foreground">
          Broker-only notes. Not shown to the client.
        </p>
        <Textarea
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          placeholder="Add notes about this group..."
          rows={6}
          className="mt-4 resize-none"
          data-testid="textarea-admin-notes"
        />
        <div className="mt-3 flex justify-end">
          <Button
            onClick={() => updateNotes.mutate()}
            disabled={updateNotes.isPending || notes === (group.adminNotes ?? "")}
            data-testid="button-save-notes"
          >
            {updateNotes.isPending ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Saving...
              </>
            ) : (
              <>
                <Save className="mr-2 h-4 w-4" />
                Save Notes
              </>
            )}
          </Button>
        </div>
      </Card>
    </div>
  );
}
