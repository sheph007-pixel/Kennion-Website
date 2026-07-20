// Kennion Benefit Advisors — public marketing homepage.
// Full-service employee benefits advisory positioning (enterprise / OneDigital-style).
// Single-file: nav, hero, sections, legal modal, footer + motion primitives.
//
// Requires (already set up in client/index.html <head>): Fraunces display font,
// Calendly widget, and the .font-display / .hairline utilities in client/src/index.css.

import { useState, useEffect, useRef } from "react";
import { Link } from "wouter";
import {
  ArrowRight, ChevronRight, ChevronDown, X, Menu, CheckCircle2,
  MapPin, Mail, Calendar, ArrowUpRight, Phone,
  Users, Building2, Landmark, ShieldCheck, LineChart, Layers,
  MessagesSquare, Pill, ScrollText, Compass, Handshake, Rocket,
  Award, TrendingUp, HeartPulse,
} from "lucide-react";

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
const KENNION_BUILDING_URL = "https://images.squarespace-cdn.com/content/v1/650a374c4246d47a3dbe7afb/1695168363204-7SHD3HNS7AARCJU8LO2L/The%2BLindsey%2BBuilding-14.jpg";

// ─────────────────────────────────────────────────────────────────────
// MOTION PRIMITIVES
// ─────────────────────────────────────────────────────────────────────
function useInView(threshold = 0.15) {
  const ref = useRef(null);
  const [seen, setSeen] = useState(false);
  useEffect(() => {
    if (!ref.current || seen) return;
    const io = new IntersectionObserver(([e]) => {
      if (e.isIntersecting) { setSeen(true); io.disconnect(); }
    }, { threshold, rootMargin: "0px 0px -8% 0px" });
    io.observe(ref.current);
    return () => io.disconnect();
  }, [seen, threshold]);
  return [ref, seen];
}

function Reveal({ children, delay = 0, as: As = "div", className = "", y = 18 }) {
  const [ref, seen] = useInView();
  return (
    <As
      ref={ref}
      className={className}
      style={{
        opacity: seen ? 1 : 0,
        transform: seen ? "translate3d(0,0,0)" : `translate3d(0,${y}px,0)`,
        transition: `opacity 900ms cubic-bezier(.2,.7,.2,1) ${delay}ms, transform 900ms cubic-bezier(.2,.7,.2,1) ${delay}ms`,
        willChange: "opacity, transform",
      }}
    >
      {children}
    </As>
  );
}

// Small uppercase eyebrow with a gold accent rule.
function Eyebrow({ children, center = false }) {
  return (
    <div className={`inline-flex items-center gap-2.5 text-[11.5px] uppercase tracking-[0.2em] font-semibold text-muted-foreground ${center ? "justify-center" : ""}`}>
      <span className="inline-block w-7 h-px" style={{ background: "hsl(var(--brand-accent))" }} />
      {children}
      {center && <span className="inline-block w-7 h-px" style={{ background: "hsl(var(--brand-accent))" }} />}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────
// NAV
// ─────────────────────────────────────────────────────────────────────
function Nav() {
  const [open, setOpen] = useState(false);
  const [portalOpen, setPortalOpen] = useState(false);
  const portalRef = useRef(null);

  useEffect(() => {
    if (!portalOpen) return;
    const close = (e) => {
      if (portalRef.current && !portalRef.current.contains(e.target)) setPortalOpen(false);
    };
    const esc = (e) => { if (e.key === "Escape") setPortalOpen(false); };
    document.addEventListener("mousedown", close);
    document.addEventListener("keydown", esc);
    return () => {
      document.removeEventListener("mousedown", close);
      document.removeEventListener("keydown", esc);
    };
  }, [portalOpen]);

  return (
    <header className="sticky top-0 z-40 border-b border-border bg-background/90 backdrop-blur supports-[backdrop-filter]:bg-background/75">
      <div className="mx-auto max-w-7xl px-6 flex items-center justify-between h-16">
        <Link href="/" className="flex items-center gap-2.5">
          <img src={KENNION_LOGO_URL} alt="Kennion Benefit Advisors" className="h-8 w-auto" style={{ mixBlendMode: "multiply" }} />
        </Link>

        <nav className="hidden md:flex items-center gap-7 text-[13.5px] text-muted-foreground">
          <a href="#solutions" className="hover:text-foreground transition-colors">Solutions</a>
          <a href="#who-we-serve" className="hover:text-foreground transition-colors">Who We Serve</a>
          <a href="#approach" className="hover:text-foreground transition-colors">Our Approach</a>
          <a href="#why-us" className="hover:text-foreground transition-colors">Why Kennion</a>
          <a href="#contact" className="hover:text-foreground transition-colors">Contact</a>
        </nav>

        <div className="hidden md:flex items-center gap-1.5">
          <div className="relative" ref={portalRef}>
            <button
              onClick={() => setPortalOpen(!portalOpen)}
              className={`flex items-center gap-1.5 text-[13px] text-muted-foreground hover:text-foreground hover:bg-black/[.04] px-3 py-2 rounded-md transition-colors ${portalOpen ? "bg-black/[.04] text-foreground" : ""}`}
              aria-expanded={portalOpen}
            >
              Existing Clients
              <ChevronDown size={13} strokeWidth={2} className={`transition-transform ${portalOpen ? "rotate-180" : ""}`}/>
            </button>
            {portalOpen && (
              <div className="absolute right-0 top-full mt-1.5 w-60 rounded-lg hairline bg-card shadow-[0_18px_40px_-12px_rgba(15,30,60,0.22)] overflow-hidden">
                <div className="px-3.5 py-2.5 border-b border-border bg-muted">
                  <div className="text-[10px] uppercase tracking-[0.16em] font-semibold text-muted-foreground">Client &amp; Member Access</div>
                  <div className="text-[11.5px] text-muted-foreground mt-0.5">For current clients &amp; members</div>
                </div>
                <a href="https://go.kennion.com/support" target="_blank" rel="noopener noreferrer" className="flex items-center justify-between px-3.5 py-3 text-[13px] hover:bg-muted transition-colors">
                  <div>
                    <div className="font-medium">Support</div>
                    <div className="text-[11.5px] text-muted-foreground">Open a ticket</div>
                  </div>
                  <ArrowUpRight size={13} className="text-muted-foreground"/>
                </a>
                <a href="http://go.kennion.com/enroll" target="_blank" rel="noopener noreferrer" className="flex items-center justify-between px-3.5 py-3 text-[13px] hover:bg-muted transition-colors border-t border-border">
                  <div>
                    <div className="font-medium">Enrollment</div>
                    <div className="text-[11.5px] text-muted-foreground">Member login</div>
                  </div>
                  <ArrowUpRight size={13} className="text-muted-foreground"/>
                </a>
              </div>
            )}
          </div>

          <div className="w-px h-5 bg-border mx-2" />

          <Link href="/quote" className="inline-flex items-center gap-1.5 text-[13.5px] font-medium text-primary-foreground bg-primary hover:opacity-90 px-4 py-2 rounded-md shadow-sm transition-opacity">
            Request a Proposal
            <ArrowRight size={14} strokeWidth={2}/>
          </Link>
        </div>

        <button className="md:hidden w-9 h-9 grid place-items-center rounded-md hover:bg-black/5" onClick={() => setOpen(!open)} aria-label="Menu">
          {open ? <X size={18}/> : <Menu size={18}/>}
        </button>
      </div>

      {open && (
        <div className="md:hidden border-t border-border bg-background px-6 py-4 text-sm">
          <a href="#solutions" className="block py-2">Solutions</a>
          <a href="#who-we-serve" className="block py-2">Who We Serve</a>
          <a href="#approach" className="block py-2">Our Approach</a>
          <a href="#why-us" className="block py-2">Why Kennion</a>
          <a href="#contact" className="block py-2">Contact</a>

          <div className="mt-4 pt-4 border-t border-border">
            <Link href="/quote" className="block text-center font-medium text-primary-foreground bg-primary px-4 py-2.5 rounded-md">Request a Proposal</Link>
          </div>

          <div className="mt-5 pt-4 border-t border-border">
            <div className="text-[10.5px] uppercase tracking-[0.14em] font-semibold text-muted-foreground mb-2">Existing Clients</div>
            <a href="https://go.kennion.com/support" className="block py-2 text-[13.5px] text-muted-foreground">Support</a>
            <a href="http://go.kennion.com/enroll" className="block py-2 text-[13.5px] text-muted-foreground">Enrollment</a>
          </div>
        </div>
      )}
    </header>
  );
}

// ─────────────────────────────────────────────────────────────────────
// HERO
// ─────────────────────────────────────────────────────────────────────
function Hero() {
  return (
    <section className="relative overflow-hidden">
      <div className="absolute inset-0 -z-10">
        <div className="absolute inset-x-0 top-0 h-[520px] bg-gradient-to-b from-[hsl(var(--primary)/0.06)] to-transparent" />
        <div className="absolute right-[-200px] top-[-100px] w-[640px] h-[640px] rounded-full bg-primary/[0.06] blur-3xl" />
        <div className="absolute left-[-160px] bottom-[-160px] w-[420px] h-[420px] rounded-full bg-[hsl(var(--brand-accent)/0.05)] blur-3xl" />
      </div>

      <div className="mx-auto max-w-7xl px-6 pt-14 pb-24 lg:pt-20 lg:pb-32 grid lg:grid-cols-[1.05fr_0.95fr] gap-x-14 gap-y-14 items-center">
        <div className="relative">
          <Reveal>
            <Eyebrow>Employee Benefits Advisors</Eyebrow>
          </Reveal>

          <Reveal delay={80}>
            <h1 className="font-display font-[450] mt-7 text-[42px] sm:text-[60px] lg:text-[78px] xl:text-[86px] leading-[1.0] sm:leading-[0.98] tracking-[-0.035em] text-foreground">
              Benefits built around
              <span className="italic" style={{ color: "hsl(var(--primary))" }}> your people.</span>
            </h1>
          </Reveal>

          <Reveal delay={160}>
            <p className="mt-7 text-[17.5px] leading-[1.55] max-w-[38rem] text-muted-foreground">
              Kennion is a full-service employee benefits advisory firm. We help employers of every
              size design, deliver, and manage benefits programs that attract talent, control cost,
              and take work off HR&rsquo;s plate&nbsp;&mdash;&nbsp;across every funding strategy.
            </p>
          </Reveal>

          <Reveal delay={240}>
            <div className="mt-9 flex flex-wrap items-center gap-3">
              <Link href="/quote" className="inline-flex items-center gap-1.5 text-[14.5px] font-medium bg-primary text-primary-foreground hover:opacity-90 px-5 py-3 rounded-md shadow-sm transition-opacity">
                Request a Proposal
                <ChevronRight size={15} strokeWidth={2}/>
              </Link>
              <a href="#solutions" className="inline-flex items-center gap-1.5 text-[14.5px] font-medium border border-border px-5 py-3 rounded-md transition-colors text-foreground hover:bg-black/[.03]">
                Explore Our Solutions
              </a>
            </div>
          </Reveal>

          <Reveal delay={320}>
            <div className="mt-12 flex flex-wrap items-center gap-x-7 gap-y-3 text-[12.5px] text-muted-foreground">
              <div className="flex items-center gap-2"><CheckCircle2 size={14} style={{ color: "hsl(var(--brand-accent))" }}/>Fast-growing firm</div>
              <div className="flex items-center gap-2"><CheckCircle2 size={14} style={{ color: "hsl(var(--brand-accent))" }}/>95%+ client retention</div>
              <div className="flex items-center gap-2"><CheckCircle2 size={14} style={{ color: "hsl(var(--brand-accent))" }}/>Serving employers nationwide</div>
            </div>
          </Reveal>
        </div>

        <Reveal delay={200} className="relative">
          <div className="relative">
            <div className="relative overflow-hidden rounded-2xl hairline shadow-[0_30px_80px_-30px_rgba(15,30,60,0.45)]">
              <img src={KENNION_BUILDING_URL} alt="Kennion Benefit Advisors headquarters" className="w-full aspect-[4/5] sm:aspect-[5/4] lg:aspect-[4/5] object-cover object-center" />
              <div className="absolute inset-0 bg-gradient-to-t from-[hsl(215_45%_12%/0.55)] via-transparent to-transparent" />
            </div>
            {/* Floating credential card */}
            <div className="absolute -bottom-6 -left-4 sm:-left-6 w-[62%] max-w-[280px] rounded-xl bg-card hairline shadow-[0_24px_60px_-24px_rgba(15,30,60,.5)] p-5">
              <div className="text-[10.5px] uppercase tracking-[0.16em] font-semibold text-muted-foreground">Trusted by employers</div>
              <div className="mt-3 grid grid-cols-2 gap-4">
                <div>
                  <div className="font-display font-[450] text-[30px] leading-none tracking-[-0.03em]">50<span style={{ color: "hsl(var(--brand-accent))" }}>+</span></div>
                  <div className="mt-1.5 text-[11px] leading-[1.3] text-muted-foreground">Years advising employers</div>
                </div>
                <div>
                  <div className="font-display font-[450] text-[30px] leading-none tracking-[-0.03em]">95<span style={{ color: "hsl(var(--brand-accent))" }}>%</span></div>
                  <div className="mt-1.5 text-[11px] leading-[1.3] text-muted-foreground">Client retention, year over year</div>
                </div>
              </div>
            </div>
          </div>
        </Reveal>
      </div>
    </section>
  );
}

// ─────────────────────────────────────────────────────────────────────
// STATS BAND
// ─────────────────────────────────────────────────────────────────────
function StatsBand() {
  const stats = [
    { v: "50+ Years", l: "Advising employers across the country" },
    { v: "95%+", l: "Client retention, year after year" },
    { v: "Nationwide", l: "Serving groups coast to coast" },
    { v: "Every Size", l: "Small business to large enterprise" },
  ];
  return (
    <section className="border-y border-border bg-muted">
      <div className="mx-auto max-w-7xl px-6 py-12 lg:py-14">
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-x-6 gap-y-8">
          {stats.map((s, i) => (
            <Reveal key={i} delay={i * 70}>
              <div className="font-display font-[450] text-[28px] lg:text-[34px] leading-none tracking-[-0.03em] text-foreground">
                {s.v}
              </div>
              <div className="mt-2.5 text-[12.5px] leading-[1.45] text-muted-foreground max-w-[16rem]">{s.l}</div>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  );
}

// ─────────────────────────────────────────────────────────────────────
// SOLUTIONS
// ─────────────────────────────────────────────────────────────────────
function Solutions() {
  const services = [
    { icon: Compass, t: "Benefits Strategy & Plan Design", d: "We start with your goals and budget, then architect a program that fits — medical, dental, vision, life, disability, and supplemental." },
    { icon: Handshake, t: "Marketing & Carrier Placement", d: "We take your group to the market, negotiate on your behalf, and bring back options built around leverage, not defaults." },
    { icon: LineChart, t: "Data, Analytics & Benchmarking", d: "Claims insight, utilization trends, and peer benchmarking so every decision is grounded in evidence, not guesswork." },
    { icon: Layers, t: "Benefits Administration & Technology", d: "Modern enrollment and administration platforms that streamline open enrollment and give HR one place to work." },
    { icon: ScrollText, t: "Compliance, ACA & ERISA", d: "Reporting, notices, and documentation handled — so you stay current without deciphering federal regulations." },
    { icon: Pill, t: "Pharmacy & Rx Strategy", d: "Pharmacy is one of the fastest-growing cost drivers. We build strategies that manage spend without hurting members." },
    { icon: MessagesSquare, t: "Employee Communication & Engagement", d: "Clear, year-round communication and decision support that helps employees actually use the benefits you provide." },
    { icon: HeartPulse, t: "Ongoing Service & Advocacy", d: "A dedicated team for claims questions, billing issues, mid-year changes, and renewals — every day of the year." },
  ];
  return (
    <section id="solutions" className="py-24 lg:py-32">
      <div className="mx-auto max-w-7xl px-6">
        <Reveal className="max-w-2xl mb-14">
          <Eyebrow>What We Do</Eyebrow>
          <h2 className="font-display font-[450] text-[36px] lg:text-[52px] leading-[1.02] tracking-[-0.03em] mt-5">
            A full spectrum of solutions, <span className="italic" style={{ color: "hsl(var(--primary))" }}>under one roof.</span>
          </h2>
          <p className="mt-5 text-[16.5px] leading-[1.6] text-muted-foreground">
            We don&rsquo;t just place coverage. We tell you what to do, show you how to do it, build the
            best possible program, and manage it for you year after year — bringing the strategy,
            technology, and partners of a national firm to employers of every size.
          </p>
        </Reveal>

        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-px bg-border rounded-2xl overflow-hidden hairline">
          {services.map((s, i) => {
            const Icon = s.icon;
            return (
              <Reveal key={s.t} delay={(i % 4) * 60}>
                <div className="bg-card p-6 lg:p-7 h-full flex flex-col gap-3.5">
                  <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                    <Icon size={18} strokeWidth={1.8} className="text-primary"/>
                  </div>
                  <h3 className="text-[15.5px] font-semibold tracking-[-0.01em] leading-snug">{s.t}</h3>
                  <p className="text-[13px] leading-[1.6] text-muted-foreground">{s.d}</p>
                </div>
              </Reveal>
            );
          })}
        </div>
      </div>
    </section>
  );
}

// ─────────────────────────────────────────────────────────────────────
// WHO WE SERVE + FUNDING STRATEGIES
// ─────────────────────────────────────────────────────────────────────
function WhoWeServe() {
  const segments = [
    { icon: Users, t: "Small Business", d: "Right-sized guidance, better rates, and technology that punches well above your headcount. You get a real advisor, not a call center." },
    { icon: Building2, t: "Middle Market", d: "Sophisticated strategy, data, and advocacy for growing organizations that have outgrown a one-size-fits-all broker." },
    { icon: Landmark, t: "Large & Enterprise", d: "Consulting-grade analytics, financial modeling, and dedicated service teams for complex, multi-location employers." },
  ];
  const funding = [
    { t: "Fully Insured", d: "Predictable, simple, and fully transferred risk — the right fit for many groups, priced competitively." },
    { t: "Level Funded", d: "The middle path: the cash-flow stability of fully insured with the savings potential of self-funding." },
    { t: "Traditional Self-Funded", d: "Maximum control, transparency, and long-term savings for groups ready to take on managed risk." },
  ];
  return (
    <section id="who-we-serve" className="py-24 lg:py-32 bg-muted border-y border-border">
      <div className="mx-auto max-w-7xl px-6">
        <Reveal className="max-w-2xl mb-14">
          <Eyebrow>Who We Serve</Eyebrow>
          <h2 className="font-display font-[450] text-[36px] lg:text-[52px] leading-[1.02] tracking-[-0.03em] mt-5">
            Built for employers of <span className="italic" style={{ color: "hsl(var(--primary))" }}>every size.</span>
          </h2>
          <p className="mt-5 text-[16.5px] leading-[1.6] text-muted-foreground">
            From a growing small business to a complex, multi-state enterprise, our team scales the
            strategy and service to fit — never the other way around.
          </p>
        </Reveal>

        <div className="grid md:grid-cols-3 gap-px bg-border rounded-2xl overflow-hidden hairline">
          {segments.map((s, i) => {
            const Icon = s.icon;
            return (
              <Reveal key={s.t} delay={i * 80}>
                <div className="bg-card p-8 h-full flex flex-col gap-4">
                  <div className="w-11 h-11 rounded-lg bg-primary/10 flex items-center justify-center">
                    <Icon size={19} strokeWidth={1.8} className="text-primary"/>
                  </div>
                  <h3 className="text-[19px] font-semibold tracking-[-0.01em]">{s.t}</h3>
                  <p className="text-[13.5px] leading-[1.6] text-muted-foreground">{s.d}</p>
                </div>
              </Reveal>
            );
          })}
        </div>

        <Reveal delay={80} className="mt-20 max-w-2xl mb-10">
          <Eyebrow>Funding Strategies</Eyebrow>
          <h3 className="font-display font-[450] text-[30px] lg:text-[40px] leading-[1.04] tracking-[-0.02em] mt-5">
            One strategy doesn&rsquo;t fit every employer.
          </h3>
          <p className="mt-4 text-[15.5px] leading-[1.6] text-muted-foreground">
            We model the options and recommend the funding approach that fits your risk tolerance
            and goals — then manage it, and revisit it, every year.
          </p>
        </Reveal>

        <div className="grid md:grid-cols-3 gap-5">
          {funding.map((f, i) => (
            <Reveal key={f.t} delay={i * 70}>
              <div className="bg-card hairline rounded-xl p-6 h-full">
                <div className="text-[11px] uppercase tracking-[0.14em] font-semibold" style={{ color: "hsl(var(--brand-accent))" }}>0{i + 1}</div>
                <h4 className="mt-3 text-[18px] font-semibold tracking-[-0.01em]">{f.t}</h4>
                <p className="mt-2.5 text-[13.5px] leading-[1.6] text-muted-foreground">{f.d}</p>
              </div>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  );
}

// ─────────────────────────────────────────────────────────────────────
// OUR APPROACH (consultative process)
// ─────────────────────────────────────────────────────────────────────
function Approach() {
  const steps = [
    { n: "01", t: "Discover", d: "We learn your workforce, your goals, and where your current program is falling short." },
    { n: "02", t: "Strategize", d: "We model funding options and design a program built around your budget and your people." },
    { n: "03", t: "Market & Place", d: "We take your group to the right partners and negotiate hard on your behalf." },
    { n: "04", t: "Implement", d: "Enrollment, technology, and employee communication — set up and handled for you." },
    { n: "05", t: "Manage", d: "Renewals, compliance, claims advocacy, and strategy reviews, all year long." },
  ];
  return (
    <section id="approach" className="py-24 lg:py-32">
      <div className="mx-auto max-w-7xl px-6">
        <Reveal className="max-w-2xl mb-14">
          <Eyebrow>Our Approach</Eyebrow>
          <h2 className="font-display font-[450] text-[36px] lg:text-[52px] leading-[1.02] tracking-[-0.03em] mt-5">
            A partnership, <span className="italic" style={{ color: "hsl(var(--primary))" }}>not a transaction.</span>
          </h2>
          <p className="mt-5 text-[16.5px] leading-[1.6] text-muted-foreground">
            Benefits shouldn&rsquo;t be a once-a-year scramble. We work as an extension of your team from
            first conversation through every renewal.
          </p>
        </Reveal>

        <div className="grid md:grid-cols-3 lg:grid-cols-5 gap-px bg-border rounded-xl overflow-hidden hairline">
          {steps.map((s) => (
            <Reveal key={s.n}>
              <div className="bg-card p-6 h-full flex flex-col">
                <div className="font-display font-[450] text-[34px] leading-none tracking-[-0.03em]" style={{ color: "hsl(var(--brand-accent))" }}>{s.n}</div>
                <h3 className="mt-4 text-[17px] font-semibold tracking-[-0.01em]">{s.t}</h3>
                <p className="mt-2 text-[13px] leading-[1.55] text-muted-foreground">{s.d}</p>
              </div>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  );
}

// ─────────────────────────────────────────────────────────────────────
// WHY KENNION
// ─────────────────────────────────────────────────────────────────────
function WhyKennion() {
  const differentiators = [
    { icon: Award, title: "Experienced Leadership", body: "A senior team that has seen every market cycle and knows how to win a renewal. Deep expertise, not a rotating cast of junior reps." },
    { icon: ShieldCheck, title: "Client-First Advocacy", body: "Independent and conflict-free. Your renewal gets shopped every year and negotiated hard — never rubber-stamped." },
    { icon: TrendingUp, title: "Proven Retention", body: "Our clients stay with us above 95% year over year. Retention like that is the clearest proof that the model works." },
    { icon: Layers, title: "Full-Service Breadth", body: "A deep bench of solutions, programs, and partners under one roof — strategy, technology, compliance, and service together." },
    { icon: Rocket, title: "Growing Fast", body: "One of the fastest-growing benefits advisories in the region, adding clients and capabilities while keeping service personal." },
    { icon: LineChart, title: "Technology-Driven", body: "Modern administration, analytics, and enrollment built for today's HR teams — the tools of a national firm, delivered locally." },
  ];

  return (
    <section id="why-us" className="py-24 lg:py-32 bg-muted border-y border-border">
      <div className="mx-auto max-w-7xl px-6">
        <div className="grid lg:grid-cols-[1fr_1.5fr] gap-12 lg:gap-20 items-start">
          <Reveal>
            <Eyebrow>Why Kennion</Eyebrow>
            <h2 className="font-display font-[450] text-[36px] lg:text-[54px] leading-[1.0] tracking-[-0.03em] mt-5">
              The difference an <span className="italic" style={{ color: "hsl(var(--primary))" }}>experienced team</span> makes.
            </h2>
            <p className="mt-5 text-[16px] leading-[1.6] text-muted-foreground max-w-md">
              Decades of relationships, technology built for today&rsquo;s HR teams, and an advisory model
              that puts your interests first — never the insurer&rsquo;s.
            </p>
            <div className="mt-8">
              <Link href="/quote" className="inline-flex items-center gap-1.5 text-[14.5px] font-medium bg-primary text-primary-foreground hover:opacity-90 px-5 py-3 rounded-md shadow-sm">
                Request a Proposal
                <ArrowRight size={15} strokeWidth={2}/>
              </Link>
            </div>
          </Reveal>

          <Reveal delay={120}>
            <div className="grid sm:grid-cols-2 gap-px bg-border rounded-xl overflow-hidden hairline">
              {differentiators.map((d) => {
                const Icon = d.icon;
                return (
                  <div key={d.title} className="bg-card p-6 flex flex-col gap-3">
                    <div className="w-9 h-9 rounded-lg bg-primary/10 flex items-center justify-center">
                      <Icon size={16} strokeWidth={1.8} className="text-primary"/>
                    </div>
                    <h3 className="text-[15px] font-semibold tracking-[-0.01em]">{d.title}</h3>
                    <p className="text-[13.5px] leading-[1.6] text-muted-foreground">{d.body}</p>
                  </div>
                );
              })}
            </div>
          </Reveal>
        </div>
      </div>
    </section>
  );
}

// ─────────────────────────────────────────────────────────────────────
// TESTIMONIAL
// ─────────────────────────────────────────────────────────────────────
function Testimonial() {
  return (
    <section className="py-24 lg:py-32 border-b border-border">
      <div className="mx-auto max-w-4xl px-6 text-center">
        <Reveal>
          <Eyebrow center>From a competitor</Eyebrow>
          <blockquote className="font-display font-[450] text-[30px] sm:text-[42px] lg:text-[54px] leading-[1.12] tracking-[-0.025em] mt-8 text-balance">
            &ldquo;Y&rsquo;all are unbeatable in the market with the prospects that we have met with that are current Kennion clients.&rdquo;
          </blockquote>
          <figcaption className="mt-8 text-[14px] text-muted-foreground">
            <span className="font-medium text-foreground">Senior Executive</span>
            <span className="mx-1.5">&middot;</span>
            Top-25 U.S. broker
          </figcaption>

          <div className="mt-14 pt-7 border-t border-border max-w-2xl mx-auto text-[14px] leading-[1.6] text-muted-foreground">
            <span className="text-[10.5px] font-semibold uppercase tracking-[0.18em] block mb-2" style={{ color: "hsl(var(--brand-accent))" }}>Why our clients stay</span>
            When you work with an independent advisor who has deep market relationships and no quota to fill,
            <span className="text-foreground font-medium"> your renewal gets shopped every year</span>, not rubber-stamped.
            That&rsquo;s why our retention rate has stayed above 95% for over a decade.
          </div>
        </Reveal>
      </div>
    </section>
  );
}

// ─────────────────────────────────────────────────────────────────────
// CONTACT
// ─────────────────────────────────────────────────────────────────────
function Contact() {
  return (
    <section id="contact" className="py-24 lg:py-32">
      <div className="mx-auto max-w-7xl px-6">
        <Reveal className="max-w-2xl mb-14">
          <Eyebrow>Contact</Eyebrow>
          <h2 className="font-display font-[450] text-[36px] lg:text-[54px] leading-[1.0] tracking-[-0.03em] mt-5">
            Let&rsquo;s <span className="italic" style={{ color: "hsl(var(--primary))" }}>talk benefits.</span>
          </h2>
          <p className="mt-5 text-[16.5px] leading-[1.6] text-muted-foreground max-w-xl">
            Whether you&rsquo;re shopping for the first time or unhappy with your renewal, we can help.
            There&rsquo;s no obligation and no cost to see what we can do for your group.
          </p>
        </Reveal>

        <div className="grid md:grid-cols-2 gap-px bg-border rounded-2xl overflow-hidden hairline">
          <div className="bg-card p-8 lg:p-10">
            <div className="text-[11px] uppercase tracking-[0.14em] font-semibold" style={{ color: "hsl(var(--brand-accent))" }}>For Employers</div>
            <h3 className="mt-2 text-[22px] font-semibold tracking-[-0.01em]">Ready for a benefits partner that works for you?</h3>
            <p className="mt-3 text-[14.5px] leading-[1.6] text-muted-foreground">
              Tell us a little about your group and our team will reach out to start the conversation —
              strategy, options, and a clear picture of what your program could be.
            </p>
            <Link href="/quote" className="mt-6 inline-flex items-center gap-1.5 text-[14.5px] font-medium bg-primary text-primary-foreground hover:opacity-90 px-5 py-3 rounded-md shadow-sm">
              Request a Proposal
              <ArrowRight size={15} strokeWidth={2}/>
            </Link>
          </div>
          <div className="bg-card p-8 lg:p-10">
            <div className="text-[11px] uppercase tracking-[0.14em] font-semibold" style={{ color: "hsl(var(--brand-accent))" }}>Existing Clients</div>
            <h3 className="mt-2 text-[22px] font-semibold tracking-[-0.01em]">Current Client or Member?</h3>
            <p className="mt-3 text-[14.5px] leading-[1.6] text-muted-foreground">
              Your account team is standing by. Open a support ticket and someone will be in touch the same business day.
            </p>
            <a href="https://go.kennion.com/support" target="_blank" rel="noopener noreferrer" className="mt-6 inline-flex items-center gap-1.5 text-[14.5px] font-medium text-foreground border border-border hover:bg-black/[.03] px-5 py-3 rounded-md">
              Submit A Ticket
              <ArrowRight size={15} strokeWidth={2}/>
            </a>
          </div>
        </div>

        <div className="mt-16 grid lg:grid-cols-2 gap-8 lg:gap-14 items-center">
          <div className="relative overflow-hidden rounded-2xl hairline">
            <img src={KENNION_BUILDING_URL} alt="Kennion Benefit Advisors headquarters" className="w-full aspect-[4/3] object-cover object-center" />
          </div>
          <div>
            <h3 className="font-display text-[32px] lg:text-[40px] leading-[1.05] tracking-[-0.02em]">
              Kennion Benefit Advisors
            </h3>
            <p className="mt-2 text-[15px] text-muted-foreground">Based in Alabama · Serving employers nationwide</p>
            <dl className="mt-8 grid sm:grid-cols-2 gap-x-6 gap-y-5 text-[14px]">
              <div className="border-t border-border pt-4">
                <dt className="text-muted-foreground text-[12px] uppercase tracking-[0.1em]">Address</dt>
                <dd className="mt-1 flex items-start gap-2">
                  <MapPin size={15} className="text-primary mt-0.5"/>
                  <span>2828 Old 280 Court<br />Vestavia, Alabama 35243</span>
                </dd>
              </div>
              <div className="border-t border-border pt-4">
                <dt className="text-muted-foreground text-[12px] uppercase tracking-[0.1em]">Email</dt>
                <dd className="mt-1 flex items-center gap-2">
                  <Mail size={15} className="text-primary"/>
                  <a href="mailto:support@kennion.com" className="text-primary hover:underline underline-offset-4">support@kennion.com</a>
                </dd>
              </div>
              <div className="border-t border-border pt-4">
                <dt className="text-muted-foreground text-[12px] uppercase tracking-[0.1em]">Phone</dt>
                <dd className="mt-1 flex items-center gap-2">
                  <Phone size={15} className="text-primary"/>
                  <a href="tel:+12056410469" className="text-primary hover:underline underline-offset-4">205-641-0469</a>
                </dd>
              </div>
              <div className="border-t border-border pt-4">
                <dt className="text-muted-foreground text-[12px] uppercase tracking-[0.1em]">Schedule</dt>
                <dd className="mt-1">
                  <a href="https://calendly.com/kennion/call" onClick={openCalendly}
                     className="inline-flex items-center gap-1.5 text-primary hover:underline underline-offset-4 cursor-pointer">
                    <Calendar size={15}/>
                    Book a call online
                  </a>
                </dd>
              </div>
            </dl>
          </div>
        </div>
      </div>
    </section>
  );
}

// ─────────────────────────────────────────────────────────────────────
// FINAL CTA
// ─────────────────────────────────────────────────────────────────────
function FinalCTA() {
  return (
    <section className="py-24 lg:py-32 bg-primary text-primary-foreground">
      <div className="mx-auto max-w-3xl px-6 text-center">
        <h2 className="font-display text-[40px] lg:text-[52px] leading-[1.05] tracking-[-0.02em]">
          Better benefits start with a better advisor.
        </h2>
        <p className="mt-5 text-[17px] leading-[1.55] text-white/85 max-w-xl mx-auto">
          Tell us about your group and we&rsquo;ll show you what a real benefits partnership looks like —
          no obligation, no cost, no pressure. Just a clear plan for your people.
        </p>
        <div className="mt-9 flex flex-wrap items-center justify-center gap-3">
          <Link href="/quote" className="inline-flex items-center gap-1.5 text-[14.5px] font-medium bg-white text-primary hover:bg-white/95 px-6 py-3 rounded-md shadow-sm">
            Request a Proposal
            <ArrowRight size={15} strokeWidth={2}/>
          </Link>
          <a href="https://calendly.com/kennion/call" onClick={openCalendly}
             className="inline-flex items-center gap-1.5 text-[14.5px] font-medium border border-white/25 text-white hover:bg-white/10 px-6 py-3 rounded-md transition-colors cursor-pointer">
            <Calendar size={15} strokeWidth={1.8}/>
            Schedule a Call
          </a>
        </div>
      </div>
    </section>
  );
}

// ─────────────────────────────────────────────────────────────────────
// LEGAL MODAL
// ─────────────────────────────────────────────────────────────────────
const LEGAL_CONTENT = {
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

function LegalModal({ kind, onClose }) {
  useEffect(() => {
    if (!kind) return;
    const esc = (e) => { if (e.key === "Escape") onClose(); };
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
      <div className="relative w-full max-w-2xl max-h-[90vh] flex flex-col bg-card rounded-2xl shadow-2xl overflow-hidden" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-start justify-between gap-4 px-7 py-5 border-b border-border bg-muted">
          <div>
            <div className="text-[10.5px] font-semibold uppercase tracking-[0.16em]" style={{ color: "hsl(var(--brand-accent))" }}>Legal</div>
            <h2 className="font-display font-[450] text-[26px] leading-tight tracking-[-0.02em] mt-1 text-foreground">{c.title}</h2>
            <div className="text-[11.5px] font-semibold uppercase tracking-[0.12em] text-muted-foreground mt-1">{c.updated}</div>
          </div>
          <button onClick={onClose} aria-label="Close" className="w-9 h-9 grid place-items-center rounded-md hover:bg-black/[.04] text-muted-foreground hover:text-foreground">
            <X size={18}/>
          </button>
        </div>

        <div className="overflow-y-auto px-7 py-6 text-foreground">
          <div className="space-y-6">
            {c.sections.map((s, i) => (
              <section key={i}>
                <h3 className="font-display font-[500] text-[17px] tracking-[-0.01em]">{s.h}</h3>
                <p className="mt-2 text-[13.5px] leading-[1.65] text-muted-foreground">{s.b}</p>
              </section>
            ))}
          </div>
        </div>

        <div className="px-7 py-4 border-t border-border bg-muted flex justify-end">
          <button onClick={onClose} className="text-[13px] font-medium bg-primary text-primary-foreground hover:opacity-90 px-4 py-2 rounded-md">
            Close
          </button>
        </div>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────
// FOOTER
// ─────────────────────────────────────────────────────────────────────
function Footer() {
  const year = new Date().getFullYear();
  const [legalOpen, setLegalOpen] = useState(null);
  return (
    <footer className="bg-[hsl(215_38%_13%)] text-white pt-16 pb-8">
      <div className="mx-auto max-w-7xl px-6">
        <div className="grid md:grid-cols-[1.5fr_1fr_1fr_1fr] gap-10 lg:gap-14">
          <div>
            <div className="font-display font-[450] text-[28px] tracking-[-0.02em] leading-none">Kennion</div>
            <div className="text-[10.5px] font-semibold uppercase tracking-[0.18em] text-white/55 mt-2">Benefit Advisors · Since 1975</div>
            <p className="mt-5 text-[13.5px] leading-[1.55] text-white/65 max-w-[26rem]">
              A full-service employee benefits advisory firm helping employers nationwide design,
              deliver, and manage benefits programs across every funding strategy. Strategy,
              technology, compliance, and service — under one roof.
            </p>
            <a href="https://calendly.com/kennion/call" onClick={openCalendly}
               className="mt-6 inline-flex items-center gap-2 text-[13px] font-medium bg-white text-[hsl(215_38%_13%)] hover:bg-white/95 px-4 py-2.5 rounded-md cursor-pointer">
              <Calendar size={14} strokeWidth={1.8}/>
              Schedule A Call
            </a>
          </div>

          <div>
            <div className="text-[10.5px] uppercase tracking-[0.16em] font-semibold text-white/55 mb-4">Solutions</div>
            <ul className="space-y-2.5 text-[13.5px] text-white/80">
              <li><a href="#solutions" className="hover:text-white">Strategy &amp; Plan Design</a></li>
              <li><a href="#solutions" className="hover:text-white">Marketing &amp; Placement</a></li>
              <li><a href="#solutions" className="hover:text-white">Administration &amp; Technology</a></li>
              <li><a href="#solutions" className="hover:text-white">Compliance &amp; Service</a></li>
            </ul>
          </div>

          <div>
            <div className="text-[10.5px] uppercase tracking-[0.16em] font-semibold text-white/55 mb-4">Company</div>
            <ul className="space-y-2.5 text-[13.5px] text-white/80">
              <li><a href="#who-we-serve" className="hover:text-white">Who We Serve</a></li>
              <li><a href="#approach" className="hover:text-white">Our Approach</a></li>
              <li><a href="#why-us" className="hover:text-white">Why Kennion</a></li>
              <li><a href="#contact" className="hover:text-white">Contact</a></li>
              <li><Link href="/quote" className="hover:text-white">Request a Proposal</Link></li>
            </ul>
          </div>

          <div>
            <div className="text-[10.5px] uppercase tracking-[0.16em] font-semibold text-white/55 mb-4">Existing Clients</div>
            <ul className="space-y-2.5 text-[13.5px] text-white/80">
              <li><a href="https://go.kennion.com/support" target="_blank" rel="noopener noreferrer" className="hover:text-white">Support</a></li>
              <li><a href="http://go.kennion.com/enroll" target="_blank" rel="noopener noreferrer" className="hover:text-white">Enrollment</a></li>
              <li><a href="mailto:support@kennion.com" className="hover:text-white">support@kennion.com</a></li>
            </ul>
          </div>
        </div>

        <div className="mt-14 pt-6 border-t border-white/10 text-[12px] text-white/55">
          <div className="flex items-start gap-2">
            <MapPin size={13} className="text-white/55 mt-[2px]" />
            <span>2828 Old 280 Court<br />Vestavia, AL 35243</span>
          </div>
        </div>

        <div className="mt-8 pt-6 border-t border-white/10 flex flex-wrap items-center justify-between gap-3 text-[11.5px] text-white/45">
          <span>© {year} Kennion Benefit Advisors. All rights reserved.</span>
          <div className="flex items-center gap-5">
            <button onClick={() => setLegalOpen("privacy")} className="hover:text-white/80 transition-colors">Privacy</button>
            <button onClick={() => setLegalOpen("terms")} className="hover:text-white/80 transition-colors">Terms</button>
          </div>
        </div>
      </div>
      <LegalModal kind={legalOpen} onClose={() => setLegalOpen(null)} />
    </footer>
  );
}


// === ROOT ===
export default function LandingPage() {
  return (
    <div className="min-h-screen bg-background text-foreground antialiased">
      <Nav />
      <Hero />
      <StatsBand />
      <Solutions />
      <WhoWeServe />
      <Approach />
      <WhyKennion />
      <Testimonial />
      <Contact />
      <FinalCTA />
      <Footer />
    </div>
  );
}
