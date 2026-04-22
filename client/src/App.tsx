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
import AdminDashboardPage from "@/pages/admin/dashboard";
import AdminGroupsListPage from "@/pages/admin/groups-list";
import AdminGroupDetailPage from "@/pages/admin/group-detail";
import AdminUsersPage from "@/pages/admin/users";
import AdminGeneratorPage from "@/pages/admin/generator";
import AdminTemplatesPage from "@/pages/admin/templates";
import AdminSettingsPage from "@/pages/admin/settings";
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
      <Route path="/forgot-password" component={ForgotPasswordPage} />
      <Route path="/reset-password" component={ResetPasswordPage} />
      <Route path="/auth/verify" component={AuthVerifyPage} />
      <Route path="/dashboard">
        <ProtectedRoute component={DashboardPage} />
      </Route>
      <Route path="/dashboard/new">
        <ProtectedRoute component={DashboardPage} />
      </Route>
      <Route path="/dashboard/:groupId">
        <ProtectedRoute component={DashboardPage} />
      </Route>
      {/* Legacy customer routes now fold into /dashboard, which is the
          one living proposal page per the redesign. */}
      <Route path="/proposals">
        <Redirect to="/dashboard" />
      </Route>
      <Route path="/report/:id">
        <Redirect to="/dashboard" />
      </Route>
      <Route path="/admin">
        <Redirect to="/admin/dashboard" />
      </Route>
      <Route path="/admin/dashboard">
        <ProtectedRoute component={AdminDashboardPage} adminOnly />
      </Route>
      <Route path="/admin/groups">
        <ProtectedRoute component={AdminGroupsListPage} adminOnly />
      </Route>
      <Route path="/admin/groups/:id">
        <ProtectedRoute component={AdminGroupDetailPage} adminOnly />
      </Route>
      <Route path="/admin/users">
        <ProtectedRoute component={AdminUsersPage} adminOnly />
      </Route>
      <Route path="/admin/generator">
        <ProtectedRoute component={AdminGeneratorPage} adminOnly />
      </Route>
      <Route path="/admin/templates">
        <ProtectedRoute component={AdminTemplatesPage} adminOnly />
      </Route>
      <Route path="/admin/settings">
        <ProtectedRoute component={AdminSettingsPage} adminOnly />
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
