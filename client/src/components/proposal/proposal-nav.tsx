import { useState } from "react";
import { ChevronDown, LogOut, UserCog } from "lucide-react";
import { useLocation } from "wouter";
import { KennionLogo } from "@/components/kennion-logo";
import { ThemeToggle } from "@/components/theme-toggle";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useAuth } from "@/lib/auth";
import { ProfileDialog } from "./profile-dialog";
import { GroupSwitcher } from "./group-switcher";

// Single nav used across every customer proposal screen — upload,
// analyzing, cockpit, accept, high-risk. Keeps the top strip visually
// consistent. The user chip is now a dropdown menu with Edit Profile
// and Log Out; "Program details" moved to the shared footer.
export function ProposalNav() {
  const { user, logout } = useAuth();
  const [, navigate] = useLocation();
  const [profileOpen, setProfileOpen] = useState(false);
  const initial = (user?.fullName || user?.email || "?").trim().charAt(0).toUpperCase();

  async function handleLogout() {
    await logout();
    navigate("/");
  }

  return (
    <>
      <nav className="sticky top-0 z-40 border-b bg-background/95 backdrop-blur">
        <div className="mx-auto flex max-w-[1280px] items-center justify-between gap-4 px-6 py-3">
          <div className="flex items-center gap-4">
            <KennionLogo size="md" />
            <GroupSwitcher />
          </div>
          <div className="flex items-center gap-2">
            <ThemeToggle />
            {user && (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <button
                    type="button"
                    className="flex items-center gap-2.5 rounded-md px-2 py-1 hover-elevate"
                    data-testid="button-profile-menu"
                  >
                    <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary/10 text-sm font-semibold text-primary">
                      {initial}
                    </div>
                    <div className="hidden flex-col items-start leading-tight sm:flex">
                      <span className="text-sm font-semibold">{user.fullName || "Account"}</span>
                      <span className="text-xs text-muted-foreground">
                        {user.companyName || user.email}
                      </span>
                    </div>
                    <ChevronDown className="hidden h-4 w-4 text-muted-foreground sm:block" />
                  </button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-56">
                  <div className="px-2 py-1.5 text-xs text-muted-foreground">
                    Signed in as
                    <div className="mt-0.5 font-semibold text-foreground">{user.email}</div>
                  </div>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onSelect={() => setProfileOpen(true)} data-testid="menu-edit-profile">
                    <UserCog className="mr-2 h-4 w-4" />
                    Edit profile
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onSelect={handleLogout} data-testid="menu-logout">
                    <LogOut className="mr-2 h-4 w-4" />
                    Log out
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            )}
          </div>
        </div>
      </nav>
      <ProfileDialog open={profileOpen} onOpenChange={setProfileOpen} />
    </>
  );
}
