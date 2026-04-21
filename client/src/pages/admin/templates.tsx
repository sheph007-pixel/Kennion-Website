import { FileSpreadsheet } from "lucide-react";
import { AdminLayout } from "./layout";
import { AdminPlaceholder } from "./placeholder";

export default function AdminTemplatesPage() {
  return (
    <AdminLayout
      crumbs={[
        { label: "Admin", href: "/admin/dashboard" },
        { label: "Templates" },
      ]}
    >
      <AdminPlaceholder
        icon={FileSpreadsheet}
        title="Templates"
        description="Manage reusable proposal templates here."
      />
    </AdminLayout>
  );
}
