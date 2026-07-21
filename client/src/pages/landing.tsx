// Kennion Benefit Advisors public marketing homepage.
// Positioning: a large, established, tech-forward benefits agency.
// Lean page: hero with product visual, proof band, platform story,
// options, how it works, CTA + contact, footer. Inter Tight type,
// paper & ink palette scoped via .kn-landing (see index.css).

import { useState, useEffect, useRef } from "react";
import { Link } from "wouter";
import { ArrowRight, ArrowUpRight, ChevronDown, X, Menu, MapPin, Mail, Calendar, Check } from "lucide-react";

declare global {
  interface Window { Calendly?: any; }
}

function openCalendly(e?: React.MouseEvent) {
  if (e) e.preventDefault();
  const url = "https://calendly.com/kennion/call";
  if (typeof window !== "undefined" && window.Calendly && typeof window.Calendly.initPopupWidget === "function") {
    window.Calendly.initPopupWidget({ url });
  } else {
    window.open(url, "_blank", "noopener,noreferrer");
  }
}

const KENNION_LOGO_URL = "https://s3.amazonaws.com/cdn.freshdesk.com/data/helpdesk/attachments/production/5004437337/logo/qGPs3ykt503dCIwP_qHVHmcxV3JVHXZucQ.png";

/* ── type scale ────────────────────────────────────────────────────── */

const H1 = "font-display font-bold tracking-[-0.04em] leading-[0.96] text-[clamp(2.75rem,10vw,6.9rem)]";
const H2 = "font-display font-bold tracking-[-0.03em] leading-[1.0] text-[clamp(2rem,4.8vw,3.8rem)]";
const H3 = "font-display font-semibold tracking-[-0.02em]";

/* ── motion ────────────────────────────────────────────────────────── */

function useInView(threshold = 0.12) {
  const ref = useRef<any>(null);
  const [seen, setSeen] = useState(false);
  useEffect(() => {
    if (!ref.current || seen) return;
    const io = new IntersectionObserver(([e]) => {
      if (e.isIntersecting) { setSeen(true); io.disconnect(); }
    }, { threshold, rootMargin: "0px 0px -6% 0px" });
    io.observe(ref.current);
    return () => io.disconnect();
  }, [seen, threshold]);
  return [ref, seen] as const;
}

function Reveal({ children, delay = 0, className = "", y = 14 }: {
  children: React.ReactNode; delay?: number; className?: string; y?: number;
}) {
  const [ref, seen] = useInView();
  return (
    <div
      ref={ref}
      className={className}
      style={{
        opacity: seen ? 1 : 0,
        transform: seen ? "translate3d(0,0,0)" : `translate3d(0,${y}px,0)`,
        transition: `opacity 800ms cubic-bezier(.2,.7,.2,1) ${delay}ms, transform 800ms cubic-bezier(.2,.7,.2,1) ${delay}ms`,
        willChange: "opacity, transform",
      }}
    >
      {children}
    </div>
  );
}

/* ── shared bits ───────────────────────────────────────────────────── */

function SectionHead({ label, children, dark = false }: {
  label: string; children: React.ReactNode; dark?: boolean;
}) {
  return (
    <Reveal>
      <div className={`flex items-baseline gap-4 border-b pb-4 ${dark ? "border-white/15" : "border-foreground/20"}`}>
        <span className="inline-block w-6 h-px translate-y-[-3px]" style={{ background: "hsl(var(--brand-accent))" }} />
        <span className={`kn-caps ${dark ? "text-white/60" : "text-muted-foreground"}`}>{label}</span>
      </div>
      <div className="pt-8 lg:pt-14">{children}</div>
    </Reveal>
  );
}

function SolidButton({ href, onClick, children, external = false, tone = "ink" }: {
  href: string; onClick?: (e: React.MouseEvent) => void; children: React.ReactNode; external?: boolean;
  tone?: "ink" | "paper";
}) {
  const cls = tone === "ink"
    ? "group inline-flex items-center justify-center gap-3 bg-primary text-primary-foreground px-6 py-3.5 text-[13px] font-semibold tracking-[0.08em] uppercase transition-colors hover:bg-[hsl(var(--ink))]"
    : "group inline-flex items-center justify-center gap-3 bg-[hsl(var(--background))] text-primary px-6 py-3.5 text-[13px] font-semibold tracking-[0.08em] uppercase transition-opacity hover:opacity-90";
  const inner = (
    <>
      {children}
      <ArrowRight size={14} strokeWidth={2} className="transition-transform group-hover:translate-x-1" />
    </>
  );
  if (external) {
    return <a href={href} onClick={onClick} className={cls} target={onClick ? undefined : "_blank"} rel="noopener noreferrer">{inner}</a>;
  }
  return <Link href={href} className={cls}>{inner}</Link>;
}

/* ── nav ───────────────────────────────────────────────────────────── */

function Nav() {
  const [open, setOpen] = useState(false);
  const [portalOpen, setPortalOpen] = useState(false);
  const portalRef = useRef<any>(null);

  useEffect(() => {
    if (!portalOpen) return;
    const close = (e: MouseEvent) => {
      if (portalRef.current && !portalRef.current.contains(e.target)) setPortalOpen(false);
    };
    const esc = (e: KeyboardEvent) => { if (e.key === "Escape") setPortalOpen(false); };
    document.addEventListener("mousedown", close);
    document.addEventListener("keydown", esc);
    return () => {
      document.removeEventListener("mousedown", close);
      document.removeEventListener("keydown", esc);
    };
  }, [portalOpen]);

  const links = [
    ["#platform", "Platform"],
    ["#options", "Options"],
    ["#how", "How It Works"],
    ["#contact", "Contact"],
  ];

  return (
    <header className="sticky top-0 z-40 border-b border-border bg-[hsl(var(--background))]/92 backdrop-blur supports-[backdrop-filter]:bg-[hsl(var(--background))]/85">
      <div className="mx-auto max-w-[1320px] px-6 lg:px-10 flex items-center justify-between h-[64px] lg:h-[68px]">
        <Link href="/" className="flex items-center">
          <img src={KENNION_LOGO_URL} alt="Kennion Benefit Advisors" className="h-7 lg:h-8 w-auto" style={{ mixBlendMode: "multiply" }} />
        </Link>

        <nav className="hidden lg:flex items-center gap-8">
          {links.map(([href, label]) => (
            <a key={href} href={href} className="kn-link-rev text-[11.5px] uppercase tracking-[0.16em] font-semibold text-muted-foreground hover:text-foreground transition-colors">
              {label}
            </a>
          ))}
        </nav>

        <div className="hidden lg:flex items-center gap-6">
          <span className="w-px h-4 bg-border" aria-hidden="true" />
          <div className="relative" ref={portalRef}>
            <button
              onClick={() => setPortalOpen(!portalOpen)}
              className={`flex items-center gap-1.5 text-[11.5px] uppercase tracking-[0.16em] font-semibold transition-colors ${portalOpen ? "text-foreground" : "text-muted-foreground hover:text-foreground"}`}
              aria-expanded={portalOpen}
            >
              Client Access
              <ChevronDown size={12} strokeWidth={2.2} className={`transition-transform ${portalOpen ? "rotate-180" : ""}`} />
            </button>
            {portalOpen && (
              <div className="absolute right-0 top-full mt-4 w-64 border border-border bg-[hsl(var(--background))] shadow-[0_24px_50px_-18px_rgba(15,30,60,0.28)]">
                <div className="px-4 pt-3.5 pb-3 border-b border-border">
                  <div className="kn-caps text-muted-foreground">Clients &amp; Members</div>
                </div>
                <a href="https://go.kennion.com/support" target="_blank" rel="noopener noreferrer" className="flex items-center justify-between px-4 py-3.5 text-[13.5px] hover:bg-muted transition-colors">
                  <div>
                    <div className="font-medium">Support</div>
                    <div className="text-[11.5px] text-muted-foreground mt-0.5">Open a ticket</div>
                  </div>
                  <ArrowUpRight size={13} className="text-muted-foreground" />
                </a>
                <a href="http://go.kennion.com/enroll" target="_blank" rel="noopener noreferrer" className="flex items-center justify-between px-4 py-3.5 text-[13.5px] hover:bg-muted transition-colors border-t border-border">
                  <div>
                    <div className="font-medium">Enrollment</div>
                    <div className="text-[11.5px] text-muted-foreground mt-0.5">Member login</div>
                  </div>
                  <ArrowUpRight size={13} className="text-muted-foreground" />
                </a>
              </div>
            )}
          </div>

          <Link href="/quote" className="inline-flex items-center gap-2.5 bg-primary text-primary-foreground px-5 py-2.5 text-[11.5px] font-semibold uppercase tracking-[0.14em] transition-colors hover:bg-[hsl(var(--ink))]">
            Request a Proposal
          </Link>
        </div>

        <button className="lg:hidden w-10 h-10 grid place-items-center -mr-2" onClick={() => setOpen(!open)} aria-label="Menu">
          {open ? <X size={20} strokeWidth={1.8} /> : <Menu size={20} strokeWidth={1.8} />}
        </button>
      </div>

      {open && (
        <div className="lg:hidden border-t border-border bg-[hsl(var(--background))] px-6 py-6">
          {links.map(([href, label]) => (
            <a key={href} href={href} onClick={() => setOpen(false)} className={`block py-3.5 ${H3} text-[20px] border-b border-border`}>
              {label}
            </a>
          ))}
          <Link href="/quote" className="mt-6 flex items-center justify-center gap-2 bg-primary text-primary-foreground px-5 py-3.5 text-[12px] font-semibold uppercase tracking-[0.14em]">
            Request a Proposal
          </Link>
          <div className="mt-6 flex items-center gap-6 text-[11.5px] uppercase tracking-[0.14em] font-semibold text-muted-foreground">
            <a href="https://go.kennion.com/support" className="kn-link">Support</a>
            <a href="http://go.kennion.com/enroll" className="kn-link">Enrollment</a>
          </div>
        </div>
      )}
    </header>
  );
}

/* ── hero product visual (pure CSS, depicts the real quoting flow) ─── */

function ProductVisual() {
  const plans = [
    { name: "Healthy 500", rate: "412", bar: "82%" },
    { name: "Healthy 1000", rate: "376", bar: "70%" },
    { name: "Healthy 2500 HSA", rate: "341", bar: "58%" },
  ];
  return (
    <div className="relative select-none pt-6 pb-12 pr-2 lg:pr-0" aria-hidden="true">
      {/* proposal card */}
      <div className="relative bg-white border border-border shadow-[0_44px_90px_-42px_rgba(15,30,60,0.5)] rotate-[0.6deg]">
        <div className="flex items-center justify-between px-5 py-4 border-b border-border">
          <div>
            <div className="kn-caps text-muted-foreground">Proposal</div>
            <div className={`${H3} text-[17px] mt-1`}>Group of 42</div>
          </div>
          <span className="text-[10.5px] font-semibold uppercase tracking-[0.1em] border border-border px-2.5 py-1.5 text-muted-foreground">
            23 plans quoted
          </span>
        </div>
        <div className="px-5 py-2">
          {plans.map((p) => (
            <div key={p.name} className="grid grid-cols-[1fr_auto] gap-x-4 items-center border-b border-border/70 last:border-b-0 py-3.5">
              <div>
                <div className="text-[13px] font-semibold tracking-[-0.01em]">{p.name}</div>
                <div className="mt-2 h-[3px] w-full bg-muted">
                  <div className="h-full bg-primary/70" style={{ width: p.bar }} />
                </div>
              </div>
              <div className="text-right">
                <div className="font-display font-bold text-[17px] tracking-[-0.02em] tabular-nums">${p.rate}</div>
                <div className="text-[10px] uppercase tracking-[0.1em] text-muted-foreground">per employee</div>
              </div>
            </div>
          ))}
        </div>
        <div className="flex items-center gap-2.5 px-5 py-3.5 border-t border-border bg-muted/50">
          <span className="relative flex h-2 w-2">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full opacity-60" style={{ background: "hsl(var(--brand-accent))" }} />
            <span className="relative inline-flex rounded-full h-2 w-2" style={{ background: "hsl(var(--brand-accent))" }} />
          </span>
          <span className="text-[11px] font-semibold uppercase tracking-[0.1em] text-muted-foreground">AI review complete</span>
        </div>
      </div>

      {/* enrollment card */}
      <div className="absolute -bottom-2 -left-3 sm:-left-6 w-[62%] max-w-[260px] bg-[hsl(var(--ink))] text-white p-4 shadow-[0_30px_60px_-24px_rgba(10,20,40,0.6)] -rotate-[1.4deg]">
        <div className="kn-caps text-white/50">Open Enrollment</div>
        <div className="mt-3 flex items-baseline justify-between">
          <span className="font-display font-bold text-[26px] leading-none tracking-[-0.03em] tabular-nums">38<span className="text-white/40">/42</span></span>
          <span className="text-[10px] uppercase tracking-[0.1em] text-white/50">enrolled online</span>
        </div>
        <div className="mt-3 h-[3px] w-full bg-white/15">
          <div className="h-full" style={{ width: "90%", background: "hsl(var(--brand-accent))" }} />
        </div>
        <div className="mt-3.5 space-y-2">
          {["Elections sent to carrier", "Digital forms signed"].map((t) => (
            <div key={t} className="flex items-center gap-2 text-[11px] text-white/70">
              <Check size={11} strokeWidth={2.5} style={{ color: "hsl(var(--brand-accent))" }} />
              {t}
            </div>
          ))}
        </div>
      </div>

      {/* census chip */}
      <div className="absolute top-0 right-2 sm:right-6 bg-white border border-border px-3 py-2 shadow-[0_16px_36px_-16px_rgba(15,30,60,0.4)] rotate-[1.2deg]">
        <span className="text-[10.5px] font-semibold uppercase tracking-[0.1em] text-muted-foreground">Census received · 42 lives</span>
      </div>
    </div>
  );
}

/* ── hero ──────────────────────────────────────────────────────────── */

function Hero() {
  return (
    <section className="relative overflow-hidden">
      <div className="mx-auto max-w-[1320px] px-6 lg:px-10 pt-12 lg:pt-24 pb-16 lg:pb-24 grid lg:grid-cols-12 gap-y-12 lg:gap-x-16 items-center">
        <div className="lg:col-span-7">
          <Reveal>
            <div className="flex items-baseline gap-4 kn-caps text-muted-foreground">
              <span className="inline-block w-10 h-px translate-y-[-3px]" style={{ background: "hsl(var(--brand-accent))" }} />
              Employee Benefits
            </div>
          </Reveal>
          <Reveal delay={90}>
            <h1 className="font-display font-bold tracking-[-0.04em] leading-[0.98] text-[clamp(2.5rem,8vw,4.6rem)] mt-7">
              The modern
              <br />
              benefits agency<span style={{ color: "hsl(var(--brand-accent))" }}>.</span>
            </h1>
          </Reveal>
          <Reveal delay={180}>
            <p className="mt-8 text-[16px] lg:text-[17px] leading-[1.65] text-muted-foreground max-w-[30rem]">
              Kennion pairs deep market experience with serious technology. Employers use us
              to find the ideas their last broker never brought up.
            </p>
            <div className="mt-9 flex flex-wrap items-center gap-x-8 gap-y-4">
              <SolidButton href="/quote">Request a Proposal</SolidButton>
              <a href="#how" className="kn-link text-[13px] font-semibold uppercase tracking-[0.1em] text-foreground">
                See how it works
              </a>
            </div>
          </Reveal>
        </div>

        <Reveal delay={220} className="lg:col-span-5">
          <ProductVisual />
        </Reveal>
      </div>

      <ProofBand />
    </section>
  );
}

function ProofBand() {
  const items = [
    ["Decades deep", "in this market"],
    ["Zero patience", "for the status quo"],
    ["New ideas", "at every renewal"],
    ["Honest pushback", "when it saves you money"],
  ];
  return (
    <div className="border-y border-border">
      <div className="mx-auto max-w-[1320px] px-6 lg:px-10 grid grid-cols-2 lg:grid-cols-4">
        {items.map(([big, small], i) => (
          <div key={big} className={`py-7 lg:py-9 pr-6 ${i > 0 ? "lg:border-l lg:border-border lg:pl-8" : ""} ${i % 2 === 1 ? "border-l border-border pl-6 lg:pl-8" : ""} ${i > 1 ? "border-t border-border lg:border-t-0" : ""}`}>
            <div className="font-display font-bold text-[24px] lg:text-[30px] leading-none tracking-[-0.03em]">{big}</div>
            <div className="mt-2 text-[12px] uppercase tracking-[0.1em] text-muted-foreground">{small}</div>
          </div>
        ))}
      </div>
    </div>
  );
}

/* ── platform (dark) ───────────────────────────────────────────────── */

function Platform() {
  return (
    <section id="platform" className="bg-[hsl(var(--ink))] text-white py-20 lg:py-32">
      <div className="mx-auto max-w-[1320px] px-6 lg:px-10">
        <SectionHead label="The Platform" dark>
          <div className="grid lg:grid-cols-12 gap-y-6 lg:gap-x-10 items-end mb-12 lg:mb-16">
            <h2 className={`${H2} lg:col-span-7`}>
              Benefits, run
              <br />
              like software.
            </h2>
            <p className="lg:col-span-5 text-[15px] leading-[1.65] text-white/60 lg:pb-2 max-w-[26rem]">
              The tools you would expect from a technology company, built by a team that got
              tired of watching benefits stand still.
            </p>
          </div>
        </SectionHead>

        <div className="grid md:grid-cols-3 gap-px bg-white/10 border border-white/10">
          {/* Quote online */}
          <Reveal>
            <div className="bg-[hsl(var(--ink))] p-6 lg:p-8 h-full flex flex-col">
              <div className="border border-white/10 bg-white/[0.04] p-4 mb-7">
                {[["Healthy 500", "82%"], ["Healthy 1000", "70%"], ["HSA 2500", "58%"]].map(([n, w]) => (
                  <div key={n} className="flex items-center gap-3 py-2 border-b border-white/10 last:border-b-0">
                    <span className="text-[10.5px] uppercase tracking-[0.08em] text-white/50 w-24 shrink-0">{n}</span>
                    <div className="h-[3px] flex-1 bg-white/10">
                      <div className="h-full" style={{ width: w, background: "hsl(var(--brand-accent))" }} />
                    </div>
                  </div>
                ))}
              </div>
              <h3 className={`${H3} text-[21px]`}>Quote online</h3>
              <p className="mt-3 text-[13.5px] leading-[1.7] text-white/60">
                Send a census, get real options back fast. No week of phone tag to find out
                what your group is worth.
              </p>
            </div>
          </Reveal>

          {/* Enroll online */}
          <Reveal delay={70}>
            <div className="bg-[hsl(var(--ink))] p-6 lg:p-8 h-full flex flex-col">
              <div className="border border-white/10 bg-white/[0.04] p-4 mb-7">
                <div className="flex items-baseline justify-between">
                  <span className="font-display font-bold text-[22px] tracking-[-0.03em] tabular-nums">90%</span>
                  <span className="text-[10px] uppercase tracking-[0.1em] text-white/50">enrolled</span>
                </div>
                <div className="mt-2.5 h-[3px] w-full bg-white/10">
                  <div className="h-full w-[90%]" style={{ background: "hsl(var(--brand-accent))" }} />
                </div>
                <div className="mt-3 flex items-center gap-2 text-[10.5px] uppercase tracking-[0.08em] text-white/50">
                  <Check size={11} strokeWidth={2.5} style={{ color: "hsl(var(--brand-accent))" }} />
                  No paper anywhere
                </div>
              </div>
              <h3 className={`${H3} text-[21px]`}>Enroll online</h3>
              <p className="mt-3 text-[13.5px] leading-[1.7] text-white/60">
                Employees enroll from a link on any device. Elections flow straight through,
                and HR watches it happen in real time.
              </p>
            </div>
          </Reveal>

          {/* AI analysis */}
          <Reveal delay={140}>
            <div className="bg-[hsl(var(--ink))] p-6 lg:p-8 h-full flex flex-col">
              <div className="border border-white/10 bg-white/[0.04] p-4 mb-7 overflow-hidden">
                <div className="kn-caps text-white/50">Analyzing group</div>
                <div className="relative mt-3 h-[3px] w-full bg-white/10 overflow-hidden">
                  <div className="kn-scan absolute inset-y-0 w-1/4" style={{ background: "hsl(var(--brand-accent))" }} />
                </div>
                <div className="mt-3 flex items-center gap-2">
                  <span className="relative flex h-1.5 w-1.5">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full opacity-60" style={{ background: "hsl(var(--brand-accent))" }} />
                    <span className="relative inline-flex rounded-full h-1.5 w-1.5" style={{ background: "hsl(var(--brand-accent))" }} />
                  </span>
                  <span className="text-[10.5px] uppercase tracking-[0.08em] text-white/50">Review in progress</span>
                </div>
              </div>
              <h3 className={`${H3} text-[21px]`}>AI-assisted analysis</h3>
              <p className="mt-3 text-[13.5px] leading-[1.7] text-white/60">
                Every group gets a layer of AI review on top of experienced underwriting eyes,
                so nothing about your risk gets missed.
              </p>
            </div>
          </Reveal>
        </div>
      </div>
    </section>
  );
}

/* ── options ───────────────────────────────────────────────────────── */

function Options() {
  const chips = [
    "Medical", "Dental", "Vision", "Life", "Disability", "Supplemental",
    "Level Funded", "Self-Funded", "Reference-Based Pricing", "Rx Programs",
    "HSA Plans", "Online Enrollment",
  ];
  const row = chips.map((c, i) => (
    <span key={i} className="inline-block border border-border px-4 py-2.5 mr-3 text-[12px] font-semibold uppercase tracking-[0.1em] text-muted-foreground whitespace-nowrap bg-white/60">
      {c}
    </span>
  ));
  return (
    <section id="options" className="py-20 lg:py-32">
      <div className="mx-auto max-w-[1320px] px-6 lg:px-10">
        <SectionHead label="Options">
          <div className="grid lg:grid-cols-12 gap-y-6 lg:gap-x-10 items-end">
            <h2 className={`${H2} lg:col-span-7`}>
              More options than
              <br />
              <span style={{ color: "hsl(var(--primary))" }}>you knew existed.</span>
            </h2>
            <p className="lg:col-span-5 text-[15px] leading-[1.65] text-muted-foreground lg:pb-2 max-w-[26rem]">
              If every renewal looks like last year with a higher number, you are looking at
              the status quo, not the market. We bring the structures most brokers never show,
              and we tell you which one we would pick.
            </p>
          </div>
        </SectionHead>
      </div>
      <div className="mt-12 lg:mt-16 overflow-hidden py-1" aria-hidden="true">
        <div className="kn-marquee flex w-max">
          <div className="flex items-center">{row}</div>
          <div className="flex items-center">{row}</div>
        </div>
      </div>
    </section>
  );
}

/* ── how it works ──────────────────────────────────────────────────── */

function HowItWorks() {
  const steps = [
    { t: "Send your census", d: "A spreadsheet is all we need to get started." },
    { t: "See every option", d: "Real plans and real rates, side by side, fast." },
    { t: "We run the rest", d: "Enrollment, renewals, and the day-to-day. Handled." },
  ];
  return (
    <section id="how" className="border-t border-border py-20 lg:py-32">
      <div className="mx-auto max-w-[1320px] px-6 lg:px-10">
        <SectionHead label="How It Works">
          <div className="grid md:grid-cols-3 gap-y-10 md:gap-x-10">
            {steps.map((s, i) => (
              <Reveal key={s.t} delay={i * 80}>
                <div className={`md:pr-6 ${i > 0 ? "md:border-l md:border-border md:pl-10" : ""}`}>
                  <div className="font-display font-bold text-[44px] lg:text-[56px] leading-none tracking-[-0.04em] tabular-nums" style={{ color: "hsl(var(--brand-accent))" }}>
                    {i + 1}
                  </div>
                  <h3 className={`${H3} mt-5 text-[22px] lg:text-[25px]`}>{s.t}</h3>
                  <p className="mt-3 text-[14px] leading-[1.7] text-muted-foreground max-w-[20rem]">{s.d}</p>
                </div>
              </Reveal>
            ))}
          </div>
        </SectionHead>
      </div>
    </section>
  );
}

/* ── CTA + contact ─────────────────────────────────────────────────── */

function FinalCTA() {
  return (
    <section id="contact" className="bg-primary text-primary-foreground py-20 lg:py-28">
      <div className="mx-auto max-w-[1320px] px-6 lg:px-10">
        <div className="kn-caps text-white/50">Get Started</div>
        <h2 className="mt-6 font-display font-bold tracking-[-0.035em] leading-[0.98] text-[clamp(2.4rem,6.5vw,4.75rem)] max-w-[15em]">
          See what your group is missing.
        </h2>
        <p className="mt-7 text-[16px] leading-[1.65] text-white/70 max-w-[34rem]">
          Send us your census and we will show you every option on the table. It costs
          nothing to look.
        </p>
        <div className="mt-10 flex flex-wrap items-center gap-x-9 gap-y-5">
          <SolidButton href="/quote" tone="paper">Request a Proposal</SolidButton>
          <a href="https://calendly.com/kennion/call" onClick={openCalendly}
             className="kn-link text-[13px] font-semibold uppercase tracking-[0.1em] text-white cursor-pointer">
            Schedule a call
          </a>
        </div>

        <div className="mt-14 lg:mt-16 border-t border-white/15 pt-7 flex flex-wrap gap-x-12 gap-y-4 text-[13px] text-white/70">
          <span className="inline-flex items-center gap-2.5">
            <MapPin size={14} strokeWidth={1.7} style={{ color: "hsl(var(--brand-accent))" }} />
            2828 Old 280 Court, Vestavia, Alabama 35243
          </span>
          <a href="mailto:support@kennion.com" className="kn-link-rev inline-flex items-center gap-2.5 hover:text-white">
            <Mail size={14} strokeWidth={1.7} style={{ color: "hsl(var(--brand-accent))" }} />
            support@kennion.com
          </a>
          <a href="https://calendly.com/kennion/call" onClick={openCalendly} className="kn-link-rev inline-flex items-center gap-2.5 hover:text-white cursor-pointer">
            <Calendar size={14} strokeWidth={1.7} style={{ color: "hsl(var(--brand-accent))" }} />
            Book a call online
          </a>
        </div>
      </div>
    </section>
  );
}

/* ── legal ─────────────────────────────────────────────────────────── */

const LEGAL_CONTENT: Record<string, { title: string; updated: string; sections: { h: string; b: string }[] }> = {
  privacy: {
    title: "Privacy Policy",
    updated: "Effective May 2026",
    sections: [
      { h: "Information We Collect", b: "We collect information you voluntarily provide when you contact us or request a proposal, typically your name, company, email address, phone number, and basic information about your group. We also collect standard analytics information about how you use our site, including pages visited, referring source, and device type." },
      { h: "How We Use Your Information", b: "We use your information to respond to your inquiries, prepare proposals, deliver our services, communicate updates about your account or coverage, and improve our website. We do not sell your personal information." },
      { h: "How We Share Information", b: "We share information with carriers, third-party administrators, and other service providers necessary to deliver our services. We may also disclose information when required by law, in response to a subpoena, or to protect our rights, safety, or property." },
      { h: "Data Security", b: "We use industry-standard administrative, technical, and physical safeguards to protect your information. No method of transmission over the Internet or electronic storage is 100% secure, and we cannot guarantee absolute security." },
      { h: "Your Choices", b: "You may opt out of marketing communications at any time using the unsubscribe link in any email or by contacting us. You may also request access to, correction of, or deletion of your information, subject to applicable legal and recordkeeping obligations." },
      { h: "Cookies & Tracking", b: "Our site uses cookies and similar technologies for functionality and analytics. You can disable cookies in your browser settings, though some site features may not work as intended." },
      { h: "Children's Privacy", b: "Our site is not directed to children under 13, and we do not knowingly collect personal information from children." },
      { h: "Changes to This Policy", b: "We may update this policy from time to time. The effective date above reflects the most recent revision. Continued use of the site after changes are posted constitutes acceptance of those changes." },
      { h: "Contact", b: "Questions about this policy can be directed to support@kennion.com." },
    ],
  },
  terms: {
    title: "Terms of Use",
    updated: "Effective May 2026",
    sections: [
      { h: "Acceptance of Terms", b: "By accessing or using this website, you agree to be bound by these Terms of Use and our Privacy Policy. If you do not agree, please do not use the site." },
      { h: "Use of the Site", b: "You may use this site for lawful business inquiry and informational purposes. You may not scrape, copy, redistribute, reverse engineer, or otherwise misuse the site or its content. Automated access without our written permission is prohibited." },
      { h: "Intellectual Property", b: "All content on this site, including text, graphics, logos, images, software, and design, is the property of Kennion Benefit Advisors or its licensors and is protected by U.S. and international copyright, trademark, and other intellectual property laws. You may not reproduce, modify, distribute, or create derivative works without our written consent." },
      { h: "Informational Only", b: "Content and interactive features on this site are provided for general informational purposes only. They are not insurance quotes, contracts, or binding offers. Actual rates and eligibility are determined only after submission and underwriting review by the applicable carrier." },
      { h: "No Professional Advice", b: "Nothing on this site constitutes legal, tax, financial, or insurance advice. You should consult a qualified professional before making decisions based on information from this site." },
      { h: "Disclaimers", b: "This site is provided \"as is\" and \"as available,\" without warranties of any kind, express or implied, including warranties of merchantability, fitness for a particular purpose, or non-infringement. We do not warrant that the site will be uninterrupted, error-free, or free of viruses or other harmful components." },
      { h: "Limitation of Liability", b: "To the fullest extent permitted by law, Kennion Benefit Advisors and its affiliates will not be liable for any indirect, incidental, special, consequential, or punitive damages arising out of or related to your use of this site, even if we have been advised of the possibility of such damages." },
      { h: "Governing Law", b: "These Terms are governed by the laws of the State of Alabama, without regard to its conflict of laws principles. Any dispute will be brought exclusively in the state or federal courts located in Jefferson County, Alabama." },
      { h: "Changes to These Terms", b: "We may revise these Terms at any time. Revisions take effect when posted. Your continued use of the site after revisions are posted constitutes acceptance of the updated Terms." },
      { h: "Contact", b: "Questions about these Terms can be directed to support@kennion.com." },
    ],
  },
};

function LegalModal({ kind, onClose }: { kind: string | null; onClose: () => void }) {
  useEffect(() => {
    if (!kind) return;
    const esc = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    document.addEventListener("keydown", esc);
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", esc);
      document.body.style.overflow = "";
    };
  }, [kind, onClose]);

  if (!kind) return null;
  const c = LEGAL_CONTENT[kind];
  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4" onClick={onClose}>
      <div className="kn-landing relative w-full max-w-2xl max-h-[88vh] flex flex-col border border-border shadow-2xl overflow-hidden" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-start justify-between gap-4 px-6 lg:px-8 py-6 border-b border-border">
          <div>
            <div className="kn-caps" style={{ color: "hsl(var(--brand-accent))" }}>Legal · {c.updated}</div>
            <h2 className={`${H3} text-[26px] leading-tight mt-2`}>{c.title}</h2>
          </div>
          <button onClick={onClose} aria-label="Close" className="w-9 h-9 grid place-items-center text-muted-foreground hover:text-foreground">
            <X size={18} />
          </button>
        </div>

        <div className="overflow-y-auto px-6 lg:px-8 py-7">
          <div className="space-y-7">
            {c.sections.map((s, i) => (
              <section key={i} className="grid sm:grid-cols-[12rem_1fr] gap-x-6 gap-y-1.5 border-t border-border pt-5 first:border-t-0 first:pt-0">
                <h3 className="font-semibold text-[14.5px] tracking-[-0.01em] leading-[1.3]">{s.h}</h3>
                <p className="text-[13px] leading-[1.7] text-muted-foreground">{s.b}</p>
              </section>
            ))}
          </div>
        </div>

        <div className="px-6 lg:px-8 py-4 border-t border-border flex justify-end">
          <button onClick={onClose} className="text-[11.5px] font-semibold uppercase tracking-[0.14em] bg-primary text-primary-foreground px-5 py-2.5 hover:bg-[hsl(var(--ink))] transition-colors">
            Close
          </button>
        </div>
      </div>
    </div>
  );
}

/* ── footer ────────────────────────────────────────────────────────── */

function Footer() {
  const year = new Date().getFullYear();
  const [legalOpen, setLegalOpen] = useState<string | null>(null);
  return (
    <footer className="bg-[hsl(var(--ink))] text-white pt-16 lg:pt-20 overflow-hidden">
      <div className="mx-auto max-w-[1320px] px-6 lg:px-10">
        <div className="grid sm:grid-cols-2 md:grid-cols-[1.6fr_1fr_1fr] gap-x-10 gap-y-12 pb-14 lg:pb-16">
          <div className="sm:col-span-2 md:col-span-1">
            <div className="font-display font-bold text-[26px] tracking-[-0.02em] leading-none">Kennion</div>
            <div className="kn-caps text-white/40 mt-3">The Modern Benefits Agency</div>
            <a href="https://calendly.com/kennion/call" onClick={openCalendly}
               className="mt-8 inline-flex items-center gap-2.5 text-[11.5px] font-semibold uppercase tracking-[0.14em] bg-[hsl(var(--background))] text-[hsl(var(--ink))] px-5 py-3 hover:opacity-90 transition-opacity cursor-pointer">
              <Calendar size={13} strokeWidth={2} />
              Schedule a Call
            </a>
          </div>

          <div>
            <div className="kn-caps text-white/40 mb-5">Company</div>
            <ul className="space-y-3 text-[13.5px] text-white/70">
              <li><a href="#platform" className="kn-link-rev hover:text-white transition-colors">Platform</a></li>
              <li><a href="#options" className="kn-link-rev hover:text-white transition-colors">Options</a></li>
              <li><a href="#how" className="kn-link-rev hover:text-white transition-colors">How It Works</a></li>
              <li><a href="#contact" className="kn-link-rev hover:text-white transition-colors">Contact</a></li>
            </ul>
          </div>

          <div>
            <div className="kn-caps text-white/40 mb-5">Clients</div>
            <ul className="space-y-3 text-[13.5px] text-white/70">
              <li><a href="https://go.kennion.com/support" target="_blank" rel="noopener noreferrer" className="kn-link-rev hover:text-white transition-colors">Support</a></li>
              <li><a href="http://go.kennion.com/enroll" target="_blank" rel="noopener noreferrer" className="kn-link-rev hover:text-white transition-colors">Enrollment</a></li>
              <li><Link href="/quote" className="kn-link-rev hover:text-white transition-colors">Request a Proposal</Link></li>
              <li><a href="mailto:support@kennion.com" className="kn-link-rev hover:text-white transition-colors">support@kennion.com</a></li>
            </ul>
          </div>
        </div>

        <div className="border-t border-white/10 py-6 flex flex-wrap items-center justify-between gap-x-8 gap-y-3 text-[11.5px] text-white/40">
          <span>© {year} Kennion Benefit Advisors. All rights reserved.</span>
          <span className="hidden lg:inline">2828 Old 280 Court, Vestavia, AL 35243</span>
          <div className="flex items-center gap-6">
            <button onClick={() => setLegalOpen("privacy")} className="kn-link-rev hover:text-white/80 transition-colors">Privacy</button>
            <button onClick={() => setLegalOpen("terms")} className="kn-link-rev hover:text-white/80 transition-colors">Terms</button>
          </div>
        </div>
      </div>

      {/* Oversized wordmark colophon, clipped at the page's bottom edge. */}
      <div className="relative mx-auto max-w-[1320px] px-6 lg:px-10 select-none pointer-events-none" aria-hidden="true">
        <div className="font-display font-extrabold uppercase text-[19vw] lg:text-[240px] leading-[0.78] tracking-[-0.045em] text-white/[0.05] whitespace-nowrap -mb-[0.14em]">
          Kennion
        </div>
      </div>

      <LegalModal kind={legalOpen} onClose={() => setLegalOpen(null)} />
    </footer>
  );
}

/* ── root ──────────────────────────────────────────────────────────── */

export default function LandingPage() {
  return (
    <div className="kn-landing min-h-screen antialiased">
      <Nav />
      <main>
        <Hero />
        <Platform />
        <Options />
        <HowItWorks />
        <FinalCTA />
      </main>
      <Footer />
    </div>
  );
}
