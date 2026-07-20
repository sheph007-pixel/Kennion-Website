import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Link } from "wouter";
import { z } from "zod";
import {
  ArrowRight, ArrowLeft, Loader2, Mail, Building2, Phone, User,
  CheckCircle2, ShieldCheck, Calendar,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { ThemeToggle } from "@/components/theme-toggle";

const KENNION_LOGO_URL =
  "https://s3.amazonaws.com/cdn.freshdesk.com/data/helpdesk/attachments/production/5004437337/logo/qGPs3ykt503dCIwP_qHVHmcxV3JVHXZucQ.png";

function isValidUSPhone(phone: string): boolean {
  const digits = phone.replace(/\D/g, "");
  if (digits.length === 10) return true;
  if (digits.length === 11 && digits[0] === "1") return true;
  return false;
}

const EMPLOYER_SIZES = [
  "1–50 employees",
  "51–100 employees",
  "101–500 employees",
  "501–1,000 employees",
  "1,000+ employees",
];
const FUNDING_OPTIONS = [
  "Fully insured",
  "Level funded",
  "Self-funded",
  "Not sure yet",
];

const quoteFormSchema = z.object({
  name: z.string().min(1, "Your name is required"),
  companyName: z.string().min(1, "Company name is required"),
  email: z.string().email("Enter a valid email address"),
  phone: z
    .string()
    .min(1, "Phone number is required")
    .refine(isValidUSPhone, { message: "Enter a valid US phone number (10 digits)" }),
  employerSize: z.string().min(1, "Please select your group size"),
  fundingInterest: z.string().min(1, "Please choose one"),
  currentCoverage: z.string().optional().default(""),
  message: z.string().optional().default(""),
});

type QuoteForm = z.infer<typeof quoteFormSchema>;

function openCalendly(e?: React.MouseEvent) {
  if (e) e.preventDefault();
  const url = "https://calendly.com/kennion/call";
  const w = window as any;
  if (typeof window !== "undefined" && w.Calendly?.initPopupWidget) {
    w.Calendly.initPopupWidget({ url });
  } else {
    window.open(url, "_blank", "noopener,noreferrer");
  }
}

export default function RequestQuotePage() {
  const [isLoading, setIsLoading] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const { toast } = useToast();

  const form = useForm<QuoteForm>({
    resolver: zodResolver(quoteFormSchema),
    defaultValues: {
      name: "",
      companyName: "",
      email: "",
      phone: "",
      employerSize: "",
      fundingInterest: "",
      currentCoverage: "",
      message: "",
    },
  });

  async function onSubmit(data: QuoteForm) {
    setIsLoading(true);
    try {
      const payload = {
        name: data.name,
        company: data.companyName,
        email: data.email,
        employees: data.employerSize,
        message: [
          `Phone: ${data.phone}`,
          `Funding interest: ${data.fundingInterest}`,
          data.currentCoverage ? `Current coverage / renewal: ${data.currentCoverage}` : "",
          data.message ? `Message: ${data.message}` : "",
        ].filter(Boolean).join("  |  "),
        website: "", // honeypot — real users leave this empty
      };
      await apiRequest("POST", "/api/contact", payload);
      setSubmitted(true);
    } catch (err: any) {
      const clean = (err?.message || "")
        .replace(/^\d+:\s*/, "")
        .replace(/[{}"]|message:/g, "")
        .trim();
      toast({
        title: "Something went wrong",
        description: clean || "Please try again, or email hunter@kennion.com directly.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-background text-foreground antialiased">
      {/* Header */}
      <header className="border-b border-border">
        <div className="mx-auto max-w-6xl px-6 h-16 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2.5">
            <img src={KENNION_LOGO_URL} alt="Kennion Benefit Advisors" className="h-8 w-auto" style={{ mixBlendMode: "multiply" }} />
          </Link>
          <div className="flex items-center gap-4">
            <Link href="/" className="hidden sm:inline-flex items-center gap-1.5 text-[13.5px] text-muted-foreground hover:text-foreground transition-colors">
              <ArrowLeft size={14} /> Back to home
            </Link>
            <ThemeToggle />
          </div>
        </div>
      </header>

      <div className="mx-auto max-w-6xl px-6 py-14 lg:py-20 grid lg:grid-cols-[0.9fr_1.1fr] gap-12 lg:gap-20 items-start">
        {/* Left: pitch */}
        <div className="lg:pt-6">
          <div className="inline-flex items-center gap-2.5 text-[11.5px] uppercase tracking-[0.2em] font-semibold text-muted-foreground">
            <span className="inline-block w-7 h-px" style={{ background: "hsl(var(--brand-accent))" }} />
            Request a Proposal
          </div>
          <h1 className="font-display font-[450] text-[38px] lg:text-[52px] leading-[1.02] tracking-[-0.03em] mt-5">
            Let&rsquo;s build a benefits program <span className="italic" style={{ color: "hsl(var(--primary))" }}>around your people.</span>
          </h1>
          <p className="mt-5 text-[16px] leading-[1.6] text-muted-foreground max-w-md">
            Tell us a little about your group and our team will reach out to start the
            conversation. No obligation, no cost — just a clear look at what your benefits
            program could be.
          </p>

          <ul className="mt-8 space-y-3.5 text-[14px] text-muted-foreground">
            {[
              "A dedicated advisor, not a call center",
              "Strategy across fully insured, level funded, and self-funded",
              "Guidance for employers of every size",
            ].map((t) => (
              <li key={t} className="flex items-start gap-2.5">
                <CheckCircle2 size={17} className="mt-[1px] shrink-0" style={{ color: "hsl(var(--brand-accent))" }} />
                <span>{t}</span>
              </li>
            ))}
          </ul>

          <div className="mt-9 pt-7 border-t border-border">
            <div className="text-[12px] text-muted-foreground">Prefer to talk it through?</div>
            <a
              href="https://calendly.com/kennion/call"
              onClick={openCalendly}
              className="mt-2 inline-flex items-center gap-1.5 text-[14px] font-medium text-primary hover:underline underline-offset-4 cursor-pointer"
            >
              <Calendar size={15} /> Schedule a call
            </a>
          </div>
        </div>

        {/* Right: form / success */}
        <div>
          {submitted ? (
            <div className="rounded-2xl border border-border bg-card p-8 lg:p-10 shadow-[0_24px_60px_-30px_rgba(15,30,60,.4)]" data-testid="card-quote-success">
              <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center">
                <CheckCircle2 size={24} className="text-primary" />
              </div>
              <h2 className="mt-5 font-display font-[450] text-[28px] tracking-[-0.02em]">Thank you &mdash; we&rsquo;ve got it.</h2>
              <p className="mt-3 text-[15px] leading-[1.6] text-muted-foreground">
                Your request is on its way to our team. Someone from Kennion will be in touch
                shortly at the email and phone number you provided. There&rsquo;s nothing else you
                need to do.
              </p>
              <div className="mt-7 flex flex-wrap items-center gap-3">
                <Link href="/" className="inline-flex items-center gap-1.5 text-[14px] font-medium bg-primary text-primary-foreground hover:opacity-90 px-5 py-2.5 rounded-md">
                  Back to homepage <ArrowRight size={15} />
                </Link>
                <a href="https://calendly.com/kennion/call" onClick={openCalendly} className="inline-flex items-center gap-1.5 text-[14px] font-medium border border-border hover:bg-black/[.03] px-5 py-2.5 rounded-md cursor-pointer">
                  <Calendar size={15} /> Schedule a call
                </a>
              </div>
            </div>
          ) : (
            <div className="rounded-2xl border border-border bg-card p-6 lg:p-8 shadow-[0_24px_60px_-30px_rgba(15,30,60,.4)]">
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                <div className="grid sm:grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <Label htmlFor="name">Your Name</Label>
                    <div className="relative">
                      <User className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                      <Input id="name" placeholder="Jordan Smith" className="pl-9" {...form.register("name")} data-testid="input-name" />
                    </div>
                    {form.formState.errors.name && <p className="text-xs text-destructive">{form.formState.errors.name.message}</p>}
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="companyName">Company</Label>
                    <div className="relative">
                      <Building2 className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                      <Input id="companyName" placeholder="Acme Corp" className="pl-9" {...form.register("companyName")} data-testid="input-company" />
                    </div>
                    {form.formState.errors.companyName && <p className="text-xs text-destructive">{form.formState.errors.companyName.message}</p>}
                  </div>
                </div>

                <div className="grid sm:grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <Label htmlFor="email">Email</Label>
                    <div className="relative">
                      <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                      <Input id="email" type="email" placeholder="you@company.com" className="pl-9" {...form.register("email")} data-testid="input-email" />
                    </div>
                    {form.formState.errors.email && <p className="text-xs text-destructive">{form.formState.errors.email.message}</p>}
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="phone">Phone</Label>
                    <div className="relative">
                      <Phone className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                      <Input id="phone" type="tel" placeholder="(555) 123-4567" className="pl-9" {...form.register("phone")} data-testid="input-phone" />
                    </div>
                    {form.formState.errors.phone && <p className="text-xs text-destructive">{form.formState.errors.phone.message}</p>}
                  </div>
                </div>

                <div className="grid sm:grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <Label htmlFor="employerSize">Group Size</Label>
                    <Select value={form.watch("employerSize")} onValueChange={(v) => form.setValue("employerSize", v, { shouldValidate: true })}>
                      <SelectTrigger id="employerSize" data-testid="select-size"><SelectValue placeholder="Select" /></SelectTrigger>
                      <SelectContent>
                        {EMPLOYER_SIZES.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                      </SelectContent>
                    </Select>
                    {form.formState.errors.employerSize && <p className="text-xs text-destructive">{form.formState.errors.employerSize.message}</p>}
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="fundingInterest">Funding Interest</Label>
                    <Select value={form.watch("fundingInterest")} onValueChange={(v) => form.setValue("fundingInterest", v, { shouldValidate: true })}>
                      <SelectTrigger id="fundingInterest" data-testid="select-funding"><SelectValue placeholder="Select" /></SelectTrigger>
                      <SelectContent>
                        {FUNDING_OPTIONS.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                      </SelectContent>
                    </Select>
                    {form.formState.errors.fundingInterest && <p className="text-xs text-destructive">{form.formState.errors.fundingInterest.message}</p>}
                  </div>
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="currentCoverage">Current Coverage / Renewal Timing <span className="text-muted-foreground font-normal">(optional)</span></Label>
                  <Input id="currentCoverage" placeholder="e.g. Renewing Jan 1, currently fully insured" {...form.register("currentCoverage")} data-testid="input-coverage" />
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="message">Anything else? <span className="text-muted-foreground font-normal">(optional)</span></Label>
                  <Textarea id="message" rows={3} placeholder="Tell us what you're looking for or what's not working today." {...form.register("message")} data-testid="input-message" />
                </div>

                <Button type="submit" className="w-full gap-1.5 mt-1" disabled={isLoading} data-testid="button-submit-quote">
                  {isLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <>Submit Request <ArrowRight className="h-4 w-4" /></>}
                </Button>
              </form>

              <div className="mt-5 pt-4 border-t border-border flex items-center gap-2 text-[11.5px] text-muted-foreground">
                <ShieldCheck className="h-3.5 w-3.5" />
                Your information goes straight to our team. We never sell your data.
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
