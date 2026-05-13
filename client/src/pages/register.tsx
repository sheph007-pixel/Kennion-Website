import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Link, useLocation } from "wouter";
import { z } from "zod";
import { ArrowRight, Loader2, Mail, Building2, Phone, User, Lock, Check } from "lucide-react";
import { KennionLogo } from "@/components/kennion-logo";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { US_STATES } from "@shared/schema";
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
  firstName: z.string().min(1, "First name is required"),
  lastName: z.string().min(1, "Last name is required"),
  email: z.string().email("Please enter a valid email address").refine(
    (email) => {
      const domain = email.split('@')[1]?.toLowerCase();
      return !BLOCKED_EMAIL_DOMAINS.includes(domain);
    },
    { message: "Please use your business email (not Gmail, Yahoo, Hotmail, etc.)" }
  ),
  password: z.string().min(8, "Password must be at least 8 characters"),
  phone: z.string().min(1, "Phone number is required").refine(
    isValidUSPhone,
    { message: "Please enter a valid US phone number (10 digits)" }
  ),
  companyName: z.string().min(1, "Company name is required"),
  state: z
    .string()
    .min(2, "2-letter state required")
    .max(2, "Use the 2-letter state code")
    .transform((s) => s.trim().toUpperCase()),
  zipCode: z.string().refine((s) => /^\d{5}(-\d{4})?$/.test(s.trim()), {
    message: "Enter a 5-digit ZIP",
  }),
});

// 3-step process indicator. Shows where the prospect is in the
// signup flow so they know what to expect before submitting.
function Steps({ active }: { active: 1 | 2 | 3 }) {
  const steps: { n: 1 | 2 | 3; label: string; sub: string }[] = [
    { n: 1, label: "Submit your info",         sub: "Fill out the form below." },
    { n: 2, label: "We approve your account",  sub: "Typically within 1 business day." },
    { n: 3, label: "Sign in",                  sub: "We email you a sign-in link." },
  ];
  return (
    <div className="mb-6 rounded-lg border border-border bg-muted/40 p-4" data-testid="register-steps">
      <ol className="space-y-3">
        {steps.map((s) => {
          const state = s.n < active ? "done" : s.n === active ? "active" : "upcoming";
          return (
            <li key={s.n} className="flex items-start gap-3">
              <div
                className={
                  "flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-[11px] font-medium mt-0.5 " +
                  (state === "done"
                    ? "bg-primary text-primary-foreground"
                    : state === "active"
                    ? "bg-primary text-primary-foreground ring-4 ring-primary/15"
                    : "bg-background text-muted-foreground border border-border")
                }
              >
                {state === "done" ? <Check className="h-3 w-3" strokeWidth={3} /> : s.n}
              </div>
              <div className="flex-1 min-w-0">
                <div
                  className={
                    "text-[13.5px] font-medium leading-tight " +
                    (state === "upcoming" ? "text-muted-foreground" : "text-foreground")
                  }
                >
                  {s.label}
                </div>
                <div className="text-[12px] text-muted-foreground leading-snug mt-0.5">
                  {s.sub}
                </div>
              </div>
            </li>
          );
        })}
      </ol>
    </div>
  );
}

export default function RegisterPage() {
  const [isLoading, setIsLoading] = useState(false);
  const [pendingApproval, setPendingApproval] = useState(false);
  const [submittedEmail, setSubmittedEmail] = useState("");
  const { register: registerUser } = useAuth();
  const { toast } = useToast();
  const [, navigate] = useLocation();

  const form = useForm<z.infer<typeof registerFormSchema>>({
    resolver: zodResolver(registerFormSchema),
    defaultValues: {
      firstName: "",
      lastName: "",
      email: "",
      password: "",
      phone: "",
      companyName: "",
      state: "",
      zipCode: "",
    },
  });

  async function onSubmit(data: z.infer<typeof registerFormSchema>) {
    setIsLoading(true);
    try {
      const result = await registerUser(data);

      // New flow: account created, awaiting Hunter's manual approval.
      // Backend returns { pending: true } and does NOT set a session.
      if (result?.pending) {
        setPendingApproval(true);
        setSubmittedEmail(data.email);
        return;
      }

      // Legacy: if backend somehow returned verified, log them in.
      if (result?.verified) {
        toast({ title: "Welcome!", description: "Your account has been created successfully." });
        setTimeout(() => navigate("/dashboard"), 500);
        return;
      }

      // Defensive fallback.
      setPendingApproval(true);
      setSubmittedEmail(data.email);
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

      <div className="flex-1 flex items-start justify-center px-6 pt-6 pb-12">
        <div className="w-full max-w-md">
          {pendingApproval ? (
            <>
              <h1 className="mb-4 text-2xl font-bold tracking-tight" data-testid="text-pending-approval-title">
                Thanks — you're in line
              </h1>
              <Steps active={2} />
              <Card className="p-6 space-y-3">
                <p className="text-sm">
                  We received your registration for{" "}
                  <span className="font-medium" data-testid="text-submitted-email">{submittedEmail}</span>.
                </p>
                <p className="text-sm text-muted-foreground">
                  Our team reviews every new account before granting access. You'll get an email at the address above as soon as your account is approved — typically within one business day. There's nothing else you need to do.
                </p>
              </Card>
              <div className="text-center mt-6">
                <Link href="/" className="text-sm text-primary font-medium" data-testid="link-back-home">
                  Back to homepage
                </Link>
              </div>
            </>
          ) : (
            <>
              <h1 className="mb-4 text-2xl font-bold tracking-tight" data-testid="text-register-title">
                Create Account
              </h1>
              <Steps active={1} />

              <Card className="p-6">
                <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
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
                    <Label htmlFor="password">Password</Label>
                    <div className="relative">
                      <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                      <Input
                        id="password"
                        type="password"
                        placeholder="Create a password (min 8 characters)"
                        className="pl-9"
                        {...form.register("password")}
                        data-testid="input-password"
                      />
                    </div>
                    {form.formState.errors.password && (
                      <p className="text-xs text-destructive">{form.formState.errors.password.message}</p>
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

                  <div className="grid grid-cols-[1fr_1.4fr] gap-3">
                    <div className="space-y-2">
                      <Label htmlFor="state">State</Label>
                      <Select
                        value={form.watch("state") || ""}
                        onValueChange={(v) =>
                          form.setValue("state", v, { shouldValidate: true })
                        }
                      >
                        <SelectTrigger id="state" data-testid="input-state">
                          <SelectValue placeholder="Select state" />
                        </SelectTrigger>
                        <SelectContent>
                          {US_STATES.map((s) => (
                            <SelectItem key={s.code} value={s.code}>
                              {s.code} — {s.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      {form.formState.errors.state && (
                        <p className="text-xs text-destructive">{form.formState.errors.state.message}</p>
                      )}
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="zipCode">ZIP Code</Label>
                      <Input
                        id="zipCode"
                        placeholder="35243"
                        {...form.register("zipCode")}
                        data-testid="input-zip-code"
                      />
                      {form.formState.errors.zipCode && (
                        <p className="text-xs text-destructive">{form.formState.errors.zipCode.message}</p>
                      )}
                    </div>
                  </div>

                  <Button type="submit" className="w-full" disabled={isLoading} data-testid="button-register">
                    {isLoading ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <>Submit <ArrowRight className="ml-1 h-4 w-4" /></>
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
