import { Settings } from "lucide-react";
import { AdminLayout } from "./layout";
import { AdminPlaceholder } from "./placeholder";

export default function AdminSettingsPage() {
  return (
    <AdminLayout
      crumbs={[
        { label: "Admin", href: "/admin/dashboard" },
        { label: "Settings" },
      ]}
    >
      <AdminPlaceholder
        icon={Settings}
        title="Settings"
        description="Workspace and account settings will be configured here."
      />
    </AdminLayout>
  );
}
