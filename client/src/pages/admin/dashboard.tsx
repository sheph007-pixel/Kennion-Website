import { Home } from "lucide-react";
import { AdminLayout } from "./layout";
import { AdminPlaceholder } from "./placeholder";

export default function AdminDashboardPage() {
  return (
    <AdminLayout crumbs={[{ label: "Admin", href: "/admin/dashboard" }, { label: "Dashboard" }]}>
      <AdminPlaceholder
        icon={Home}
        title="Dashboard"
        description="Welcome metrics, recent submissions, and quick actions will land here."
      />
    </AdminLayout>
  );
}
