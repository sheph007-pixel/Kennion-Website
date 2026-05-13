// Kennion homepage — drop-in replacement for client/src/pages/landing.tsx
// Single-file: includes all sections, calculator, modals, motion primitives.
//
// REQUIRES (one-time setup in client/index.html <head>):
//   <link rel="preconnect" href="https://fonts.googleapis.com" />
//   <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />
//   <link href="https://fonts.googleapis.com/css2?family=Fraunces:opsz,wght@9..144,400;9..144,500;9..144,600&family=JetBrains+Mono:wght@400;500&display=swap" rel="stylesheet" />
//   <link href="https://assets.calendly.com/assets/external/widget.css" rel="stylesheet" />
//   <script src="https://assets.calendly.com/assets/external/widget.js" async></script>
//
// And add to client/src/index.css:
//   .font-display { font-family: 'Fraunces', Georgia, serif; font-optical-sizing: auto; }
//   .font-display em, .font-display .italic { font-style: italic; }
//   .font-mono { font-family: 'JetBrains Mono', ui-monospace, monospace; }
//   .hairline { box-shadow: 0 0 0 1px hsl(var(--border)); }
//   @keyframes fadein { from { opacity: 0; transform: translateY(2px); } to { opacity: 1; transform: translateY(0); } }
//   @keyframes kn-scan { 0% { transform: translateX(-100%); } 100% { transform: translateX(400%); } }
//   .kn-scan { animation: kn-scan 1.2s linear infinite; }
//   .kn-range { -webkit-appearance: none; appearance: none; height: 4px; background: linear-gradient(to right, hsl(var(--primary)) 0%, hsl(var(--primary)) var(--pct, 0%), hsl(var(--border)) var(--pct, 0%), hsl(var(--border)) 100%); border-radius: 999px; outline: none; cursor: pointer; }
//   .kn-range::-webkit-slider-thumb { -webkit-appearance: none; appearance: none; width: 20px; height: 20px; border-radius: 50%; background: white; border: 2px solid hsl(var(--primary)); box-shadow: 0 2px 8px rgba(0,0,0,.18); cursor: grab; transition: transform .12s ease; }
//   .kn-range::-webkit-slider-thumb:active { transform: scale(1.1); cursor: grabbing; }
//   .kn-range::-moz-range-thumb { width: 20px; height: 20px; border-radius: 50%; background: white; border: 2px solid hsl(var(--primary)); box-shadow: 0 2px 8px rgba(0,0,0,.18); cursor: grab; }
//   .grid-paper { background-image: linear-gradient(to right, rgba(15,30,60,.05) 1px, transparent 1px), linear-gradient(to bottom, rgba(15,30,60,.05) 1px, transparent 1px); background-size: 32px 32px; }

import { useState, useEffect, useRef, useMemo, Fragment } from "react";
import { Link } from "wouter";
import {
  ArrowRight, ChevronRight, ChevronDown, X, Menu, Check, CheckCircle2,
  Play, MapPin, Mail, Calendar, Printer, RotateCcw, Loader2,
  ArrowUpRight,
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
const VIDEO_THUMB_HERO = "https://vumbnail.com/1004137913.jpg";
const VIDEO_THUMB_BENEFITS = "https://vumbnail.com/1060997796.jpg";

// Tiny icon helper for Lucide UMD

// ─────────────────────────────────────────────────────────────────────
// MOTION PRIMITIVES — scroll reveals + animated counters
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

// Animates from 0 to `value` when scrolled into view. Preserves the original
// formatted string (e.g. "$12M+", "85-95%") by extracting the leading numeric
// portion, tweening it, and re-stitching the prefix/suffix on every frame.
function AnimatedNumber({ value, duration = 1600, className = "" }) {
  const [ref, seen] = useInView(0.4);
  const [out, setOut] = useState(value);
  useEffect(() => {
    if (!seen) return;
    const m = String(value).match(/^([^\d-]*)([\d,]+(?:\.\d+)?)(.*)$/);
    if (!m) { setOut(value); return; }
    const [, prefix, numStr, suffix] = m;
    const hasComma = numStr.includes(",");
    const target = parseFloat(numStr.replace(/,/g, ""));
    let raf, start;
    const tick = (t) => {
      if (!start) start = t;
      const p = Math.min(1, (t - start) / duration);
      const eased = 1 - Math.pow(1 - p, 3);
      const cur = Math.round(target * eased);
      const fmt = hasComma ? cur.toLocaleString() : String(cur);
      setOut(prefix + fmt + suffix);
      if (p < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [seen, value, duration]);
  return <span ref={ref} className={className}>{out}</span>;
}


// ─────────────────────────────────────────────────────────────────────
// VIDEO MODAL — preserved from original
// ─────────────────────────────────────────────────────────────────────
function VideoModal({ open, onClose, videoId }) {
  useEffect(() => {
    if (!open) return;
    const handler = (e) => {
      if (typeof e.data !== "string" || !e.origin.includes("vimeo")) return;
      try {
        const data = JSON.parse(e.data);
        if (data.event === "ended" || data.event === "finish") onClose();
      } catch {}
    };
    window.addEventListener("message", handler);
    // Tell the Vimeo player to notify us on end
    const t = setTimeout(() => {
      const iframe = document.querySelector("iframe[data-vimeo-modal]");
      if (iframe?.contentWindow) {
        iframe.contentWindow.postMessage(JSON.stringify({ method: "addEventListener", value: "ended" }), "*");
        iframe.contentWindow.postMessage(JSON.stringify({ method: "addEventListener", value: "finish" }), "*");
      }
    }, 900);
    return () => {
      window.removeEventListener("message", handler);
      clearTimeout(t);
    };
  }, [open, onClose]);

  if (!open) return null;
  // Vimeo URL params: hide branding + author overlay so end screen is cleaner.
  // The 'ended' event handler above closes the modal before recommendation cards have time to appear.
  const src = `https://player.vimeo.com/video/${videoId}?autoplay=1&title=0&byline=0&portrait=0&badge=0&dnt=1`;
  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/70 backdrop-blur-sm" onClick={onClose}>
      <div className="relative w-full max-w-4xl mx-4" onClick={(e) => e.stopPropagation()}>
        <button onClick={onClose} className="absolute -top-10 right-0 text-white hover:text-white/80" aria-label="Close video">
          <X size={20}/>
        </button>
        <div className="relative w-full" style={{ paddingBottom: "56.25%" }}>
          <iframe
            data-vimeo-modal="true"
            src={src}
            className="absolute inset-0 w-full h-full rounded-lg"
            allow="autoplay; fullscreen; picture-in-picture"
            allowFullScreen
          />
        </div>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────
// NAV — cleaner: no floating "Sales Portal" tab
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
    <header className="sticky top-0 z-40 border-b border-border bg-background">
      <div className="mx-auto max-w-7xl px-6 flex items-center justify-between h-16">
        <Link href="/" className="flex items-center gap-2.5">
          <img src={KENNION_LOGO_URL} alt="Kennion Benefit Advisors" className="h-8 w-auto" style={{ mixBlendMode: "multiply" }} />
        </Link>

        <nav className="hidden md:flex items-center gap-7 text-[13.5px] text-muted-foreground">
          <a href="#how-it-works" className="hover:text-foreground">How It Works</a>
          <a href="#program" className="hover:text-foreground">Program</a>
          <a href="#benefits" className="hover:text-foreground">Benefits</a>
          <a href="#contact" className="hover:text-foreground">Contact</a>
        </nav>

        <div className="hidden md:flex items-center gap-1.5">
          {/* Existing client portal — dropdown */}
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
                  <div className="text-[10px] uppercase tracking-[0.16em] font-mono text-muted-foreground">Client Portal</div>
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

          {/* Visual separator between client + prospect actions */}
          <div className="w-px h-5 bg-border mx-2" />

          {/* Sales portal */}
          <Link href="/login" className="text-[13px] text-foreground hover:bg-black/[.04] px-3 py-2 rounded-md transition-colors">Sign In</Link>
          <Link href="/register" className="inline-flex items-center gap-1.5 text-[13.5px] font-medium text-primary-foreground bg-primary hover:opacity-90 px-3.5 py-2 rounded-md shadow-sm transition-opacity">
            Submit Your Group
            <ArrowRight size={14} strokeWidth={2}/>
          </Link>
        </div>

        <button className="md:hidden w-9 h-9 grid place-items-center rounded-md hover:bg-black/5" onClick={() => setOpen(!open)} aria-label="Menu">
          {open ? <X size={18}/> : <Menu size={18}/>}
        </button>
      </div>

      {open && (
        <div className="md:hidden border-t border-border bg-background px-6 py-4 text-sm">
          <a href="#how-it-works" className="block py-2">How It Works</a>
          <a href="#program" className="block py-2">Program</a>
          <a href="#benefits" className="block py-2">Benefits</a>
          <a href="#contact" className="block py-2">Contact</a>

          {/* Prospect actions */}
          <div className="mt-4 pt-4 border-t border-border space-y-2">
            <Link href="/login" className="block text-center text-[14px] font-medium text-foreground border border-border px-4 py-2.5 rounded-md">Sign In</Link>
            <Link href="/register" className="block text-center font-medium text-primary-foreground bg-primary px-4 py-2.5 rounded-md">Submit Your Group</Link>
          </div>

          {/* Client portal */}
          <div className="mt-5 pt-4 border-t border-border">
            <div className="text-[10.5px] uppercase tracking-[0.14em] font-mono text-muted-foreground mb-2">Existing Clients</div>
            <a href="https://go.kennion.com/support" className="block py-2 text-[13.5px] text-muted-foreground">Support</a>
            <a href="http://go.kennion.com/enroll" className="block py-2 text-[13.5px] text-muted-foreground">Enrollment</a>
          </div>
        </div>
      )}
    </header>
  );
}

// ─────────────────────────────────────────────────────────────────────
// HERO — original copy, three layout variants, two treatments (light/dark)
// ─────────────────────────────────────────────────────────────────────
function Hero({ variant, treatment = "light" }) {
  const [videoOpen, setVideoOpen] = useState(false);
  const isDark = treatment === "dark";

  // Tone classes for dark vs light treatment
  const tone = isDark
    ? {
        wrap: "bg-[hsl(215_35%_14%)] text-white",
        head: "text-white",
        muted: "text-white/65",
        eyebrow: "text-white/55",
        rule: "bg-white/40",
        ctaSecondary: "text-white border-white/20 hover:bg-white/10",
        trust: "text-white/65",
        trustIcon: "text-white",
      }
    : {
        wrap: "",
        head: "text-foreground",
        muted: "text-muted-foreground",
        eyebrow: "text-muted-foreground",
        rule: "bg-primary",
        ctaSecondary: "text-foreground border-border hover:bg-black/[.03]",
        trust: "text-muted-foreground",
        trustIcon: "text-primary",
      };

  // Right-hand visuals
  const right =
    variant === "scorecard"  ? <ScorecardCard onPlay={() => setVideoOpen(true)} dark={isDark} /> :
    variant === "comparison" ? <RateComparisonCard dark={isDark} /> :
    <EditorialQuoteCard dark={isDark} />;

  return (
    <section className={`relative overflow-hidden ${tone.wrap}`}>
      {/* Atmospheric background */}
      <div className="absolute inset-0 -z-10">
        {isDark ? (
          <>
            <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,hsl(var(--primary) / 0.45),transparent_60%)] opacity-50" />
            <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_bottom_left,hsl(var(--primary) / 0.18),transparent_55%)]" />
            {/* Faint grid */}
            <div className="absolute inset-0 opacity-[0.08]"
                 style={{ backgroundImage: "linear-gradient(to right, white 1px, transparent 1px), linear-gradient(to bottom, white 1px, transparent 1px)", backgroundSize: "56px 56px" }} />
          </>
        ) : (
          <>
            <div className="absolute inset-x-0 top-0 h-[480px] bg-gradient-to-b from-[hsl(var(--primary) / 0.06)] to-transparent" />
            <div className="absolute right-[-200px] top-[-100px] w-[640px] h-[640px] rounded-full bg-primary/[0.07] blur-3xl" />
            <div className="absolute left-[-160px] bottom-[-160px] w-[420px] h-[420px] rounded-full bg-[hsl(var(--primary) / 0.04)] blur-3xl" />
          </>
        )}
        {/* Subtle grain for premium feel */}
        <svg className="absolute inset-0 w-full h-full opacity-[0.04] mix-blend-overlay" aria-hidden="true">
          <filter id="hero-noise">
            <feTurbulence type="fractalNoise" baseFrequency="0.9" numOctaves="2" stitchTiles="stitch" />
            <feColorMatrix values="0 0 0 0 0   0 0 0 0 0   0 0 0 0 0   0 0 0 1 0" />
          </filter>
          <rect width="100%" height="100%" filter="url(#hero-noise)" />
        </svg>
      </div>

      {/* Subtle grain background only */}

      <div className="mx-auto max-w-7xl px-6 pt-12 pb-24 lg:pt-16 lg:pb-32 grid lg:grid-cols-[1.08fr_0.92fr] gap-x-14 gap-y-14 items-center">
        <div className="relative">
          {/* Side rule — editorial detail */}
          <div className={`hidden lg:block absolute -left-6 top-2 bottom-2 w-px ${tone.rule} opacity-50`} />

          <Reveal>
            <div className={`inline-flex items-center gap-2 text-[11.5px] uppercase tracking-[0.18em] font-medium ${tone.eyebrow}`}>
              <span className={`inline-block w-6 h-px ${tone.rule}`} />
              Kennion Benefit Advisors
            </div>
          </Reveal>

          <Reveal delay={80}>
            <h1 className={`font-display font-[450] mt-7 text-[44px] sm:text-[64px] lg:text-[88px] xl:text-[104px] leading-[0.98] sm:leading-[0.96] tracking-[-0.035em] ${tone.head}`}>
              Better Benefits.<br />
              <span className="italic" style={{ color: isDark ? "white" : "hsl(var(--primary))" }}>Lower Rates.</span>
            </h1>
          </Reveal>

          <Reveal delay={160}>
            <p className={`mt-7 text-[17.5px] leading-[1.55] max-w-[36rem] ${tone.muted}`}>
              Our proprietary underwriting platform analyzes your group's risk profile to unlock exclusive
              benefits programs that deliver premium coverage at significantly lower costs.
            </p>
          </Reveal>

          <Reveal delay={240}>
            <div className="mt-9 flex flex-wrap items-center gap-3">
              <Link href="/register" className="inline-flex items-center gap-1.5 text-[14.5px] font-medium bg-primary text-primary-foreground hover:opacity-90 px-5 py-3 rounded-md shadow-sm transition-opacity">
                Submit Your Group
                <ChevronRight size={15} strokeWidth={2}/>
              </Link>
              <a href="#how-it-works" className={`inline-flex items-center gap-1.5 text-[14.5px] font-medium border px-5 py-3 rounded-md transition-colors ${tone.ctaSecondary}`}>
                Learn How It Works
              </a>
            </div>
          </Reveal>

          <Reveal delay={320}>
            <div className={`mt-12 flex flex-wrap items-center gap-x-7 gap-y-3 text-[12.5px] ${tone.trust}`}>
              <div className="flex items-center gap-2"><CheckCircle2 size={14} className={tone.trustIcon}/>No obligation</div>
              <div className="flex items-center gap-2"><CheckCircle2 size={14} className={tone.trustIcon}/>Free qualification analysis</div>
              <div className="flex items-center gap-2"><CheckCircle2 size={14} className={tone.trustIcon}/>Results in minutes</div>
            </div>
          </Reveal>
        </div>

        <Reveal delay={200} className="relative">
          {right}
        </Reveal>
      </div>

      <VideoModal open={videoOpen} onClose={() => setVideoOpen(false)} videoId="1004137913" />
    </section>
  );
}

// ─────────────────────────────────────────────────────────────────────
// HERO VARIANT CARDS
// ─────────────────────────────────────────────────────────────────────
function ScorecardCard({ onPlay }) {
  // Tier reveal animation
  const [revealed, setRevealed] = useState(false);
  useEffect(() => {
    const t = setTimeout(() => setRevealed(true), 320);
    return () => clearTimeout(t);
  }, []);

  return (
    <div className="relative">
      <div className="absolute -inset-6 -z-10 rounded-[28px] grid-paper opacity-50" />
      <div className="relative rounded-2xl bg-card hairline shadow-[0_24px_60px_-30px_rgba(15,30,60,.35)] overflow-hidden">
        <div className="flex items-center justify-between px-4 py-2.5 border-b border-border bg-muted">
          <div className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-border" />
            <span className="w-2.5 h-2.5 rounded-full bg-border" />
            <span className="w-2.5 h-2.5 rounded-full bg-border" />
          </div>
          <div className="text-[11px] font-mono text-muted-foreground">kennion.com / risk-tier</div>
          <div className="w-12" />
        </div>

        <div className="p-6">
          <div className="flex items-start justify-between gap-3">
            <div>
              <div className="text-[10.5px] uppercase tracking-[0.12em] text-muted-foreground">Risk Classification</div>
              <div className="text-[17px] font-semibold mt-1">Sample Group · 42 employees</div>
            </div>
            <div className={`text-[10.5px] font-mono px-2 py-1 rounded-md transition-colors duration-500 shrink-0 ${revealed ? "bg-emerald-500/15 text-emerald-700" : "bg-muted text-muted-foreground"}`}>
              {revealed ? "QUALIFIED" : "ANALYZING…"}
            </div>
          </div>

          {/* Tier indicator: Standard vs Preferred */}
          <div className="mt-5 grid grid-cols-2 gap-2 p-1.5 rounded-xl bg-muted hairline">
            <div className="px-4 py-4 rounded-lg text-center">
              <div className="text-[10px] font-mono uppercase tracking-[0.14em] text-muted-foreground">Standard</div>
              <div className="font-display font-[450] text-[18px] mt-0.5 text-muted-foreground tracking-[-0.01em]">Risk</div>
            </div>
            <div
              className={`relative px-4 py-4 rounded-lg text-center transition-all duration-700 ${revealed ? "bg-primary text-white shadow-[0_10px_30px_-10px_hsl(var(--primary) / 0.7)]" : "bg-transparent"}`}
              style={{ transform: revealed ? "scale(1)" : "scale(0.96)" }}
            >
              <div className={`text-[10px] font-mono uppercase tracking-[0.14em] ${revealed ? "text-white/80" : "text-muted-foreground"}`}>Preferred</div>
              <div className="font-display font-[450] text-[18px] mt-0.5 tracking-[-0.01em]">Risk</div>
              {revealed && (
                <span className="absolute -top-2 -right-2 w-5 h-5 rounded-full bg-white text-primary grid place-items-center shadow-md">
                  <Check size={12} strokeWidth={3}/>
                </span>
              )}
            </div>
          </div>

          {/* Factor breakdown */}
          <div className="mt-5 space-y-2.5">
            {[
              { l: "Demographics",       v: 92 },
              { l: "Geographic area",    v: 86 },
              { l: "Family composition", v: 91 },
              { l: "Group size",         v: 88 },
            ].map((row, i) => (
              <div key={row.l} className="flex items-center gap-3">
                <div className="w-[140px] text-[12px] text-muted-foreground">{row.l}</div>
                <div className="flex-1 h-1.5 rounded-full bg-border overflow-hidden">
                  <div className="h-full bg-primary" style={{
                    width: revealed ? `${row.v}%` : "0%",
                    transition: `width 1.4s cubic-bezier(.2,.7,.2,1) ${320 + i * 110}ms`,
                  }} />
                </div>
                <div className="w-7 text-right text-[12px] font-mono tabular-nums" style={{ opacity: revealed ? 1 : 0, transition: `opacity .6s ${500 + i * 110}ms` }}>{row.v}</div>
              </div>
            ))}
          </div>

          {/* Eligibility */}
          <div className="mt-5 pt-4 border-t border-border flex items-center gap-2 text-[12.5px]">
            <CheckCircle2 size={15} className="text-emerald-600 shrink-0"/>
            <span>Eligible for Kennion's private benefits program</span>
          </div>
        </div>
      </div>
    </div>
  );
}

function RateComparisonCard() {
  const rows = [
    { plan: "Health Plan A",  market: 612, kennion: 484 },
    { plan: "Health Plan B",  market: 538, kennion: 421 },
    { plan: "Health Plan C",  market: 469, kennion: 372 },
    { plan: "Private Program", market: 592, kennion: 446 },
  ];
  return (
    <div className="relative">
      <div className="absolute -inset-6 -z-10 rounded-[28px] grid-paper opacity-50" />
      <div className="rounded-2xl bg-card hairline shadow-[0_24px_60px_-30px_rgba(15,30,60,.35)] overflow-hidden">
        <div className="flex items-baseline justify-between px-5 py-4 border-b border-border bg-muted">
          <div>
            <div className="text-[10.5px] uppercase tracking-[0.12em] text-muted-foreground">Sample group · 42 employees</div>
            <div className="text-[14px] font-semibold mt-0.5">Monthly EE rate comparison</div>
          </div>
          <div className="text-[11px] font-mono text-muted-foreground">USD / month</div>
        </div>
        <div className="p-5">
          <div className="grid grid-cols-[1fr_auto_auto_auto] gap-x-4 gap-y-3 items-center">
            <div className="text-[11px] uppercase tracking-[0.1em] text-muted-foreground">Plan</div>
            <div className="text-[11px] uppercase tracking-[0.1em] text-muted-foreground text-right">Market</div>
            <div className="text-[11px] uppercase tracking-[0.1em] text-primary text-right font-semibold">Kennion</div>
            <div className="text-[11px] uppercase tracking-[0.1em] text-muted-foreground text-right">Δ</div>
            {rows.map((r) => {
              const pct = Math.round((1 - r.kennion / r.market) * 100);
              return (
                <Fragment key={r.plan}>
                  <div className="text-[13.5px]">{r.plan}</div>
                  <div className="text-[13.5px] font-mono tabular-nums text-right text-muted-foreground line-through decoration-[hsl(var(--muted-fg)/.6)]">${r.market}</div>
                  <div className="text-[14px] font-mono tabular-nums text-right font-semibold">${r.kennion}</div>
                  <div className="text-[12px] font-mono tabular-nums text-right text-emerald-600">−{pct}%</div>
                </Fragment>
              );
            })}
          </div>
          <div className="mt-5 pt-4 border-t border-border flex items-center justify-between">
            <div className="text-[11.5px] text-muted-foreground">Illustrative · your rates depend on census</div>
            <div className="text-right">
              <div className="text-[10.5px] uppercase tracking-[0.1em] text-muted-foreground">Annual savings</div>
              <div className="font-display text-[22px] leading-tight tracking-tight">$84,200</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function EditorialQuoteCard() {
  return (
    <div className="relative">
      <div className="rounded-2xl bg-[hsl(215_35%_14%)] text-white p-8 lg:p-10 overflow-hidden">
        <div className="font-display text-[26px] leading-[1.25] tracking-tight">
          “Premium coverage at significantly lower costs.”
        </div>
        <div className="mt-6 text-[13px] text-white/70 max-w-sm">
          Qualified groups see average rate reductions of 12–25% compared to standard market offerings.
        </div>
        <div className="mt-8 grid grid-cols-2 gap-x-4 gap-y-4 text-[12px]">
          <div className="border-t border-white/15 pt-3">
            <div className="text-white/60 text-[10.5px] uppercase tracking-[0.1em]">Built for</div>
            <div className="mt-1">SMBs · 2–500 employees</div>
          </div>
          <div className="border-t border-white/15 pt-3">
            <div className="text-white/60 text-[10.5px] uppercase tracking-[0.1em]">Security</div>
            <div className="mt-1">Bank-level encryption</div>
          </div>
        </div>
      </div>
      <img src={KENNION_BUILDING_URL} alt="" className="absolute -bottom-6 -right-6 w-40 h-28 object-cover rounded-xl hairline opacity-95" />
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────
// STATS — original numbers and labels, animated counters
// ─────────────────────────────────────────────────────────────────────
function StatsBand() {
  const stats = [
    { v: "2,415+",   l: "Groups Analyzed" },
    { v: "18%",      l: "Avg. Rate Reduction" },
    { v: "$12M+",    l: "Client Savings" },
    { v: "85-95%",   l: "Retention Rate" },
  ];
  return (
    <section className="border-y border-border bg-background">
      <div className="mx-auto max-w-7xl px-6 py-14">
        <div className="grid md:grid-cols-4 gap-px bg-border rounded-xl overflow-hidden hairline">
          {stats.map((s, i) => (
            <Reveal key={i} delay={i * 80} className="bg-background p-7">
              <AnimatedNumber
                value={s.v}
                className="font-display font-[450] text-[48px] sm:text-[56px] leading-none tracking-[-0.03em] text-foreground tabular-nums"
              />
              <div className="mt-3 text-[12.5px] uppercase tracking-[0.12em] text-muted-foreground">{s.l}</div>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  );
}

// ─────────────────────────────────────────────────────────────────────
// HOW IT WORKS — original step titles + descriptions
// ─────────────────────────────────────────────────────────────────────
function HowItWorks() {
  const steps = [
    {
      n: "01", t: "Register & Upload",
      body: "Create your account and upload your employee census data securely through our encrypted portal.",
      preview: <CensusPreview />,
    },
    {
      n: "02", t: "Risk Analysis",
      body: "Our predictive underwriting model scores your group across demographic, geographic, and workforce risk signals.",
      preview: <AnalysisPreview />,
    },
    {
      n: "03", t: "Get Your Score",
      body: "Receive your group's predictive risk classification and tier assessment within minutes.",
      preview: <ScorePreview />,
    },
    {
      n: "04", t: "Access Rates",
      body: "Qualified groups unlock exclusive rates through our private employee benefits program.",
      preview: <RatePreview />,
    },
  ];
  return (
    <section id="how-it-works" className="py-24 lg:py-32">
      <div className="mx-auto max-w-7xl px-6">
        <Reveal className="max-w-2xl mb-14">
          <div className="inline-flex items-center gap-2 text-[11.5px] uppercase tracking-[0.18em] font-medium text-muted-foreground">
            <span className="inline-block w-6 h-px bg-primary" />
            Process
          </div>
          <h2 className="font-display font-[450] text-[44px] lg:text-[60px] leading-[0.98] tracking-[-0.03em] mt-5">
            How It <span className="italic" style={{ color: "hsl(var(--primary))" }}>Works</span>
          </h2>
          <p className="mt-5 text-[16.5px] leading-[1.6] text-muted-foreground max-w-xl">
            Four simple steps to discover if your group qualifies for our exclusive benefits program.
          </p>
        </Reveal>

        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-px bg-border rounded-xl overflow-hidden hairline">
          {steps.map((s) => (
            <div key={s.n} className="bg-card p-6 flex flex-col">
              <div className="flex items-baseline justify-between">
                <span className="font-mono text-[11px] uppercase tracking-[0.14em] text-primary">Step {s.n}</span>
                <ArrowRight size={14} className="text-muted-foreground"/>
              </div>
              <div className="mt-4 h-32 rounded-md bg-muted hairline overflow-hidden">
                {s.preview}
              </div>
              <h3 className="mt-5 text-[17px] font-semibold tracking-[-0.01em]">{s.t}</h3>
              <p className="mt-1.5 text-[13.5px] leading-[1.55] text-muted-foreground">{s.body}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

function CensusPreview() {
  return (
    <div className="h-full w-full p-3 font-mono text-[9.5px] leading-[1.3] text-muted-foreground">
      <div className="grid grid-cols-[1fr_auto_auto] gap-x-2 gap-y-0.5">
        <div className="text-foreground">Employee</div>
        <div className="text-foreground">Age</div>
        <div className="text-foreground">Tier</div>
        {[["M.Allen",42,"FAM"],["J.Singh",35,"ESP"],["A.Reyes",28,"EE"],["T.Hayes",51,"ECH"],["P.Quinn",46,"FAM"],["S.Park",33,"EE"],["R.Mehta",58,"ESP"]].map((r,i)=>(
          <Fragment key={i}>
            <div className="truncate">{r[0]}</div>
            <div>{r[1]}</div>
            <div>{r[2]}</div>
          </Fragment>
        ))}
      </div>
    </div>
  );
}
function AnalysisPreview() {
  const bars = [62, 78, 88, 71, 92, 84, 67, 80];
  return (
    <div className="h-full w-full p-3 flex items-end gap-1">
      {bars.map((b, i) => (
        <div key={i} className="flex-1 bg-primary/[0.18] rounded-sm relative overflow-hidden h-full">
          <div className="absolute inset-x-0 bottom-0 bg-primary" style={{ height: `${b}%` }} />
        </div>
      ))}
    </div>
  );
}
function ScorePreview() {
  return (
    <div className="h-full w-full grid place-items-center">
      <div className="text-center">
        <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-500/15 text-emerald-700 text-[9px] font-mono uppercase tracking-[0.16em]">
          <span className="w-1 h-1 rounded-full bg-emerald-600" />
          Qualified
        </div>
        <div className="mt-2 font-display font-[450] text-[18px] leading-tight tracking-[-0.02em]">Preferred Risk</div>
        <div className="mt-0.5 text-[9.5px] font-mono uppercase tracking-[0.14em] text-muted-foreground">Private Program</div>
      </div>
    </div>
  );
}
function RatePreview() {
  return (
    <div className="h-full w-full p-3 font-mono text-[10px]">
      {[["Medical","$484"],["Dental","$32"],["Vision","$14"],["Supplemental","$58"]].map((r,i)=>(
        <div key={i} className="flex items-center justify-between py-0.5 border-b border-dashed border-border last:border-0">
          <span className="text-muted-foreground">{r[0]}</span>
          <span className="text-foreground tabular-nums">{r[1]}</span>
        </div>
      ))}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────
// SAVINGS CALCULATOR — interactive lead-gen estimator
// Auto-models a believable current monthly bill from group size + avg age,
// then projects Kennion savings. User can override the bill at any time.
// ─────────────────────────────────────────────────────────────────────
const NATL_SINGLE_AVG_MONTHLY = 777;
const NATL_FAMILY_AVG_MONTHLY = 2249;
const NATL_SINGLE_MIX = 0.65;
const NATL_FAMILY_MIX = 0.35;
const BASE_PER_EMP = Math.round(NATL_SINGLE_AVG_MONTHLY * NATL_SINGLE_MIX + NATL_FAMILY_AVG_MONTHLY * NATL_FAMILY_MIX); // ~$1,292
function ageFactor(avgAge) {
  // Smooth composite curve centered at 42 (=1.0); ~1.025^(Δage)
  return Math.pow(1.025, avgAge - 42);
}
function estimateBill(employees, avgAge) {
  return Math.max(2000, Math.round((employees * BASE_PER_EMP * ageFactor(avgAge)) / 500) * 500);
}

// Opens a printable, brand-styled savings report in a new tab with Hunter's
// contact card + a QR back to kennion.com. The user can hit Cmd/Ctrl+P to save as PDF.
function printSavingsReport({ employees, avgAge, monthlyBill, annualSavings, monthlySavings, reductionPct, newBill, tier }) {
  const fmt = (n) => "$" + Math.round(n).toLocaleString();
  const today = new Date().toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" });
  const qrUrl = "https://api.qrserver.com/v1/create-qr-code/?size=240x240&margin=0&data=" + encodeURIComponent("https://kennion.com");

  const html = `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8" />
<title>Kennion Savings Estimate</title>
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&family=Fraunces:opsz,wght@9..144,400;9..144,500;9..144,600&family=JetBrains+Mono:wght@500&display=swap" rel="stylesheet">
<style>
  *,*::before,*::after { box-sizing: border-box; }
  :root {
    --accent: #0e4992;
    --ink: #0f1828;
    --fg: #0e1421;
    --muted: #5b6679;
    --line: #d9dde5;
    --sub: #f3f5f9;
  }
  html, body { margin: 0; }
  body {
    font-family: 'Inter', system-ui, sans-serif;
    color: var(--fg);
    background: white;
    -webkit-font-smoothing: antialiased;
    padding: 48px 56px;
    max-width: 760px;
    margin: 0 auto;
  }
  .display { font-family: 'Fraunces', Georgia, serif; font-variation-settings: 'opsz' 144; }
  .mono { font-family: 'JetBrains Mono', monospace; }
  .eyebrow { font-family: 'JetBrains Mono', monospace; font-size: 10.5px; letter-spacing: 0.16em; text-transform: uppercase; color: var(--muted); }
  .accent { color: var(--accent); }
  .rule { height: 1px; background: var(--line); margin: 28px 0; border: 0; }

  header {
    display: flex; align-items: flex-end; justify-content: space-between;
    padding-bottom: 18px; border-bottom: 1px solid var(--line);
  }
  .brand { display: flex; flex-direction: column; gap: 4px; }
  .brand-name { font-family: 'Fraunces', serif; font-size: 28px; font-weight: 500; line-height: 1; letter-spacing: -0.02em; }
  .brand-sub { font-family: 'JetBrains Mono', monospace; font-size: 9.5px; letter-spacing: 0.18em; text-transform: uppercase; color: var(--muted); }
  .meta { text-align: right; font-size: 11px; line-height: 1.5; color: var(--muted); }
  .meta b { color: var(--fg); font-weight: 500; }

  .headline-row {
    display: flex; align-items: flex-end; justify-content: space-between;
    gap: 24px; margin-top: 32px;
  }
  .hero-num { font-family: 'Fraunces', serif; font-weight: 450; font-size: 78px; line-height: 1; letter-spacing: -0.035em; font-variant-numeric: tabular-nums; color: var(--fg); }
  .hero-side { text-align: right; font-size: 12.5px; color: var(--muted); line-height: 1.6; }
  .hero-side b { display: block; font-family: 'Fraunces', serif; color: var(--fg); font-size: 22px; font-weight: 500; }

  .grid {
    display: grid; grid-template-columns: 1fr 1fr;
    gap: 0; margin-top: 32px; border: 1px solid var(--line); border-radius: 12px; overflow: hidden;
  }
  .gcell { padding: 18px 22px; border-right: 1px solid var(--line); border-bottom: 1px solid var(--line); }
  .gcell:nth-child(2n) { border-right: 0; }
  .gcell:nth-last-child(-n+2) { border-bottom: 0; }
  .glbl { font-family: 'JetBrains Mono', monospace; font-size: 9.5px; letter-spacing: 0.16em; text-transform: uppercase; color: var(--muted); }
  .gval { font-family: 'Fraunces', serif; font-weight: 450; font-size: 26px; letter-spacing: -0.02em; margin-top: 6px; font-variant-numeric: tabular-nums; }

  .next {
    margin-top: 36px;
    padding: 24px 28px;
    background: var(--sub);
    border-radius: 14px;
    display: grid;
    grid-template-columns: 1fr 200px;
    gap: 28px;
    align-items: center;
  }
  .next h3 { font-family: 'Fraunces', serif; font-weight: 500; font-size: 22px; margin: 0 0 8px; letter-spacing: -0.02em; line-height: 1.15; }
  .next p { margin: 0; font-size: 13px; line-height: 1.55; color: var(--muted); }
  .contact { margin-top: 18px; font-size: 13px; line-height: 1.65; }
  .contact .name { font-weight: 600; color: var(--fg); }
  .contact a { color: var(--accent); text-decoration: none; }
  .qr { background: white; padding: 10px; border-radius: 10px; border: 1px solid var(--line); text-align: center; }
  .qr img { display: block; width: 180px; height: 180px; }
  .qr-label { font-family: 'JetBrains Mono', monospace; font-size: 9px; letter-spacing: 0.16em; text-transform: uppercase; color: var(--muted); margin-top: 8px; }

  footer { margin-top: 32px; padding-top: 18px; border-top: 1px solid var(--line); font-family: 'JetBrains Mono', monospace; font-size: 9.5px; letter-spacing: 0.14em; text-transform: uppercase; color: var(--muted); display: flex; justify-content: space-between; }

  .verified { display: inline-flex; align-items: center; gap: 6px; padding: 3px 9px; border-radius: 999px; background: rgba(16,185,129,.12); color: #047857; font-family: 'JetBrains Mono', monospace; font-size: 9.5px; letter-spacing: 0.14em; text-transform: uppercase; }

  @media print {
    body { padding: 0.4in 0.5in; }
    a { color: var(--accent); }
    @page { size: letter; margin: 0; }
  }
</style>
</head>
<body>

<header>
  <div class="brand">
    <div class="brand-name">Kennion</div>
    <div class="brand-sub">Benefit Advisors</div>
  </div>
  <div class="meta">
    <b>Personalized Savings Estimate</b><br>
    Generated ${today}<br>
    <span class="verified">✓ Estimate Ready</span>
  </div>
</header>

<div class="eyebrow" style="margin-top: 28px;">Estimated annual savings on group health</div>
<div class="headline-row">
  <div class="hero-num">${fmt(annualSavings)}</div>
  <div class="hero-side">
    Monthly savings<br><b>${fmt(monthlySavings)}</b>
  </div>
</div>
<div style="margin-top: 10px; font-size: 13px; color: var(--muted);">
  A <span style="color: var(--accent); font-weight: 500;">${reductionPct}% rate reduction</span> vs your current premium &mdash; qualified at <b style="color: var(--fg);">${tier} Risk</b> tier.
</div>

<hr class="rule">

<div class="eyebrow">Your group profile</div>
<div class="grid">
  <div class="gcell"><div class="glbl">Employees</div><div class="gval">${employees}</div></div>
  <div class="gcell"><div class="glbl">Average age</div><div class="gval">${avgAge}</div></div>
  <div class="gcell"><div class="glbl">Current monthly bill</div><div class="gval">${fmt(monthlyBill)}</div></div>
  <div class="gcell"><div class="glbl">Estimated Kennion bill</div><div class="gval" style="color: var(--accent);">${fmt(newBill)}</div></div>
</div>

<div class="next">
  <div>
    <h3>Ready for your exact number?</h3>
    <p>This estimate uses national averages. Submit your group's census and we'll return your actual rates, plan-by-plan, the same day.</p>
    <div class="contact">
      <span class="name">Hunter Shepherd</span><br>
      Kennion Benefit Advisors<br>
      <a href="tel:+12056410469">205-641-0469</a> &nbsp;·&nbsp; <a href="mailto:hunter@kennion.com">hunter@kennion.com</a>
    </div>
  </div>
  <div class="qr">
    <img src="${qrUrl}" alt="Scan to visit kennion.com" />
    <div class="qr-label">Scan &middot; kennion.com</div>
  </div>
</div>

<footer>
  <span>Kennion Benefit Advisors &middot; Vestavia, AL</span>
  <span>Illustrative estimate. Final rates determined by census underwriting.</span>
</footer>

<script>
  // Auto-trigger print once fonts & QR are loaded
  window.addEventListener('load', () => {
    setTimeout(() => { try { window.print(); } catch (e) {} }, 700);
  });
</script>

</body>
</html>`;

  const w = window.open("", "_blank");
  if (!w) {
    alert("Please allow popups to print your savings report.");
    return;
  }
  w.document.open();
  w.document.write(html);
  w.document.close();
}

function SavingsCalculator() {
  const [employees, setEmployees] = useState(42);
  const [avgAge, setAvgAge] = useState(42);
  const [monthlyBill, setMonthlyBill] = useState(() => estimateBill(42, 42));
  const [billSource, setBillSource] = useState("auto"); // "auto" | "manual"
  const [analyzing, setAnalyzing] = useState(false);
  const [displaySavings, setDisplaySavings] = useState(0);

  // Auto-recompute bill from employees + age when user hasn't manually overridden
  const estimated = estimateBill(employees, avgAge);
  useEffect(() => {
    if (billSource === "auto") setMonthlyBill(estimated);
  }, [estimated, billSource]);

  // Savings rate — varies with all three inputs so the number isn't always the same.
  // Clamped to 10–22% so it stays believable.
  const savingsPct = useMemo(() => {
    const sizeFactor = Math.min(1, Math.max(0, (employees - 5) / 195));
    const basePct = 0.12 + 0.06 * sizeFactor;
    const ageAdj = (avgAge - 42) * 0.0018;
    const billNoise = (Math.sin(monthlyBill * 0.00015) + Math.cos(monthlyBill * 0.00041)) * 0.008;
    return Math.max(0.10, Math.min(0.22, basePct + ageAdj + billNoise));
  }, [employees, avgAge, monthlyBill]);

  const targetSavings = Math.round(monthlyBill * savingsPct);
  const annualSavings = targetSavings * 12;
  const reductionPct = Math.round(savingsPct * 100);
  const newBill = monthlyBill - targetSavings;
  const tier = employees >= 20 ? "Preferred" : "Standard";

  // Single source of truth for every dollar/percent on the result card.
  // Tied to displaySavings (the tweened value) so all numbers move in lockstep.
  const liveMonthly = displaySavings;
  const liveAnnual = liveMonthly * 12;
  const livePct = monthlyBill > 0 ? Math.round((liveMonthly / monthlyBill) * 100) : 0;
  const liveNewBill = Math.max(0, monthlyBill - liveMonthly);
  const liveNewBillPct = monthlyBill > 0 ? Math.round((liveNewBill / monthlyBill) * 100) : 100;

  // Pulse "analyzing", tween savings number on any input change
  useEffect(() => {
    setAnalyzing(true);
    const tFinish = setTimeout(() => setAnalyzing(false), 820);

    let raf;
    const startVal = displaySavings;
    const startTime = performance.now();
    const dur = 850;
    const tick = (now) => {
      const p = Math.min(1, (now - startTime) / dur);
      const eased = 1 - Math.pow(1 - p, 3);
      setDisplaySavings(Math.round(startVal + (targetSavings - startVal) * eased));
      if (p < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);

    return () => {
      clearTimeout(tFinish);
      cancelAnimationFrame(raf);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [targetSavings]);

  const fmt = (n) => "$" + n.toLocaleString();
  const billPct = 100;

  // Vague engine phrases — cycle during analysis, don't expose actual math
  const phrases = [
    "Loading risk model…",
    "Modeling group profile…",
    "Cross-referencing program rates…",
    "Evaluating eligibility…",
    "Finalizing estimate…",
  ];
  const [phraseIdx, setPhraseIdx] = useState(0);
  useEffect(() => {
    if (!analyzing) return;
    const id = setInterval(() => {
      setPhraseIdx((i) => (i + 1) % phrases.length);
    }, 220);
    return () => clearInterval(id);
  }, [analyzing]);

  return (
    <section id="calculator" className="py-24 lg:py-32 bg-background">
      <div className="mx-auto max-w-7xl px-6">
        <Reveal className="max-w-2xl mb-12">
          <div className="inline-flex items-center gap-2 text-[11.5px] uppercase tracking-[0.18em] font-medium text-muted-foreground">
            <span className="inline-block w-6 h-px bg-primary" />
            Group Health · Live Estimate
          </div>
          <h2 className="font-display font-[450] text-[44px] lg:text-[60px] leading-[0.98] tracking-[-0.03em] mt-5">
            Your group health rates <span className="italic mr-[0.35em]" style={{ color: "hsl(var(--primary))" }}>don't have to</span>climb every year.
          </h2>
          <p className="mt-5 text-[16.5px] leading-[1.6] text-muted-foreground max-w-xl">
            Renewal after renewal, the number only goes one way. We built our program to change that. Plug in your group below and see what's possible.
          </p>
        </Reveal>

        <div className="grid lg:grid-cols-[1fr_1.1fr] gap-6 lg:gap-8 items-start">
          {/* INPUTS */}
          <Reveal>
            <div className="rounded-2xl bg-card hairline overflow-hidden">
              <div className="px-7 lg:px-8 pt-6 pb-4 border-b border-border bg-muted">
                <div className="flex items-baseline justify-between gap-3">
                  <div>
                    <div className="text-[10.5px] font-mono uppercase tracking-[0.16em] text-primary">Step 1</div>
                    <div className="font-display font-[450] text-[20px] tracking-[-0.02em] mt-0.5">Tell us about your group</div>
                  </div>
                  <span className="text-[10.5px] font-mono uppercase tracking-[0.12em] text-muted-foreground">15 sec</span>
                </div>
                <div className="text-[12.5px] text-muted-foreground mt-3">
                  Drag the sliders or type your own numbers in the boxes.
                </div>
              </div>

              <div className="p-7 lg:p-8">
                <div className="space-y-7">
                  <Field
                    label="Employees on plan"
                    value={employees}
                    min={5}
                    max={500}
                    step={1}
                    onChange={setEmployees}
                    format={(v) => v.toString()}
                    ticks={["5", "100", "250", "500"]}
                  />
                  <Field
                    label="Average age"
                    value={avgAge}
                    min={25}
                    max={65}
                    step={1}
                    onChange={setAvgAge}
                    format={(v) => v + " yrs"}
                    ticks={["25", "40", "50", "65"]}
                  />
                  <div>
                    <Field
                      label="Current monthly bill"
                      value={monthlyBill}
                      min={2000}
                      max={500000}
                      step={500}
                      onChange={(v) => { setMonthlyBill(v); setBillSource("manual"); }}
                      format={(v) => "$" + v.toLocaleString()}
                      ticks={["$2k", "$100k", "$250k", "$500k"]}
                    />
                    <div className="mt-2 flex items-center justify-between text-[11.5px] text-muted-foreground">
                      <span>
                        Estimated from your inputs: 
                        <span className="text-foreground font-mono">{fmt(estimated)}</span>
                      </span>
                      {billSource === "manual" && (
                        <button onClick={() => setBillSource("auto")}
                                className="inline-flex items-center gap-1 text-primary hover:underline underline-offset-2">
                          <RotateCcw size={11}/>
                          Use Estimate
                        </button>
                      )}
                    </div>
                  </div>
                </div>

              {/* Model engine — black-box "secret sauce" feel */}
              <div className="mt-7 pt-6 border-t border-border">
                <div className="flex items-center justify-between text-[10.5px] font-mono uppercase tracking-[0.16em] text-muted-foreground">
                  <span className="flex items-center gap-2">
                    <span className={`w-1.5 h-1.5 rounded-full ${analyzing ? "bg-amber-500 animate-pulse" : "bg-emerald-500"}`} />
                    {analyzing ? "Underwriting engine · running" : "Underwriting engine · ready"}
                  </span>
                  <span>Kennion Estimator</span>
                </div>

                {/* Indeterminate scan bar */}
                <div className="mt-3 relative h-1 rounded-full bg-border overflow-hidden">
                  {analyzing ? (
                    <div className="absolute inset-y-0 left-0 w-1/3 bg-primary kn-scan rounded-full" />
                  ) : (
                    <div className="h-full bg-primary" />
                  )}
                </div>

                {/* Single rotating phrase */}
                <div className="mt-3 h-5 font-mono text-[11px] text-muted-foreground flex items-center gap-2">
                  <span className="text-primary">›</span>
                  <span>{analyzing ? phrases[phraseIdx] : "Estimate ready"}</span>
                </div>

                <div className="text-[11px] text-muted-foreground mt-4 leading-[1.5]">
                  Illustrative estimate. Submit your census for your exact rates.
                </div>
              </div>
              </div>
            </div>
          </Reveal>

          {/* RESULT */}
          <Reveal delay={120}>
            <div className="relative rounded-2xl bg-[hsl(215_35%_14%)] text-white overflow-hidden shadow-[0_30px_80px_-30px_rgba(15,30,60,0.45)]">
              <div className="absolute inset-0 opacity-60 pointer-events-none"
                   style={{ background: "radial-gradient(ellipse at top right, hsl(var(--primary) / 0.35), transparent 60%)" }} />

              <div className="relative">
                <div className="flex items-center justify-between px-6 py-3 border-b border-white/10">
                  <div className="flex items-center gap-2">
                    <span className={`w-2 h-2 rounded-full ${analyzing ? "bg-amber-400 animate-pulse" : "bg-emerald-400"}`} />
                    <span className="text-[10.5px] font-mono uppercase tracking-[0.16em] text-white/80">
                      {analyzing ? "Analyzing" : `Qualified · ${tier} Risk`}
                    </span>
                  </div>
                  <span className="text-[10.5px] font-mono text-white/50">Kennion Estimator</span>
                </div>

                <div className="px-7 lg:px-9 py-8 lg:py-10">
                  <div className="text-[10.5px] uppercase tracking-[0.14em] text-white/70">Estimated annual savings on group health</div>
                  <div className="mt-2 font-display font-[450] text-[44px] sm:text-[56px] lg:text-[88px] leading-none tracking-[-0.035em] tabular-nums">
                    {fmt(liveAnnual)}
                  </div>
                  <div className="mt-2.5 flex items-baseline flex-wrap gap-x-3 gap-y-1 text-[13.5px]">
                    <span className="text-white/75 tabular-nums">{fmt(liveMonthly)}/mo saved</span>
                    <span className="text-emerald-300 font-mono tabular-nums">−{livePct}%</span>
                    <span className={`inline-flex items-center gap-1 text-[10.5px] font-mono uppercase tracking-[0.14em] px-2 py-0.5 rounded-full transition-colors ${analyzing ? "bg-amber-400/15 text-amber-200" : "bg-emerald-400/15 text-emerald-300"}`}>
                      {analyzing ? <Loader2 size={10} strokeWidth={2.4} className="animate-spin"/> : <Check size={10} strokeWidth={2.4}/>}
                      {analyzing ? "Calculating…" : "Estimate Ready"}
                    </span>
                  </div>

                  <div className="mt-6 space-y-2.5">
                    <div className="flex items-center gap-3">
                      <div className="w-[60px] text-[11px] font-mono uppercase tracking-[0.12em] text-white/70">Now</div>
                      <div className="flex-1 h-2 rounded-full bg-white/15 overflow-hidden">
                        <div className="h-full bg-white/55" style={{ width: `${billPct}%` }} />
                      </div>
                      <div className="w-[100px] text-right font-mono text-[12.5px] tabular-nums text-white/90">{fmt(monthlyBill)}</div>
                    </div>
                    <div className="flex items-center gap-3">
                      <div className="w-[60px] text-[11px] font-mono uppercase tracking-[0.12em]" style={{ color: "hsl(210 85% 70%)" }}>Kennion</div>
                      <div className="flex-1 h-2 rounded-full bg-white/15 overflow-hidden">
                        <div className="h-full" style={{ width: `${liveNewBillPct}%`, transition: "width .6s ease-out", background: "hsl(210 85% 62%)" }} />
                      </div>
                      <div className="w-[100px] text-right font-mono text-[12.5px] tabular-nums" style={{ color: "hsl(210 85% 78%)" }}>{fmt(liveNewBill)}</div>
                    </div>
                  </div>

                  <div className="mt-7 grid grid-cols-3 gap-px bg-white/15 rounded-xl overflow-hidden">
                    {[
                      { l: "Monthly savings", v: fmt(liveMonthly) },
                      { l: "Rate reduction", v: `−${livePct}%` },
                      { l: "Risk tier",      v: tier },
                    ].map((s) => (
                      <div key={s.l} className="bg-[hsl(215_35%_14%)] px-4 py-4">
                        <div className="text-[10px] uppercase tracking-[0.12em] text-white/70">{s.l}</div>
                        <div className="mt-1 font-display font-[450] text-[20px] lg:text-[24px] tracking-[-0.02em] tabular-nums">{s.v}</div>
                      </div>
                    ))}
                  </div>

                  {/* Primary CTA + secondary actions */}
                  <div className="mt-7">
                    <Link href="/register" className="inline-flex items-center gap-1.5 text-[14.5px] font-medium bg-white text-[hsl(215_35%_14%)] hover:bg-white/95 px-6 py-3 rounded-md shadow-sm">
                      Get Your Exact Number
                      <ArrowRight size={15} strokeWidth={2}/>
                    </Link>
                    <div className="mt-4 flex flex-wrap items-center gap-x-6 gap-y-2.5 text-[13px]">
                      <a href="https://calendly.com/kennion/call" onClick={openCalendly}
                         className="inline-flex items-center gap-1.5 text-white/75 hover:text-white transition-colors cursor-pointer">
                        <Calendar size={13} strokeWidth={1.8}/>
                        Schedule A Call
                      </a>
                      <button
                        onClick={() => printSavingsReport({
                          employees, avgAge, monthlyBill,
                          annualSavings, monthlySavings: targetSavings,
                          reductionPct, newBill, tier,
                        })}
                        className="inline-flex items-center gap-1.5 text-white/75 hover:text-white transition-colors"
                      >
                        <Printer size={13} strokeWidth={1.8}/>
                        Print Savings Report
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </Reveal>
        </div>
      </div>
    </section>
  );
}

// Field — slider + editable readout (type or drag)
function Field({ label, value, unit, min, max, step, onChange, format, ticks = [] }) {
  const [text, setText] = useState(() => format(value));
  const [editing, setEditing] = useState(false);

  // Keep input text in sync with external value changes (e.g. slider drag, auto-update)
  useEffect(() => {
    if (!editing) setText(format(value));
  }, [value, format, editing]);

  const commit = (raw) => {
    const numStr = String(raw).replace(/[^0-9.-]/g, "");
    const n = parseFloat(numStr);
    if (!isFinite(n)) { setText(format(value)); return; }
    const snapped = Math.round(n / step) * step;
    const clamped = Math.max(min, Math.min(max, snapped));
    onChange(clamped);
    setText(format(clamped));
  };

  return (
    <div>
      <div className="flex items-baseline justify-between gap-3">
        <label className="text-[12px] font-mono uppercase tracking-[0.14em] text-muted-foreground">{label}</label>
        <input
          type="text"
          inputMode="numeric"
          value={text}
          onChange={(e) => { setText(e.target.value); setEditing(true); }}
          onFocus={(e) => { setEditing(true); e.target.select(); }}
          onBlur={(e) => { setEditing(false); commit(e.target.value); }}
          onKeyDown={(e) => { if (e.key === "Enter") e.currentTarget.blur(); if (e.key === "Escape") { setText(format(value)); e.currentTarget.blur(); } }}
          className="font-display font-[450] text-[26px] sm:text-[28px] leading-none tracking-[-0.02em] tabular-nums text-right bg-transparent outline-none border-b border-transparent hover:border-border focus:border-primary w-[160px] pb-1 cursor-text transition-colors"
          aria-label={label}
        />
      </div>
      <input
        type="range"
        min={min} max={max} step={step}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        className="kn-range mt-3 w-full"
        style={{ "--pct": `${((value - min) / (max - min)) * 100}%` }}
      />
      <div className="mt-1.5 flex justify-between text-[10.5px] font-mono text-muted-foreground">
        {ticks.map((t, i) => <span key={i}>{t}</span>)}
      </div>
    </div>
  );
}
function BenefitsProgram() {
  const videos = [
    { id: "1004137913", thumb: VIDEO_THUMB_HERO,     label: "Overview",   duration: "1:42" },
    { id: "1060997796", thumb: VIDEO_THUMB_BENEFITS, label: "Quick look", duration: "0:45" },
  ];
  const [activeVideo, setActiveVideo] = useState(0);
  const [videoOpen, setVideoOpen] = useState(false);
  const v = videos[activeVideo];
  const plans = [
    { t: "Health",       n: "15" },
    { t: "Dental",       n: "6"  },
    { t: "Vision",       n: "3"  },
    { t: "Supplemental", n: "10" },
  ];
  return (
    <section id="program" className="relative py-24 lg:py-32 bg-muted border-y border-border">
      {/* Faint background texture so this section reads distinct */}
      <div className="absolute inset-0 opacity-[0.35] pointer-events-none"
           style={{ backgroundImage: "radial-gradient(circle at 1px 1px, hsl(var(--border)) 1px, transparent 1.2px)", backgroundSize: "22px 22px" }} />

      <div className="relative mx-auto max-w-7xl px-6">
        {/* TOP: video + intro */}
        <div className="grid lg:grid-cols-[1.15fr_1fr] gap-10 lg:gap-16 items-start">
          <Reveal>
            <button onClick={() => setVideoOpen(true)}
                    className="group relative block w-full overflow-hidden rounded-2xl hairline shadow-[0_30px_80px_-30px_rgba(15,30,60,0.4)]">
              <img key={v.id} src={v.thumb} alt={v.label}
                   className="w-full aspect-video object-cover group-hover:scale-[1.02] transition-transform duration-500" />
              <div className="absolute inset-0 bg-gradient-to-tr from-black/40 via-black/15 to-transparent group-hover:from-black/45 transition-colors" />
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="flex h-20 w-20 items-center justify-center rounded-full bg-primary shadow-[0_12px_30px_-8px_hsl(var(--primary) / 0.7)] ring-4 ring-white/25 group-hover:scale-105 transition-transform">
                  <Play size={26} className="text-white" strokeWidth={2.2}/>
                </div>
              </div>
              <div className="absolute top-4 left-4 inline-flex items-center gap-2 px-2.5 py-1 rounded-full bg-black/55 backdrop-blur text-white text-[10.5px] font-mono uppercase tracking-[0.14em]">
                <span className="w-1.5 h-1.5 rounded-full bg-red-400" />
                Watch{v.duration ? ` · ${v.duration}` : ""}
              </div>
            </button>

            {/* Video picker */}
            <div className="mt-4 inline-flex items-center gap-1 p-1 rounded-xl bg-card hairline">
              {videos.map((vid, i) => (
                <button
                  key={vid.id}
                  onClick={() => setActiveVideo(i)}
                  className={`flex items-center gap-2 px-3.5 py-2 rounded-lg text-[12.5px] font-medium transition-colors ${
                    activeVideo === i
                      ? "bg-primary text-white shadow-sm"
                      : "text-muted-foreground hover:text-foreground hover:bg-muted"
                  }`}
                  aria-pressed={activeVideo === i}
                >
                  <Play size={11} strokeWidth={2.2} className={activeVideo === i ? "text-white" : ""}/>
                  {vid.label}
                  {vid.duration && (
                    <span className={`text-[10.5px] font-mono ${activeVideo === i ? "text-white/75" : "text-muted-foreground/70"}`}>
                      {vid.duration}
                    </span>
                  )}
                </button>
              ))}
            </div>
          </Reveal>

          <Reveal delay={120}>
            <div className="inline-flex items-center gap-2 text-[11.5px] uppercase tracking-[0.18em] font-medium text-muted-foreground">
              <span className="inline-block w-6 h-px bg-primary" />
              Benefits Program
            </div>
            <h2 className="font-display font-[450] text-[34px] lg:text-[44px] leading-[1.02] tracking-[-0.03em] mt-5">
              The benefits a Fortune 500 has. <span className="italic" style={{ color: "hsl(var(--primary))" }}>Built for everyone else.</span>
            </h2>
            <p className="mt-5 text-[16px] leading-[1.65] text-muted-foreground">
              Five decades in this industry taught us what small and mid-sized employers actually need, and what they keep getting handed instead. So we built it ourselves. Premium health, dental, vision, and supplemental coverage, engineered to deliver real choice for your team and real control for your bottom line. One program. One invoice. One team that picks up the phone.
            </p>

            {/* 3-stat row */}
            <div className="mt-7 grid grid-cols-3 gap-4">
              {[
                { v: "50+", l: "Years building benefits programs nationwide" },
                { v: "1",   l: "Monthly invoice for every line of coverage" },
                { v: "1",   l: "Dedicated team behind every detail" },
              ].map((s, i) => (
                <div key={i} className="border-t border-border pt-3">
                  <div className="font-display font-[450] text-[36px] leading-none tracking-[-0.03em] text-foreground">
                    {s.v}<span className="text-primary">.</span>
                  </div>
                  <div className="mt-2 text-[11.5px] leading-[1.45] text-muted-foreground">{s.l}</div>
                </div>
              ))}
            </div>
          </Reveal>
        </div>

        {/* BOTTOM: plans band — strong horizontal capability strip */}
        <Reveal delay={80} className="mt-14 lg:mt-16">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-px bg-border rounded-2xl overflow-hidden hairline">
            {plans.map(p => (
              <div key={p.t} className="bg-background p-6 lg:p-8">
                <div className="flex items-baseline gap-1">
                  <span className="font-display font-[450] text-[56px] lg:text-[64px] leading-none tracking-[-0.04em] tabular-nums">{p.n}</span>
                  <span className="font-display font-[450] text-[32px] lg:text-[36px] leading-none text-primary">+</span>
                </div>
                <div className="mt-3 text-[10.5px] font-mono uppercase tracking-[0.16em] text-muted-foreground">Plans</div>
                <div className="mt-3 pt-3 border-t border-border font-display font-[450] text-[20px] lg:text-[22px] tracking-[-0.01em]">{p.t}</div>
              </div>
            ))}
          </div>
        </Reveal>
      </div>
      <VideoModal open={videoOpen} onClose={() => setVideoOpen(false)} videoId={v.id} />
    </section>
  );
}

// ─────────────────────────────────────────────────────────────────────
// BENEFITS — "Why Groups Choose Kennion" — original copy
// ─────────────────────────────────────────────────────────────────────
function Benefits() {
  const benefits = [
    "Access to exclusive private benefit programs",
    "Average rate savings of 12-25% vs. market",
    "No upfront costs or hidden fees",
    "Dedicated account management team",
    "Custom plan design and consultation",
    "Ongoing compliance and regulatory support",
  ];

  return (
    <section id="benefits" className="py-24 lg:py-32 bg-muted border-y border-border">
      <div className="mx-auto max-w-7xl px-6">
        <div className="grid lg:grid-cols-[1fr_1.2fr] gap-12 lg:gap-20 items-start">
          <Reveal>
            <div className="inline-flex items-center gap-2 text-[11.5px] uppercase tracking-[0.18em] font-medium text-muted-foreground">
              <span className="inline-block w-6 h-px bg-primary" />
              Benefits
            </div>
            <h2 className="font-display font-[450] text-[44px] lg:text-[60px] leading-[0.98] tracking-[-0.03em] mt-5">
              Why Groups Choose <span className="italic" style={{ color: "hsl(var(--primary))" }}>Kennion</span>
            </h2>
            <p className="mt-5 text-[16px] leading-[1.6] text-muted-foreground max-w-md">
              We've built relationships with top-tier carriers and designed proprietary programs
              that reward healthy, well-managed groups with significantly better rates and benefits.
            </p>
            <div className="mt-8">
              <Link href="/register" className="inline-flex items-center gap-1.5 text-[14.5px] font-medium bg-primary text-primary-foreground hover:opacity-90 px-5 py-3 rounded-md shadow-sm">
                Submit Your Group
                <ArrowRight size={15} strokeWidth={2}/>
              </Link>
            </div>
          </Reveal>

          <Reveal delay={120}>
            <ul className="grid sm:grid-cols-2 gap-x-10 gap-y-6">
              {benefits.map((b, i) => (
                <li key={b} className="flex items-baseline gap-4 border-t border-border pt-5">
                  <span className="font-display font-[450] text-[30px] leading-none tabular-nums text-primary tracking-[-0.025em] shrink-0">
                    {String(i + 1).padStart(2, "0")}
                  </span>
                  <span className="text-[15.5px] leading-[1.55] text-foreground">{b}</span>
                </li>
              ))}
            </ul>
          </Reveal>
        </div>
      </div>
    </section>
  );
}

// ─────────────────────────────────────────────────────────────────────
// CONTACT — original copy preserved
// ─────────────────────────────────────────────────────────────────────
function Contact() {
  return (
    <section id="contact" className="py-24 lg:py-32">
      <div className="mx-auto max-w-7xl px-6">
        <Reveal className="max-w-2xl mb-14">
          <div className="inline-flex items-center gap-2 text-[11.5px] uppercase tracking-[0.18em] font-medium text-muted-foreground">
            <span className="inline-block w-6 h-px bg-primary" />
            Contact
          </div>
          <h2 className="font-display font-[450] text-[44px] lg:text-[60px] leading-[0.98] tracking-[-0.03em] mt-5">
            Contact <span className="italic" style={{ color: "hsl(var(--primary))" }}>Us</span>
          </h2>
          <p className="mt-5 text-[16.5px] leading-[1.6] text-muted-foreground max-w-xl">
            Whether you're exploring options or already a client, our team is here to help.
          </p>
        </Reveal>

        <div className="grid md:grid-cols-2 gap-px bg-border rounded-2xl overflow-hidden hairline">
          <div className="bg-card p-8 lg:p-10">
            <div className="text-[11px] font-mono uppercase tracking-[0.14em] text-primary">For Employers</div>
            <h3 className="mt-2 text-[22px] font-semibold tracking-[-0.01em]">For Employers Interested In A Proposal</h3>
            <p className="mt-3 text-[14.5px] leading-[1.6] text-muted-foreground">
              Want to see if we can lower your costs and improve your group benefits?
              We'll show you what's possible.
            </p>
            <Link href="/register" className="mt-6 inline-flex items-center gap-1.5 text-[14.5px] font-medium bg-primary text-primary-foreground hover:opacity-90 px-5 py-3 rounded-md shadow-sm">
              Submit Your Group
              <ArrowRight size={15} strokeWidth={2}/>
            </Link>
          </div>
          <div className="bg-card p-8 lg:p-10">
            <div className="text-[11px] font-mono uppercase tracking-[0.14em] text-primary">Existing Clients</div>
            <h3 className="mt-2 text-[22px] font-semibold tracking-[-0.01em]">Current Client Or Member?</h3>
            <p className="mt-3 text-[14.5px] leading-[1.6] text-muted-foreground">
              Please open a support ticket below. We are here to help.
            </p>
            <a href="https://go.kennion.com/support" target="_blank" rel="noopener noreferrer" className="mt-6 inline-flex items-center gap-1.5 text-[14.5px] font-medium text-foreground border border-border hover:bg-black/[.03] px-5 py-3 rounded-md">
              Submit A Ticket
              <ArrowRight size={15} strokeWidth={2}/>
            </a>
          </div>
        </div>

        {/* Building + company info */}
        <div className="mt-16 grid lg:grid-cols-2 gap-8 lg:gap-14 items-center">
          <div className="relative overflow-hidden rounded-2xl hairline">
            <img src={KENNION_BUILDING_URL} alt="Kennion Benefit Advisors headquarters" className="w-full aspect-[4/3] object-cover object-center" />
          </div>
          <div>
            <h3 className="font-display text-[32px] lg:text-[40px] leading-[1.05] tracking-[-0.02em]">
              Kennion Benefit Advisors
            </h3>
            <p className="mt-2 text-[15px] text-muted-foreground">Vestavia Hills, Alabama</p>
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
            </dl>
          </div>
        </div>
      </div>
    </section>
  );
}

// ─────────────────────────────────────────────────────────────────────
// FINAL CTA — original copy
// ─────────────────────────────────────────────────────────────────────
function FinalCTA() {
  return (
    <section className="py-24 lg:py-32 bg-primary text-primary-foreground">
      <div className="mx-auto max-w-3xl px-6 text-center">
        <h2 className="font-display text-[40px] lg:text-[52px] leading-[1.05] tracking-[-0.02em]">
          Ready to See If You Qualify?
        </h2>
        <p className="mt-5 text-[17px] leading-[1.55] text-white/85 max-w-xl mx-auto">
          It takes less than 5 minutes to submit your group for analysis.
          Find out if your employees can get better benefits at lower rates.
        </p>
        <div className="mt-9 flex flex-wrap items-center justify-center gap-3">
          <Link href="/register" className="inline-flex items-center gap-1.5 text-[14.5px] font-medium bg-white text-primary hover:bg-white/95 px-6 py-3 rounded-md shadow-sm">
            Submit Your Group
            <ArrowRight size={15} strokeWidth={2}/>
          </Link>
        </div>
      </div>
    </section>
  );
}

// ─────────────────────────────────────────────────────────────────────
// FOOTER
// ─────────────────────────────────────────────────────────────────────
// ─────────────────────────────────────────────────────────────────────
// TESTIMONIAL — single pull-quote slot
// PLACEHOLDER CONTENT — swap quote, attribution, and portrait when ready.
// ─────────────────────────────────────────────────────────────────────
function Testimonial() {
  return (
    <section className="py-24 lg:py-32 bg-muted border-y border-border">
      <div className="mx-auto max-w-4xl px-6 text-center">
        <Reveal>
          <div className="inline-flex items-center gap-2 text-[11.5px] uppercase tracking-[0.18em] font-medium text-muted-foreground">
            <span className="inline-block w-6 h-px bg-primary" />
            From a competitor
            <span className="inline-block w-6 h-px bg-primary" />
          </div>
          <blockquote className="font-display font-[450] text-[30px] sm:text-[42px] lg:text-[54px] leading-[1.12] tracking-[-0.025em] mt-8 text-balance">
            &ldquo;Y&rsquo;all are unbeatable in the market with the prospects that we have met with that are current Kennion clients.&rdquo;
          </blockquote>
          <figcaption className="mt-8 text-[14px] text-muted-foreground">
            <span className="font-medium text-foreground">Senior Executive</span>
            <span className="mx-1.5">&middot;</span>
            Top-25 U.S. broker
          </figcaption>

          {/* Why this matters */}
          <div className="mt-14 pt-7 border-t border-border max-w-2xl mx-auto text-[14px] leading-[1.6] text-muted-foreground">
            <span className="text-[10.5px] font-mono uppercase tracking-[0.18em] text-primary block mb-2">Why we hear this</span>
            Kennion&rsquo;s program is <span className="text-foreground font-medium">private, not available through traditional broker channels.</span>
            That&rsquo;s a big part of why our rates clear the market and other brokers can&rsquo;t match them.
          </div>
        </Reveal>
      </div>
    </section>
  );
}

// ─────────────────────────────────────────────────────────────────────
// LEGAL MODAL — generic Privacy / Terms popups
// ─────────────────────────────────────────────────────────────────────
const LEGAL_CONTENT = {
  privacy: {
    title: "Privacy Policy",
    updated: "Effective May 2026",
    sections: [
      { h: "Information We Collect", b: "We collect information you voluntarily provide when you contact us or submit a quote request — typically your name, company, email address, phone number, and group census data. We also collect standard analytics information about how you use our site, including pages visited, referring source, and device type." },
      { h: "How We Use Your Information", b: "We use your information to respond to your inquiries, generate proposals, deliver our services, communicate updates about your account or coverage, and improve our website. We do not sell your personal information." },
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
      { h: "Intellectual Property", b: "All content on this site — including text, graphics, logos, images, software, and design — is the property of Kennion Benefit Advisors or its licensors and is protected by U.S. and international copyright, trademark, and other intellectual property laws. You may not reproduce, modify, distribute, or create derivative works without our written consent." },
      { h: "Informational Only", b: "The rate estimates, savings calculator, scoring tools, and other interactive features on this site are illustrative and provided for general informational purposes only. They are not insurance quotes, contracts, or binding offers. Actual rates and eligibility are determined only after submission and underwriting review of a complete group census." },
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
        {/* Header */}
        <div className="flex items-start justify-between gap-4 px-7 py-5 border-b border-border bg-muted">
          <div>
            <div className="text-[10.5px] font-mono uppercase tracking-[0.16em] text-primary">Legal</div>
            <h2 className="font-display font-[450] text-[26px] leading-tight tracking-[-0.02em] mt-1 text-foreground">{c.title}</h2>
            <div className="text-[11.5px] font-mono uppercase tracking-[0.12em] text-muted-foreground mt-1">{c.updated}</div>
          </div>
          <button onClick={onClose} aria-label="Close" className="w-9 h-9 grid place-items-center rounded-md hover:bg-black/[.04] text-muted-foreground hover:text-foreground">
            <X size={18}/>
          </button>
        </div>

        {/* Scrollable body */}
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
// FOOTER — multi-column, dark, agency-grade
// ─────────────────────────────────────────────────────────────────────
function Footer() {
  const year = new Date().getFullYear();
  const [legalOpen, setLegalOpen] = useState(null); // null | "privacy" | "terms"
  return (
    <footer className="bg-[hsl(215_35%_14%)] text-white pt-16 pb-8">
      <div className="mx-auto max-w-7xl px-6">
        <div className="grid md:grid-cols-[1.5fr_1fr_1fr_1fr] gap-10 lg:gap-14">
          {/* Brand */}
          <div>
            <div className="font-display font-[450] text-[28px] tracking-[-0.02em] leading-none">Kennion</div>
            <div className="text-[10.5px] font-mono uppercase tracking-[0.18em] text-white/55 mt-2">Benefit Advisors</div>
            <p className="mt-5 text-[13.5px] leading-[1.55] text-white/65 max-w-[26rem]">
              A private program for our clients only. Not available through outside brokers or consultants. Underwriting and approval are required, and not all groups are accepted.
            </p>
            <a href="https://calendly.com/kennion/call" onClick={openCalendly}
               className="mt-6 inline-flex items-center gap-2 text-[13px] font-medium bg-white text-[hsl(215_35%_14%)] hover:bg-white/95 px-4 py-2.5 rounded-md cursor-pointer">
              <Calendar size={14} strokeWidth={1.8}/>
              Schedule A Call
            </a>
          </div>

          <div>
            <div className="text-[10.5px] uppercase tracking-[0.16em] font-mono text-white/55 mb-4">Solutions</div>
            <ul className="space-y-2.5 text-[13.5px] text-white/80">
              <li><a href="#program" className="hover:text-white">Group Health</a></li>
              <li><a href="#program" className="hover:text-white">Dental</a></li>
              <li><a href="#program" className="hover:text-white">Vision</a></li>
              <li><a href="#program" className="hover:text-white">Supplemental</a></li>
              <li><a href="#calculator" className="hover:text-white">Savings Estimator</a></li>
            </ul>
          </div>

          <div>
            <div className="text-[10.5px] uppercase tracking-[0.16em] font-mono text-white/55 mb-4">Company</div>
            <ul className="space-y-2.5 text-[13.5px] text-white/80">
              <li><a href="#how-it-works" className="hover:text-white">How It Works</a></li>
              <li><a href="#benefits" className="hover:text-white">Why Kennion</a></li>
              <li><a href="#contact" className="hover:text-white">Contact</a></li>
              <li><Link href="/register" className="hover:text-white">Submit Your Group</Link></li>
            </ul>
          </div>

          <div>
            <div className="text-[10.5px] uppercase tracking-[0.16em] font-mono text-white/55 mb-4">Existing Clients</div>
            <ul className="space-y-2.5 text-[13.5px] text-white/80">
              <li><a href="https://go.kennion.com/support" target="_blank" rel="noopener noreferrer" className="hover:text-white">Support</a></li>
              <li><a href="http://go.kennion.com/enroll" target="_blank" rel="noopener noreferrer" className="hover:text-white">Enrollment</a></li>
              <li><a href="mailto:support@kennion.com" className="hover:text-white">support@kennion.com</a></li>
            </ul>
          </div>
        </div>

        {/* Address + compliance */}
        <div className="mt-14 pt-6 border-t border-white/10 grid md:grid-cols-2 gap-6 text-[12px] text-white/55">
          <div className="flex items-start gap-2">
            <MapPin size={13} className="text-white/55 mt-[2px]" />
            <span>2828 Old 280 Court<br />Vestavia, AL 35243</span>
          </div>
          <div className="md:text-right">
            <div className="text-[10.5px] uppercase tracking-[0.16em] font-mono text-white/45 mb-1.5">Compliance</div>
            <div>HIPAA &middot; ERISA &middot; Bank-grade encryption</div>
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
      <Hero variant="scorecard" />
      <SavingsCalculator />
      <StatsBand />
      <BenefitsProgram />
      <HowItWorks />
      <Benefits />
      <Testimonial />
      <Contact />
      <FinalCTA />
      <Footer />
    </div>
  );
}
