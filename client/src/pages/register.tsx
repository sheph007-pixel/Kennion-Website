import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Link, useLocation } from "wouter";
import { z } from "zod";
import { ArrowRight, ArrowLeft, Loader2 } from "lucide-react";
import kennionLogo from "@assets/qt=q_95_1770371575379.webp";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  InputOTP,
  InputOTPGroup,
  InputOTPSlot,
} from "@/components/ui/input-otp";
import { useAuth } from "@/lib/auth";
import { useToast } from "@/hooks/use-toast";
import { registerSchema } from "@shared/schema";
import { ThemeToggle } from "@/components/theme-toggle";

export default function RegisterPage() {
  const [step, setStep] = useState<"register" | "verify">("register");
  const [email, setEmail] = useState("");
  const [verifyCode, setVerifyCode] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const { register: registerUser, verifyEmail } = useAuth();
  const { toast } = useToast();
  const [, navigate] = useLocation();

  const form = useForm<z.infer<typeof registerSchema>>({
    resolver: zodResolver(registerSchema),
    defaultValues: {
      fullName: "",
      email: "",
      password: "",
      companyName: "",
    },
  });

  async function onRegister(data: z.infer<typeof registerSchema>) {
    setIsLoading(true);
    try {
      const result = await registerUser(data);
      if (result.requiresVerification) {
        setEmail(data.email);
        setStep("verify");
        toast({
          title: "Verification code sent",
          description: "Please check your email for the 6-digit verification code.",
        });
      }
    } catch (err: any) {
      toast({
        title: "Registration failed",
        description: err.message || "Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  }

  async function onVerify() {
    if (verifyCode.length !== 6) return;
    setIsLoading(true);
    try {
      await verifyEmail(email, verifyCode);
      toast({ title: "Email verified!", description: "Welcome to Kennion Benefit Advisors." });
      navigate("/dashboard");
    } catch (err: any) {
      toast({
        title: "Verification failed",
        description: err.message || "Invalid or expired code.",
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
          <div className="flex items-center cursor-pointer">
            <img src={kennionLogo} alt="Kennion Benefit Advisors" className="h-8 w-auto" />
          </div>
        </Link>
        <ThemeToggle />
      </div>

      <div className="flex-1 flex items-center justify-center px-6 py-12">
        <div className="w-full max-w-md">
          {step === "register" ? (
            <>
              <div className="text-center mb-8">
                <h1 className="text-2xl font-bold tracking-tight">Create Your Account</h1>
                <p className="mt-2 text-sm text-muted-foreground">
                  Register to submit your group for qualification analysis.
                </p>
              </div>

              <Card className="p-6">
                <form onSubmit={form.handleSubmit(onRegister)} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="fullName">Full Name</Label>
                    <Input
                      id="fullName"
                      placeholder="John Smith"
                      data-testid="input-full-name"
                      {...form.register("fullName")}
                    />
                    {form.formState.errors.fullName && (
                      <p className="text-xs text-destructive">{form.formState.errors.fullName.message}</p>
                    )}
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="email">Business Email</Label>
                    <Input
                      id="email"
                      type="email"
                      placeholder="john@company.com"
                      data-testid="input-email"
                      {...form.register("email")}
                    />
                    {form.formState.errors.email && (
                      <p className="text-xs text-destructive">{form.formState.errors.email.message}</p>
                    )}
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="companyName">Company Name</Label>
                    <Input
                      id="companyName"
                      placeholder="Acme Corp"
                      data-testid="input-company-name"
                      {...form.register("companyName")}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="password">Password</Label>
                    <Input
                      id="password"
                      type="password"
                      placeholder="Min. 8 characters"
                      data-testid="input-password"
                      {...form.register("password")}
                    />
                    {form.formState.errors.password && (
                      <p className="text-xs text-destructive">{form.formState.errors.password.message}</p>
                    )}
                  </div>

                  <Button type="submit" className="w-full" disabled={isLoading} data-testid="button-register">
                    {isLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                    Create Account <ArrowRight className="ml-1 h-4 w-4" />
                  </Button>
                </form>
              </Card>

              <p className="mt-4 text-center text-sm text-muted-foreground">
                Already have an account?{" "}
                <Link href="/login">
                  <span className="text-primary font-medium cursor-pointer">Sign in</span>
                </Link>
              </p>
            </>
          ) : (
            <>
              <div className="text-center mb-8">
                <h1 className="text-2xl font-bold tracking-tight">Verify Your Email</h1>
                <p className="mt-2 text-sm text-muted-foreground">
                  We sent a 6-digit code to <strong>{email}</strong>
                </p>
              </div>

              <Card className="p-6">
                <div className="space-y-6">
                  <div className="flex justify-center">
                    <InputOTP maxLength={6} value={verifyCode} onChange={setVerifyCode} data-testid="input-otp">
                      <InputOTPGroup>
                        <InputOTPSlot index={0} />
                        <InputOTPSlot index={1} />
                        <InputOTPSlot index={2} />
                        <InputOTPSlot index={3} />
                        <InputOTPSlot index={4} />
                        <InputOTPSlot index={5} />
                      </InputOTPGroup>
                    </InputOTP>
                  </div>
                  <Button
                    className="w-full"
                    onClick={onVerify}
                    disabled={verifyCode.length !== 6 || isLoading}
                    data-testid="button-verify"
                  >
                    {isLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                    Verify Email
                  </Button>
                </div>
              </Card>

              <button
                onClick={() => setStep("register")}
                className="mt-4 flex items-center gap-1 mx-auto text-sm text-muted-foreground"
                data-testid="button-back-register"
              >
                <ArrowLeft className="h-3.5 w-3.5" /> Back to registration
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
