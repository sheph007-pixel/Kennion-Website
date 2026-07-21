// Kennion Benefit Advisors public marketing homepage.
// Corporate-modern design system: Inter Tight display type, hard grid,
// ruled index lists, small-caps labels, duotone photography, restrained
// navy/bronze palette. Mobile-first sizing via clamp().
//
// Requires (set up in client/index.html <head> + client/src/index.css):
// Inter Tight / Inter fonts, Calendly widget, and the .kn-landing /
// .kn-caps / .kn-link / .kn-marquee / .kn-photo utilities.

import { useState, useEffect, useRef } from "react";
import { Link } from "wouter";
import { ArrowRight, ArrowUpRight, ChevronDown, X, Menu, MapPin, Mail, Calendar } from "lucide-react";

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

/* ── type scale (single source of truth for the design system) ─────── */

const H1 = "font-display font-bold tracking-[-0.04em] leading-[0.96] text-[clamp(2.75rem,10vw,6.9rem)]";
const H2 = "font-display font-bold tracking-[-0.03em] leading-[1.0] text-[clamp(2rem,4.8vw,3.8rem)]";
const H2_SM = "font-display font-bold tracking-[-0.025em] leading-[1.04] text-[clamp(1.7rem,3.4vw,2.5rem)]";
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

/* ── top strip + nav ───────────────────────────────────────────────── */

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
    ["#solutions", "Solutions"],
    ["#who-we-serve", "Who We Serve"],
    ["#approach", "Approach"],
    ["#why-us", "Why Kennion"],
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

/* ── hero ──────────────────────────────────────────────────────────── */

function Hero() {
  return (
    <section className="relative">
      <div className="mx-auto max-w-[1320px] px-6 lg:px-10 pt-12 lg:pt-24 pb-0">
        <Reveal>
          <div className="flex items-baseline gap-4 kn-caps text-muted-foreground">
            <span className="inline-block w-10 h-px translate-y-[-3px]" style={{ background: "hsl(var(--brand-accent))" }} />
            Employee Benefits · Advisory &amp; Administration
          </div>
        </Reveal>

        <Reveal delay={90}>
          <h1 className={`${H1} mt-7 text-foreground`}>
            Benefits built around
            <br />
            <span style={{ color: "hsl(var(--primary))" }}>your people</span>
            <span style={{ color: "hsl(var(--brand-accent))" }}>.</span>
          </h1>
        </Reveal>

        <Reveal delay={180}>
          <div className="mt-10 lg:mt-16 grid lg:grid-cols-12 gap-y-10 lg:gap-x-10 border-t border-foreground/20 pt-8 lg:pt-12 items-start">
            <div className="lg:col-span-5">
              <p className="text-[16px] lg:text-[17px] leading-[1.65] text-muted-foreground max-w-[34rem]">
                Kennion is an independent employee benefits advisory firm. We design and manage
                programs that help employers win talent and keep costs in check, and we take the
                day-to-day benefits work off HR&rsquo;s plate.
              </p>
              <div className="mt-8 lg:mt-9 flex flex-wrap items-center gap-x-8 gap-y-4">
                <SolidButton href="/quote">Request a Proposal</SolidButton>
                <a href="#solutions" className="kn-link text-[13px] font-semibold uppercase tracking-[0.1em] text-foreground">
                  Explore our work
                </a>
              </div>
            </div>

            <div className="lg:col-span-3 lg:border-l lg:border-border lg:pl-10 self-stretch flex flex-col justify-between gap-8">
              {[
                ["Independent", "We answer to you, not an insurance carrier. Nobody here has a quota to protect."],
                ["95%+ retention", "Most of our clients have been with us for years. They stay because the model works."],
              ].map(([t, d]) => (
                <div key={t as string} className="border-t border-border pt-4 lg:border-t-0 lg:pt-0">
                  <div className={`${H3} text-[20px] leading-none`}>{t}</div>
                  <p className="mt-2.5 text-[12.5px] leading-[1.6] text-muted-foreground">{d}</p>
                </div>
              ))}
            </div>

            <div className="lg:col-span-4">
              <figure>
                <div className="kn-photo">
                  <img src={KENNION_BUILDING_URL} alt="The Lindsey Building, home of Kennion Benefit Advisors" className="w-full aspect-[4/3] lg:aspect-[5/4] object-cover" />
                </div>
                <figcaption className="mt-3 flex items-baseline justify-between text-[11px] uppercase tracking-[0.14em] text-muted-foreground">
                  <span>The Lindsey Building</span>
                  <span>Vestavia, AL</span>
                </figcaption>
              </figure>
            </div>
          </div>
        </Reveal>
      </div>

      <Ticker />
    </section>
  );
}

function Ticker() {
  const items = [
    "Group Health", "Dental & Vision", "Life & Disability", "Pharmacy Strategy",
    "Fully Insured", "Level Funded", "Self-Funded", "ACA & ERISA Compliance",
    "Benefits Technology", "Claims Advocacy", "Benchmarking & Analytics",
  ];
  const row = items.map((t, i) => (
    <span key={i} className="inline-flex items-center gap-6 lg:gap-10 mr-6 lg:mr-10">
      <span className="kn-caps text-muted-foreground whitespace-nowrap">{t}</span>
      <span className="inline-block w-1 h-1 rounded-full" style={{ background: "hsl(var(--brand-accent))" }} />
    </span>
  ));
  return (
    <div className="mt-12 lg:mt-24 border-y border-border overflow-hidden py-4" aria-hidden="true">
      <div className="kn-marquee flex w-max">
        <div className="flex items-center">{row}</div>
        <div className="flex items-center">{row}</div>
      </div>
    </div>
  );
}

/* ── solutions: ruled index list ───────────────────────────────────── */

function Solutions() {
  const services = [
    { t: "Benefits Strategy & Plan Design", d: "Most benefits programs were inherited, not designed. We start over from your budget and your workforce and build a lineup that actually fits." },
    { t: "Marketing & Carrier Placement", d: "When your group goes to market, leverage matters. We run the process and push the carriers until the options are worth choosing between." },
    { t: "Data, Analytics & Benchmarking", d: "You can't manage what you can't see. We put claims experience and peer benchmarks in front of you before decisions get made." },
    { t: "Benefits Administration & Technology", d: "Enrollment platforms your HR team will actually like using, with one place for elections, changes, and reporting all year." },
    { t: "Compliance, ACA & ERISA", d: "The notices, filings, and plan documents are our job to track. You stay current without reading federal regulations." },
    { t: "Pharmacy & Rx Strategy", d: "Drug spend is climbing faster than anything else on your renewal. We work to contain it without your members feeling squeezed." },
    { t: "Employee Communication & Engagement", d: "A benefit nobody understands might as well not exist. We make sure your people know what they have and how to use it." },
    { t: "Ongoing Service & Advocacy", d: "A claim gets denied, a bill looks wrong, someone lost a card. Your team calls us and we handle it." },
  ];
  return (
    <section id="solutions" className="py-20 lg:py-32">
      <div className="mx-auto max-w-[1320px] px-6 lg:px-10">
        <SectionHead label="What We Do">
          <div className="grid lg:grid-cols-12 gap-y-8 lg:gap-x-10 items-end mb-12 lg:mb-20">
            <h2 className={`${H2} lg:col-span-8`}>
              A full spectrum of solutions,
              <br />
              <span style={{ color: "hsl(var(--primary))" }}>under one roof.</span>
            </h2>
            <p className="lg:col-span-4 text-[15px] leading-[1.65] text-muted-foreground lg:pb-2">
              We don&rsquo;t place coverage and then disappear until renewal. We build the program,
              run it all year, and bring the resources of a national firm to groups of any size.
            </p>
          </div>
        </SectionHead>

        <div>
          {services.map((s, i) => (
            <Reveal key={s.t} delay={Math.min(i * 40, 160)}>
              <div className="group grid grid-cols-1 lg:grid-cols-[1fr_1fr_4rem] gap-x-10 items-baseline border-t border-border py-5 lg:py-7 transition-colors hover:bg-foreground/[0.025]">
                <h3 className={`${H3} text-[19px] lg:text-[24px] leading-[1.15]`}>
                  {s.t}
                </h3>
                <p className="mt-2 lg:mt-0 text-[13.5px] leading-[1.65] text-muted-foreground max-w-[34rem]">
                  {s.d}
                </p>
                <ArrowRight size={18} strokeWidth={1.6} className="hidden lg:block justify-self-end self-center opacity-0 -translate-x-2 transition-all group-hover:opacity-100 group-hover:translate-x-0 text-foreground" />
              </div>
            </Reveal>
          ))}
          <div className="border-t border-border" />
        </div>
      </div>
    </section>
  );
}

/* ── who we serve: ink section, ruled columns ──────────────────────── */

function WhoWeServe() {
  const segments = [
    { t: "Small Business", d: "You get a named advisor who knows your group, better rates than you could find on your own, and technology usually reserved for much larger employers." },
    { t: "Middle Market", d: "Growing organizations tend to outgrow their broker before they notice. We bring the analytics and the advocacy your size now warrants." },
    { t: "Large & Enterprise", d: "Complex census, multiple locations, real financial exposure. Our consulting bench models it and a dedicated team runs it." },
  ];
  const funding = [
    { t: "Fully Insured", d: "The carrier takes the risk and your monthly cost stays fixed. Still the best answer for plenty of groups, and we price it hard." },
    { t: "Level Funded", d: "Fixed payments like fully insured, with money back in years when claims run well. Often the smartest middle ground." },
    { t: "Self-Funded", d: "You keep the margin a carrier would have kept. More control and more transparency, for groups ready to manage the risk." },
  ];
  return (
    <section id="who-we-serve" className="bg-[hsl(var(--ink))] text-white py-20 lg:py-32">
      <div className="mx-auto max-w-[1320px] px-6 lg:px-10">
        <SectionHead label="Who We Serve" dark>
          <h2 className={`${H2} mb-6`}>
            Built for employers
            <br />
            of every size.
          </h2>
          <p className="text-[15.5px] leading-[1.65] text-white/60 max-w-[38rem] mb-12 lg:mb-20">
            Whether you have twelve employees or twelve locations, the strategy and the service
            scale to fit you. Never the other way around.
          </p>
        </SectionHead>

        <Reveal>
          <div className="grid md:grid-cols-3 border-t border-white/15">
            {segments.map((s, i) => (
              <div key={s.t} className={`pt-7 pb-9 md:pr-10 ${i > 0 ? "md:pl-10 md:border-l md:border-white/15 border-t border-white/15 md:border-t-0" : ""}`}>
                <h3 className={`${H3} text-[23px] lg:text-[26px] leading-[1.1]`}>{s.t}</h3>
                <p className="mt-4 text-[13.5px] leading-[1.7] text-white/60 max-w-[24rem]">{s.d}</p>
              </div>
            ))}
          </div>
        </Reveal>

        <Reveal delay={80}>
          <div className="mt-16 lg:mt-28 grid lg:grid-cols-12 gap-y-10 lg:gap-x-10">
            <div className="lg:col-span-4">
              <div className="kn-caps text-white/50">Funding Strategies</div>
              <h3 className={`${H2_SM} mt-5`}>
                One strategy doesn&rsquo;t fit every employer.
              </h3>
              <p className="mt-5 text-[14px] leading-[1.7] text-white/55 max-w-[24rem]">
                We model the options against your claims history and risk tolerance, make a
                recommendation, and revisit it at every renewal.
              </p>
            </div>
            <div className="lg:col-span-8">
              {funding.map((f) => (
                <div key={f.t} className="grid grid-cols-1 lg:grid-cols-[16rem_1fr] gap-x-8 items-baseline border-t border-white/15 py-5 lg:py-6">
                  <h4 className={`${H3} text-[19px] lg:text-[21px]`}>{f.t}</h4>
                  <p className="mt-2 lg:mt-0 text-[13.5px] leading-[1.7] text-white/60">{f.d}</p>
                </div>
              ))}
              <div className="border-t border-white/15" />
            </div>
          </div>
        </Reveal>
      </div>
    </section>
  );
}

/* ── approach: sticky header + numbered steps ──────────────────────── */

function Approach() {
  const steps = [
    { t: "Discover", d: "We start by understanding your workforce and where the current program falls short." },
    { t: "Strategize", d: "Then we model the funding options and design around your budget." },
    { t: "Market & Place", d: "We take the group to market and negotiate on your behalf." },
    { t: "Implement", d: "Enrollment, technology, and employee communication get set up and handled for you." },
    { t: "Manage", d: "And we stay on it through the year: renewals, compliance, claims advocacy, strategy reviews." },
  ];
  return (
    <section id="approach" className="py-20 lg:py-32">
      <div className="mx-auto max-w-[1320px] px-6 lg:px-10">
        <SectionHead label="Our Approach">
          <div className="grid lg:grid-cols-12 gap-y-12 lg:gap-x-10">
            <div className="lg:col-span-5">
              <div className="lg:sticky lg:top-32">
                <h2 className={H2}>
                  A partnership,
                  <br />
                  <span style={{ color: "hsl(var(--primary))" }}>not a transaction.</span>
                </h2>
                <p className="mt-6 text-[15px] leading-[1.65] text-muted-foreground max-w-[26rem]">
                  Benefits shouldn&rsquo;t be a once-a-year scramble. We work as an extension of your
                  team from first conversation through every renewal.
                </p>
                <div className="mt-9">
                  <SolidButton href="/quote">Start the Conversation</SolidButton>
                </div>
              </div>
            </div>
            <div className="lg:col-span-7">
              {steps.map((s, i) => (
                <Reveal key={s.t} delay={Math.min(i * 50, 200)}>
                  <div className="grid grid-cols-[3.5rem_1fr] lg:grid-cols-[4.5rem_1fr] gap-x-5 border-t border-border py-6 lg:py-9 items-baseline">
                    <span className="font-display font-bold text-[26px] lg:text-[32px] leading-none tracking-[-0.03em] tabular-nums" style={{ color: "hsl(var(--brand-accent))" }}>
                      {String(i + 1).padStart(2, "0")}
                    </span>
                    <div>
                      <h3 className={`${H3} text-[21px] lg:text-[25px] leading-[1.1]`}>{s.t}</h3>
                      <p className="mt-3 text-[14px] leading-[1.7] text-muted-foreground max-w-[30rem]">{s.d}</p>
                    </div>
                  </div>
                </Reveal>
              ))}
              <div className="border-t border-border" />
            </div>
          </div>
        </SectionHead>
      </div>
    </section>
  );
}

/* ── why kennion: pull stats + ruled list ──────────────────────────── */

function WhyKennion() {
  const stats = [
    { v: "100%", l: "Independent. We work for you, not a carrier" },
    { v: "95%", l: "Client retention, year over year" },
    { v: "0", l: "Quotas. Independent and conflict-free" },
  ];
  const differentiators = [
    { t: "Experienced Leadership", d: "The people on your account have seen every market cycle and know how a renewal gets won. No rotating cast of junior reps." },
    { t: "Client-First Advocacy", d: "Your renewal gets shopped and negotiated every year, because nobody here has a carrier quota to protect." },
    { t: "Proven Retention", d: "More than 95% of our clients stay with us year over year. We think that says more than any pitch could." },
    { t: "Full-Service Breadth", d: "Strategy, technology, compliance, and day-to-day service all live under one roof, so nothing falls between vendors." },
    { t: "Growing Fast", d: "One of the fastest-growing benefits advisories in the region, and service has stayed personal while we grow." },
    { t: "Technology-Driven", d: "Modern enrollment, administration, and analytics, delivered with local service instead of a national call queue." },
  ];
  return (
    <section id="why-us" className="pb-20 lg:pb-32">
      <div className="mx-auto max-w-[1320px] px-6 lg:px-10">
        <SectionHead label="Why Kennion">
          <h2 className={H2}>
            The difference an
            <br />
            <span style={{ color: "hsl(var(--primary))" }}>experienced team</span> makes.
          </h2>
        </SectionHead>

        <Reveal delay={60}>
          <div className="mt-12 lg:mt-20 grid sm:grid-cols-3 border-y border-foreground/20">
            {stats.map((s, i) => (
              <div key={s.v} className={`py-7 lg:py-10 sm:pr-8 ${i > 0 ? "sm:pl-8 sm:border-l sm:border-border border-t border-border sm:border-t-0" : ""}`}>
                <div className="font-display font-bold text-[54px] lg:text-[84px] leading-[0.9] tracking-[-0.045em] tabular-nums">
                  {s.v}
                </div>
                <div className="mt-4 text-[12px] leading-[1.5] text-muted-foreground uppercase tracking-[0.1em]">{s.l}</div>
              </div>
            ))}
          </div>
        </Reveal>

        <div className="mt-12 lg:mt-20 grid md:grid-cols-2 gap-x-14 lg:gap-x-24">
          {differentiators.map((d, i) => (
            <Reveal key={d.t} delay={Math.min((i % 2) * 60, 120)}>
              <div className="border-t border-border py-6 lg:py-7">
                <h3 className={`${H3} flex items-baseline gap-4 text-[18px] lg:text-[20px]`}>
                  <span className="inline-block w-6 h-px translate-y-[-4px] shrink-0" style={{ background: "hsl(var(--brand-accent))" }} />
                  {d.t}
                </h3>
                <p className="mt-3 pl-10 text-[13.5px] leading-[1.7] text-muted-foreground">{d.d}</p>
              </div>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  );
}

/* ── contact ───────────────────────────────────────────────────────── */

function Contact() {
  return (
    <section id="contact" className="py-20 lg:py-32">
      <div className="mx-auto max-w-[1320px] px-6 lg:px-10">
        <SectionHead label="Contact">
          <div className="grid lg:grid-cols-12 gap-y-14 lg:gap-x-10">
            <div className="lg:col-span-6">
              <h2 className={H2}>
                Let&rsquo;s <span style={{ color: "hsl(var(--primary))" }}>talk benefits.</span>
              </h2>
              <p className="mt-6 text-[15.5px] leading-[1.65] text-muted-foreground max-w-[30rem]">
                Whether you&rsquo;re shopping for the first time or unhappy with your renewal, we can
                help. There&rsquo;s no obligation and no cost to see what we can do for your group.
              </p>

              <dl className="mt-10 lg:mt-12 max-w-[30rem]">
                <div className="grid grid-cols-[5rem_1fr] sm:grid-cols-[7rem_1fr] gap-x-6 border-t border-border py-5 items-baseline">
                  <dt className="kn-caps text-muted-foreground">Visit</dt>
                  <dd className="text-[14.5px] leading-[1.6] flex items-start gap-2.5">
                    <MapPin size={15} strokeWidth={1.7} className="mt-[3px] shrink-0" style={{ color: "hsl(var(--brand-accent))" }} />
                    <span>2828 Old 280 Court, Vestavia, Alabama 35243</span>
                  </dd>
                </div>
                <div className="grid grid-cols-[5rem_1fr] sm:grid-cols-[7rem_1fr] gap-x-6 border-t border-border py-5 items-baseline">
                  <dt className="kn-caps text-muted-foreground">Write</dt>
                  <dd className="text-[14.5px] flex items-center gap-2.5">
                    <Mail size={15} strokeWidth={1.7} className="shrink-0" style={{ color: "hsl(var(--brand-accent))" }} />
                    <a href="mailto:support@kennion.com" className="kn-link">support@kennion.com</a>
                  </dd>
                </div>
                <div className="grid grid-cols-[5rem_1fr] sm:grid-cols-[7rem_1fr] gap-x-6 border-y border-border py-5 items-baseline">
                  <dt className="kn-caps text-muted-foreground">Meet</dt>
                  <dd className="text-[14.5px] flex items-center gap-2.5">
                    <Calendar size={15} strokeWidth={1.7} className="shrink-0" style={{ color: "hsl(var(--brand-accent))" }} />
                    <a href="https://calendly.com/kennion/call" onClick={openCalendly} className="kn-link cursor-pointer">
                      Book a call online
                    </a>
                  </dd>
                </div>
              </dl>
            </div>

            <div className="lg:col-span-6 lg:border-l lg:border-border lg:pl-14">
              <div className="border-t border-foreground/20 lg:border-t-0 pt-8 lg:pt-0">
                <div className="kn-caps" style={{ color: "hsl(var(--brand-accent))" }}>For Employers</div>
                <h3 className={`${H3} mt-3 text-[23px] lg:text-[26px] leading-[1.15]`}>
                  Ready for a benefits partner that works for you?
                </h3>
                <p className="mt-4 text-[14px] leading-[1.7] text-muted-foreground max-w-[30rem]">
                  Tell us a little about your group and our team will reach out. We&rsquo;ll come
                  back with options and a clear picture of what your program could be.
                </p>
                <div className="mt-7">
                  <SolidButton href="/quote">Request a Proposal</SolidButton>
                </div>
              </div>

              <div className="mt-12 lg:mt-14 border-t border-border pt-9">
                <div className="kn-caps" style={{ color: "hsl(var(--brand-accent))" }}>Existing Clients</div>
                <h3 className={`${H3} mt-3 text-[23px] lg:text-[26px] leading-[1.15]`}>
                  Current client or member?
                </h3>
                <p className="mt-4 text-[14px] leading-[1.7] text-muted-foreground max-w-[30rem]">
                  Your account team is standing by. Open a support ticket and someone will be in
                  touch the same business day.
                </p>
                <div className="mt-6">
                  <a href="https://go.kennion.com/support" target="_blank" rel="noopener noreferrer" className="kn-link text-[13px] font-semibold uppercase tracking-[0.1em]">
                    Submit a ticket
                  </a>
                </div>
              </div>

              <figure className="mt-12 lg:mt-14">
                <div className="kn-photo">
                  <img src={KENNION_BUILDING_URL} alt="Kennion Benefit Advisors headquarters" className="w-full aspect-[16/9] object-cover" />
                </div>
                <figcaption className="mt-3 text-[11px] uppercase tracking-[0.14em] text-muted-foreground">
                  Headquarters · Vestavia, Alabama
                </figcaption>
              </figure>
            </div>
          </div>
        </SectionHead>
      </div>
    </section>
  );
}

/* ── final CTA ─────────────────────────────────────────────────────── */

function FinalCTA() {
  return (
    <section className="bg-primary text-primary-foreground py-20 lg:py-32 border-b border-white/10">
      <div className="mx-auto max-w-[1320px] px-6 lg:px-10">
        <div className="kn-caps text-white/50">Get Started</div>
        <h2 className="mt-6 font-display font-bold tracking-[-0.035em] leading-[0.98] text-[clamp(2.4rem,6.5vw,4.75rem)] max-w-[15em]">
          Better benefits start with a better advisor.
        </h2>
        <p className="mt-7 text-[16px] leading-[1.65] text-white/70 max-w-[36rem]">
          Tell us about your group and we&rsquo;ll show you what a real benefits partnership
          looks like. There&rsquo;s no cost to find out, and no pressure to move.
        </p>
        <div className="mt-10 flex flex-wrap items-center gap-x-9 gap-y-5">
          <SolidButton href="/quote" tone="paper">Request a Proposal</SolidButton>
          <a href="https://calendly.com/kennion/call" onClick={openCalendly}
             className="kn-link text-[13px] font-semibold uppercase tracking-[0.1em] text-white cursor-pointer">
            Schedule a call
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
        <div className="grid sm:grid-cols-2 md:grid-cols-[1.6fr_1fr_1fr_1fr] gap-x-10 gap-y-12 pb-14 lg:pb-16">
          <div className="sm:col-span-2 md:col-span-1">
            <div className="font-display font-bold text-[26px] tracking-[-0.02em] leading-none">Kennion</div>
            <div className="kn-caps text-white/40 mt-3">Independent Benefit Advisors</div>
            <p className="mt-6 text-[13.5px] leading-[1.7] text-white/55 max-w-[24rem]">
              A full-service, independent employee benefits advisory firm helping employers
              nationwide design, deliver, and manage benefits programs across every funding
              strategy.
            </p>
            <a href="https://calendly.com/kennion/call" onClick={openCalendly}
               className="mt-8 inline-flex items-center gap-2.5 text-[11.5px] font-semibold uppercase tracking-[0.14em] bg-[hsl(var(--background))] text-[hsl(var(--ink))] px-5 py-3 hover:opacity-90 transition-opacity cursor-pointer">
              <Calendar size={13} strokeWidth={2} />
              Schedule a Call
            </a>
          </div>

          {[
            {
              h: "Solutions",
              links: [
                ["#solutions", "Strategy & Plan Design"],
                ["#solutions", "Marketing & Placement"],
                ["#solutions", "Administration & Technology"],
                ["#solutions", "Compliance & Service"],
              ],
            },
            {
              h: "Company",
              links: [
                ["#who-we-serve", "Who We Serve"],
                ["#approach", "Our Approach"],
                ["#why-us", "Why Kennion"],
                ["#contact", "Contact"],
              ],
            },
          ].map((col) => (
            <div key={col.h}>
              <div className="kn-caps text-white/40 mb-5">{col.h}</div>
              <ul className="space-y-3 text-[13.5px] text-white/70">
                {col.links.map(([href, label]) => (
                  <li key={label}><a href={href} className="kn-link-rev hover:text-white transition-colors">{label}</a></li>
                ))}
              </ul>
            </div>
          ))}

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
        <Solutions />
        <WhoWeServe />
        <Approach />
        <WhyKennion />
        <Contact />
        <FinalCTA />
      </main>
      <Footer />
    </div>
  );
}
