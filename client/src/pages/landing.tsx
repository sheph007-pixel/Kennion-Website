// Kennion Benefit Advisors public marketing homepage.
// Positioning: a large, established, tech-forward benefits agency.
// Lean page: hero with product visual, proof band, technology story,
// options, how it works, CTA + contact, footer. Google Sans Flex type,
// cool navy palette scoped via .kn-landing (see index.css).

import { useState, useEffect, useLayoutEffect, useRef } from "react";
import { Link } from "wouter";
import { ArrowRight, ArrowUpRight, ChevronDown, X, Menu, MapPin, Mail, Check, Stethoscope, Smile, Eye, ShieldCheck, Accessibility, Wallet, Receipt, PiggyBank, MonitorSmartphone, Upload, Bandage, Ribbon, RefreshCw, HeartPulse, ConciergeBell, Hospital, Briefcase, BadgePlus, Video, Leaf, Headphones, LifeBuoy, Sparkles, Share2, Calculator, Bot, Globe, Presentation, Zap, FolderOpen, Send, Download, Timer, FileText, Search } from "lucide-react";
import { PARTNER_LOGOS, FEATURED_PARTNERS, type PartnerLogo } from "@/lib/partner-logos";

const QUOTE_URL = "https://app.kennion.com/quote";
const KENNION_LOGO_URL = "/kennion-logo.svg";

/* ── type scale ────────────────────────────────────────────────────── */

const H1 = "font-display font-semibold tracking-[-0.01em] leading-[1.05] text-[clamp(2.75rem,10vw,6.9rem)]";
const H2 = "font-display font-semibold tracking-[-0.015em] leading-[1.1] text-[clamp(2rem,4.8vw,3.8rem)]";
const H3 = "font-display font-semibold tracking-[-0.01em]";

/* ── motion ────────────────────────────────────────────────────────── */

function useInView(threshold = 0.12) {
  const ref = useRef<any>(null);
  const [seen, setSeen] = useState(false);
  // Anything already in the viewport at mount paints instantly, before the
  // first frame, so above-the-fold content never flashes in washed out.
  const [instant, setInstant] = useState(false);
  useLayoutEffect(() => {
    if (!ref.current) return;
    const r = ref.current.getBoundingClientRect();
    if (r.top < window.innerHeight && r.bottom > 0) {
      setInstant(true);
      setSeen(true);
    }
  }, []);
  useEffect(() => {
    if (!ref.current || seen) return;
    const io = new IntersectionObserver(([e]) => {
      if (e.isIntersecting) { setSeen(true); io.disconnect(); }
    }, { threshold, rootMargin: "0px 0px -6% 0px" });
    io.observe(ref.current);
    return () => io.disconnect();
  }, [seen, threshold]);
  return [ref, seen, instant] as const;
}

function Reveal({ children, delay = 0, className = "", y = 14 }: {
  children: React.ReactNode; delay?: number; className?: string; y?: number;
}) {
  const [ref, seen, instant] = useInView();
  return (
    <div
      ref={ref}
      className={className}
      style={{
        opacity: seen ? 1 : 0,
        transform: seen ? "translate3d(0,0,0)" : `translate3d(0,${y}px,0)`,
        transition: instant
          ? "none"
          : `opacity 600ms cubic-bezier(.2,.7,.2,1) ${delay}ms, transform 600ms cubic-bezier(.2,.7,.2,1) ${delay}ms`,
        willChange: "opacity, transform",
      }}
    >
      {children}
    </div>
  );
}

/** Counts from 0 to `to` once `go` turns true (respects reduced motion). */
function useCountUp(to: number, go: boolean, ms = 1100) {
  const [v, setV] = useState(0);
  useEffect(() => {
    if (!go) return;
    if (window.matchMedia?.("(prefers-reduced-motion: reduce)").matches) { setV(to); return; }
    let raf = 0; const t0 = performance.now();
    const tick = (t: number) => {
      const k = Math.min(1, (t - t0) / ms);
      setV(Math.round(to * (1 - Math.pow(1 - k, 3))));
      if (k < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [go, to, ms]);
  return v;
}

/* ── shared bits ───────────────────────────────────────────────────── */

/** Centered section intro: pill eyebrow, headline, one short line. */
function SectionIntro({ label, title, sub, dark = false, className = "" }: {
  label: string; title: React.ReactNode; sub?: React.ReactNode; dark?: boolean; className?: string;
}) {
  return (
    <Reveal className={`mx-auto max-w-[60rem] text-center ${className}`}>
      <span
        className={`inline-flex items-center gap-2 rounded-full border px-3.5 py-1.5 text-[12.5px] font-semibold ${
          dark
            ? "border-white/15 bg-white/[0.06] text-[hsl(var(--brand-accent-soft))]"
            : "border-[hsl(var(--brand-accent))]/20 bg-[hsl(var(--brand-accent))]/[0.07] text-[hsl(var(--brand-accent))]"
        }`}
      >
        <span className={`h-1.5 w-1.5 rounded-full ${dark ? "bg-[hsl(var(--brand-accent-soft))]" : "bg-[hsl(var(--brand-accent))]"}`} />
        {label}
      </span>
      <h2 className={`${H2} mt-6`}>{title}</h2>
      {sub && (
        <p className={`mx-auto mt-6 max-w-[38rem] [text-wrap:balance] text-[16px] leading-[1.65] ${dark ? "text-white/65" : "text-muted-foreground"}`}>{sub}</p>
      )}
    </Reveal>
  );
}

function SolidButton({ href, onClick, children, external = false, tone = "ink" }: {
  href: string; onClick?: (e: React.MouseEvent) => void; children: React.ReactNode; external?: boolean;
  tone?: "ink" | "paper";
}) {
  const cls = tone === "ink"
    ? "group inline-flex items-center justify-center gap-3 rounded-md bg-primary text-primary-foreground px-6 py-3.5 text-[13px] font-semibold  transition-colors hover:bg-[hsl(var(--primary-hover))]"
    : "group inline-flex items-center justify-center gap-3 rounded-md bg-primary text-primary-foreground px-6 py-3.5 text-[13px] font-semibold transition-colors hover:bg-[hsl(var(--primary-hover))]";
  const inner = (
    <>
      {children}
      <ArrowRight size={14} strokeWidth={2} className="transition-transform group-hover:translate-x-1" />
    </>
  );
  if (external) {
    return <a href={href} onClick={onClick} className={cls} target={onClick ? undefined : "_blank"} rel="noopener noreferrer">{inner}</a>;
  }
  if (/^https?:\/\//.test(href)) {
    return <a href={href} onClick={onClick} className={cls}>{inner}</a>;
  }
  return <Link href={href} className={cls}>{inner}</Link>;
}

/* ── nav ───────────────────────────────────────────────────────────── */

function Nav({ onContact }: { onContact: () => void }) {
  const [open, setOpen] = useState(false);

  const links = [
    ["#what", "What We Do"],
    ["#bensync", "BenSync"],
    ["#how", "How We Do It"],
    ["#why", "Why Kennion"],
  ];

  return (
    <header className="sticky top-0 z-40 border-b border-border bg-[hsl(var(--background))]">
      <div className="mx-auto max-w-[1320px] px-6 lg:px-10 flex items-center justify-between h-[68px] lg:h-[76px]">
        <Link href="/" className="flex items-center">
          <img src={KENNION_LOGO_URL} alt="Kennion Benefit Advisors" className="h-6 lg:h-7 w-auto" />
        </Link>

        <nav className="hidden lg:flex items-center gap-10">
          {links.map(([href, label]) => (
            <a key={href} href={href} className="kn-link-rev text-[15px] font-semibold text-foreground/75 hover:text-foreground transition-colors">
              {label}
            </a>
          ))}
        </nav>

        <div className="hidden lg:flex items-center gap-6">
          <span className="w-px h-4 bg-border" aria-hidden="true" />
          <button onClick={onContact} className="kn-link-rev text-[15px] font-semibold text-foreground/75 hover:text-foreground transition-colors">
            Contact
          </button>
          <a href={QUOTE_URL} className="inline-flex items-center gap-2.5 rounded-md bg-primary text-primary-foreground px-5 py-3 text-[14.5px] font-semibold transition-colors hover:bg-[hsl(var(--primary-hover))]">
            Get A Quote
          </a>
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
          <a href={QUOTE_URL} className="mt-6 flex items-center justify-center gap-2 rounded-md bg-primary text-primary-foreground px-5 py-3.5 text-[13.5px] font-semibold ">
            Get A Quote
          </a>
          <button onClick={() => { setOpen(false); onContact(); }} className="mt-6 block text-[13px] font-semibold text-muted-foreground kn-link w-max">
            Contact
          </button>
        </div>
      )}
    </header>
  );
}

/* ── hero app mockup (pure CSS, a preview of the client platform) ───
   Skeleton data only: shows the shape of the product without real
   rates, carriers or plan details. Replays on a loop. */

function Skel({ w, h = 7, className = "" }: { w: string; h?: number; className?: string }) {
  return <span className={`kn-skel block rounded-full ${className}`} style={{ width: w, height: h }} />;
}

const MOCK_ROWS = [
  { tag: "Lower Cost", w: ["62%", "48%", "54%"] },
  { tag: null, w: ["70%", "44%", "50%"] },
  { tag: "Balanced", w: ["58%", "52%", "46%"] },
  { tag: null, w: ["66%", "40%", "56%"] },
  { tag: "Richer Benefits", w: ["54%", "50%", "60%"] },
];

function AppMockup() {
  // `cycle` remounts the animated bits so the whole flow replays.
  const [cycle, setCycle] = useState(0);
  const [picked, setPicked] = useState(false);
  useEffect(() => {
    if (window.matchMedia?.("(prefers-reduced-motion: reduce)").matches) { setPicked(true); return; }
    const a = setTimeout(() => setPicked(true), 2600);
    const b = setTimeout(() => { setPicked(false); setCycle((c) => c + 1); }, 9000);
    return () => { clearTimeout(a); clearTimeout(b); };
  }, [cycle]);

  const nav = ["Welcome", "Medical Plans", "Supplemental", "Sign Up", "AI Assistant"];
  return (
    <div className="relative select-none" aria-hidden="true">
      <div className="relative rounded-[12px] border border-border bg-white shadow-xl overflow-hidden">
        {/* window chrome */}
        <div className="flex items-center gap-3 px-4 py-2.5 border-b border-border bg-muted/60">
          <div className="flex gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-[#ff5f57]" />
            <span className="w-2.5 h-2.5 rounded-full bg-[#febc2e]" />
            <span className="w-2.5 h-2.5 rounded-full bg-[#28c840]" />
          </div>
          <div className="mx-auto w-[46%] rounded-md bg-white border border-border px-3 py-1 text-[10.5px] text-muted-foreground text-center truncate">
            app.kennion.com
          </div>
          <span className="w-10" />
        </div>

        <div className="flex">
          {/* sidebar */}
          <div className="hidden sm:flex w-[30%] max-w-[170px] shrink-0 flex-col gap-1 bg-[hsl(var(--ink))] px-3 py-4">
            <div className="flex items-center gap-2 px-1.5 mb-3">
              <span className="grid place-items-center w-6 h-6 rounded-md bg-[hsl(var(--brand-accent))] text-white text-[10px] font-bold">K</span>
              <Skel w="60%" h={6} className="!bg-white/20 !bg-none" />
            </div>
            {nav.map((n, i) => (
              <div key={n} className={`flex items-center gap-2 rounded-md px-2 py-1.5 text-[10.5px] font-semibold ${i === 1 ? "bg-white/10 text-white" : "text-white/55"}`}>
                <span className={`w-1.5 h-1.5 rounded-full ${i === 1 ? "bg-[hsl(var(--brand-accent-soft))]" : "bg-white/25"}`} />
                {n}
              </div>
            ))}
            <div className="mt-auto rounded-md bg-[hsl(var(--brand-accent-soft))] px-2 py-2 text-[10px] font-bold text-[hsl(var(--ink))] flex items-center gap-1.5">
              <Share2 size={11} strokeWidth={2.4} /> Share With Employees
            </div>
          </div>

          {/* main */}
          <div className="flex-1 min-w-0 p-4 lg:p-5 bg-[hsl(210_30%_98%)]">
            <div className="flex items-start justify-between gap-3">
              <div>
                <div className="font-display font-semibold text-[15px] lg:text-[17px] tracking-[-0.01em]">Medical Plans</div>
                <Skel w="96px" h={6} className="mt-2" />
              </div>
              <div className="flex gap-1.5">
                <span className="rounded-md border border-[hsl(var(--brand-accent))]/25 bg-[hsl(var(--brand-accent))]/10 px-2 py-1"><Skel w="34px" h={5} /></span>
                <span className="hidden md:block rounded-md border border-[hsl(var(--brand-accent))]/25 bg-[hsl(var(--brand-accent))]/10 px-2 py-1"><Skel w="40px" h={5} /></span>
              </div>
            </div>

            {/* carrier cards */}
            <div className="mt-4 grid grid-cols-2 gap-2.5">
              {["#6d4aff", "hsl(var(--ink))"].map((c, i) => (
                <div key={i} className="rounded-[8px] border border-border bg-white p-3">
                  <div className="flex items-center gap-2">
                    <span className="grid place-items-center w-5 h-5 rounded text-white text-[9px] font-bold" style={{ background: c }} />
                    <Skel w="55%" h={6} />
                  </div>
                  <div className="mt-3 space-y-2">
                    {[0, 1, 2].map((r) => (
                      <div key={r} className="flex items-center justify-between gap-3">
                        <Skel w="38%" h={5} />
                        <Skel w="24%" h={5} />
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>

            {/* AI picks banner */}
            <div className="mt-3 flex items-center justify-between gap-3 rounded-[8px] border border-[hsl(var(--brand-accent))]/25 bg-[hsl(var(--brand-accent))]/[0.07] px-3 h-[44px]">
              <div className="flex items-center gap-2 text-[11px] font-semibold text-[hsl(var(--brand-accent))]">
                <Sparkles size={13} strokeWidth={2.2} className={picked ? "" : "animate-pulse"} />
                <span className="truncate">{picked ? "Picks Ready For Your Team" : "Finding Picks For Your Team…"}</span>
              </div>
              <span className="rounded-md bg-[hsl(var(--brand-accent))] px-2.5 py-1 text-[10px] font-bold text-white">Run AI Picks</span>
            </div>

            {/* plan table */}
            <div key={cycle} className="mt-3 rounded-[8px] border border-border bg-white overflow-hidden">
              <div className="grid grid-cols-[18px_1.6fr_1fr_1fr] gap-3 items-center bg-[hsl(var(--ink))] px-3 py-2 text-[9.5px] font-bold text-white">
                <span />
                <span>Plan</span>
                <span>Deductible</span>
                <span className="text-right whitespace-nowrap">Employee Rate</span>
              </div>
              {MOCK_ROWS.map((r, i) => (
                <div
                  key={i}
                  className="kn-row-in grid grid-cols-[18px_1.6fr_1fr_1fr] gap-3 items-center border-t border-border px-3 h-[38px]"
                  style={{ animationDelay: `${300 + i * 140}ms` }}
                >
                  <span className={`grid place-items-center w-3.5 h-3.5 rounded-[3px] border transition-colors duration-300 ${picked && r.tag ? "bg-[hsl(var(--brand-accent))] border-[hsl(var(--brand-accent))] text-white" : "border-border"}`}>
                    {picked && r.tag && <Check size={9} strokeWidth={3.5} />}
                  </span>
                  <span className="flex items-center gap-2 min-w-0 h-[18px]">
                    <Skel w={r.w[0]} h={6} />
                    {picked && r.tag && (
                      <span className="kn-pop hidden md:inline-flex shrink-0 items-center gap-1 rounded-full bg-[hsl(var(--brand-accent))]/10 px-1.5 py-0.5 text-[8.5px] font-bold text-[hsl(var(--brand-accent))]" style={{ animationDelay: `${i * 120}ms` }}>
                        <Sparkles size={8} strokeWidth={2.6} /> {r.tag}
                      </span>
                    )}
                  </span>
                  <Skel w={r.w[1]} h={6} />
                  <span className="flex justify-end"><Skel w={r.w[2]} h={6} /></span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* floating chips */}
      <div className="kn-float absolute -left-6 -bottom-6 z-10 hidden lg:flex items-center gap-2.5 rounded-full bg-white border border-border shadow-md pl-2 pr-4 py-2">
        <span className="grid place-items-center w-7 h-7 rounded-full bg-[hsl(var(--brand-accent))] text-white"><Upload size={14} strokeWidth={2.2} /></span>
        <span className="text-[12.5px] font-semibold">Census Uploaded</span>
      </div>
      <div className="kn-float absolute -right-4 -top-5 z-10 hidden lg:flex items-center gap-2 rounded-full bg-[hsl(var(--ink))] text-white shadow-md px-3.5 py-2" style={{ animationDelay: "1.4s" }}>
        <span className="relative flex h-2 w-2">
          <span className="kn-ping absolute inline-flex h-full w-full rounded-full" style={{ background: "hsl(var(--brand-accent-soft))" }} />
          <span className="relative inline-flex rounded-full h-2 w-2" style={{ background: "hsl(var(--brand-accent-soft))" }} />
        </span>
        <span className="text-[12px] font-semibold">Live Rates</span>
      </div>
    </div>
  );
}

/* ── hero ──────────────────────────────────────────────────────────── */

function Hero() {
  return (
    <section className="relative overflow-hidden">
      <div className="mx-auto max-w-[1320px] px-6 lg:px-10 pt-12 lg:pt-24 pb-16 lg:pb-24 grid lg:grid-cols-12 gap-y-12 lg:gap-x-12 items-center">
        <div className="lg:col-span-6">
          <Reveal delay={40}>
            <div className="mb-8 h-1 w-10 rounded-full bg-[hsl(var(--brand-accent))]" aria-hidden="true" />
          </Reveal>
          <Reveal delay={90}>
            <h1 className="font-display font-semibold tracking-[-0.01em] leading-[1.05] text-[clamp(2.5rem,8vw,4.6rem)]">
              A new kind of
              <br />
              benefits agency.
            </h1>
          </Reveal>
          <Reveal delay={180}>
            <p className="mt-8 text-[16px] lg:text-[17px] leading-[1.65] text-muted-foreground max-w-[30rem]">
              A team of advisors ready to help, and technology that handles the busywork.
              Group health, dental, vision, supplemental, and everything else the modern
              employer needs.
            </p>
            <div className="mt-9 flex flex-wrap items-center gap-x-8 gap-y-4">
              <SolidButton href={QUOTE_URL}>Get A Quote</SolidButton>
              <a href="#how" className="kn-link text-[13px] font-semibold text-foreground">
                See How It Works
              </a>
            </div>
          </Reveal>
        </div>

        <Reveal delay={220} className="lg:col-span-6">
          <AppMockup />
        </Reveal>
      </div>

      <PartnersBand />
    </section>
  );
}

/* ── partners band: shuffled, muted, same-size logos on a slow loop ── */

const PARTNERS_SHOWN = 40;

function shufflePartners(): PartnerLogo[] {
  const featured = PARTNER_LOGOS.filter((l) => FEATURED_PARTNERS.includes(l.n));
  const pool = PARTNER_LOGOS.filter((l) => !FEATURED_PARTNERS.includes(l.n));
  for (let i = pool.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [pool[i], pool[j]] = [pool[j], pool[i]];
  }
  const set = [...featured, ...pool.slice(0, PARTNERS_SHOWN - featured.length)];
  for (let i = set.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [set[i], set[j]] = [set[j], set[i]];
  }
  return set;
}

function PartnersBand() {
  const [logos] = useState(shufflePartners);
  const track = (copy: number) => logos.map((l) => (
    <li key={`${copy}-${l.f}`} aria-hidden={copy === 1 || undefined} className="shrink-0 grid place-items-center h-16 px-7 lg:px-9">
      <img
        src={`/partners/${l.f}`}
        alt={copy === 0 ? l.n : ""}
        width={l.w}
        height={l.h}
        loading="lazy"
        decoding="async"
        className="opacity-[.55] transition-opacity duration-300 hover:opacity-100"
        style={{ width: l.w, height: l.h }}
      />
    </li>
  ));
  return (
    <div className="relative bg-white py-14 lg:py-16">
      <h2 className="text-center font-display font-semibold tracking-[-0.01em] text-[26px] lg:text-[34px] text-foreground">
        Our Partners
      </h2>
      <div className="mt-8 lg:mt-10">
        <div className="kn-marquee-wrap relative overflow-hidden [mask-image:linear-gradient(to_right,transparent,#000_10%,#000_90%,transparent)]">
          <ul className="kn-marquee flex w-max items-center" style={{ animationDuration: `${logos.length * 4.5}s` }}>
            {track(0)}
            {track(1)}
          </ul>
        </div>
      </div>
    </div>
  );
}

/* ── the problem ───────────────────────────────────────────────────── */

function Problem() {
  const cases = [
    {
      img: "https://images.unsplash.com/photo-1522071820081-009f0129c71c?w=1200&q=70&auto=format&fit=crop",
      alt: "A growing team collaborating in an office",
      label: "Growing Company",
      h: "Setting up benefits for the first\u00a0time?",
      p: "You are hiring and it is time for a real program. Our advisors design it around your budget, set up online enrollment, and make benefits a reason people join.",
      cta: "Get A Quote",
    },
    {
      img: "https://images.unsplash.com/photo-1556761175-b413da4baf72?w=1200&q=70&auto=format&fit=crop",
      alt: "An advisor meeting with a client",
      label: "Time for Something Better",
      h: "High rates, rough renewals, no new\u00a0ideas?",
      p: "If every renewal is a higher number and nothing else changes, get a second opinion. Send us your census and see what you have been missing.",
      cta: "Get A Quote",
    },
  ];
  return (
    <section className="py-20 lg:py-28">
      <div className="mx-auto max-w-[1320px] px-6 lg:px-10">
        <SectionIntro
          label="The Problem"
          className="mb-14 lg:mb-20"
          title={<>Benefits keep costing&nbsp;more<br className="hidden md:block" />{" "}<span style={{ color: "hsl(var(--brand-accent))" }}>and delivering less.</span></>}
          sub="Premiums climb every year, employees are not sure what they have, and HR is stuck in the middle. You are who we built this for."
        />
        <div>
          <div className="grid md:grid-cols-2 gap-y-12 md:gap-x-0">
            {cases.map((c, i) => (
              <Reveal key={c.label} delay={i * 80}>
                <div className={`h-full flex flex-col items-start ${i === 0 ? "md:pr-12" : "md:pl-12 md:border-l md:border-border"}`}>
                  <div className="kn-photo w-full mb-7">
                    <img src={c.img} alt={c.alt} className="w-full aspect-[16/9] object-cover" loading="lazy" />
                  </div>
                  <div className="kn-caps" style={{ color: "hsl(var(--brand-accent))" }}>{c.label}</div>
                  <h3 className={`${H3} mt-4 text-[24px] lg:text-[30px] leading-[1.12] max-w-[16em]`}>{c.h}</h3>
                  <p className="mt-4 text-[14.5px] leading-[1.7] text-muted-foreground max-w-[26rem]">{c.p}</p>
                  <a href={QUOTE_URL} className="kn-link mt-6 text-[13px] font-semibold text-foreground">
                    {c.cta}
                  </a>
                </div>
              </Reveal>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}

/* ── how we do it (dark): 3 steps + the year-round loop ────────────── */

function YearRoundLoop() {
  const stages = [
    { Icon: MonitorSmartphone, t: "Online Enrollment", d: "Employees enroll from a link on any device." },
    { Icon: Headphones, t: "1:1 Enrollment Counselors", d: "A real person walks every employee through their options." },
    { Icon: LifeBuoy, t: "Year-Round Support", d: "Claims, changes, questions. We pick up the phone." },
    { Icon: RefreshCw, t: "Renewal", d: "We negotiate early, with programs we have built alongside top carriers, TPAs and providers." },
  ];
  const [ref, seen] = useInView(0.3);
  const [active, setActive] = useState(0);
  const [paused, setPaused] = useState(false);
  useEffect(() => {
    if (!seen || paused) return;
    if (window.matchMedia?.("(prefers-reduced-motion: reduce)").matches) return;
    const t = setInterval(() => setActive((a) => (a + 1) % stages.length), 2600);
    return () => clearInterval(t);
  }, [seen, paused, stages.length]);
  const pct = (active / (stages.length - 1)) * 100;

  return (
    <div ref={ref} onMouseLeave={() => setPaused(false)}>
      <Reveal>
        <div className="mt-24 lg:mt-32 mb-12 lg:mb-16 pt-16 lg:pt-20 border-t border-white/10 mx-auto max-w-[40rem] text-center">
          <h3 className={`${H3} text-[26px] lg:text-[36px] leading-[1.1]`}>
            Enrollment Done The Right Way.
            <br />
            <span className="text-[hsl(var(--brand-accent-soft))]">Then We're With You All Year.</span>
          </h3>
        </div>
      </Reveal>

      <div className="relative">
        {/* track (desktop) */}
        <div className="hidden md:block absolute left-[12.5%] right-[12.5%] top-8 h-[2px] bg-white/10 rounded-full">
          <div className="h-full rounded-full bg-[hsl(var(--brand-accent-soft))] transition-[width] duration-700 ease-out" style={{ width: `${pct}%` }} />
          <div
            className="absolute top-1/2 -translate-y-1/2 -translate-x-1/2 w-3 h-3 rounded-full bg-[hsl(var(--brand-accent-soft))] kn-glow transition-[left] duration-700 ease-out"
            style={{ left: `${pct}%` }}
          />
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-y-10 gap-x-4">
          {stages.map(({ Icon, t }, i) => {
            const on = i === active;
            const done = i < active;
            return (
              <button
                key={t}
                type="button"
                onMouseEnter={() => { setPaused(true); setActive(i); }}
                onFocus={() => { setPaused(true); setActive(i); }}
                onClick={() => setActive(i)}
                className="relative flex flex-col items-center text-center focus:outline-none"
              >
                <span
                  className={`relative z-10 grid place-items-center w-16 h-16 rounded-full border transition-all duration-500 ${
                    on
                      ? "bg-[hsl(var(--brand-accent))] border-[hsl(var(--brand-accent-soft))] text-white scale-110 kn-glow"
                      : done
                        ? "bg-[hsl(var(--ink))] border-[hsl(var(--brand-accent-soft))]/60 text-[hsl(var(--brand-accent-soft))]"
                        : "bg-[hsl(var(--ink))] border-white/15 text-white/50"
                  }`}
                >
                  <Icon size={24} strokeWidth={1.8} />
                </span>
                <span className={`mt-5 font-display font-semibold text-[16px] lg:text-[19px] leading-tight transition-colors duration-500 ${on ? "text-white" : "text-white/50"}`}>
                  {t}
                </span>
              </button>
            );
          })}
        </div>

        {/* active caption */}
        <div className="mt-10 h-8 text-center">
          <p key={active} className="kn-row-in text-[15px] lg:text-[16px] text-white/70">{stages[active].d}</p>
        </div>
      </div>
    </div>
  );
}

function HowWeDoIt() {
  const steps = [
    { t: "Send Your Census", d: "A spreadsheet is all we need to get started." },
    { t: "See Something New", d: "Fresh ideas priced with real rates, back fast." },
    { t: "We Run The Rest", d: "Enrollment, renewals, and the day-to-day. Handled." },
  ];
  return (
    <section id="how" className="relative overflow-hidden bg-[hsl(var(--ink))] text-white py-20 lg:py-32">
      <div className="relative mx-auto max-w-[1320px] px-6 lg:px-10">
        <SectionIntro
          dark
          label="How We Do It"
          className="mb-14 lg:mb-20"
          title={<>Easy to start. <span className="text-[hsl(var(--brand-accent-soft))]">Handled from there.</span></>}
        />
        <div>
          <div className="grid md:grid-cols-3 gap-y-10 md:gap-x-10 text-center">
            {steps.map((s, i) => (
              <Reveal key={s.t} delay={i * 80}>
                <div className={`flex flex-col items-center px-4 ${i > 0 ? "md:border-l md:border-white/15" : ""}`}>
                  <div className="font-display font-semibold text-[44px] lg:text-[56px] leading-none tabular-nums text-[hsl(var(--brand-accent-soft))]">
                    0{i + 1}
                  </div>
                  <h3 className={`${H3} mt-5 text-[22px] lg:text-[25px]`}>{s.t}</h3>
                  <p className="mt-3 text-[14px] leading-[1.7] text-white/60 max-w-[20rem]">{s.d}</p>
                </div>
              </Reveal>
            ))}
          </div>
        </div>

        <YearRoundLoop />
      </div>
    </section>
  );
}

/* ── options ───────────────────────────────────────────────────────── */

function Options() {
  const top: [React.ComponentType<any>, string][] = [
    [Stethoscope, "Medical"],
    [Smile, "Dental"],
    [Eye, "Vision"],
  ];
  // Everything else, A–Z.
  const rest: [React.ComponentType<any>, string][] = ([
    [Bandage, "Accident"],
    [Ribbon, "Cancer"],
    [RefreshCw, "COBRA"],
    [HeartPulse, "Critical Illness"],
    [Accessibility, "Disability"],
    [Wallet, "FSA"],
    [ConciergeBell, "Health Concierge"],
    [Hospital, "Hospital Indemnity"],
    [Briefcase, "HR Services"],
    [Receipt, "HRA"],
    [PiggyBank, "HSA"],
    [ShieldCheck, "Life"],
    [BadgePlus, "Supplemental Health"],
    [Video, "Telehealth"],
    [Leaf, "Wellness"],
  ] as [React.ComponentType<any>, string][]).sort((a, b) => a[1].localeCompare(b[1], "en", { sensitivity: "base" }));

  return (
    <section id="what" className="bg-white py-20 lg:py-32">
      <div className="mx-auto max-w-[1320px] px-6 lg:px-10">
        <SectionIntro
          label="What We Do"
          title={<>Your benefits program,<br className="hidden md:block" />{" "}<span style={{ color: "hsl(var(--brand-accent))" }}>built and run for you.</span></>}
          sub="Every line of coverage your employees expect, plus programs we have built with top carriers, TPAs and providers that most brokers simply can't offer."
        />
      </div>
      <div className="mx-auto max-w-[1320px] px-6 lg:px-10 mt-12 lg:mt-16">
        {/* the big three */}
        <div className="grid grid-cols-3 gap-3 lg:gap-4">
          {top.map(([Icon, t], i) => (
            <Reveal key={t} delay={i * 80}>
              <div className="kn-tile group h-full flex flex-col items-center justify-center gap-4 rounded-[14px] bg-[hsl(var(--ink))] text-white px-4 py-8 lg:py-12 transition-all duration-300 hover:-translate-y-1 hover:shadow-xl">
                <div className="kn-tile-icon grid place-items-center w-14 h-14 lg:w-16 lg:h-16 rounded-[14px] bg-white/10 text-[hsl(var(--brand-accent-soft))] group-hover:bg-[hsl(var(--brand-accent))] group-hover:text-white">
                  <Icon size={28} strokeWidth={1.8} />
                </div>
                <div className={`${H3} text-[18px] lg:text-[24px]`}>{t}</div>
              </div>
            </Reveal>
          ))}
        </div>
        {/* everything else */}
        <div className="mt-3 lg:mt-4 grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3 lg:gap-4">
          {rest.map(([Icon, t], i) => (
            <Reveal key={t} delay={(i % 5) * 50}>
              <div className="kn-tile group h-full flex items-center gap-3.5 rounded-[12px] border border-border bg-white px-4 py-4 lg:py-5 transition-all duration-300 hover:-translate-y-1 hover:shadow-md hover:border-[hsl(var(--brand-accent))]/40">
                <div className="kn-tile-icon grid shrink-0 place-items-center w-10 h-10 rounded-[10px] bg-[hsl(var(--brand-accent))]/10 text-[hsl(var(--brand-accent))] group-hover:bg-[hsl(var(--brand-accent))] group-hover:text-white">
                  <Icon size={19} strokeWidth={1.9} />
                </div>
                <div className={`${H3} text-[14.5px] lg:text-[15.5px] leading-tight`}>{t}</div>
              </div>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  );
}

/* ── BenSync: the platform, shown as tabbed animated mockups ────────
   Skeleton data only. Tabs auto-advance; hover or click to hold. */

const ACC = "hsl(var(--brand-accent))";
const ACC_SOFT = "hsl(var(--brand-accent-soft))";

function Line({ w, h = 6, d = 0, className = "" }: { w: string; h?: number; d?: number; className?: string }) {
  return (
    <span className={`kn-row-in block ${className}`} style={{ width: w, animationDelay: `${d}ms` }}>
      <span className="kn-skel block rounded-full" style={{ height: h }} />
    </span>
  );
}

function MockQuote() {
  const cols = [
    { name: "Lower Cost", bar: 46, tone: "bg-muted" },
    { name: "Balanced", bar: 64, tone: "bg-[hsl(var(--brand-accent))]/15", star: true },
    { name: "Richer Benefits", bar: 82, tone: "bg-muted" },
  ];
  return (
    <div className="h-full flex flex-col">
      <div className="flex items-center justify-between">
        <div>
          <div className="font-display font-semibold text-[15px]">Proposal</div>
          <Line w="110px" className="mt-2" />
        </div>
        <span className="kn-pop inline-flex items-center gap-1.5 rounded-full bg-[hsl(var(--brand-accent))] px-3 py-1 text-[10.5px] font-bold text-white" style={{ animationDelay: "1200ms" }}>
          <Check size={11} strokeWidth={3} /> Proposal Ready
        </span>
      </div>
      <div className="mt-5 grid grid-cols-3 gap-3 flex-1">
        {cols.map((c, i) => (
          <div key={c.name} className={`kn-row-in relative flex flex-col rounded-[10px] border bg-white p-3.5 ${c.star ? "border-[hsl(var(--brand-accent))] shadow-md" : "border-border"}`} style={{ animationDelay: `${150 + i * 140}ms` }}>
            {c.star && <span className="absolute -top-2.5 left-1/2 -translate-x-1/2 rounded-full bg-[hsl(var(--brand-accent))] px-2 py-0.5 text-[8.5px] font-bold text-white whitespace-nowrap">Recommended</span>}
            <div className="text-[11px] font-bold">{c.name}</div>
            <div className="mt-4 space-y-3">
              {[0, 1, 2, 3].map((k) => (
                <div key={k} className="flex items-center justify-between gap-2">
                  <Line w="42%" h={5} d={300 + i * 140 + k * 60} />
                  <Line w="26%" h={5} d={340 + i * 140 + k * 60} />
                </div>
              ))}
            </div>
            <div className="kn-row-in mt-4 font-display font-semibold text-[18px] tabular-nums" style={{ animationDelay: `${700 + i * 140}ms` }}>
              <span className="text-muted-foreground/60">$</span><span className="inline-block align-middle ml-1 w-14"><span className="kn-skel block h-3 rounded-full" /></span>
            </div>
            <div className={`mt-auto rounded-md ${c.tone} h-12 flex items-end p-1.5`}>
              <div className="w-full rounded-[4px] transition-[height] duration-1000 ease-out" style={{ height: `${c.bar}%`, background: c.star ? ACC : "hsl(210 20% 80%)" }} />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function MockAI() {
  return (
    <div className="h-full flex flex-col">
      <div className="flex items-center gap-2.5">
        <span className="grid place-items-center w-8 h-8 rounded-full bg-[hsl(var(--brand-accent))] text-white"><Sparkles size={15} /></span>
        <div className="font-display font-semibold text-[15px]">AI Assistant</div>
      </div>
      <div className="mt-5 flex-1 space-y-3">
        <div className="kn-row-in ml-auto max-w-[70%] rounded-[12px] rounded-br-[4px] bg-[hsl(var(--ink))] px-3.5 py-2.5 text-[11.5px] text-white" style={{ animationDelay: "150ms" }}>
          Which plan fits a team with young families?
        </div>
        <div className="kn-row-in max-w-[78%] rounded-[12px] rounded-bl-[4px] border border-border bg-white px-3.5 py-3 space-y-2" style={{ animationDelay: "700ms" }}>
          <Line w="92%" d={900} /><Line w="84%" d={1050} /><Line w="66%" d={1200} />
          <div className="kn-pop mt-2 inline-flex items-center gap-1 rounded-full bg-[hsl(var(--brand-accent))]/10 px-2 py-0.5 text-[9.5px] font-bold text-[hsl(var(--brand-accent))]" style={{ animationDelay: "1500ms" }}>
            <Sparkles size={9} /> Balanced Plan
          </div>
        </div>
      </div>
      <div className="mt-3 flex flex-wrap gap-2">
        {["Compare Deductibles", "Draft Employee Email", "Explain HSA"].map((t, i) => (
          <span key={t} className="kn-row-in rounded-full border border-border bg-white px-3 py-1 text-[10px] font-semibold text-muted-foreground" style={{ animationDelay: `${1700 + i * 120}ms` }}>{t}</span>
        ))}
      </div>
      <div className="mt-3 flex items-center gap-2 rounded-full border border-border bg-white pl-4 pr-1.5 py-1.5">
        <span className="flex-1 text-[11px] text-muted-foreground">Ask anything about your plans…</span>
        <span className="grid place-items-center w-7 h-7 rounded-full bg-[hsl(var(--brand-accent))] text-white"><Send size={12} /></span>
      </div>
    </div>
  );
}

function MockSite() {
  return (
    <div className="h-full flex flex-col rounded-[10px] border border-border bg-white overflow-hidden">
      <div className="flex items-center justify-between px-4 py-2.5 border-b border-border">
        <div className="flex items-center gap-2"><span className="w-5 h-5 rounded bg-[hsl(var(--ink))]" /><Line w="70px" h={5} /></div>
        <span className="rounded-md bg-[hsl(var(--brand-accent))] px-2.5 py-1 text-[9.5px] font-bold text-white">Enroll Now</span>
      </div>
      <div className="kn-row-in px-5 py-6 text-white" style={{ background: "linear-gradient(120deg, hsl(var(--ink)), hsl(var(--brand-accent)))", animationDelay: "100ms" }}>
        <div className="font-display font-semibold text-[18px]">Your 2027 Benefits</div>
        <div className="mt-2 h-1.5 w-40 rounded-full bg-white/30" />
      </div>
      <div className="p-4 grid grid-cols-3 gap-2.5 flex-1">
        {[[Stethoscope, "Medical"], [Smile, "Dental"], [Eye, "Vision"], [PiggyBank, "HSA"], [ShieldCheck, "Life"], [Video, "Telehealth"]].map(([I, t]: any, i) => (
          <div key={t} className="kn-row-in rounded-[8px] border border-border p-2.5 flex flex-col items-start gap-1.5" style={{ animationDelay: `${300 + i * 90}ms` }}>
            <span className="grid place-items-center w-6 h-6 rounded-md bg-[hsl(var(--brand-accent))]/10 text-[hsl(var(--brand-accent))]"><I size={12} /></span>
            <span className="text-[10.5px] font-bold">{t}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

function MockFlyers() {
  const cards = [
    { r: -9, x: -120, y: 14, label: "Open Enrollment" },
    { r: 0, x: 0, y: 0, label: "Benefits Guide" },
    { r: 9, x: 120, y: 14, label: "HSA 101" },
  ];
  return (
    <div className="relative h-full grid place-items-center">
      {cards.map((c, i) => (
        <div key={c.label} className="absolute w-[34%] max-w-[190px] aspect-[3/4]" style={{ transform: `translateX(${c.x}%) translateY(${c.y}px) rotate(${c.r}deg)`, zIndex: i === 1 ? 2 : 1 }}>
        <div className="kn-row-in h-full rounded-[10px] border border-border bg-white shadow-lg overflow-hidden" style={{ animationDelay: `${150 + i * 160}ms` }}>
          <div className="h-[38%] p-3 flex items-end text-white" style={{ background: i === 1 ? `linear-gradient(140deg, hsl(var(--ink)), ${ACC})` : "hsl(var(--ink))" }}>
            <span className="font-display font-semibold text-[12px] leading-tight">{c.label}</span>
          </div>
          <div className="p-3 space-y-1.5">
            <Line w="90%" h={4} /><Line w="76%" h={4} /><Line w="84%" h={4} /><Line w="60%" h={4} />
            <div className="pt-2 grid grid-cols-2 gap-1.5"><span className="h-6 rounded bg-muted" /><span className="h-6 rounded bg-muted" /></div>
          </div>
        </div>
        </div>
      ))}
      <span className="kn-pop absolute bottom-2 right-2 inline-flex items-center gap-1.5 rounded-full bg-[hsl(var(--ink))] px-3 py-1.5 text-[10.5px] font-bold text-white" style={{ animationDelay: "900ms", zIndex: 3 }}>
        <Download size={11} /> Export PDF
      </span>
    </div>
  );
}

function MockRenewal() {
  const bars = [
    { t: "Current", v: 62, c: "hsl(210 20% 78%)" },
    { t: "Renewal Offer", v: 90, c: "hsl(4 70% 62%)" },
    { t: "Kennion Option", v: 55, c: ACC },
  ];
  const [go, setGo] = useState(false);
  useEffect(() => { const t = setTimeout(() => setGo(true), 250); return () => clearTimeout(t); }, []);
  return (
    <div className="h-full flex flex-col">
      <div className="flex items-center justify-between">
        <div className="font-display font-semibold text-[15px]">Renewal Review</div>
        <span className="inline-flex items-center gap-1.5 rounded-full bg-muted px-3 py-1 text-[10.5px] font-bold text-muted-foreground"><Timer size={11} /> Ready In Days</span>
      </div>
      <div className="mt-6 flex-1 grid grid-cols-3 gap-5 items-end px-2">
        {bars.map((b, i) => (
          <div key={b.t} className="h-full flex flex-col justify-end items-center gap-2">
            <div className="w-full max-w-[90px] rounded-t-[8px] transition-[height] duration-[1100ms] ease-out" style={{ height: go ? `${b.v}%` : "4%", background: b.c, transitionDelay: `${i * 180}ms` }} />
            <span className="text-[10.5px] font-bold text-center">{b.t}</span>
          </div>
        ))}
      </div>
      <div className="kn-pop mt-4 self-center inline-flex items-center gap-1.5 rounded-full bg-[hsl(var(--brand-accent))]/10 px-3 py-1.5 text-[11px] font-bold text-[hsl(var(--brand-accent))]" style={{ animationDelay: "1300ms" }}>
        <Check size={12} strokeWidth={3} /> Better Option Found
      </div>
    </div>
  );
}

function MockDocs() {
  const files = ["Summary Of Benefits", "Plan Documents", "Employee Guide", "Carrier Contracts", "Compliance Notices"];
  return (
    <div className="h-full flex flex-col">
      <div className="flex items-center gap-2 rounded-full border border-border bg-white px-3.5 py-2">
        <Search size={13} className="text-muted-foreground" />
        <span className="text-[11px] text-muted-foreground">Search documents</span>
      </div>
      <div className="mt-4 flex-1 rounded-[10px] border border-border bg-white overflow-hidden">
        {files.map((f, i) => (
          <div key={f} className="kn-row-in flex items-center gap-3 border-b border-border last:border-b-0 px-3.5 py-2.5" style={{ animationDelay: `${150 + i * 110}ms` }}>
            <span className="grid place-items-center w-7 h-7 rounded-md bg-[hsl(var(--brand-accent))]/10 text-[hsl(var(--brand-accent))]"><FileText size={13} /></span>
            <span className="flex-1 text-[11.5px] font-semibold">{f}</span>
            <Line w="44px" h={5} d={300 + i * 110} />
          </div>
        ))}
      </div>
      <div className="kn-row-in mt-3 rounded-[10px] border border-dashed border-[hsl(var(--brand-accent))]/40 bg-[hsl(var(--brand-accent))]/[0.04] px-3.5 py-2.5" style={{ animationDelay: "800ms" }}>
        <div className="flex items-center justify-between text-[10.5px] font-semibold"><span>Uploading 2027 Rate Sheet</span><span className="text-[hsl(var(--brand-accent))]">Synced</span></div>
        <div className="mt-2 h-1.5 rounded-full bg-muted overflow-hidden"><div className="h-full rounded-full bg-[hsl(var(--brand-accent))] kn-fill" /></div>
      </div>
    </div>
  );
}

const BENSYNC_FEATURES = [
  { Icon: Calculator, t: "Quote & Propose", d: "Real options and polished proposals, back fast.", Mock: MockQuote },
  { Icon: Bot, t: "AI Assistant", d: "A personal assistant that knows your plans.", Mock: MockAI },
  { Icon: Globe, t: "Employee Websites", d: "A custom benefits site for every client.", Mock: MockSite },
  { Icon: Presentation, t: "Flyers & Presentations", d: "Branded materials, built in a click.", Mock: MockFlyers },
  { Icon: Zap, t: "Fast Renewals", d: "Renewals reviewed and compared in days.", Mock: MockRenewal },
  { Icon: FolderOpen, t: "Document Hub", d: "Every document, one place, always current.", Mock: MockDocs },
];
const BENSYNC_MS = 5200;

function BenSync() {
  const [ref, seen] = useInView(0.25);
  const [active, setActive] = useState(0);
  const [held, setHeld] = useState(false);
  const reduced = typeof window !== "undefined" && window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
  useEffect(() => {
    if (!seen || held || reduced) return;
    const t = setTimeout(() => setActive((a) => (a + 1) % BENSYNC_FEATURES.length), BENSYNC_MS);
    return () => clearTimeout(t);
  }, [seen, held, active, reduced]);
  const F = BENSYNC_FEATURES[active];

  return (
    <section id="bensync" className="relative overflow-hidden py-20 lg:py-32">
      <div aria-hidden="true" className="pointer-events-none absolute left-1/2 top-[38%] -translate-x-1/2 w-[900px] h-[600px] rounded-full opacity-60 blur-3xl" style={{ background: `radial-gradient(closest-side, hsl(var(--brand-accent) / .16), transparent)` }} />
      <div className="relative mx-auto max-w-[1320px] px-6 lg:px-10">
        <SectionIntro
          label="BenSync"
          className="mb-12 lg:mb-16"
          title={<>Meet BenSync.<br className="hidden md:block" />{" "}<span style={{ color: ACC }}>The platform behind it all.</span></>}
          sub="The system we built to quote faster, present better and support your team all year."
        />

        <div ref={ref} onMouseEnter={() => setHeld(true)} onMouseLeave={() => setHeld(false)}>
          {/* tabs */}
          <div className="-mx-6 px-6 lg:mx-0 lg:px-0 overflow-x-auto [scrollbar-width:none]">
            <div className="grid grid-flow-col auto-cols-[minmax(150px,1fr)] lg:grid-cols-6 gap-2 min-w-max lg:min-w-0" role="tablist">
              {BENSYNC_FEATURES.map(({ Icon, t }, i) => {
                const on = i === active;
                return (
                  <button
                    key={t}
                    type="button"
                    role="tab"
                    aria-selected={on}
                    onClick={() => setActive(i)}
                    className={`relative overflow-hidden flex items-center gap-2.5 rounded-[10px] border px-3.5 py-3 text-left transition-all duration-300 ${on ? "bg-white border-[hsl(var(--brand-accent))]/40 shadow-md" : "bg-white/60 border-border hover:bg-white"}`}
                  >
                    <span className={`grid shrink-0 place-items-center w-8 h-8 rounded-[8px] transition-colors ${on ? "bg-[hsl(var(--brand-accent))] text-white" : "bg-[hsl(var(--brand-accent))]/10 text-[hsl(var(--brand-accent))]"}`}>
                      <Icon size={16} strokeWidth={1.9} />
                    </span>
                    <span className={`text-[13px] font-semibold leading-tight ${on ? "text-foreground" : "text-muted-foreground"}`}>{t}</span>
                    {on && !reduced && (
                      <span key={`${active}-${held}`} className="absolute left-0 bottom-0 h-[3px] bg-[hsl(var(--brand-accent))] kn-progress" style={{ animationDuration: `${BENSYNC_MS}ms`, animationPlayState: held || !seen ? "paused" : "running" }} />
                    )}
                  </button>
                );
              })}
            </div>
          </div>

          {/* stage */}
          <div className="mt-5 grid lg:grid-cols-12 gap-6 lg:gap-10 items-center">
            <div className="lg:col-span-4 order-2 lg:order-1">
              <div key={active} className="kn-row-in">
                <h3 className={`${H3} text-[26px] lg:text-[34px] leading-[1.1]`}>{F.t}</h3>
                <p className="mt-4 text-[16px] leading-[1.6] text-muted-foreground max-w-[22rem]">{F.d}</p>
                <a href={QUOTE_URL} className="kn-link mt-7 inline-block text-[14px] font-semibold text-foreground">See It With Your Group</a>
              </div>
            </div>
            <div className="lg:col-span-8 order-1 lg:order-2">
              <div className="rounded-[14px] border border-border bg-white shadow-xl overflow-hidden">
                <div className="flex items-center gap-3 px-4 py-2.5 border-b border-border bg-muted/60">
                  <div className="flex gap-1.5">
                    <span className="w-2.5 h-2.5 rounded-full bg-[#ff5f57]" />
                    <span className="w-2.5 h-2.5 rounded-full bg-[#febc2e]" />
                    <span className="w-2.5 h-2.5 rounded-full bg-[#28c840]" />
                  </div>
                  <div className="mx-auto flex items-center gap-1.5 rounded-md bg-white border border-border px-3 py-1 text-[10.5px] font-semibold text-muted-foreground">
                    <span className="w-2 h-2 rounded-sm" style={{ background: ACC }} /> BenSync
                  </div>
                  <span className="w-10" />
                </div>
                <div className="flex h-[360px] sm:h-[400px] lg:h-[430px]">
                  <div className="hidden sm:flex w-[52px] shrink-0 flex-col items-center gap-2 bg-[hsl(var(--ink))] py-4">
                    <span className="grid place-items-center w-7 h-7 rounded-md text-white text-[10px] font-bold mb-2" style={{ background: ACC }}>B</span>
                    {BENSYNC_FEATURES.map(({ Icon }, i) => (
                      <span key={i} className={`grid place-items-center w-8 h-8 rounded-md transition-colors ${i === active ? "bg-white/12 text-white" : "text-white/40"}`} style={i === active ? { color: ACC_SOFT, background: "rgba(255,255,255,.08)" } : undefined}>
                        <Icon size={15} />
                      </span>
                    ))}
                  </div>
                  <div key={active} className="flex-1 min-w-0 p-4 sm:p-6 bg-[hsl(210_30%_98%)]">
                    <F.Mock />
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

/* ── why kennion ───────────────────────────────────────────────────── */

const FOUNDED = 1985;

function YearsInBusiness() {
  const [ref, seen] = useInView(0.4);
  const v = useCountUp(new Date().getFullYear() - FOUNDED, seen, 1300);
  return (
    <div ref={ref} className="font-display font-semibold text-[84px] lg:text-[120px] leading-[0.9] tracking-[-0.01em] tabular-nums">
      {v}
    </div>
  );
}

function WhyKennion() {
  const rows = [
    { t: "Advisors who push back", d: "You get a recommendation, not a menu. If an option is not worth your money, we say so." },
    { t: "More of the market", d: "Carriers and structures most employers are never shown, priced and compared for you." },
    { t: "Less work for your team", d: "Online enrollment and digital tools take the paperwork off HR's desk." },
  ];
  return (
    <section id="why" className="relative overflow-hidden py-20 lg:py-32">
      {/* faded hedcut portraits of Hal and Hunter Shepherd behind the story */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute right-[-60px] top-[150px] lg:right-auto lg:top-auto lg:left-[max(0px,calc(50%-720px))] lg:bottom-0 flex items-end opacity-[.14] lg:opacity-[.22] [mask-image:linear-gradient(to_top,transparent,#000_20%)]"
      >
        <div className="flex items-end [mask-image:linear-gradient(to_right,#000_55%,transparent_96%)]">
          <img src="/team/hal-shepherd.webp" alt="" className="h-[330px] lg:h-[560px] w-auto" loading="lazy" />
          <img src="/team/hunter-shepherd.webp" alt="" className="-ml-14 lg:-ml-28 h-[330px] lg:h-[560px] w-auto" loading="lazy" />
        </div>
      </div>
      <div className="relative mx-auto max-w-[1320px] px-6 lg:px-10">
        <SectionIntro
          label="Why Kennion"
          className="mb-14 lg:mb-20"
          title={<>Family-led. <span style={{ color: "hsl(var(--brand-accent))" }}>Built to last.</span></>}
        />
        <div>
          <div className="grid lg:grid-cols-12 gap-y-12 lg:gap-x-10 items-start">
            <div className="lg:col-span-4">
              <YearsInBusiness />
              <div className="mt-4 text-[15px] font-medium text-foreground">
                Years in business, since {FOUNDED}
              </div>
              <p className="mt-3 text-[13.5px] text-muted-foreground max-w-[19rem] leading-[1.6]">
                Hal Shepherd founded W. H. Shepherd Companies in {FOUNDED}, which later became
                Kennion. Today Hunter Shepherd, the second generation of the family, leads the team.
              </p>
              <div className="mt-6 inline-flex items-center gap-2 text-[12.5px] font-semibold text-foreground/70">
                <span className="h-px w-6 bg-foreground/30" /> Hal &amp; Hunter Shepherd
              </div>
            </div>
            <div className="lg:col-span-8">
              {rows.map((r) => (
                <div key={r.t} className="grid grid-cols-1 lg:grid-cols-[18rem_1fr] gap-x-8 items-baseline border-t border-border py-6 lg:py-7">
                  <h3 className={`${H3} text-[20px] lg:text-[23px]`}>{r.t}</h3>
                  <p className="mt-2 lg:mt-0 text-[14px] leading-[1.7] text-muted-foreground">{r.d}</p>
                </div>
              ))}
              <div className="border-t border-border" />
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

/* ── CTA + contact ─────────────────────────────────────────────────── */

const CONTACT_ROLES = ["Employer", "Member", "Client"];

function ContactModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const [role, setRole] = useState("Employer");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [message, setMessage] = useState("");
  const [state, setState] = useState<"idle" | "sending" | "sent" | "error">("idle");

  useEffect(() => {
    if (!open) return;
    const esc = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    document.addEventListener("keydown", esc);
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", esc);
      document.body.style.overflow = "";
    };
  }, [open, onClose]);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim() || !email.trim() || !message.trim()) return;
    setState("sending");
    try {
      const res = await fetch("/api/contact", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name,
          company: role,
          email,
          employees: "",
          message: `[${role} inquiry] ${message}`,
          website: "",
        }),
      });
      if (!res.ok) throw new Error();
      setState("sent");
    } catch {
      setState("error");
    }
  }

  const fieldCls = "w-full h-11 border-0 border-b border-border bg-transparent px-0 text-[15px] text-foreground placeholder:text-muted-foreground/50 focus:outline-none focus:border-primary transition-colors";

  if (!open) return null;

  const body = state === "sent" ? (
    <div className="p-7 sm:p-9">
      <div className="kn-caps" style={{ color: "hsl(var(--brand-accent))" }}>Message sent</div>
      <h3 className={`${H3} mt-3 text-[24px]`}>Thank you.</h3>
      <p className="mt-3 text-[14px] leading-[1.7] text-muted-foreground">
        The right person on our team will get back to you shortly.
      </p>
      <button onClick={onClose} className="mt-7 inline-flex items-center justify-center rounded-md bg-primary text-primary-foreground px-6 py-3 text-[13.5px] font-semibold hover:bg-[hsl(var(--primary-hover))] transition-colors">
        Done
      </button>
    </div>
  ) : (
    <form onSubmit={submit} className="p-7 sm:p-9">
      <div className="space-y-6">
        <div>
          <label htmlFor="kn-role" className="kn-caps text-muted-foreground block">I am a...</label>
          <div className="mt-1 flex gap-2">
            {CONTACT_ROLES.map((r) => (
              <button
                key={r}
                type="button"
                onClick={() => setRole(r)}
                className={`px-4 py-2 text-[13.5px] font-semibold border transition-colors ${role === r ? "bg-primary text-primary-foreground border-primary" : "border-border text-muted-foreground hover:text-foreground"}`}
              >
                {r}
              </button>
            ))}
          </div>
        </div>
        <div>
          <label htmlFor="kn-name" className="kn-caps text-muted-foreground block">Name</label>
          <input id="kn-name" value={name} onChange={(e) => setName(e.target.value)} required placeholder="Jordan Smith" className={fieldCls} />
        </div>
        <div>
          <label htmlFor="kn-email" className="kn-caps text-muted-foreground block">Email</label>
          <input id="kn-email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} required placeholder="you@company.com" className={fieldCls} />
        </div>
        <div>
          <label htmlFor="kn-msg" className="kn-caps text-muted-foreground block">How can we help?</label>
          <textarea id="kn-msg" rows={3} value={message} onChange={(e) => setMessage(e.target.value)} required placeholder="Tell us what you need." className={`${fieldCls} h-auto py-2 resize-none`} />
        </div>
      </div>
      <button
        type="submit"
        disabled={state === "sending"}
        className="mt-7 w-full inline-flex items-center justify-center gap-3 rounded-md bg-primary text-primary-foreground px-6 py-3.5 text-[13px] font-semibold transition-colors hover:bg-[hsl(var(--primary-hover))] disabled:opacity-60"
      >
        {state === "sending" ? "Sending..." : "Send Message"}
      </button>
      {state === "error" && (
        <p className="mt-3 text-[12.5px] text-destructive">
          Something went wrong. Please try again in a moment.
        </p>
      )}
    </form>
  );

  return (
    <div className="fixed inset-0 z-[100] flex items-end sm:items-center justify-center bg-black/60 backdrop-blur-sm sm:p-4" onClick={onClose}>
      <div
        className="kn-landing relative w-full sm:max-w-md max-h-[92vh] overflow-y-auto border-t sm:border border-border bg-[hsl(var(--background))] text-foreground shadow-2xl"
        role="dialog"
        aria-modal="true"
        aria-label="Contact Kennion"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-7 sm:px-9 pt-6 pb-4 border-b border-border">
          <span className="kn-caps text-muted-foreground">Contact Us</span>
          <button onClick={onClose} aria-label="Close" className="w-9 h-9 -mr-2 grid place-items-center text-muted-foreground hover:text-foreground">
            <X size={18} />
          </button>
        </div>
        {body}
      </div>
    </div>
  );
}

function FinalCTA({ onContact }: { onContact: () => void }) {
  return (
    <section id="contact" className="relative overflow-hidden bg-[hsl(var(--navy2))] text-white py-20 lg:py-28">
      <div className="relative mx-auto max-w-[1320px] px-6 lg:px-10 grid lg:grid-cols-12 gap-y-12 lg:gap-x-16 items-center">
        <div className="lg:col-span-7">
        <span className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/[0.06] px-3.5 py-1.5 text-[12.5px] font-semibold text-[hsl(var(--brand-accent-soft))]">
          <span className="h-1.5 w-1.5 rounded-full bg-[hsl(var(--brand-accent-soft))]" />
          Get Started
        </span>
        <h2 className="mt-6 font-display font-bold tracking-[-0.01em] leading-[0.98] text-[clamp(2.4rem,6.5vw,4.75rem)] max-w-[15em]">
          See what your group is missing.
        </h2>
        <p className="mt-7 text-[16px] leading-[1.65] text-white/70 max-w-[34rem]">
          Send us your census and we will come back with something new. It costs
          nothing to look. Just have a question?{" "}
          <button onClick={onContact} className="kn-link text-white font-medium">Contact Us</button> and
          the right person will get back to you.
        </p>
        <div className="mt-10">
          <SolidButton href={QUOTE_URL} tone="paper">Get A Quote</SolidButton>
        </div>

        </div>
        <div className="hidden lg:block lg:col-span-5">
          <div className="kn-photo">
            <img src="https://images.unsplash.com/photo-1600880292203-757bb62b4baf?w=1200&q=70&auto=format&fit=crop" alt="Advisors working with a client" className="w-full aspect-[4/3] object-cover" loading="lazy" />
          </div>
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
          <button onClick={onClose} className="text-[13px] font-semibold rounded-md bg-primary text-primary-foreground px-5 py-2.5 hover:bg-[hsl(var(--primary-hover))] transition-colors">
            Close
          </button>
        </div>
      </div>
    </div>
  );
}

/* ── footer ────────────────────────────────────────────────────────── */

function Footer({ onContact }: { onContact: () => void }) {
  const year = new Date().getFullYear();
  const [legalOpen, setLegalOpen] = useState<string | null>(null);
  return (
    <footer className="bg-[hsl(var(--ink))] text-white pt-16 lg:pt-20 overflow-hidden">
      <div className="mx-auto max-w-[1320px] px-6 lg:px-10">
        <div className="grid sm:grid-cols-2 md:grid-cols-[1.6fr_1fr_1fr] gap-x-10 gap-y-12 pb-14 lg:pb-16">
          <div className="sm:col-span-2 md:col-span-1">
            <img src="/kennion-logo-white.svg" alt="Kennion Benefit Advisors" className="h-7 w-auto" />
            <div className="kn-caps text-white/40 mt-3">The Modern Benefits Agency</div>
            <a href={QUOTE_URL}
               className="mt-8 inline-flex items-center gap-2.5 text-[13px] font-semibold rounded-md bg-primary text-primary-foreground px-5 py-3 hover:bg-[hsl(var(--primary-hover))] transition-colors">
              Get A Quote
              <ArrowRight size={13} strokeWidth={2} />
            </a>
          </div>

          <div>
            <div className="kn-caps text-white/40 mb-5">Company</div>
            <ul className="space-y-3 text-[13.5px] text-white/70">
              <li><a href="#what" className="kn-link-rev hover:text-white transition-colors">What We Do</a></li>
              <li><a href="#how" className="kn-link-rev hover:text-white transition-colors">How We Do It</a></li>
              <li><a href="#bensync" className="kn-link-rev hover:text-white transition-colors">BenSync</a></li>
              <li><a href="#why" className="kn-link-rev hover:text-white transition-colors">Why Kennion</a></li>
            </ul>
          </div>

          <div>
            <div className="kn-caps text-white/40 mb-5">Contact</div>
            <ul className="space-y-3 text-[13.5px] text-white/70">
              <li><a href={QUOTE_URL} className="kn-link-rev hover:text-white transition-colors">Get A Quote</a></li>
              <li><button onClick={onContact} className="kn-link-rev hover:text-white transition-colors">Contact Us</button></li>
            </ul>
          </div>
        </div>

        <img src="/kennion-logo-white.svg" alt="" aria-hidden="true" className="block w-full h-auto opacity-[0.07] mb-10 lg:mb-14 select-none pointer-events-none" />

        <div className="border-t border-white/10 py-6 flex flex-wrap items-center justify-between gap-x-8 gap-y-3 text-[13px] text-white/40">
          <span>© {year} Kennion Benefit Advisors. All rights reserved.</span>
          <span className="hidden lg:inline">2828 Old 280 Court, Vestavia, AL 35243</span>
          <div className="flex items-center gap-6">
            <button onClick={() => setLegalOpen("privacy")} className="kn-link-rev hover:text-white/80 transition-colors">Privacy</button>
            <button onClick={() => setLegalOpen("terms")} className="kn-link-rev hover:text-white/80 transition-colors">Terms</button>
          </div>
        </div>
      </div>

      <LegalModal kind={legalOpen} onClose={() => setLegalOpen(null)} />
    </footer>
  );
}

/* ── root ──────────────────────────────────────────────────────────── */

export default function LandingPage() {
  const [contactOpen, setContactOpen] = useState(false);
  const openContact = () => setContactOpen(true);
  return (
    <div className="kn-landing min-h-screen antialiased">
      <Nav onContact={openContact} />
      <main>
        <Hero />
        <Problem />
        <Options />
        <BenSync />
        <HowWeDoIt />
        <WhyKennion />
        <FinalCTA onContact={openContact} />
      </main>
      <Footer onContact={openContact} />
      <ContactModal open={contactOpen} onClose={() => setContactOpen(false)} />
    </div>
  );
}
