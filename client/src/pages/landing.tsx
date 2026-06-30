// Kennion homepage: employee benefits agency pivot
// Single-file: includes all sections, modals, motion primitives.
//
// REQUIRES (one-time setup in client/index.html <head>):
//   <link rel="preconnect" href="https://fonts.googleapis.com" />
//   <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />
//   <link href="https://fonts.googleapis.com/css2?family=Fraunces:opsz,wght@9..144,400;9..144,500;9..144,600&family=JetBrains+Mono:wght@400;500&display=swap" rel="stylesheet" />
//   <link href="https://assets.calendly.com/assets/external/widget.css" rel="stylesheet" />
//   <script src="https://assets.calendly.com/assets/external/widget.js" async></script>
//
// And add to client/src/index.css:
//   .font-display { font-family: 'Space Grotesk', 'Plus Jakarta Sans', sans-serif; letter-spacing: -0.02em; }
//   .font-display em, .font-display .italic { font-style: normal; color: hsl(var(--kn-accent)); }
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

import { useState, useEffect, useRef } from "react";
import { Link } from "wouter";
import {
  ArrowRight, ChevronRight, ChevronDown, X, Menu, Check, CheckCircle2,
  Play, MapPin, Mail, Calendar,
  ArrowUpRight, Shield, Users, FileText, HeartPulse, Eye, Smile,
  Building2, Megaphone,
} from "lucide-react";

const KENNION_LOGO_URL = "https://s3.amazonaws.com/cdn.freshdesk.com/data/helpdesk/attachments/production/5004437337/logo/qGPs3ykt503dCIwP_qHVHmcxV3JVHXZucQ.png";
const KENNION_BUILDING_URL = "https://images.squarespace-cdn.com/content/v1/650a374c4246d47a3dbe7afb/1695168363204-7SHD3HNS7AARCJU8LO2L/The%2BLindsey%2BBuilding-14.jpg";
const VIDEO_THUMB_HERO = "https://vumbnail.com/1004137913.jpg";
const VIDEO_THUMB_BENEFITS = "https://vumbnail.com/1060997796.jpg";

// ─────────────────────────────────────────────────────────────────────
// MOTION PRIMITIVES: scroll reveals + animated counters
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
// VIDEO MODAL
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
// CONTACT MODAL
// ─────────────────────────────────────────────────────────────────────
function ContactModal({ open, onClose }) {
  const [form, setForm] = useState({ name: "", company: "", email: "", employees: "", message: "", website: "" });
  const [status, setStatus] = useState("idle");

  useEffect(() => {
    if (!open) { setStatus("idle"); return; }
    const esc = (e) => { if (e.key === "Escape") onClose(); };
    document.addEventListener("keydown", esc);
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", esc);
      document.body.style.overflow = "";
    };
  }, [open, onClose]);

  if (!open) return null;

  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }));

  const submit = async (e) => {
    e.preventDefault();
    setStatus("sending");
    try {
      const res = await fetch("/api/contact", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      if (!res.ok) throw new Error("failed");
      setStatus("sent");
    } catch {
      setStatus("error");
    }
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4" onClick={onClose}>
      <div className="relative w-full max-w-lg flex flex-col bg-card rounded-2xl shadow-2xl overflow-hidden" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-start justify-between gap-4 px-7 py-5 border-b border-border bg-muted">
          <div>
            <div className="text-[10.5px] font-mono uppercase tracking-[0.16em] text-primary">Get in Touch</div>
            <h2 className="font-display font-[600] text-[24px] leading-tight tracking-[-0.02em] mt-1">Talk To An Advisor</h2>
            <p className="text-[13px] text-muted-foreground mt-1">Tell us about your company and we'll be in touch within one business day.</p>
          </div>
          <button onClick={onClose} aria-label="Close" className="w-9 h-9 grid place-items-center rounded-md hover:bg-black/[.04] text-muted-foreground hover:text-foreground shrink-0">
            <X size={18}/>
          </button>
        </div>

        {status === "sent" ? (
          <div className="px-7 py-12 text-center">
            <div className="w-12 h-12 rounded-full bg-emerald-500/15 flex items-center justify-center mx-auto mb-4">
              <CheckCircle2 size={22} className="text-emerald-600"/>
            </div>
            <h3 className="font-display text-[22px] tracking-[-0.01em]">Message Received</h3>
            <p className="mt-2 text-[14px] text-muted-foreground">We'll reach out within one business day.</p>
            <button onClick={onClose} className="mt-6 text-[13px] font-medium bg-primary text-primary-foreground hover:opacity-90 px-5 py-2.5 rounded-md">Close</button>
          </div>
        ) : (
          <form onSubmit={submit} className="px-7 py-6 space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-[11.5px] font-medium mb-1.5">Your Name <span className="text-primary">*</span></label>
                <input required value={form.name} onChange={set("name")} placeholder="Jane Smith"
                  className="w-full text-[13.5px] border border-border rounded-md px-3 py-2 bg-background focus:outline-none focus:ring-2 focus:ring-primary/30" />
              </div>
              <div>
                <label className="block text-[11.5px] font-medium mb-1.5">Company <span className="text-primary">*</span></label>
                <input required value={form.company} onChange={set("company")} placeholder="Acme Corp"
                  className="w-full text-[13.5px] border border-border rounded-md px-3 py-2 bg-background focus:outline-none focus:ring-2 focus:ring-primary/30" />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-[11.5px] font-medium mb-1.5">Email <span className="text-primary">*</span></label>
                <input required type="email" value={form.email} onChange={set("email")} placeholder="jane@acme.com"
                  className="w-full text-[13.5px] border border-border rounded-md px-3 py-2 bg-background focus:outline-none focus:ring-2 focus:ring-primary/30" />
              </div>
              <div>
                <label className="block text-[11.5px] font-medium mb-1.5">Employee Count</label>
                <input value={form.employees} onChange={set("employees")} placeholder="e.g. 45"
                  className="w-full text-[13.5px] border border-border rounded-md px-3 py-2 bg-background focus:outline-none focus:ring-2 focus:ring-primary/30" />
              </div>
            </div>
            <div>
              <label className="block text-[11.5px] font-medium mb-1.5">Message</label>
              <textarea value={form.message} onChange={set("message")} rows={3}
                placeholder="Tell us about your current benefits situation or what you're looking for..."
                className="w-full text-[13.5px] border border-border rounded-md px-3 py-2 bg-background focus:outline-none focus:ring-2 focus:ring-primary/30 resize-none" />
            </div>
            {status === "error" && (
              <p className="text-[12.5px] text-red-600">Something went wrong. Please try again in a moment.</p>
            )}
            <div className="flex items-center justify-between pt-1">
              <p className="text-[11.5px] text-muted-foreground">No obligation. Response within one business day.</p>
              <button type="submit" disabled={status === "sending"}
                className="inline-flex items-center gap-1.5 text-[13.5px] font-medium bg-primary text-primary-foreground hover:opacity-90 disabled:opacity-60 px-5 py-2.5 rounded-md shadow-sm">
                {status === "sending" ? "Sending..." : "Send Message"}
                {status !== "sending" && <ArrowRight size={14} strokeWidth={2}/>}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────
// NAV
// ─────────────────────────────────────────────────────────────────────
function Nav({ openContact }) {
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
          <a href="#solutions" className="hover:text-foreground">Solutions</a>
          <a href="#who-we-serve" className="hover:text-foreground">Who We Serve</a>
          <a href="#how-it-works" className="hover:text-foreground">How It Works</a>
          <a href="#why-us" className="hover:text-foreground">Why Kennion</a>
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

          <div className="w-px h-5 bg-border mx-2" />

          <button onClick={openContact} className="inline-flex items-center gap-1.5 text-[13.5px] font-medium text-primary-foreground bg-primary hover:opacity-90 px-3.5 py-2 rounded-md shadow-sm transition-opacity">
            Talk To An Advisor
            <ArrowRight size={14} strokeWidth={2}/>
          </button>
        </div>

        <button className="md:hidden w-9 h-9 grid place-items-center rounded-md hover:bg-black/5" onClick={() => setOpen(!open)} aria-label="Menu">
          {open ? <X size={18}/> : <Menu size={18}/>}
        </button>
      </div>

      {open && (
        <div className="md:hidden border-t border-border bg-background px-6 py-4 text-sm">
          <a href="#solutions" className="block py-2" onClick={() => setOpen(false)}>Solutions</a>
          <a href="#who-we-serve" className="block py-2" onClick={() => setOpen(false)}>Who We Serve</a>
          <a href="#how-it-works" className="block py-2" onClick={() => setOpen(false)}>How It Works</a>
          <a href="#why-us" className="block py-2" onClick={() => setOpen(false)}>Why Kennion</a>

          <div className="mt-4 pt-4 border-t border-border">
            <button onClick={() => { setOpen(false); openContact(); }} className="block w-full text-center font-medium text-primary-foreground bg-primary px-4 py-2.5 rounded-md">Talk To An Advisor</button>
          </div>

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
// HERO
// ─────────────────────────────────────────────────────────────────────
function BenefitsPackageCard() {
  const lines = [
    { icon: HeartPulse, label: "Group Health",  tag: "Included" },
    { icon: Smile,      label: "Dental",        tag: "Included" },
    { icon: Eye,        label: "Vision",        tag: "Included" },
    { icon: Shield,     label: "Supplemental",  tag: "Included" },
  ];
  const [active, setActive] = useState(0);
  useEffect(() => {
    const id = setInterval(() => setActive((i) => (i + 1) % lines.length), 2200);
    return () => clearInterval(id);
  }, []);

  return (
    <div className="relative">
      <div className="absolute -inset-6 -z-10 rounded-[28px] grid-paper opacity-50" />
      <div className="relative rounded-2xl bg-card hairline shadow-[0_24px_60px_-30px_rgba(15,30,60,.35)] overflow-hidden">
        <div className="p-5">
          <div className="flex items-start justify-between gap-3 mb-4">
            <div>
              <div className="text-[10.5px] uppercase tracking-[0.12em] text-muted-foreground">Benefits Package</div>
              <div className="text-[15px] font-semibold mt-0.5">Sample Group &middot; 45 employees</div>
            </div>
            <div className="text-[10.5px] font-mono px-2 py-1 rounded-md bg-emerald-500/15 text-emerald-700 shrink-0">
              ACTIVE
            </div>
          </div>

          <div className="space-y-2">
            {lines.map((line, i) => {
              const Icon = line.icon;
              const isActive = i === active;
              return (
                <div
                  key={line.label}
                  className={`flex items-center gap-3 p-2.5 rounded-lg transition-all duration-500 cursor-default ${isActive ? "bg-kn-accent-soft hairline" : "hover:bg-muted"}`}
                >
                  <div className={`w-8 h-8 rounded-md flex items-center justify-center shrink-0 transition-colors duration-500 ${isActive ? "bg-primary text-white" : "bg-muted text-muted-foreground"}`}>
                    <Icon size={15} strokeWidth={1.8}/>
                  </div>
                  <div className="flex-1 min-w-0 flex items-center justify-between gap-2">
                    <div className={`text-[13.5px] font-medium transition-colors ${isActive ? "text-foreground" : "text-foreground/80"}`}>{line.label}</div>
                    <div className="text-[10.5px] font-mono text-kn-accent shrink-0">{line.tag}</div>
                  </div>
                </div>
              );
            })}
          </div>

          <div className="mt-4 pt-3 border-t border-border flex items-center justify-between">
            <div>
              <div className="text-[10.5px] font-mono uppercase tracking-[0.12em] text-muted-foreground">Consolidated invoice</div>
              <div className="text-[12.5px] font-medium mt-0.5">Everything in one bill, every month</div>
            </div>
            <div className="flex items-center gap-1.5 text-[11px] font-mono text-emerald-700 bg-emerald-500/10 px-2 py-1 rounded-md">
              <Check size={11} strokeWidth={2.5}/>
              Simplified
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function Hero({ openContact }) {
  return (
    <section className="relative overflow-hidden">
      <div className="absolute inset-0 -z-10">
        <div className="absolute inset-x-0 top-0 h-[480px] bg-gradient-to-b from-[hsl(var(--primary) / 0.06)] to-transparent" />
        <div className="absolute right-[-200px] top-[-100px] w-[640px] h-[640px] rounded-full bg-primary/[0.07] blur-3xl" />
        <div className="absolute left-[-160px] bottom-[-160px] w-[420px] h-[420px] rounded-full bg-[hsl(var(--kn-accent) / 0.05)] blur-3xl" />
        <svg className="absolute inset-0 w-full h-full opacity-[0.04] mix-blend-overlay" aria-hidden="true">
          <filter id="hero-noise">
            <feTurbulence type="fractalNoise" baseFrequency="0.9" numOctaves="2" stitchTiles="stitch" />
            <feColorMatrix values="0 0 0 0 0   0 0 0 0 0   0 0 0 0 0   0 0 0 1 0" />
          </filter>
          <rect width="100%" height="100%" filter="url(#hero-noise)" />
        </svg>
      </div>

      <div className="mx-auto max-w-7xl px-6 pt-12 pb-24 lg:pt-16 lg:pb-32 grid lg:grid-cols-[1.08fr_0.92fr] gap-x-14 gap-y-14 items-center">
        <div className="relative">
          <div className="hidden lg:block absolute -left-6 top-2 bottom-2 w-px bg-kn-accent opacity-60" />

          <Reveal delay={80}>
            <h1 className="font-display font-[700] text-[44px] sm:text-[64px] lg:text-[88px] xl:text-[100px] leading-[0.98] sm:leading-[0.96] tracking-[-0.04em] text-foreground">
              Benefits<br />
              Built to<br />
              <span className="text-kn-accent">Perform.</span>
            </h1>
          </Reveal>

          <Reveal delay={160}>
            <p className="mt-7 text-[17.5px] leading-[1.55] max-w-[36rem] text-muted-foreground">
              Kennion is a technology-driven benefits agency with access to a wide variety of carriers, programs, and partners. We help employers of every size design the best possible benefits program, control cost, and improve outcomes for the company and its people.
            </p>
          </Reveal>

          <Reveal delay={240}>
            <div className="mt-9 flex flex-wrap items-center gap-3">
              <button onClick={openContact} className="inline-flex items-center gap-1.5 text-[14.5px] font-medium bg-primary text-primary-foreground hover:opacity-90 px-5 py-3 rounded-md shadow-sm transition-opacity">
                Talk To An Advisor
                <ChevronRight size={15} strokeWidth={2}/>
              </button>
            </div>
          </Reveal>

          <Reveal delay={320}>
            <div className="mt-12 flex flex-wrap items-center gap-x-7 gap-y-3 text-[12.5px] text-muted-foreground">
              <div className="flex items-center gap-2"><CheckCircle2 size={14} className="text-primary"/>Small and mid-market employers</div>
              <div className="flex items-center gap-2"><CheckCircle2 size={14} className="text-primary"/>Plans built around your budget</div>
              <div className="flex items-center gap-2"><CheckCircle2 size={14} className="text-primary"/>Employers nationwide</div>
            </div>
          </Reveal>
        </div>

        <Reveal delay={200} className="relative">
          <BenefitsPackageCard />
        </Reveal>
      </div>
    </section>
  );
}

// ─────────────────────────────────────────────────────────────────────
// SOLUTIONS: capabilities grid + video
// ─────────────────────────────────────────────────────────────────────
function Solutions() {
  const [videoOpen, setVideoOpen] = useState(false);
  const capabilities = [
    {
      icon: Shield,
      title: "Benefits Strategy & Advisory",
      body: "We learn your current program, draw on what we know works after decades of advising employers, and build a multi-year strategy aligned with your goals, your workforce, and your budget.",
    },
    {
      icon: FileText,
      title: "The Right Plan at the Right Price",
      body: "There are many ways to build and pay for a benefits program. We find the one that gives your people great coverage at the best possible price, and we show you exactly how the numbers work.",
    },
    {
      icon: Users,
      title: "Simple, Paperless Enrollment",
      body: "Modern, paperless enrollment for your whole team. It connects with the systems you already use, with digital ID cards and mobile access for every employee.",
    },
    {
      icon: HeartPulse,
      title: "Healthier, Happier Employees",
      body: "Mental health support, wellness programs, and the kind of care that keeps your team healthy and productive, lowers cost, and makes people glad they work for you.",
    },
    {
      icon: Megaphone,
      title: "Employee Education & Communication",
      body: "Great benefits only matter if your people understand them. We help your employees know what they have and how to use it, with clear communication all year, not just at enrollment.",
    },
    {
      icon: CheckCircle2,
      title: "Compliance Guidance",
      body: "Benefits come with a lot of rules, filings, and fine print. We help you stay on top of it all and point you in the right direction, so nothing catches you off guard.",
    },
  ];

  return (
    <section id="solutions" className="relative py-24 lg:py-32 bg-muted border-y border-border">
      <div className="absolute inset-0 opacity-[0.35] pointer-events-none"
           style={{ backgroundImage: "radial-gradient(circle at 1px 1px, hsl(var(--border)) 1px, transparent 1.2px)", backgroundSize: "22px 22px" }} />

      <div className="relative mx-auto max-w-7xl px-6">
        <div className="grid lg:grid-cols-[1.15fr_1fr] gap-10 lg:gap-16 items-start">
          <Reveal>
            <button onClick={() => setVideoOpen(true)}
                    className="group relative block w-full overflow-hidden rounded-2xl hairline shadow-[0_30px_80px_-30px_rgba(15,30,60,0.4)]">
              <img src={VIDEO_THUMB_HERO} alt="Kennion overview"
                   className="w-full aspect-video object-cover group-hover:scale-[1.02] transition-transform duration-500" />
              <div className="absolute inset-0 bg-gradient-to-tr from-black/40 via-black/15 to-transparent group-hover:from-black/45 transition-colors" />
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="flex h-20 w-20 items-center justify-center rounded-full bg-primary shadow-[0_12px_30px_-8px_hsl(var(--primary) / 0.7)] ring-4 ring-white/25 group-hover:scale-105 transition-transform">
                  <Play size={26} className="text-white" strokeWidth={2.2}/>
                </div>
              </div>
              <div className="absolute top-4 left-4 inline-flex items-center gap-2 px-2.5 py-1 rounded-full bg-black/55 backdrop-blur text-white text-[10.5px] font-mono uppercase tracking-[0.14em]">
                <span className="w-1.5 h-1.5 rounded-full bg-red-400" />
                Watch &middot; 1:42
              </div>
            </button>
          </Reveal>

          <Reveal delay={120}>
            <div className="inline-flex items-center gap-2 text-[11.5px] uppercase tracking-[0.18em] font-medium text-muted-foreground">
              <span className="inline-block w-6 h-px bg-kn-accent" />
              Our Capabilities
            </div>
            <h2 className="font-display font-[600] text-[34px] lg:text-[44px] leading-[1.02] tracking-[-0.03em] mt-5">
              A full-service platform. <span className="text-kn-accent">One trusted team.</span>
            </h2>
            <p className="mt-5 text-[16px] leading-[1.65] text-muted-foreground">
              From strategy and plan design to enrollment technology, compliance, and ongoing management, Kennion is a single source for your entire benefits program. We tell you what to do, how to do it, and stand behind it, so your team gets the best of the best without the complexity.
            </p>

            <div className="mt-7 grid grid-cols-3 gap-4">
              {[
                { v: "50+", l: "Years of advisory expertise" },
                { v: "85-95%", l: "Client retention rate" },
                { v: "All", l: "Your benefits in one place" },
              ].map((s, i) => (
                <div key={i} className="border-t border-border pt-3">
                  <div className="font-display font-[600] text-[36px] leading-none tracking-[-0.03em] text-foreground">
                    {s.v}<span className="text-kn-accent">.</span>
                  </div>
                  <div className="mt-2 text-[11.5px] leading-[1.45] text-muted-foreground">{s.l}</div>
                </div>
              ))}
            </div>
          </Reveal>
        </div>

        <Reveal delay={80} className="mt-14 lg:mt-16">
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-px bg-border rounded-2xl overflow-hidden hairline">
            {capabilities.map((c) => {
              const Icon = c.icon;
              return (
                <div key={c.title} className="bg-background p-6 lg:p-8">
                  <div className="w-9 h-9 rounded-lg bg-primary/10 flex items-center justify-center mb-4">
                    <Icon size={16} strokeWidth={1.8} className="text-primary"/>
                  </div>
                  <h3 className="font-semibold text-[15px] tracking-[-0.01em]">{c.title}</h3>
                  <p className="mt-2 text-[13px] leading-[1.6] text-muted-foreground">{c.body}</p>
                </div>
              );
            })}
          </div>
        </Reveal>
      </div>
      <VideoModal open={videoOpen} onClose={() => setVideoOpen(false)} videoId="1004137913" />
    </section>
  );
}

// ─────────────────────────────────────────────────────────────────────
// IMPACT BAND: firm-level proof points (no carrier / plan counts)
// ─────────────────────────────────────────────────────────────────────
function ImpactBand() {
  const stats = [
    { v: "50+", l: "Years advising employers nationwide" },
    { v: "Nationwide", l: "Access, coast to coast" },
    { v: "85-95%", l: "Client retention, year over year" },
    { v: "100%", l: "Client-first, every time" },
  ];
  return (
    <section className="relative bg-primary text-primary-foreground overflow-hidden">
      <div className="absolute inset-0 grid-paper opacity-[0.06]" />
      <div className="absolute right-[-140px] top-[-140px] w-[460px] h-[460px] rounded-full bg-[hsl(var(--kn-accent)/0.18)] blur-3xl" />
      <div className="relative mx-auto max-w-7xl px-6 py-20 lg:py-24">
        <Reveal className="max-w-3xl">
          <div className="inline-flex items-center gap-2 text-[11.5px] uppercase tracking-[0.18em] font-medium text-white/70">
            <span className="inline-block w-6 h-px bg-kn-accent" />
            The Kennion Difference
          </div>
          <h2 className="font-display font-[600] text-[32px] lg:text-[46px] leading-[1.04] tracking-[-0.03em] mt-5">
            A national agency with a <span className="text-kn-accent">personal touch.</span>
          </h2>
          <p className="mt-4 text-[15.5px] leading-[1.6] text-white/75 max-w-2xl">
            Trusted by employers across the country for over 50 years. Big enough to deliver the best of the best, small enough to know your name.
          </p>
        </Reveal>

        <div className="mt-12 grid grid-cols-2 lg:grid-cols-4 gap-px bg-white/10 rounded-2xl overflow-hidden">
          {stats.map((s) => (
            <div key={s.l} className="bg-primary p-7 lg:p-8">
              <div className="flex items-end min-h-[44px] lg:min-h-[54px]">
                <AnimatedNumber
                  value={s.v}
                  className={`font-display font-[600] leading-[0.9] tracking-[-0.04em] whitespace-nowrap ${/[a-z]/i.test(s.v) ? "text-[30px] lg:text-[38px]" : "text-[44px] lg:text-[54px]"}`}
                />
              </div>
              <div className="mt-3 text-[12.5px] leading-[1.45] text-white/70">{s.l}</div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

// ─────────────────────────────────────────────────────────────────────
// WHO WE SERVE
// ─────────────────────────────────────────────────────────────────────
function WhoWeServe() {
  const segments = [
    {
      tag: "Small Businesses",
      heading: "Build a program that competes with the big guys.",
      body: "When you're a smaller company, every dollar matters. We help you get the kind of benefits and pricing that used to be reserved for big companies, without needing a big HR team to manage it.",
      items: ["2-50 employees", "Great coverage at a price that fits", "Simple, guided enrollment", "One bill for everything"],
    },
    {
      tag: "Growing Companies",
      heading: "Benefits that grow right along with you.",
      body: "As you add people, your benefits get more complicated and more expensive. We bring smarter, more cost-effective options and handle the moving parts so growth never becomes a headache.",
      items: ["51-200 employees", "Smarter ways to control cost", "Proven strategies that work", "Multi-location and multi-state support"],
    },
    {
      tag: "Mid-Market Employers",
      heading: "Sophisticated benefits, without the complexity.",
      body: "At this size you can do more with your benefits, but you don't always have the in-house expertise to pull it off. We work like part of your team to make it happen.",
      items: ["201-500 employees", "Advanced cost-saving strategies", "A team that works like part of yours", "Wellbeing programs that perform"],
    },
  ];

  return (
    <section id="who-we-serve" className="py-24 lg:py-32">
      <div className="mx-auto max-w-7xl px-6">
        <Reveal className="max-w-2xl mb-14">
          <div className="inline-flex items-center gap-2 text-[11.5px] uppercase tracking-[0.18em] font-medium text-muted-foreground">
            <span className="inline-block w-6 h-px bg-kn-accent" />
            Who We Serve
          </div>
          <h2 className="font-display font-[600] text-[44px] lg:text-[60px] leading-[0.98] tracking-[-0.03em] mt-5">
            Built for small and<br /><span className="text-kn-accent">mid-market employers.</span>
          </h2>
          <p className="mt-5 text-[16.5px] leading-[1.6] text-muted-foreground max-w-xl">
            From a small business to a 500-person company, we bring the expertise, the technology, and the relationships to give your people benefits they'll love, without the big-company runaround.
          </p>
        </Reveal>

        <div className="grid md:grid-cols-3 gap-px bg-border rounded-xl overflow-hidden hairline">
          {segments.map((s, i) => (
            <Reveal key={s.tag} delay={i * 80}>
              <div className="bg-card p-8 h-full flex flex-col">
                <div className="text-[10.5px] font-mono uppercase tracking-[0.16em] text-primary mb-3">{s.tag}</div>
                <h3 className="font-display font-[600] text-[22px] leading-[1.15] tracking-[-0.015em]">{s.heading}</h3>
                <p className="mt-3 text-[13.5px] leading-[1.6] text-muted-foreground flex-1">{s.body}</p>
                <ul className="mt-5 pt-5 border-t border-border space-y-2">
                  {s.items.map((item) => (
                    <li key={item} className="flex items-start gap-2 text-[12.5px] text-muted-foreground">
                      <Check size={12} className="text-primary mt-0.5 shrink-0" strokeWidth={2.5}/>
                      {item}
                    </li>
                  ))}
                </ul>
              </div>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  );
}

// ─────────────────────────────────────────────────────────────────────
// HOW IT WORKS: Assess > Design > Implement > Optimize
// ─────────────────────────────────────────────────────────────────────
function HowItWorks({ openContact }) {
  const steps = [
    {
      n: "01", t: "Assess",
      body: "We start by understanding your current program, your people, and your goals. Benefits strategy begins with listening, not with a product sheet.",
      preview: <AssessPreview />,
    },
    {
      n: "02", t: "Design",
      body: "We map out your best options and show you exactly what each one means for your costs and your people, in plain language, so the right choice is obvious.",
      preview: <DesignPreview />,
    },
    {
      n: "03", t: "Implement",
      body: "Our technology platform makes rollout straightforward: digital enrollment, carrier integrations, and a guided experience for your HR team and your employees.",
      preview: <ImplementPreview />,
    },
    {
      n: "04", t: "Optimize",
      body: "Benefits management doesn't stop at go-live. We stay close, take care of the details, and keep improving your program for the long term, doing exactly what we said we would.",
      preview: <OptimizePreview />,
    },
  ];

  return (
    <section id="how-it-works" className="py-24 lg:py-32 bg-muted border-y border-border">
      <div className="mx-auto max-w-7xl px-6">
        <Reveal className="max-w-2xl mb-14">
          <div className="inline-flex items-center gap-2 text-[11.5px] uppercase tracking-[0.18em] font-medium text-muted-foreground">
            <span className="inline-block w-6 h-px bg-kn-accent" />
            Our Process
          </div>
          <h2 className="font-display font-[600] text-[44px] lg:text-[60px] leading-[0.98] tracking-[-0.03em] mt-5">
            How We <span className="text-kn-accent">Work</span>
          </h2>
          <p className="mt-5 text-[16.5px] leading-[1.6] text-muted-foreground max-w-xl">
            A disciplined advisory process built around your organization. We don't hand you a binder and disappear. We manage your benefits program like a strategic partner, year after year.
          </p>
        </Reveal>

        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-px bg-border rounded-xl overflow-hidden hairline">
          {steps.map((s) => (
            <div key={s.n} className="bg-card p-6 flex flex-col">
              <div className="flex items-baseline justify-between">
                <span className="font-mono text-[11px] uppercase tracking-[0.14em] text-primary">{s.n}</span>
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

        <Reveal className="mt-12 text-center">
          <button onClick={openContact} className="inline-flex items-center gap-1.5 text-[14.5px] font-medium bg-primary text-primary-foreground hover:opacity-90 px-5 py-3 rounded-md shadow-sm">
            Talk To An Advisor
            <ArrowRight size={15} strokeWidth={2}/>
          </button>
        </Reveal>
      </div>
    </section>
  );
}

function AssessPreview() {
  return (
    <div className="h-full w-full p-3 space-y-2">
      {[
        { label: "Current program", val: "Reviewed" },
        { label: "Your priorities", val: "Documented" },
        { label: "What's working", val: "Identified" },
        { label: "Where we can help", val: "Flagged" },
      ].map((item, i) => (
        <div key={i} className="flex items-center justify-between text-[9.5px]">
          <span className="text-muted-foreground">{item.label}</span>
          <span className="font-mono text-primary">{item.val}</span>
        </div>
      ))}
    </div>
  );
}

function DesignPreview() {
  const rows = [["Your Plan Today","$412"],["Our Recommendation","$361"],["Premium Option","$448"]];
  return (
    <div className="h-full w-full p-3 font-mono text-[9.5px] leading-[1.4]">
      <div className="text-[8.5px] uppercase tracking-[0.12em] text-muted-foreground mb-1.5">Plan Options &middot; Per Employee</div>
      {rows.map(([plan, rate], i) => (
        <div key={i} className={`flex items-center justify-between py-0.5 border-b border-dashed border-border last:border-0 ${i===1?"text-primary font-medium":""}`}>
          <span className="truncate">{plan}</span>
          <span className="tabular-nums shrink-0 ml-2">{rate}</span>
        </div>
      ))}
    </div>
  );
}

function ImplementPreview() {
  return (
    <div className="h-full w-full p-3 flex flex-col justify-center gap-2">
      {[["Carrier Setup","Complete"],["HR Integration","Complete"],["Employee Enrollment","Active"],["Go-Live","Confirmed"]].map(([name,status],i)=>(
        <div key={i} className="flex items-center gap-2 text-[9.5px]">
          <div className="w-1.5 h-1.5 rounded-full shrink-0 bg-emerald-500"/>
          <span className="text-muted-foreground truncate flex-1">{name}</span>
          <span className="font-mono text-emerald-600">{status}</span>
        </div>
      ))}
    </div>
  );
}

function OptimizePreview() {
  return (
    <div className="h-full w-full p-3 space-y-2.5">
      {[
        { l: "Dedicated Service Team", s: "Active" },
        { l: "Proactive Check-ins", s: "Ongoing" },
        { l: "Issues Resolved", s: "Same Day" },
        { l: "Program Health", s: "Strong" },
      ].map((item, i) => (
        <div key={i} className="flex items-center justify-between text-[9.5px]">
          <span className="text-muted-foreground">{item.l}</span>
          <span className={`font-mono ${item.l === "Program Health" ? "text-emerald-600" : "text-primary"}`}>{item.s}</span>
        </div>
      ))}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────
// WHY KENNION
// ─────────────────────────────────────────────────────────────────────
function WhyKennion({ openContact }) {
  const differentiators = [
    {
      icon: Building2,
      title: "Deep Carrier Access",
      body: "Decades of national carrier relationships and buying power give our clients access to programs and pricing that most agencies simply can't match.",
    },
    {
      icon: FileText,
      title: "Coverage That Fits Your Budget",
      body: "There's no one-size-fits-all in benefits. We know every way to build and pay for a program, and we find the one that gives your people more while costing you less.",
    },
    {
      icon: Users,
      title: "Technology, Backed by Real People",
      body: "Benefits are complicated. Our technology makes them simpler, paperless enrollment, mobile access, and far fewer headaches, so your team spends less time on busywork and more time on the people who matter.",
    },
    {
      icon: HeartPulse,
      title: "Real Support, Real People",
      body: "You get a real team, not a call center. When something needs fixing, a person who knows your account picks up and gets it done, fast. We do what we say we will do.",
    },
    {
      icon: Calendar,
      title: "Long-Term Solutions That Work",
      body: "We know what works and what doesn't. Instead of chasing quick fixes, we build programs designed to perform for years and stay close to make sure they do. Solutions, not transactions.",
    },
    {
      icon: Shield,
      title: "Compliance Support",
      body: "Benefits compliance is complicated and always changing. We help you understand what applies to you and keep you pointed in the right direction, so you're never caught off guard.",
    },
  ];

  return (
    <section id="why-us" className="py-24 lg:py-32">
      <div className="mx-auto max-w-7xl px-6">
        <div className="grid lg:grid-cols-[1fr_1.5fr] gap-12 lg:gap-20 items-start">
          <Reveal>
            <div className="inline-flex items-center gap-2 text-[11.5px] uppercase tracking-[0.18em] font-medium text-muted-foreground">
              <span className="inline-block w-6 h-px bg-kn-accent" />
              Why Kennion
            </div>
            <h2 className="font-display font-[600] text-[44px] lg:text-[60px] leading-[0.98] tracking-[-0.03em] mt-5">
              The difference an <span className="text-kn-accent">experienced team</span> makes.
            </h2>
            <p className="mt-5 text-[16px] leading-[1.6] text-muted-foreground max-w-md">
              Fifty years of relationships, programs we know will perform, and a team that does what it says. That's why clients come to us, and why they stay.
            </p>
            <div className="mt-8">
              <button onClick={openContact} className="inline-flex items-center gap-1.5 text-[14.5px] font-medium bg-primary text-primary-foreground hover:opacity-90 px-5 py-3 rounded-md shadow-sm">
                Talk To An Advisor
                <ArrowRight size={15} strokeWidth={2}/>
              </button>
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
    <section className="py-24 lg:py-32 bg-muted border-y border-border">
      <div className="mx-auto max-w-4xl px-6 text-center">
        <Reveal>
          <div className="inline-flex items-center gap-2 text-[11.5px] uppercase tracking-[0.18em] font-medium text-muted-foreground">
            <span className="inline-block w-6 h-px bg-kn-accent" />
            From a competitor
            <span className="inline-block w-6 h-px bg-kn-accent" />
          </div>
          <blockquote className="font-display font-[600] text-[30px] sm:text-[42px] lg:text-[54px] leading-[1.12] tracking-[-0.025em] mt-8 text-balance">
            &ldquo;Y&rsquo;all are unbeatable in the market with the prospects that we have met with that are current Kennion clients.&rdquo;
          </blockquote>
          <figcaption className="mt-8 text-[14px] text-muted-foreground">
            <span className="font-medium text-foreground">Senior Executive</span>
            <span className="mx-1.5">&middot;</span>
            Top-25 U.S. broker
          </figcaption>

          <div className="mt-14 pt-7 border-t border-border max-w-2xl mx-auto text-[14px] leading-[1.6] text-muted-foreground">
            <span className="text-[10.5px] font-mono uppercase tracking-[0.18em] text-primary block mb-2">Why our clients stay</span>
            Clients partner with us because we know what works. They stay because of
            <span className="text-foreground font-medium"> how we take care of them</span>, year after year, and because we do what we say we will do.
            That's why our client retention runs 85 to 95%, year after year.
          </div>
        </Reveal>
      </div>
    </section>
  );
}

// ─────────────────────────────────────────────────────────────────────
// CONTACT: inline form
// ─────────────────────────────────────────────────────────────────────
function Contact() {
  const [form, setForm] = useState({ name: "", company: "", email: "", employees: "", message: "", website: "" });
  const [status, setStatus] = useState("idle");

  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }));

  const submit = async (e) => {
    e.preventDefault();
    setStatus("sending");
    try {
      const res = await fetch("/api/contact", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      if (!res.ok) throw new Error("failed");
      setStatus("sent");
    } catch {
      setStatus("error");
    }
  };

  return (
    <section id="contact" className="py-24 lg:py-32">
      <div className="mx-auto max-w-7xl px-6">
        <div className="grid lg:grid-cols-[1fr_1.25fr] gap-12 lg:gap-20 items-start">
          <Reveal>
            <div className="inline-flex items-center gap-2 text-[11.5px] uppercase tracking-[0.18em] font-medium text-muted-foreground">
              <span className="inline-block w-6 h-px bg-kn-accent" />
              Contact
            </div>
            <h2 className="font-display font-[600] text-[44px] lg:text-[56px] leading-[0.98] tracking-[-0.03em] mt-5">
              Let&rsquo;s talk <span className="text-kn-accent">benefits.</span>
            </h2>
            <p className="mt-5 text-[16.5px] leading-[1.6] text-muted-foreground">
              Whether you're building a program from scratch, unhappy with your current broker, or just curious what the market looks like right now, we're a great first call.
            </p>

            <div className="mt-10 relative overflow-hidden rounded-2xl hairline">
              <img src={KENNION_BUILDING_URL} alt="Kennion Benefit Advisors" className="w-full aspect-[4/3] object-cover object-center" />
            </div>

            <dl className="mt-8 space-y-4 text-[14px]">
              <div className="flex items-start gap-3 border-t border-border pt-4">
                <MapPin size={15} className="text-primary mt-0.5 shrink-0"/>
                <div>
                  <dt className="text-[11px] uppercase tracking-[0.1em] text-muted-foreground">Headquarters</dt>
                  <dd className="mt-0.5">2828 Old 280 Court, Vestavia, AL 35243</dd>
                </div>
              </div>
            </dl>
          </Reveal>

          <Reveal delay={120}>
            <div className="bg-card rounded-2xl hairline shadow-[0_20px_50px_-20px_rgba(15,30,60,.18)] overflow-hidden">
              <div className="px-7 py-5 border-b border-border bg-muted">
                <div className="text-[10.5px] font-mono uppercase tracking-[0.16em] text-primary">Inquire</div>
                <h3 className="font-display font-[600] text-[22px] tracking-[-0.02em] mt-1">Tell us about your company</h3>
                <p className="text-[13px] text-muted-foreground mt-0.5">No obligation. We'll respond within one business day.</p>
              </div>

              {status === "sent" ? (
                <div className="px-7 py-14 text-center">
                  <div className="w-14 h-14 rounded-full bg-emerald-500/15 flex items-center justify-center mx-auto mb-4">
                    <CheckCircle2 size={24} className="text-emerald-600"/>
                  </div>
                  <h4 className="font-display text-[20px] tracking-[-0.01em]">Message Received</h4>
                  <p className="mt-2 text-[14px] text-muted-foreground">We'll be in touch within one business day.</p>
                </div>
              ) : (
                <form onSubmit={submit} className="px-7 py-6 space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-[11.5px] font-medium mb-1.5">Name <span className="text-primary">*</span></label>
                      <input required value={form.name} onChange={set("name")} placeholder="Jane Smith"
                        className="w-full text-[13.5px] border border-border rounded-md px-3 py-2 bg-background focus:outline-none focus:ring-2 focus:ring-primary/30" />
                    </div>
                    <div>
                      <label className="block text-[11.5px] font-medium mb-1.5">Company <span className="text-primary">*</span></label>
                      <input required value={form.company} onChange={set("company")} placeholder="Acme Corp"
                        className="w-full text-[13.5px] border border-border rounded-md px-3 py-2 bg-background focus:outline-none focus:ring-2 focus:ring-primary/30" />
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-[11.5px] font-medium mb-1.5">Email <span className="text-primary">*</span></label>
                      <input required type="email" value={form.email} onChange={set("email")} placeholder="jane@acme.com"
                        className="w-full text-[13.5px] border border-border rounded-md px-3 py-2 bg-background focus:outline-none focus:ring-2 focus:ring-primary/30" />
                    </div>
                    <div>
                      <label className="block text-[11.5px] font-medium mb-1.5">Employee Count</label>
                      <input value={form.employees} onChange={set("employees")} placeholder="e.g. 45"
                        className="w-full text-[13.5px] border border-border rounded-md px-3 py-2 bg-background focus:outline-none focus:ring-2 focus:ring-primary/30" />
                    </div>
                  </div>
                  <div>
                    <label className="block text-[11.5px] font-medium mb-1.5">Message</label>
                    <textarea value={form.message} onChange={set("message")} rows={4}
                      placeholder="Tell us about your current benefits situation or what you're looking for..."
                      className="w-full text-[13.5px] border border-border rounded-md px-3 py-2 bg-background focus:outline-none focus:ring-2 focus:ring-primary/30 resize-none" />
                  </div>
                  {status === "error" && (
                    <p className="text-[12.5px] text-red-600">Something went wrong. Please try again in a moment.</p>
                  )}
                  <button type="submit" disabled={status === "sending"}
                    className="w-full inline-flex items-center justify-center gap-1.5 text-[14.5px] font-medium bg-primary text-primary-foreground hover:opacity-90 disabled:opacity-60 px-5 py-3 rounded-md shadow-sm">
                    {status === "sending" ? "Sending..." : "Send Message"}
                    {status !== "sending" && <ArrowRight size={15} strokeWidth={2}/>}
                  </button>
                </form>
              )}
            </div>
          </Reveal>
        </div>
      </div>
    </section>
  );
}

// ─────────────────────────────────────────────────────────────────────
// FINAL CTA
// ─────────────────────────────────────────────────────────────────────
function FinalCTA({ openContact }) {
  return (
    <section className="py-24 lg:py-32 bg-primary text-primary-foreground">
      <div className="mx-auto max-w-3xl px-6 text-center">
        <h2 className="font-display text-[40px] lg:text-[52px] leading-[1.05] tracking-[-0.02em]">
          Better benefits start with a better advisor.
        </h2>
        <p className="mt-5 text-[17px] leading-[1.55] text-white/85 max-w-xl mx-auto">
          We bring decades of market expertise, access to a wide variety of carriers and partners, and a technology platform built for scale. Let's build the best possible benefits program for your company and your people.
        </p>
        <div className="mt-9 flex flex-wrap items-center justify-center gap-3">
          <button onClick={openContact} className="inline-flex items-center gap-1.5 text-[14.5px] font-medium bg-white text-primary hover:bg-white/95 px-6 py-3 rounded-md shadow-sm">
            Talk To An Advisor
            <ArrowRight size={15} strokeWidth={2}/>
          </button>
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
      { h: "Information We Collect", b: "We collect information you voluntarily provide when you contact us or submit a quote request, typically your name, company, email address, and group census data. We also collect standard analytics information about how you use our site, including pages visited, referring source, and device type." },
      { h: "How We Use Your Information", b: "We use your information to respond to your inquiries, generate proposals, deliver our services, communicate updates about your account or coverage, and improve our website. We do not sell your personal information." },
      { h: "How We Share Information", b: "We share information with carriers, third-party administrators, and other service providers necessary to deliver our services. We may also disclose information when required by law, in response to a subpoena, or to protect our rights, safety, or property." },
      { h: "Data Security", b: "We use industry-standard administrative, technical, and physical safeguards to protect your information. No method of transmission over the Internet or electronic storage is 100% secure, and we cannot guarantee absolute security." },
      { h: "Your Choices", b: "You may opt out of marketing communications at any time using the unsubscribe link in any email or by contacting us. You may also request access to, correction of, or deletion of your information, subject to applicable legal and recordkeeping obligations." },
      { h: "Cookies & Tracking", b: "Our site uses cookies and similar technologies for functionality and analytics. You can disable cookies in your browser settings, though some site features may not work as intended." },
      { h: "Children's Privacy", b: "Our site is not directed to children under 13, and we do not knowingly collect personal information from children." },
      { h: "Changes to This Policy", b: "We may update this policy from time to time. The effective date above reflects the most recent revision. Continued use of the site after changes are posted constitutes acceptance of those changes." },
      { h: "Contact", b: "Questions about this policy can be submitted through the contact form on our website." },
    ],
  },
  terms: {
    title: "Terms of Use",
    updated: "Effective May 2026",
    sections: [
      { h: "Acceptance of Terms", b: "By accessing or using this website, you agree to be bound by these Terms of Use and our Privacy Policy. If you do not agree, please do not use the site." },
      { h: "Use of the Site", b: "You may use this site for lawful business inquiry and informational purposes. You may not scrape, copy, redistribute, reverse engineer, or otherwise misuse the site or its content. Automated access without our written permission is prohibited." },
      { h: "Intellectual Property", b: "All content on this site, including text, graphics, logos, images, software, and design, is the property of Kennion Benefit Advisors or its licensors and is protected by U.S. and international copyright, trademark, and other intellectual property laws. You may not reproduce, modify, distribute, or create derivative works without our written consent." },
      { h: "Informational Only", b: "Content on this site is provided for general informational purposes only and does not constitute insurance quotes, contracts, or binding offers. Actual rates and eligibility are determined only after underwriting review of a complete group census by the applicable carrier." },
      { h: "No Professional Advice", b: "Nothing on this site constitutes legal, tax, financial, or insurance advice. You should consult a qualified professional before making decisions based on information from this site." },
      { h: "Disclaimers", b: "This site is provided as is and as available, without warranties of any kind, express or implied, including warranties of merchantability, fitness for a particular purpose, or non-infringement. We do not warrant that the site will be uninterrupted, error-free, or free of viruses or other harmful components." },
      { h: "Limitation of Liability", b: "To the fullest extent permitted by law, Kennion Benefit Advisors and its affiliates will not be liable for any indirect, incidental, special, consequential, or punitive damages arising out of or related to your use of this site, even if we have been advised of the possibility of such damages." },
      { h: "Governing Law", b: "These Terms are governed by the laws of the State of Alabama, without regard to its conflict of laws principles. Any dispute will be brought exclusively in the state or federal courts located in Jefferson County, Alabama." },
      { h: "Changes to These Terms", b: "We may revise these Terms at any time. Revisions take effect when posted. Your continued use of the site after revisions are posted constitutes acceptance of the updated Terms." },
      { h: "Contact", b: "Questions about these Terms can be submitted through the contact form on our website." },
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
            <div className="text-[10.5px] font-mono uppercase tracking-[0.16em] text-primary">Legal</div>
            <h2 className="font-display font-[600] text-[26px] leading-tight tracking-[-0.02em] mt-1 text-foreground">{c.title}</h2>
            <div className="text-[11.5px] font-mono uppercase tracking-[0.12em] text-muted-foreground mt-1">{c.updated}</div>
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
function Footer({ openContact }) {
  const year = new Date().getFullYear();
  const [legalOpen, setLegalOpen] = useState(null);
  return (
    <footer className="bg-[hsl(215_35%_14%)] text-white pt-16 pb-8">
      <div className="mx-auto max-w-7xl px-6">
        <div className="grid md:grid-cols-[1.5fr_1fr_1fr_1fr] gap-10 lg:gap-14">
          <div>
            <div className="font-display font-[600] text-[28px] tracking-[-0.02em] leading-none">Kennion</div>
            <div className="text-[10.5px] font-mono uppercase tracking-[0.18em] text-white/55 mt-2">Benefit Advisors &middot; 50+ Years</div>
            <p className="mt-5 text-[13.5px] leading-[1.55] text-white/65 max-w-[26rem]">
              A technology-driven, full-service employee benefits agency. For over 50 years we've helped small and mid-market employers, nationwide, give their people better benefits and taken great care of them along the way.
            </p>
            <button onClick={openContact}
               className="mt-6 inline-flex items-center gap-2 text-[13px] font-medium bg-white text-[hsl(215_35%_14%)] hover:bg-white/95 px-4 py-2.5 rounded-md cursor-pointer">
              <Mail size={14} strokeWidth={1.8}/>
              Talk To An Advisor
            </button>
          </div>

          <div>
            <div className="text-[10.5px] uppercase tracking-[0.16em] font-mono text-white/55 mb-4">Capabilities</div>
            <ul className="space-y-2.5 text-[13.5px] text-white/80">
              <li><a href="#solutions" className="hover:text-white">Benefits Strategy</a></li>
              <li><a href="#solutions" className="hover:text-white">Plan Design</a></li>
              <li><a href="#solutions" className="hover:text-white">Digital Enrollment</a></li>
              <li><a href="#solutions" className="hover:text-white">Compliance Support</a></li>
            </ul>
          </div>

          <div>
            <div className="text-[10.5px] uppercase tracking-[0.16em] font-mono text-white/55 mb-4">Company</div>
            <ul className="space-y-2.5 text-[13.5px] text-white/80">
              <li><a href="#who-we-serve" className="hover:text-white">Who We Serve</a></li>
              <li><a href="#how-it-works" className="hover:text-white">How It Works</a></li>
              <li><a href="#why-us" className="hover:text-white">Why Kennion</a></li>
              <li><button onClick={openContact} className="hover:text-white text-left">Talk To An Advisor</button></li>
            </ul>
          </div>

          <div>
            <div className="text-[10.5px] uppercase tracking-[0.16em] font-mono text-white/55 mb-4">Existing Clients</div>
            <ul className="space-y-2.5 text-[13.5px] text-white/80">
              <li><a href="https://go.kennion.com/support" target="_blank" rel="noopener noreferrer" className="hover:text-white">Support</a></li>
              <li><a href="http://go.kennion.com/enroll" target="_blank" rel="noopener noreferrer" className="hover:text-white">Enrollment</a></li>
            </ul>
          </div>
        </div>

        <div className="mt-14 pt-6 border-t border-white/10 text-[12px] text-white/55">
          <div className="flex items-start gap-2">
            <MapPin size={13} className="text-white/55 mt-[2px]" />
            <span>2828 Old 280 Court, Vestavia, AL 35243</span>
          </div>
        </div>

        <div className="mt-8 pt-6 border-t border-white/10 flex flex-wrap items-center justify-between gap-3 text-[11.5px] text-white/45">
          <span>&#169; {year} Kennion Benefit Advisors. All rights reserved.</span>
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
  const [contactOpen, setContactOpen] = useState(false);
  const openContact = () => setContactOpen(true);

  return (
    <div className="min-h-screen bg-background text-foreground antialiased">
      <ContactModal open={contactOpen} onClose={() => setContactOpen(false)} />
      <Nav openContact={openContact} />
      <Hero openContact={openContact} />
      <Solutions />
      <ImpactBand />
      <WhoWeServe />
      <HowItWorks openContact={openContact} />
      <WhyKennion openContact={openContact} />
      <Testimonial />
      <Contact />
      <FinalCTA openContact={openContact} />
      <Footer openContact={openContact} />
    </div>
  );
}
