import { Users } from "lucide-react";
import { AdminLayout } from "./layout";
import { AdminPlaceholder } from "./placeholder";

export default function AdminUsersPage() {
  return (
    <AdminLayout
      crumbs={[
        { label: "Admin", href: "/admin/dashboard" },
        { label: "Users" },
      ]}
    >
      <AdminPlaceholder
        icon={Users}
        title="Users"
        description="User management (search, edit, delete, password reset) moves here."
      />
    </AdminLayout>
  );
}
