import { useMutation, useQuery } from "@tanstack/react-query";
import type { Group } from "@shared/schema";
import { apiRequest, queryClient } from "@/lib/queryClient";

// Internal-sales quotes list (admin only). Filtered server-side to
// source='internal_sales' so it never overlaps with the customer
// /admin user list.
export function useAdminQuotes() {
  return useQuery<Group[]>({ queryKey: ["/api/admin/quotes"] });
}

type CreateQuoteInput = {
  companyName: string;
  state: string;
  zipCode: string;
  // All contact fields optional — the rep can crank a quote with
  // just company + state/zip and either fill these later or leave
  // them for the prospect to fill on Accept.
  contactName?: string;
  contactEmail?: string;
  contactPhone?: string;
};

export function useCreateQuote() {
  return useMutation({
    mutationFn: async (input: CreateQuoteInput) => {
      const res = await apiRequest("POST", "/api/admin/quotes", input);
      return (await res.json()) as Group;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/quotes"] });
    },
  });
}

export function useRotateQuoteLink() {
  return useMutation({
    mutationFn: async (id: string) => {
      const res = await apiRequest("POST", `/api/admin/quotes/${id}/rotate-link`, {});
      return (await res.json()) as Group;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/quotes"] });
      queryClient.invalidateQueries({ queryKey: ["/api/groups"] });
    },
  });
}

export function useRevokeQuoteLink() {
  return useMutation({
    mutationFn: async (id: string) => {
      const res = await apiRequest("POST", `/api/admin/quotes/${id}/revoke-link`, {});
      return (await res.json()) as Group;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/quotes"] });
      queryClient.invalidateQueries({ queryKey: ["/api/groups"] });
    },
  });
}

export function useDeleteQuote() {
  // Reuses the existing admin-side group delete endpoint, which is
  // already requireAdmin and accepts any group id.
  return useMutation({
    mutationFn: async (id: string) => {
      await apiRequest("DELETE", `/api/admin/groups/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/quotes"] });
    },
  });
}

// Status derived from the row's view + accept timestamps. Internal-
// sales quotes go through Draft → Sent → Viewed → Accepted.
export type QuoteStatus = "draft" | "sent" | "viewed" | "accepted" | "revoked";

export function deriveQuoteStatus(group: Group): QuoteStatus {
  if (group.publicAcceptedAt) return "accepted";
  // Pre-census quotes have no riskTier; treat as draft regardless of
  // token presence — the link won't render rates yet anyway.
  if (!group.riskTier) return "draft";
  if (!group.publicToken) return "revoked";
  if (group.firstViewedAt) return "viewed";
  return "sent";
}

export function statusLabel(s: QuoteStatus): string {
  switch (s) {
    case "draft":    return "Draft";
    case "sent":     return "Sent · not opened";
    case "viewed":   return "Viewed";
    case "accepted": return "Accepted";
    case "revoked":  return "Link revoked";
  }
}
