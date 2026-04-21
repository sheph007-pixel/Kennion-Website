import { FileBarChart } from "lucide-react";
import { AdminLayout } from "./layout";
import { AdminPlaceholder } from "./placeholder";

export default function AdminGeneratorPage() {
  return (
    <AdminLayout
      crumbs={[
        { label: "Admin", href: "/admin/dashboard" },
        { label: "Proposal Generator" },
      ]}
    >
      <AdminPlaceholder
        icon={FileBarChart}
        title="Proposal Generator"
        description="XLSM template card + per-group generation moves here."
      />
    </AdminLayout>
  );
}
