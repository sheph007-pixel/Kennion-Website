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
import ForgotPasswordPage from "@/pages/forgot-password";
import ResetPasswordPage from "@/pages/reset-password";
import AuthVerifyPage from "@/pages/auth-verify";
import DashboardPage from "@/pages/dashboard";
import GroupsPage from "@/pages/groups";
import PlanDetailsPage from "@/pages/plan-details";
import ReplaceCensusPage from "@/pages/proposal/replace-census";
import AdminHome from "@/pages/admin";
import AdminGroupViewPage from "@/pages/admin/group-view";
import AdminTemplatesPage from "@/pages/admin/templates";
import NotFound from "@/pages/not-found";
import { Loader2 } from "lucide-react";
import { Redirect } from "wouter";

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
      <Route path="/forgot-password" component={ForgotPasswordPage} />
      <Route path="/reset-password" component={ResetPasswordPage} />
      <Route path="/auth/verify" component={AuthVerifyPage} />
      <Route path="/dashboard">
        <ProtectedRoute component={DashboardPage} />
      </Route>
      <Route path="/dashboard/new">
        <ProtectedRoute component={DashboardPage} />
      </Route>
      <Route path="/dashboard/groups">
        <ProtectedRoute component={GroupsPage} />
      </Route>
      <Route path="/dashboard/:groupId/plan-details">
        <ProtectedRoute component={PlanDetailsPage} />
      </Route>
      <Route path="/dashboard/:groupId/replace-census">
        <ProtectedRoute component={ReplaceCensusPage} />
      </Route>
      <Route path="/dashboard/:groupId">
        <ProtectedRoute component={DashboardPage} />
      </Route>
      {/* Legacy customer routes fold into /dashboard. */}
      <Route path="/proposals">
        <Redirect to="/dashboard" />
      </Route>
      <Route path="/report/:id">
        <Redirect to="/dashboard" />
      </Route>
      {/* Admin is now a single unified list + customer-view-as-admin. */}
      <Route path="/admin">
        <ProtectedRoute component={AdminHome} adminOnly />
      </Route>
      <Route path="/admin/groups/:groupId/plan-details">
        <ProtectedRoute component={PlanDetailsPage} adminOnly />
      </Route>
      <Route path="/admin/groups/:groupId">
        <ProtectedRoute component={AdminGroupViewPage} adminOnly />
      </Route>
      <Route path="/admin/templates">
        <ProtectedRoute component={AdminTemplatesPage} adminOnly />
      </Route>
      {/* Legacy admin deep links redirect to the unified admin home. */}
      <Route path="/admin/dashboard">
        <Redirect to="/admin" />
      </Route>
      <Route path="/admin/groups">
        <Redirect to="/admin" />
      </Route>
      <Route path="/admin/users">
        <Redirect to="/admin" />
      </Route>
      <Route path="/admin/generator">
        <Redirect to="/admin" />
      </Route>
      <Route path="/admin/settings">
        <Redirect to="/admin" />
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
