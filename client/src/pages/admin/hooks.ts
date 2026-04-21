import { useQuery } from "@tanstack/react-query";
import { useMemo } from "react";
import type { Group, User } from "@shared/schema";

export function useGroups() {
  return useQuery<Group[]>({
    queryKey: ["/api/admin/groups"],
  });
}

// TODO: Once /api/admin/groups/:id exists, swap this client-side filter
// for a dedicated fetch keyed by ["/api/admin/groups", id] so detail
// pages don't require the full list to be loaded.
export function useGroup(id: string | undefined) {
  const { data: groups, ...rest } = useGroups();
  const group = useMemo(
    () => (id ? groups?.find((g) => g.id === id) : undefined),
    [groups, id],
  );
  return { ...rest, data: group };
}

export function useUsers() {
  return useQuery<User[]>({
    queryKey: ["/api/admin/users"],
  });
}
