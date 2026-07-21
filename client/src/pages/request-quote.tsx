// Request-a-proposal page, styled to match the editorial landing design
// (paper & ink palette, Fraunces display type, ruled fields, small-caps
// labels; see client/src/pages/landing.tsx and the .kn-* utilities).

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Link } from "wouter";
import { z } from "zod";
import { ArrowRight, ArrowLeft, Loader2, Calendar, ShieldCheck } from "lucide-react";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";

const KENNION_LOGO_URL =
  "https://s3.amazonaws.com/cdn.freshdesk.com/data/helpdesk/attachments/production/5004437337/logo/qGPs3ykt503dCIwP_qHVHmcxV3JVHXZucQ.png";

function isValidUSPhone(phone: string): boolean {
  const digits = phone.replace(/\D/g, "");
  if (digits.length === 10) return true;
  if (digits.length === 11 && digits[0] === "1") return true;
  return false;
}

const EMPLOYER_SIZES = [
  "1-50 employees",
  "51-100 employees",
  "101-500 employees",
  "501-1,000 employees",
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

/* Editorial field chrome: small-caps label above a ruled, squared input. */
const FIELD_INPUT_CLS =
  "h-11 rounded-none border-0 border-b border-border bg-transparent px-0 text-[15px] " +
  "placeholder:text-muted-foreground/50 focus-visible:ring-0 focus-visible:ring-offset-0 " +
  "focus-visible:border-primary transition-colors";

function Field({ label, error, optional = false, children, htmlFor }: {
  label: string; error?: string; optional?: boolean; children: React.ReactNode; htmlFor?: string;
}) {
  return (
    <div>
      <label htmlFor={htmlFor} className="kn-caps text-muted-foreground block">
        {label}
        {optional && <span className="ml-2 normal-case tracking-normal font-normal text-[11px]">(optional)</span>}
      </label>
      <div className="mt-1">{children}</div>
      {error && <p className="mt-1.5 text-xs text-destructive">{error}</p>}
    </div>
  );
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
        website: "", // honeypot, real users leave this empty
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

  const selectCls =
    "h-11 rounded-none border-0 border-b border-border bg-transparent px-0 text-[15px] " +
    "focus:ring-0 focus:ring-offset-0 data-[placeholder]:text-muted-foreground/50";

  return (
    <div className="kn-landing min-h-screen antialiased">
      {/* Header */}
      <header className="border-b border-border">
        <div className="mx-auto max-w-[1320px] px-6 lg:px-10 h-[68px] flex items-center justify-between">
          <Link href="/" className="flex items-center">
            <img src={KENNION_LOGO_URL} alt="Kennion Benefit Advisors" className="h-8 w-auto" style={{ mixBlendMode: "multiply" }} />
          </Link>
          <Link href="/" className="inline-flex items-center gap-2 text-[11.5px] uppercase tracking-[0.16em] font-semibold text-muted-foreground hover:text-foreground transition-colors">
            <ArrowLeft size={13} strokeWidth={2} /> Back to home
          </Link>
        </div>
      </header>

      <div className="mx-auto max-w-[1320px] px-6 lg:px-10 py-16 lg:py-24 grid lg:grid-cols-12 gap-y-14 lg:gap-x-10 items-start">
        {/* Left: pitch */}
        <div className="lg:col-span-5">
          <div className="flex items-baseline gap-4 kn-caps text-muted-foreground">
            <span className="inline-block w-10 h-px translate-y-[-3px]" style={{ background: "hsl(var(--brand-accent))" }} />
            Request a Proposal
          </div>
          <h1 className="font-display font-bold mt-7 text-[clamp(2.4rem,6vw,3.5rem)] leading-[1.0] tracking-[-0.035em]">
            See what your last broker <span style={{ color: "hsl(var(--primary))" }}>never showed you.</span>
          </h1>
          <p className="mt-6 text-[15.5px] leading-[1.65] text-muted-foreground max-w-[28rem]">
            Tell us a little about your group and our team will take it from there. It costs
            nothing to see what we would put on the table.
          </p>

          <div className="mt-10 max-w-[28rem]">
            {[
              "New ideas, priced with real rates",
              "Online enrollment, no paper anywhere",
              "A team that runs it all year",
            ].map((t) => (
              <div key={t} className="flex items-baseline gap-4 border-t border-border py-4 last:border-b">
                <span className="inline-block w-5 h-px translate-y-[-4px] shrink-0" style={{ background: "hsl(var(--brand-accent))" }} />
                <span className="text-[14px] leading-[1.6]">{t}</span>
              </div>
            ))}
          </div>

          <div className="mt-10">
            <div className="kn-caps text-muted-foreground">Prefer to talk it through?</div>
            <a
              href="https://calendly.com/kennion/call"
              onClick={openCalendly}
              className="mt-3 inline-flex items-center gap-2.5 kn-link text-[13px] font-semibold uppercase tracking-[0.1em] cursor-pointer"
            >
              <Calendar size={14} strokeWidth={1.8} style={{ color: "hsl(var(--brand-accent))" }} />
              Schedule a call
            </a>
          </div>
        </div>

        {/* Right: form / success */}
        <div className="lg:col-span-7 lg:border-l lg:border-border lg:pl-14">
          {submitted ? (
            <div className="max-w-[36rem]" data-testid="card-quote-success">
              <div className="kn-caps" style={{ color: "hsl(var(--brand-accent))" }}>Request received</div>
              <h2 className="mt-4 font-display font-bold text-[clamp(2rem,5vw,2.75rem)] leading-[1.04] tracking-[-0.03em]">
                Thank you, we&rsquo;ve got it.
              </h2>
              <p className="mt-5 text-[15px] leading-[1.7] text-muted-foreground border-t border-border pt-5">
                Your request is on its way to our team. Someone from Kennion will be in touch
                shortly at the email and phone number you provided. There&rsquo;s nothing else you
                need to do.
              </p>
              <div className="mt-9 flex flex-wrap items-center gap-x-8 gap-y-4">
                <Link href="/" className="group inline-flex items-center gap-3 bg-primary text-primary-foreground px-6 py-3.5 text-[13px] font-semibold tracking-[0.08em] uppercase transition-colors hover:bg-[hsl(var(--ink))]">
                  Back to homepage
                  <ArrowRight size={14} strokeWidth={2} className="transition-transform group-hover:translate-x-1" />
                </Link>
                <a href="https://calendly.com/kennion/call" onClick={openCalendly} className="kn-link text-[13px] font-semibold uppercase tracking-[0.1em] cursor-pointer">
                  Schedule a call
                </a>
              </div>
            </div>
          ) : (
            <div className="max-w-[36rem]">
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
                <div className="grid sm:grid-cols-2 gap-x-10 gap-y-8">
                  <Field label="Your Name" htmlFor="name" error={form.formState.errors.name?.message}>
                    <Input id="name" placeholder="Jordan Smith" className={FIELD_INPUT_CLS} {...form.register("name")} data-testid="input-name" />
                  </Field>
                  <Field label="Company" htmlFor="companyName" error={form.formState.errors.companyName?.message}>
                    <Input id="companyName" placeholder="Acme Corp" className={FIELD_INPUT_CLS} {...form.register("companyName")} data-testid="input-company" />
                  </Field>
                  <Field label="Email" htmlFor="email" error={form.formState.errors.email?.message}>
                    <Input id="email" type="email" placeholder="you@company.com" className={FIELD_INPUT_CLS} {...form.register("email")} data-testid="input-email" />
                  </Field>
                  <Field label="Phone" htmlFor="phone" error={form.formState.errors.phone?.message}>
                    <Input id="phone" type="tel" placeholder="(555) 123-4567" className={FIELD_INPUT_CLS} {...form.register("phone")} data-testid="input-phone" />
                  </Field>
                  <Field label="Group Size" htmlFor="employerSize" error={form.formState.errors.employerSize?.message}>
                    <Select value={form.watch("employerSize")} onValueChange={(v) => form.setValue("employerSize", v, { shouldValidate: true })}>
                      <SelectTrigger id="employerSize" className={selectCls} data-testid="select-size"><SelectValue placeholder="Select" /></SelectTrigger>
                      <SelectContent>
                        {EMPLOYER_SIZES.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </Field>
                  <Field label="Funding Interest" htmlFor="fundingInterest" error={form.formState.errors.fundingInterest?.message}>
                    <Select value={form.watch("fundingInterest")} onValueChange={(v) => form.setValue("fundingInterest", v, { shouldValidate: true })}>
                      <SelectTrigger id="fundingInterest" className={selectCls} data-testid="select-funding"><SelectValue placeholder="Select" /></SelectTrigger>
                      <SelectContent>
                        {FUNDING_OPTIONS.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </Field>
                </div>

                <Field label="Current Coverage / Renewal Timing" htmlFor="currentCoverage" optional>
                  <Input id="currentCoverage" placeholder="e.g. Renewing Jan 1, currently fully insured" className={FIELD_INPUT_CLS} {...form.register("currentCoverage")} data-testid="input-coverage" />
                </Field>

                <Field label="Anything else?" htmlFor="message" optional>
                  <Textarea
                    id="message"
                    rows={3}
                    placeholder="Tell us what you're looking for or what's not working today."
                    className="rounded-none border-0 border-b border-border bg-transparent px-0 text-[15px] placeholder:text-muted-foreground/50 focus-visible:ring-0 focus-visible:ring-offset-0 focus-visible:border-primary transition-colors resize-none"
                    {...form.register("message")}
                    data-testid="input-message"
                  />
                </Field>

                <button
                  type="submit"
                  disabled={isLoading}
                  data-testid="button-submit-quote"
                  className="group w-full inline-flex items-center justify-center gap-3 bg-primary text-primary-foreground px-6 py-4 text-[13px] font-semibold tracking-[0.08em] uppercase transition-colors hover:bg-[hsl(var(--ink))] disabled:opacity-60"
                >
                  {isLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : (
                    <>
                      Submit Request
                      <ArrowRight size={14} strokeWidth={2} className="transition-transform group-hover:translate-x-1" />
                    </>
                  )}
                </button>
              </form>

              <div className="mt-6 pt-5 border-t border-border flex items-center gap-2.5 text-[11.5px] uppercase tracking-[0.1em] text-muted-foreground">
                <ShieldCheck size={13} strokeWidth={1.8} style={{ color: "hsl(var(--brand-accent))" }} />
                Your information goes straight to our team. We never sell your data.
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
