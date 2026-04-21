import { useRoute } from "wouter";
import { Building2 } from "lucide-react";
import { AdminLayout } from "./layout";
import { AdminPlaceholder } from "./placeholder";
import { useGroup } from "./hooks";

export default function AdminGroupDetailPage() {
  const [, params] = useRoute("/admin/groups/:id");
  const id = params?.id;
  const { data: group } = useGroup(id);

  const label = group?.companyName ?? "Group";

  return (
    <AdminLayout
      crumbs={[
        { label: "Admin", href: "/admin/dashboard" },
        { label: "Groups", href: "/admin/groups" },
        { label },
      ]}
    >
      <AdminPlaceholder
        icon={Building2}
        title={label}
        description="Six-tab group detail page (Overview, Census, Risk, Submissions, Notes, Activity) will render here."
      />
    </AdminLayout>
  );
}
