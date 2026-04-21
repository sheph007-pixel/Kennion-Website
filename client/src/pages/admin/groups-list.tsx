import { Building2 } from "lucide-react";
import { AdminLayout } from "./layout";
import { AdminPlaceholder } from "./placeholder";

export default function AdminGroupsListPage() {
  return (
    <AdminLayout
      crumbs={[
        { label: "Admin", href: "/admin/dashboard" },
        { label: "Groups" },
      ]}
    >
      <AdminPlaceholder
        icon={Building2}
        title="Groups"
        description="Grouped-by-company census queue with stats overview and keyboard navigation."
      />
    </AdminLayout>
  );
}
