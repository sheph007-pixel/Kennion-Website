import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Link, useLocation } from "wouter";
import { z } from "zod";
import { ArrowRight, Loader2, Mail, Lock } from "lucide-react";
import { KennionLogo } from "@/components/kennion-logo";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useAuth } from "@/lib/auth";
import { useToast } from "@/hooks/use-toast";
import { ThemeToggle } from "@/components/theme-toggle";

const signInSchema = z.object({
  email: z.string().email("Please enter a valid email address"),
});

const adminLoginSchema = z.object({
  email: z.string().email("Valid email required"),
  password: z.string().min(1, "Password is required"),
});

export default function LoginPage() {
  const [isLoading, setIsLoading] = useState(false);
  const [emailSent, setEmailSent] = useState(false);
  const [sentToEmail, setSentToEmail] = useState("");
  const [showAdminLogin, setShowAdminLogin] = useState(false);
  const { requestMagicLink, login } = useAuth();
  const { toast } = useToast();
  const [, navigate] = useLocation();

  const form = useForm<z.infer<typeof signInSchema>>({
    resolver: zodResolver(signInSchema),
    defaultValues: { email: "" },
  });

  const adminForm = useForm<z.infer<typeof adminLoginSchema>>({
    resolver: zodResolver(adminLoginSchema),
    defaultValues: { email: "", password: "" },
  });

  async function onSubmit(data: z.infer<typeof signInSchema>) {
    setIsLoading(true);
    try {
      const result = await requestMagicLink({ email: data.email });

      if (result.needsSignup) {
        toast({
          title: "Account not found",
          description: "No account found with that email. Please register first.",
          variant: "destructive",
        });
        navigate("/register");
      } else {
        setEmailSent(true);
        setSentToEmail(data.email);
        toast({
          title: "Check your email",
          description: "We sent you a secure sign-in link.",
        });
      }
    } catch (err: any) {
      const errMsg = err.message || "";
      const cleanMessage = errMsg.replace(/^\d+:\s*/, "").replace(/[{}"]|message:/g, "").trim() || "Please try again.";
      toast({
        title: "Something went wrong",
        description: cleanMessage,
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  }

  async function onAdminLogin(data: z.infer<typeof adminLoginSchema>) {
    setIsLoading(true);
    try {
      await login(data.email, data.password);
      navigate("/admin");
    } catch (err: any) {
      toast({
        title: "Login failed",
        description: err.message || "Invalid email or password.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <div className="flex items-center justify-between px-6 py-3 border-b">
        <Link href="/">
          <KennionLogo size="md" />
        </Link>
        <ThemeToggle />
      </div>

      <div className="flex-1 flex items-center justify-center px-6 py-12">
        <div className="w-full max-w-md">
          {showAdminLogin ? (
            <>
              <div className="text-center mb-8">
                <div className="flex h-12 w-12 items-center justify-center rounded-md bg-primary mx-auto mb-4">
                  <Lock className="h-6 w-6 text-primary-foreground" />
                </div>
                <h1 className="text-2xl font-bold tracking-tight" data-testid="text-admin-login-title">Admin Login</h1>
                <p className="text-muted-foreground mt-2">Sign in with admin credentials</p>
              </div>

              <Card className="p-6">
                <form onSubmit={adminForm.handleSubmit(onAdminLogin)} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="admin-email">Email</Label>
                    <Input
                      id="admin-email"
                      type="email"
                      placeholder="admin@kennion.com"
                      {...adminForm.register("email")}
                      data-testid="input-admin-email"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="admin-password">Password</Label>
                    <Input
                      id="admin-password"
                      type="password"
                      placeholder="Enter password"
                      {...adminForm.register("password")}
                      data-testid="input-admin-password"
                    />
                  </div>
                  <Button type="submit" className="w-full" disabled={isLoading} data-testid="button-admin-login">
                    {isLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : "Sign In"}
                  </Button>
                </form>
              </Card>

              <div className="text-center mt-4">
                <button
                  onClick={() => setShowAdminLogin(false)}
                  className="text-sm text-muted-foreground"
                  data-testid="button-back-to-magic-link"
                >
                  Back to sign in
                </button>
              </div>
            </>
          ) : emailSent ? (
            <div className="text-center space-y-4">
              <div className="flex h-16 w-16 items-center justify-center rounded-full bg-primary/10 mx-auto">
                <Mail className="h-8 w-8 text-primary" />
              </div>
              <h1 className="text-2xl font-bold tracking-tight" data-testid="text-check-email-title">Check your email</h1>
              <p className="text-muted-foreground">
                We sent a sign-in link to <span className="font-medium text-foreground" data-testid="text-sent-email">{sentToEmail}</span>
              </p>
              <Card className="p-6 text-left space-y-3">
                <p className="text-sm text-muted-foreground">Click the link in the email to sign in securely. The link expires in 15 minutes.</p>
                <p className="text-sm text-muted-foreground">Didn't get the email? Check your spam folder or try again.</p>
              </Card>
              <Button
                variant="outline"
                onClick={() => { setEmailSent(false); }}
                data-testid="button-try-different-email"
              >
                Try a different email
              </Button>
            </div>
          ) : (
            <>
              <div className="text-center mb-8">
                <div className="flex h-12 w-12 items-center justify-center rounded-full bg-primary/10 mx-auto mb-4">
                  <Mail className="h-6 w-6 text-primary" />
                </div>
                <h1 className="text-2xl font-bold tracking-tight" data-testid="text-sign-in-title">Sign In</h1>
                <p className="text-muted-foreground mt-2">
                  Enter your email and we'll send you a secure sign-in link
                </p>
              </div>

              <Card className="p-6">
                <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="email">Business Email</Label>
                    <Input
                      id="email"
                      type="email"
                      placeholder="you@company.com"
                      {...form.register("email")}
                      data-testid="input-email"
                    />
                    {form.formState.errors.email && (
                      <p className="text-sm text-destructive">{form.formState.errors.email.message}</p>
                    )}
                  </div>

                  <Button type="submit" className="w-full" disabled={isLoading} data-testid="button-send-link">
                    {isLoading ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <>Send Sign-In Link <ArrowRight className="ml-1 h-4 w-4" /></>
                    )}
                  </Button>
                </form>
              </Card>

              <div className="text-center mt-6 space-y-2">
                <p className="text-xs text-muted-foreground">
                  No password needed. We'll email you a secure link to sign in.
                </p>
                <p className="text-sm">
                  Don't have an account?{" "}
                  <Link href="/register" className="font-medium text-primary" data-testid="link-register">
                    Get Started
                  </Link>
                </p>
              </div>

              <div className="text-center mt-4">
                <button
                  onClick={() => setShowAdminLogin(true)}
                  className="text-xs text-muted-foreground"
                  data-testid="button-admin-login-toggle"
                >
                  Admin login
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
