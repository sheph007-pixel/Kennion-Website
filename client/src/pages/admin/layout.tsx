import { useEffect, useRef, type ReactNode } from "react";
import { Link, useLocation } from "wouter";
import {
  Home,
  Building2,
  Users as UsersIcon,
  FileBarChart,
  FileSpreadsheet,
  Settings as SettingsIcon,
  Search,
  Bell,
  LogOut,
} from "lucide-react";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarProvider,
  SidebarInset,
} from "@/components/ui/sidebar";
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { ThemeToggle } from "@/components/theme-toggle";
import { useAuth } from "@/lib/auth";
import { cn } from "@/lib/utils";
import { useGroups, useUsers } from "./hooks";
import {
  GroupsFocusProvider,
  useGroupsFocus,
} from "./groups-focus-context";

const NAV_WORKSPACE = [
  { href: "/admin/dashboard", label: "Dashboard", icon: Home, match: /^\/admin\/dashboard/ },
  { href: "/admin/groups", label: "Groups", icon: Building2, match: /^\/admin\/groups/, countKey: "groups" as const },
  { href: "/admin/users", label: "Users", icon: UsersIcon, match: /^\/admin\/users/, countKey: "users" as const },
  { href: "/admin/generator", label: "Proposal Generator", icon: FileBarChart, match: /^\/admin\/generator/ },
];

const NAV_SETTINGS = [
  { href: "/admin/templates", label: "Templates", icon: FileSpreadsheet, match: /^\/admin\/templates/ },
  { href: "/admin/settings", label: "Settings", icon: SettingsIcon, match: /^\/admin\/settings/ },
];

function initials(name: string | null | undefined): string {
  if (!name) return "?";
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0]?.toUpperCase() ?? "")
    .join("");
}

function AdminSidebar({ currentPath }: { currentPath: string }) {
  const { user, logout } = useAuth();
  const [, navigate] = useLocation();
  const { data: groups } = useGroups();
  const { data: users } = useUsers();

  const counts = {
    groups: groups?.length ?? 0,
    users: users?.length ?? 0,
  };

  async function handleLogout() {
    await logout();
    navigate("/");
  }

  return (
    <Sidebar
      collapsible="none"
      className="border-r border-sidebar-border bg-sidebar"
    >
      <SidebarHeader className="h-14 border-b border-sidebar-border px-4">
        <div className="flex h-full items-center gap-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-md bg-primary text-primary-foreground font-semibold">
            K
          </div>
          <div className="flex flex-col leading-tight">
            <span className="text-sm font-semibold tracking-[-0.02em]">Kennion</span>
            <span className="text-[11px] text-muted-foreground">Benefit Advisors</span>
          </div>
        </div>
      </SidebarHeader>

      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel>Workspace</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {NAV_WORKSPACE.map((item) => {
                const active = item.match.test(currentPath);
                const count = item.countKey ? counts[item.countKey] : undefined;
                return (
                  <SidebarMenuItem key={item.href}>
                    <SidebarMenuButton
                      asChild
                      isActive={active}
                      data-testid={`nav-${item.label.toLowerCase().replace(/\s+/g, "-")}`}
                      className={cn(
                        "relative",
                        active &&
                          "bg-primary/10 text-primary hover:bg-primary/15 hover:text-primary before:absolute before:left-0 before:top-1 before:bottom-1 before:w-[3px] before:rounded-full before:bg-primary",
                      )}
                    >
                      <Link href={item.href}>
                        <item.icon className="h-4 w-4" />
                        <span className="flex-1">{item.label}</span>
                        {count !== undefined && count > 0 && (
                          <Badge
                            variant="secondary"
                            className={cn(
                              "ml-auto h-5 min-w-[1.25rem] rounded-full px-1.5 text-[10px] font-medium",
                              active && "bg-primary/15 text-primary",
                            )}
                          >
                            {count}
                          </Badge>
                        )}
                      </Link>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                );
              })}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        <SidebarGroup>
          <SidebarGroupLabel>Settings</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {NAV_SETTINGS.map((item) => {
                const active = item.match.test(currentPath);
                return (
                  <SidebarMenuItem key={item.href}>
                    <SidebarMenuButton
                      asChild
                      isActive={active}
                      data-testid={`nav-${item.label.toLowerCase()}`}
                      className={cn(
                        "relative",
                        active &&
                          "bg-primary/10 text-primary hover:bg-primary/15 hover:text-primary before:absolute before:left-0 before:top-1 before:bottom-1 before:w-[3px] before:rounded-full before:bg-primary",
                      )}
                    >
                      <Link href={item.href}>
                        <item.icon className="h-4 w-4" />
                        <span>{item.label}</span>
                      </Link>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                );
              })}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      <SidebarFooter className="border-t border-sidebar-border p-3">
        <div className="flex items-center gap-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-full bg-primary/10 text-sm font-semibold text-primary">
            {initials(user?.fullName)}
          </div>
          <div className="min-w-0 flex-1">
            <div className="truncate text-sm font-medium" data-testid="text-sidebar-user-name">
              {user?.fullName ?? "—"}
            </div>
            <div className="text-[11px] text-muted-foreground">Admin</div>
          </div>
          <Button
            size="icon"
            variant="ghost"
            className="h-8 w-8"
            onClick={handleLogout}
            data-testid="button-admin-logout"
            title="Logout"
          >
            <LogOut className="h-4 w-4" />
          </Button>
        </div>
      </SidebarFooter>
    </Sidebar>
  );
}

type Crumb = { label: string; href?: string };

function TopBar({ crumbs }: { crumbs: Crumb[] }) {
  const { searchRef } = useGroupsFocus();
  return (
    <header className="sticky top-0 z-30 h-14 border-b border-card-border bg-background/80 backdrop-blur">
      <div className="flex h-full items-center gap-4 px-6">
        <Breadcrumb className="min-w-0 flex-shrink">
          <BreadcrumbList>
            {crumbs.map((c, i) => {
              const isLast = i === crumbs.length - 1;
              return (
                <span key={`${c.label}-${i}`} className="flex items-center gap-1.5">
                  <BreadcrumbItem>
                    {isLast || !c.href ? (
                      <BreadcrumbPage className="truncate">{c.label}</BreadcrumbPage>
                    ) : (
                      <BreadcrumbLink asChild>
                        <Link href={c.href}>{c.label}</Link>
                      </BreadcrumbLink>
                    )}
                  </BreadcrumbItem>
                  {!isLast && <BreadcrumbSeparator />}
                </span>
              );
            })}
          </BreadcrumbList>
        </Breadcrumb>

        <div className="relative ml-auto w-full max-w-sm">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            ref={searchRef}
            id="admin-global-search"
            placeholder="Search groups, users..."
            className="pl-9 pr-10"
            data-testid="input-global-search"
          />
          <kbd className="pointer-events-none absolute right-2 top-1/2 -translate-y-1/2 rounded border border-input bg-muted px-1.5 py-0.5 font-mono text-[10px] text-muted-foreground">
            /
          </kbd>
        </div>

        <div className="flex items-center gap-1">
          <Button size="icon" variant="ghost" className="h-9 w-9" data-testid="button-notifications" title="Notifications">
            <Bell className="h-4 w-4" />
          </Button>
          <ThemeToggle />
        </div>
      </div>
    </header>
  );
}

function isEditableTarget(target: EventTarget | null): boolean {
  if (!(target instanceof HTMLElement)) return false;
  const tag = target.tagName;
  if (tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT") return true;
  if (target.isContentEditable) return true;
  return false;
}

function KeyboardShortcuts() {
  const focus = useGroupsFocus();
  const [location, navigate] = useLocation();
  // Keep the latest location in a ref so the listener isn't re-bound on every
  // navigation (which would drop any in-progress focus state).
  const locationRef = useRef(location);
  locationRef.current = location;

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (isEditableTarget(e.target)) {
        // `/` still focuses search even when an input is focused elsewhere
        // only if Esc-like keys, but skip otherwise.
        return;
      }

      if (e.key === "/") {
        e.preventDefault();
        focus.searchRef.current?.focus();
        focus.searchRef.current?.select();
        return;
      }

      if (e.key === "Escape") {
        if (/^\/admin\/groups\/.+/.test(locationRef.current)) {
          e.preventDefault();
          navigate("/admin/groups");
        }
        return;
      }

      const path = locationRef.current;
      if (path === "/admin/groups" && focus.hasList) {
        if (e.key === "j") {
          e.preventDefault();
          focus.move(1);
        } else if (e.key === "k") {
          e.preventDefault();
          focus.move(-1);
        } else if (e.key === "Enter") {
          e.preventDefault();
          focus.activate();
        }
      }
    }

    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [focus, navigate]);

  return null;
}

export function AdminLayout({
  crumbs,
  children,
}: {
  crumbs: Crumb[];
  children: ReactNode;
}) {
  const [location] = useLocation();
  return (
    <GroupsFocusProvider>
      <SidebarProvider
        defaultOpen
        style={
          {
            "--sidebar-width": "15rem",
            "--sidebar-width-icon": "3rem",
          } as React.CSSProperties
        }
      >
        <div className="flex min-h-screen w-full bg-background text-foreground">
          <AdminSidebar currentPath={location} />
          <SidebarInset className="flex-1">
            <TopBar crumbs={crumbs} />
            <KeyboardShortcuts />
            <main className="mx-auto w-full max-w-[90rem] p-6">{children}</main>
          </SidebarInset>
        </div>
      </SidebarProvider>
    </GroupsFocusProvider>
  );
}
