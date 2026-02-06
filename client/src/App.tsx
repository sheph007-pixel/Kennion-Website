import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AuthProvider, useAuth } from "@/lib/auth";
import { ThemeProvider } from "@/components/theme-provider";
import LandingPage from "@/pages/landing";
import RegisterPage from "@/pages/register";
import LoginPage from "@/pages/login";
import AuthVerifyPage from "@/pages/auth-verify";
import DashboardPage from "@/pages/dashboard";
import AdminPage from "@/pages/admin";
import ReportPage from "@/pages/report";
import NotFound from "@/pages/not-found";
import { Loader2 } from "lucide-react";
import { useLocation, Redirect } from "wouter";

function ProtectedRoute({ component: Component, adminOnly }: { component: React.ComponentType; adminOnly?: boolean }) {
  const { user, isLoading } = useAuth();

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!user) {
    return <Redirect to="/login" />;
  }

  if (adminOnly && user.role !== "admin") {
    return <Redirect to="/dashboard" />;
  }

  return <Component />;
}

function PublicRoute({ component: Component }: { component: React.ComponentType }) {
  const { user, isLoading } = useAuth();

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (user) {
    return <Redirect to={user.role === "admin" ? "/admin" : "/dashboard"} />;
  }

  return <Component />;
}

function Router() {
  return (
    <Switch>
      <Route path="/" component={LandingPage} />
      <Route path="/register">
        <PublicRoute component={RegisterPage} />
      </Route>
      <Route path="/login">
        <PublicRoute component={LoginPage} />
      </Route>
      <Route path="/auth/verify" component={AuthVerifyPage} />
      <Route path="/dashboard">
        <ProtectedRoute component={DashboardPage} />
      </Route>
      <Route path="/admin">
        <ProtectedRoute component={AdminPage} adminOnly />
      </Route>
      <Route path="/report/:id">
        <ProtectedRoute component={ReportPage} />
      </Route>
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider>
        <TooltipProvider>
          <AuthProvider>
            <Router />
          </AuthProvider>
          <Toaster />
        </TooltipProvider>
      </ThemeProvider>
    </QueryClientProvider>
  );
}

export default App;
