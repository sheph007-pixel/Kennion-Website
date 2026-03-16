import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Link, useLocation } from "wouter";
import { z } from "zod";
import { ArrowRight, Loader2, UserPlus, Mail, Building2, Phone, User, Key } from "lucide-react";
import { KennionLogo } from "@/components/kennion-logo";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useAuth } from "@/lib/auth";
import { useToast } from "@/hooks/use-toast";
import { ThemeToggle } from "@/components/theme-toggle";

// Personal email domains blocklist
const BLOCKED_EMAIL_DOMAINS = [
  'gmail.com', 'yahoo.com', 'hotmail.com', 'outlook.com', 'aol.com',
  'icloud.com', 'me.com', 'mac.com', 'live.com', 'msn.com',
  'ymail.com', 'rocketmail.com', 'protonmail.com', 'mail.com',
  'gmx.com', 'zoho.com', 'inbox.com', 'hey.com'
];

// US phone number validation (accepts various formats)
function isValidUSPhone(phone: string): boolean {
  // Strip all non-numeric characters
  const digits = phone.replace(/\D/g, '');

  // Valid US phone: 10 digits or 11 digits starting with 1
  if (digits.length === 10) {
    return true;
  }
  if (digits.length === 11 && digits[0] === '1') {
    return true;
  }
  return false;
}

const registerFormSchema = z.object({
  accessCode: z.string().min(1, "Access code is required"),
  firstName: z.string().min(1, "First name is required"),
  lastName: z.string().min(1, "Last name is required"),
  email: z.string().email("Please enter a valid email address").refine(
    (email) => {
      const domain = email.split('@')[1]?.toLowerCase();
      return !BLOCKED_EMAIL_DOMAINS.includes(domain);
    },
    { message: "Please use your business email (not Gmail, Yahoo, Hotmail, etc.)" }
  ),
  phone: z.string().min(1, "Phone number is required").refine(
    isValidUSPhone,
    { message: "Please enter a valid US phone number (10 digits)" }
  ),
  companyName: z.string().min(1, "Company name is required"),
});

export default function RegisterPage() {
  const [isLoading, setIsLoading] = useState(false);
  const [emailSent, setEmailSent] = useState(false);
  const [sentToEmail, setSentToEmail] = useState("");
  const { register: registerUser } = useAuth();
  const { toast } = useToast();
  const [, navigate] = useLocation();

  const form = useForm<z.infer<typeof registerFormSchema>>({
    resolver: zodResolver(registerFormSchema),
    defaultValues: { accessCode: "", firstName: "", lastName: "", email: "", phone: "", companyName: "" },
  });

  async function onSubmit(data: z.infer<typeof registerFormSchema>) {
    setIsLoading(true);
    try {
      const result = await registerUser(data);

      // If verified (valid access code), redirect to dashboard immediately
      if (result?.verified) {
        toast({
          title: "Welcome!",
          description: "Your account has been created successfully.",
        });
        // Small delay to let the toast show
        setTimeout(() => navigate("/dashboard"), 500);
      } else {
        // Fallback to email verification flow
        setEmailSent(true);
        setSentToEmail(data.email);
        toast({
          title: "Check your email",
          description: "We sent you a secure sign-in link to verify your account.",
        });
      }
    } catch (err: any) {
      const errMsg = err.message || "";
      const cleanMessage = errMsg.replace(/^\d+:\s*/, "").replace(/[{}"]|message:/g, "").trim() || "Please try again.";
      toast({
        title: "Registration failed",
        description: cleanMessage,
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
          {emailSent ? (
            <div className="text-center space-y-4">
              <div className="flex h-16 w-16 items-center justify-center rounded-full bg-primary/10 mx-auto">
                <Mail className="h-8 w-8 text-primary" />
              </div>
              <h1 className="text-2xl font-bold tracking-tight" data-testid="text-check-email-title">Check your email</h1>
              <p className="text-muted-foreground">
                We sent a verification link to <span className="font-medium text-foreground" data-testid="text-sent-email">{sentToEmail}</span>
              </p>
              <Card className="p-6 text-left space-y-3">
                <p className="text-sm text-muted-foreground">Click the link in the email to verify your account and sign in. The link expires in 15 minutes.</p>
                <p className="text-sm text-muted-foreground">Didn't get the email? Check your spam folder or try again.</p>
              </Card>
              <Button
                variant="outline"
                onClick={() => { setEmailSent(false); }}
                data-testid="button-try-again"
              >
                Try again
              </Button>
            </div>
          ) : (
            <>
              <div className="text-center mb-8">
                <div className="flex h-12 w-12 items-center justify-center rounded-full bg-primary/10 mx-auto mb-4">
                  <UserPlus className="h-6 w-6 text-primary" />
                </div>
                <h1 className="text-2xl font-bold tracking-tight" data-testid="text-register-title">Submit Your Group</h1>
                <p className="text-muted-foreground mt-2">
                  Register your organization to begin your benefits qualification analysis
                </p>
              </div>

              <Card className="p-6">
                <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="accessCode">Access Code</Label>
                    <div className="relative">
                      <Key className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                      <Input
                        id="accessCode"
                        type="text"
                        placeholder="Enter your access code"
                        className="pl-9"
                        {...form.register("accessCode")}
                        data-testid="input-access-code"
                      />
                    </div>
                    {form.formState.errors.accessCode && (
                      <p className="text-xs text-destructive">{form.formState.errors.accessCode.message}</p>
                    )}
                    <p className="text-xs text-muted-foreground">
                      Need A Code? Text Hunter Shepherd 205-641-0469
                    </p>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-2">
                      <Label htmlFor="firstName">First Name</Label>
                      <div className="relative">
                        <User className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                        <Input
                          id="firstName"
                          placeholder="John"
                          className="pl-9"
                          {...form.register("firstName")}
                          data-testid="input-first-name"
                        />
                      </div>
                      {form.formState.errors.firstName && (
                        <p className="text-xs text-destructive">{form.formState.errors.firstName.message}</p>
                      )}
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="lastName">Last Name</Label>
                      <Input
                        id="lastName"
                        placeholder="Smith"
                        {...form.register("lastName")}
                        data-testid="input-last-name"
                      />
                      {form.formState.errors.lastName && (
                        <p className="text-xs text-destructive">{form.formState.errors.lastName.message}</p>
                      )}
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="email">Business Email</Label>
                    <div className="relative">
                      <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                      <Input
                        id="email"
                        type="email"
                        placeholder="you@company.com"
                        className="pl-9"
                        {...form.register("email")}
                        data-testid="input-email"
                      />
                    </div>
                    {form.formState.errors.email && (
                      <p className="text-xs text-destructive">{form.formState.errors.email.message}</p>
                    )}
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="phone">Phone Number</Label>
                    <div className="relative">
                      <Phone className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                      <Input
                        id="phone"
                        type="tel"
                        placeholder="(555) 123-4567"
                        className="pl-9"
                        {...form.register("phone")}
                        data-testid="input-phone"
                      />
                    </div>
                    {form.formState.errors.phone && (
                      <p className="text-xs text-destructive">{form.formState.errors.phone.message}</p>
                    )}
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="companyName">Company Name</Label>
                    <div className="relative">
                      <Building2 className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                      <Input
                        id="companyName"
                        placeholder="Acme Corporation"
                        className="pl-9"
                        {...form.register("companyName")}
                        data-testid="input-company-name"
                      />
                    </div>
                    {form.formState.errors.companyName && (
                      <p className="text-xs text-destructive">{form.formState.errors.companyName.message}</p>
                    )}
                  </div>

                  <Button type="submit" className="w-full" disabled={isLoading} data-testid="button-register">
                    {isLoading ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <>Create Account <ArrowRight className="ml-1 h-4 w-4" /></>
                    )}
                  </Button>
                </form>
              </Card>

              <div className="text-center mt-6 space-y-2">
                <p className="text-sm">
                  Already have an account?{" "}
                  <Link href="/login" className="font-medium text-primary" data-testid="link-login">
                    Sign In
                  </Link>
                </p>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
