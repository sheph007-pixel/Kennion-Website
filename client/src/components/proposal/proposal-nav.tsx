import { ExternalLink, LogOut } from "lucide-react";
import { useLocation } from "wouter";
import { KennionLogo } from "@/components/kennion-logo";
import { ThemeToggle } from "@/components/theme-toggle";
import { useAuth } from "@/lib/auth";

// Single nav used across every customer proposal screen — login shell,
// upload, analyzing, cockpit, accept, high-risk. Keeps the top strip
// visually consistent so the user never feels like they got dropped in a
// different app between steps.
export function ProposalNav() {
  const { user, logout } = useAuth();
  const [, navigate] = useLocation();
  const initial = (user?.fullName || user?.email || "?").trim().charAt(0).toUpperCase();

  async function handleLogout() {
    await logout();
    navigate("/");
  }

  return (
    <nav className="sticky top-0 z-40 border-b bg-background/95 backdrop-blur">
      <div className="mx-auto flex max-w-[1280px] items-center justify-between gap-4 px-6 py-3">
        <KennionLogo size="md" />
        <div className="flex items-center gap-4">
          <a
            href="https://KennionProgram.com"
            target="_blank"
            rel="noreferrer noopener"
            className="hidden items-center gap-1 text-sm font-medium text-muted-foreground hover:text-foreground sm:inline-flex"
            data-testid="link-program-details"
          >
            Program details
            <ExternalLink className="h-3.5 w-3.5" />
          </a>
          {user && (
            <div className="flex items-center gap-2.5" data-testid="nav-user">
              <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary/10 text-sm font-semibold text-primary">
                {initial}
              </div>
              <div className="hidden flex-col leading-tight sm:flex">
                <span className="text-sm font-semibold">{user.fullName || "Account"}</span>
                <span className="text-xs text-muted-foreground">
                  {user.companyName || user.email}
                </span>
              </div>
            </div>
          )}
          <ThemeToggle />
          <button
            type="button"
            onClick={handleLogout}
            className="flex h-8 w-8 items-center justify-center rounded-md text-muted-foreground hover:bg-muted hover:text-foreground"
            aria-label="Log out"
            data-testid="button-logout"
          >
            <LogOut className="h-4 w-4" />
          </button>
        </div>
      </div>
    </nav>
  );
}
