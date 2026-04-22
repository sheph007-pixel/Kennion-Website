import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { KennionLogo } from "@/components/kennion-logo";
import { ThemeToggle } from "@/components/theme-toggle";
import { ClickToRevealPhone } from "@/components/click-to-reveal-phone";
import { Mail, Phone } from "lucide-react";
import { useAuth } from "@/lib/auth";
import { useLocation } from "wouter";

export function ProposalHighRisk() {
  const { user, logout } = useAuth();
  const [, navigate] = useLocation();
  const firstName = user?.fullName?.split(" ")[0] || "there";
  async function handleLogout() {
    await logout();
    navigate("/");
  }
  return (
    <div className="min-h-screen bg-background">
      <nav className="flex items-center justify-between border-b px-6 py-3">
        <KennionLogo size="md" />
        <div className="flex items-center gap-3">
          <ThemeToggle />
          <Button variant="outline" onClick={handleLogout}>
            Logout
          </Button>
        </div>
      </nav>
      <div className="mx-auto max-w-xl px-6 py-16">
        <Card className="p-8">
          <div className="text-[11px] font-semibold uppercase tracking-[0.14em] text-primary">
            Thanks for submitting, {firstName}
          </div>
          <h1 className="mt-2 text-2xl font-bold tracking-tight">
            Your advisor will reach out directly
          </h1>
          <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
            We've received your census and are reviewing it. Because your group
            has a unique profile, we want to hand-pair you with a Kennion advisor
            who can walk through options that fit you specifically, rather than
            auto-generate a proposal. Expect a call or email within 1 business day.
          </p>

          <div className="mt-6 space-y-2 text-sm">
            <div className="flex items-center gap-2">
              <Phone className="h-4 w-4 text-primary" />
              <ClickToRevealPhone label="Click to reveal direct line" variant="link" />
            </div>
            <div className="flex items-center gap-2">
              <Mail className="h-4 w-4 text-primary" />
              <a href="mailto:hunter@kennion.com" className="font-semibold text-primary hover:underline">
                hunter@kennion.com
              </a>
            </div>
          </div>
        </Card>
      </div>
    </div>
  );
}
