import { useState } from "react";
import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import {
  TrendingDown,
  Users,
  BarChart3,
  ArrowRight,
  CheckCircle2,
  Building2,
  FileBarChart,
  Lock,
  Zap,
  ChevronRight,
  Activity,
  Shield,
  Mail,
  MapPin,
  Play,
  X,
} from "lucide-react";
import { KennionLogo } from "@/components/kennion-logo";

function Navbar() {
  return (
    <nav className="sticky top-0 z-50 border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/80">
      <div className="mx-auto max-w-7xl px-6 relative">
        {/* Main Header Row */}
        <div className="flex items-center justify-between gap-6 py-3">
          {/* Left: Logo */}
          <KennionLogo size="md" />

          {/* Center: Primary Navigation */}
          <div className="hidden md:flex items-center gap-6">
            <a href="#how-it-works" className="text-sm text-muted-foreground hover:text-foreground transition-colors" data-testid="link-how-it-works">
              How It Works
            </a>
            <a href="#features" className="text-sm text-muted-foreground hover:text-foreground transition-colors" data-testid="link-features">
              Platform
            </a>
            <a href="#benefits" className="text-sm text-muted-foreground hover:text-foreground transition-colors" data-testid="link-benefits">
              Benefits
            </a>
            <a href="#contact" className="text-sm text-muted-foreground hover:text-foreground transition-colors" data-testid="link-contact">
              Contact
            </a>
          </div>

          {/* Right: Client Links */}
          <div className="hidden md:flex items-center gap-2">
            <span className="text-xs text-muted-foreground font-medium">Existing Clients:</span>
            <a
              href="https://go.kennion.com/support"
              target="_blank"
              rel="noopener noreferrer"
              className="text-xs text-muted-foreground hover:text-primary transition-colors"
            >
              Support
            </a>
            <span className="text-muted-foreground/50">•</span>
            <a
              href="http://go.kennion.com/enroll"
              target="_blank"
              rel="noopener noreferrer"
              className="text-xs text-muted-foreground hover:text-primary transition-colors"
            >
              Login
            </a>
          </div>
        </div>

        {/* Tab Section: CTAs sit on the border */}
        <div className="absolute right-6 top-full z-10">
          <div className="flex items-center gap-3 px-4 py-2 rounded-lg border border-border bg-background shadow-md">
            <Link href="/login">
              <Button variant="ghost" size="default" data-testid="link-login">
                Log In
              </Button>
            </Link>
            <Link href="/register">
              <Button size="default" className="font-semibold shadow-sm" data-testid="link-register">
                Get Started <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            </Link>
          </div>
        </div>
      </div>
    </nav>
  );
}

function VideoModal({ open, onClose, videoId }: { open: boolean; onClose: () => void; videoId: string }) {
  if (!open) return null;
  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center bg-black/70 backdrop-blur-sm"
      onClick={onClose}
    >
      <div className="relative w-full max-w-4xl mx-4" onClick={(e) => e.stopPropagation()}>
        <button
          onClick={onClose}
          className="absolute -top-10 right-0 text-white hover:text-white/80 transition-colors"
          aria-label="Close video"
        >
          <X className="h-6 w-6" />
        </button>
        <div className="relative w-full" style={{ paddingBottom: "56.25%" }}>
          <iframe
            src={`https://player.vimeo.com/video/${videoId}?autoplay=1`}
            className="absolute inset-0 w-full h-full rounded-lg"
            allow="autoplay; fullscreen; picture-in-picture"
            allowFullScreen
          />
        </div>
      </div>
    </div>
  );
}

function HeroSection() {
  const [videoOpen, setVideoOpen] = useState(false);

  return (
    <section className="relative overflow-hidden">
      <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-transparent to-primary/3 dark:from-primary/10 dark:to-primary/5" />
      <div className="absolute top-20 right-0 w-96 h-96 bg-primary/5 rounded-full blur-3xl dark:bg-primary/10" />
      <div className="absolute bottom-0 left-0 w-72 h-72 bg-primary/3 rounded-full blur-3xl dark:bg-primary/8" />
      <div className="relative mx-auto max-w-7xl px-6 py-20 md:py-28 lg:py-32">
        <div className="mx-auto max-w-3xl text-center">
          {/* Video Thumbnail */}
          <div className="mb-8 mx-auto max-w-2xl">
            <button
              onClick={() => setVideoOpen(true)}
              className="group relative block w-full overflow-hidden rounded-xl border shadow-lg hover:shadow-xl transition-shadow"
            >
              <img
                src="https://vumbnail.com/1004137913.jpg"
                alt="Watch how Kennion works"
                className="w-full aspect-video object-cover group-hover:scale-105 transition-transform duration-300"
              />
              <div className="absolute inset-0 flex items-center justify-center bg-black/20 group-hover:bg-black/30 transition-colors">
                <div className="flex h-16 w-16 items-center justify-center rounded-full bg-primary shadow-lg">
                  <Play className="h-7 w-7 text-primary-foreground ml-1" />
                </div>
              </div>
            </button>
          </div>

          <h1 className="text-4xl font-bold tracking-tight sm:text-5xl lg:text-6xl">
            Better Benefits.{" "}
            <span className="text-primary">Lower Rates.</span>
          </h1>
          <p className="mt-6 text-lg text-muted-foreground leading-relaxed max-w-2xl mx-auto">
            Our proprietary underwriting platform analyzes your group's risk profile to unlock exclusive
            benefits programs that deliver premium coverage at significantly lower costs.
          </p>
          <div className="mt-10 flex flex-col sm:flex-row items-center justify-center gap-3">
            <Link href="/register">
              <Button size="lg" data-testid="button-hero-cta">
                Submit Your Group <ChevronRight className="ml-1 h-4 w-4" />
              </Button>
            </Link>
            <a href="#how-it-works">
              <Button variant="outline" size="lg" data-testid="button-hero-learn">
                Learn How It Works
              </Button>
            </a>
          </div>
          <div className="mt-12 flex flex-wrap items-center justify-center gap-6 text-sm text-muted-foreground">
            <div className="flex items-center gap-1.5">
              <CheckCircle2 className="h-4 w-4 text-primary" />
              <span>No obligation</span>
            </div>
            <div className="flex items-center gap-1.5">
              <CheckCircle2 className="h-4 w-4 text-primary" />
              <span>Free qualification analysis</span>
            </div>
            <div className="flex items-center gap-1.5">
              <CheckCircle2 className="h-4 w-4 text-primary" />
              <span>Results in minutes</span>
            </div>
          </div>
        </div>
      </div>
      <VideoModal open={videoOpen} onClose={() => setVideoOpen(false)} videoId="1004137913" />
    </section>
  );
}

function StatsBar() {
  const stats = [
    { value: "2,415+", label: "Groups Analyzed" },
    { value: "18%", label: "Avg. Rate Reduction" },
    { value: "$12M+", label: "Client Savings" },
    { value: "97%", label: "Retention Rate" },
  ];
  return (
    <section className="border-y bg-card/50">
      <div className="mx-auto max-w-7xl px-6 py-10">
        <div className="grid grid-cols-2 gap-6 md:grid-cols-4">
          {stats.map((s) => (
            <div key={s.label} className="text-center">
              <div className="text-2xl font-bold text-primary">{s.value}</div>
              <div className="mt-1 text-sm text-muted-foreground">{s.label}</div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

function HowItWorksSection() {
  const steps = [
    {
      icon: Users,
      step: "01",
      title: "Register & Upload",
      desc: "Create your account and upload your employee census data securely through our encrypted portal.",
    },
    {
      icon: BarChart3,
      step: "02",
      title: "Risk Analysis",
      desc: "Our proprietary algorithm analyzes your group's demographics, risk factors, and claims history.",
    },
    {
      icon: FileBarChart,
      step: "03",
      title: "Get Your Score",
      desc: "Receive your group's qualification score and risk tier assessment within minutes.",
    },
    {
      icon: Shield,
      step: "04",
      title: "Access Rates",
      desc: "Qualified groups unlock exclusive rates through our private employee benefits program.",
    },
  ];

  return (
    <section id="how-it-works" className="py-20 md:py-24">
      <div className="mx-auto max-w-7xl px-6">
        <div className="mx-auto max-w-2xl text-center mb-14">
          <h2 className="text-3xl font-bold tracking-tight">How It Works</h2>
          <p className="mt-3 text-muted-foreground">
            Four simple steps to discover if your group qualifies for our exclusive benefits program.
          </p>
        </div>
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
          {steps.map((s) => (
            <Card key={s.step} className="relative p-6 hover-elevate">
              <div className="mb-4 flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-md bg-primary/10 dark:bg-primary/20">
                  <s.icon className="h-5 w-5 text-primary" />
                </div>
                <span className="text-xs font-bold text-primary/60">{s.step}</span>
              </div>
              <h3 className="font-semibold">{s.title}</h3>
              <p className="mt-2 text-sm text-muted-foreground leading-relaxed">{s.desc}</p>
            </Card>
          ))}
        </div>
      </div>
    </section>
  );
}

function FeaturesSection() {
  const features = [
    {
      icon: Zap,
      title: "Proprietary Scoring Engine",
      desc: "Our machine-learning model evaluates 50+ risk variables to determine group eligibility and optimal rate structures.",
    },
    {
      icon: Lock,
      title: "Enterprise-Grade Security",
      desc: "Bank-level encryption protects your sensitive employee data throughout the entire analysis process.",
    },
    {
      icon: TrendingDown,
      title: "Rate Optimization",
      desc: "Qualified groups see average rate reductions of 12-25% compared to standard market offerings.",
    },
    {
      icon: Building2,
      title: "Built for SMBs",
      desc: "Purpose-built for small to mid-sized businesses with 2-500 employees seeking premium benefits.",
    },
    {
      icon: BarChart3,
      title: "Real-Time Analytics",
      desc: "Track your group's qualification status, risk assessment, and rate availability through your personal dashboard.",
    },
    {
      icon: FileBarChart,
      title: "Comprehensive Reports",
      desc: "Receive detailed PDF reports with your group's analysis, scoring breakdown, and recommended programs.",
    },
  ];

  return (
    <section id="features" className="py-20 md:py-24 bg-card/30">
      <div className="mx-auto max-w-7xl px-6">
        <div className="mx-auto max-w-2xl text-center mb-14">
          <h2 className="text-3xl font-bold tracking-tight">The Kennion Platform</h2>
          <p className="mt-3 text-muted-foreground">
            Combining deep insurance expertise with cutting-edge analytics technology.
          </p>
        </div>
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {features.map((f) => (
            <Card key={f.title} className="p-6 hover-elevate">
              <div className="mb-4 flex h-10 w-10 items-center justify-center rounded-md bg-primary/10 dark:bg-primary/20">
                <f.icon className="h-5 w-5 text-primary" />
              </div>
              <h3 className="font-semibold">{f.title}</h3>
              <p className="mt-2 text-sm text-muted-foreground leading-relaxed">{f.desc}</p>
            </Card>
          ))}
        </div>
      </div>
    </section>
  );
}

function BenefitsSection() {
  const [videoOpen, setVideoOpen] = useState(false);
  const benefits = [
    "Access to exclusive private benefit programs",
    "Average rate savings of 12-25% vs. market",
    "No upfront costs or hidden fees",
    "Dedicated account management team",
    "Custom plan design and consultation",
    "Ongoing compliance and regulatory support",
  ];

  return (
    <section id="benefits" className="py-20 md:py-24">
      <div className="mx-auto max-w-7xl px-6">
        <div className="grid gap-12 lg:grid-cols-2 items-center">
          <div>
            <h2 className="text-3xl font-bold tracking-tight">
              Why Groups Choose Kennion
            </h2>
            <p className="mt-4 text-muted-foreground leading-relaxed">
              We've built relationships with top-tier carriers and designed proprietary programs
              that reward healthy, well-managed groups with significantly better rates and benefits.
            </p>
            <ul className="mt-8 space-y-3">
              {benefits.map((b) => (
                <li key={b} className="flex items-start gap-3">
                  <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
                  <span className="text-sm">{b}</span>
                </li>
              ))}
            </ul>
            <div className="mt-8">
              <Link href="/register">
                <Button data-testid="button-benefits-cta">
                  Start Your Qualification <ArrowRight className="ml-1 h-4 w-4" />
                </Button>
              </Link>
            </div>
          </div>

          {/* Video thumbnail replacing the static card */}
          <div>
            <button
              onClick={() => setVideoOpen(true)}
              className="group relative block w-full overflow-hidden rounded-xl border shadow-lg hover:shadow-xl transition-all"
            >
              <img
                src="https://vumbnail.com/1060997796.jpg"
                alt="See how Kennion benefits work"
                className="w-full aspect-video object-cover group-hover:scale-105 transition-transform duration-300"
              />
              <div className="absolute inset-0 flex items-center justify-center bg-black/20 group-hover:bg-black/30 transition-colors">
                <div className="flex h-16 w-16 items-center justify-center rounded-full bg-primary shadow-lg">
                  <Play className="h-7 w-7 text-primary-foreground ml-1" />
                </div>
              </div>
            </button>
          </div>
        </div>

        {/* Plans summary bar below */}
        <div className="mt-14">
          <Card className="p-8">
            <div className="flex flex-col md:flex-row md:items-center gap-6 md:gap-10">
              <div className="flex items-center gap-4 shrink-0">
                <div className="flex h-12 w-12 items-center justify-center rounded-md bg-primary">
                  <Shield className="h-6 w-6 text-primary-foreground" />
                </div>
                <div>
                  <div className="text-xl font-bold text-primary">Benefits Program</div>
                  <div className="text-sm text-muted-foreground">Group Health, Dental, Vision & More</div>
                </div>
              </div>
              <div className="hidden md:block w-px h-12 bg-border" />
              <div className="grid grid-cols-2 md:grid-cols-4 gap-6 flex-1">
                <div>
                  <div className="text-xl font-bold">Health</div>
                  <div className="text-sm text-muted-foreground">15+ Plans</div>
                </div>
                <div>
                  <div className="text-xl font-bold">Dental</div>
                  <div className="text-sm text-muted-foreground">6+ Plans</div>
                </div>
                <div>
                  <div className="text-xl font-bold">Vision</div>
                  <div className="text-sm text-muted-foreground">3+ Plans</div>
                </div>
                <div>
                  <div className="text-xl font-bold">Supplemental</div>
                  <div className="text-sm text-muted-foreground">10+ Plans</div>
                </div>
              </div>
            </div>
          </Card>
        </div>
      </div>
      <VideoModal open={videoOpen} onClose={() => setVideoOpen(false)} videoId="1060997796" />
    </section>
  );
}

function ContactSection() {
  return (
    <section id="contact" className="py-20 md:py-24 bg-card/30">
      <div className="mx-auto max-w-7xl px-6">
        <div className="mx-auto max-w-3xl">
          <h2 className="text-3xl font-bold tracking-tight">Contact Us</h2>
          <p className="mt-3 text-muted-foreground">
            Whether you're exploring options or already a client, our team is here to help.
          </p>

          <div className="mt-10 h-px bg-border" />

          <div className="mt-10">
            <h3 className="text-xl font-bold">For Employers Interested In A Proposal</h3>
            <p className="mt-3 text-muted-foreground">
              Want to see if we can lower your costs and improve your group benefits?
              We'll show you what's possible.
            </p>
            <div className="mt-5">
              <Link href="/register">
                <Button data-testid="button-contact-proposal">
                  Request Proposal <ArrowRight className="ml-1 h-4 w-4" />
                </Button>
              </Link>
            </div>
          </div>

          <div className="mt-10 h-px bg-border" />

          <div className="mt-10">
            <h3 className="text-xl font-bold">Current Client Or Member?</h3>
            <p className="mt-3 text-muted-foreground">
              Please open a support ticket below — we're here to help.
            </p>
            <div className="mt-5">
              <a href="https://go.kennion.com/support" target="_blank" rel="noopener noreferrer">
                <Button data-testid="button-contact-support">
                  Submit A Ticket <ArrowRight className="ml-1 h-4 w-4" />
                </Button>
              </a>
            </div>
          </div>

          <div className="mt-10 h-px bg-border" />

          <div className="mt-10">
            <h3 className="text-xl font-bold">Contact Information</h3>
            <ul className="mt-4 space-y-3">
              <li className="flex items-center gap-3">
                <Mail className="h-4 w-4 shrink-0 text-primary" />
                <span className="text-sm">
                  <span className="font-medium">Email:</span>{" "}
                  <a href="mailto:support@kennion.com" className="text-primary hover:underline">
                    support@kennion.com
                  </a>
                </span>
              </li>
              <li className="flex items-center gap-3">
                <MapPin className="h-4 w-4 shrink-0 text-primary" />
                <span className="text-sm">
                  <span className="font-medium">Address:</span> 2828 Old 280 Court, Suite 110, Vestavia, Alabama 35243
                </span>
              </li>
            </ul>
          </div>
        </div>
      </div>

      {/* Full-width building banner */}
      <div className="mt-20 relative overflow-hidden">
        <div className="relative h-[400px] md:h-[500px]">
          <img
            src="https://images.squarespace-cdn.com/content/v1/650a374c4246d47a3dbe7afb/1695168363204-7SHD3HNS7AARCJU8LO2L/The%2BLindsey%2BBuilding-14.jpg"
            alt="Kennion Benefit Advisors headquarters"
            className="absolute inset-0 w-full h-full object-cover object-center"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/30 to-transparent" />
          <div className="absolute bottom-0 left-0 right-0 p-8 md:p-14">
            <div className="mx-auto max-w-7xl">
              <h3 className="text-2xl md:text-3xl font-bold text-white tracking-tight">
                Kennion Benefit Advisors
              </h3>
              <p className="mt-2 text-white/80 text-sm md:text-base">
                Vestavia Hills, Alabama
              </p>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

function CTASection() {
  return (
    <section className="py-20 md:py-24 bg-primary text-primary-foreground">
      <div className="mx-auto max-w-3xl px-6 text-center">
        <h2 className="text-3xl font-bold tracking-tight">Ready to See If You Qualify?</h2>
        <p className="mt-4 text-primary-foreground/80 text-lg">
          It takes less than 5 minutes to submit your group for analysis.
          Find out if your employees can get better benefits at lower rates.
        </p>
        <div className="mt-8 flex flex-col sm:flex-row items-center justify-center gap-3">
          <Link href="/register">
            <Button size="lg" variant="secondary" data-testid="button-cta-register">
              Create Your Account <ArrowRight className="ml-1 h-4 w-4" />
            </Button>
          </Link>
        </div>
      </div>
    </section>
  );
}

function Footer() {
  return (
    <footer className="border-t py-10">
      <div className="mx-auto max-w-7xl px-6">
        <div className="flex flex-col md:flex-row items-center justify-between gap-4">
          <KennionLogo size="sm" />
          <p className="text-xs text-muted-foreground">
            &copy; {new Date().getFullYear()} Kennion Benefit Advisors. All rights reserved.
          </p>
        </div>
      </div>
    </footer>
  );
}

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <HeroSection />
      <StatsBar />
      <HowItWorksSection />
      <FeaturesSection />
      <BenefitsSection />
      <ContactSection />
      <CTASection />
      <Footer />
    </div>
  );
}
