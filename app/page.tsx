'use client';

import Link from 'next/link';
import {
  Printer, Clock, CheckCircle, Bell, BarChart3, Shield,
  ArrowRight, ChevronRight, Star, Zap, Users, FileText,
} from 'lucide-react';

// ─── Data ────────────────────────────────────────────────────────────────────

const PROBLEMS = [
  '200+ Telegram messages before a deadline',
  'Printing wrong size because preferences weren\'t clear',
  'Running out of A0 paper at 3 AM',
  'Forgetting a student\'s order in the message flood',
  'Students calling every 10 minutes asking "is mine ready?"',
  'Staying up all night just to stay on top of it',
];

const FEATURES = [
  {
    icon: FileText,
    title: 'Structured Orders',
    desc: 'Students submit with file, paper size, colour, copies and notes — all in one place. No back-and-forth.',
    color: 'bg-blue-50 text-blue-700',
  },
  {
    icon: Printer,
    title: 'Live Print Queue',
    desc: 'Your dashboard shows every order in submission order — tick each one when done. Impossible to lose a job.',
    color: 'bg-amber-50 text-amber-700',
  },
  {
    icon: Bell,
    title: 'Auto Notifications',
    desc: 'Students get notified the moment their prints are ready. They come when it\'s done, not before.',
    color: 'bg-green-50 text-green-700',
  },
  {
    icon: BarChart3,
    title: 'Demand Forecasting',
    desc: 'See upcoming paper needs before a deadline hits. Stock the right sizes before you run out.',
    color: 'bg-violet-50 text-violet-700',
  },
  {
    icon: Clock,
    title: 'Order Tracking',
    desc: 'Students follow their order status in real time — from submitted to ready — on any device.',
    color: 'bg-rose-50 text-rose-700',
  },
  {
    icon: Shield,
    title: 'Secure File Handling',
    desc: 'Files stored encrypted, auto-deleted after pickup. Student work stays private.',
    color: 'bg-teal-50 text-teal-700',
  },
];

const STEPS = [
  { n: '01', who: 'Student', title: 'Submits in 60 seconds', desc: 'Uploads file, picks size & colour, done. Order number received instantly.' },
  { n: '02', who: 'System',  title: 'Queue updates live', desc: 'New order appears on the owner\'s dashboard — fully labelled, in order.' },
  { n: '03', who: 'Owner',   title: 'Prints & ticks', desc: 'Print the job, tap Done. No typing, no hunting through messages.' },
  { n: '04', who: 'Student', title: 'Notified & collects', desc: 'Student gets a notification, arrives at the shop, picks up their work. Done.' },
];

const STATS = [
  { value: '3 min', label: 'Average order setup time' },
  { value: '0',     label: 'Missed orders after adoption' },
  { value: '60s',   label: 'Time for student to submit' },
  { value: '24/7',  label: 'Order tracking for students' },
];

// ─── Component ────────────────────────────────────────────────────────────────

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-stone-50 overflow-x-hidden">
      {/* ── Navbar ─────────────────────────────────────────────── */}
      <nav className="fixed top-0 inset-x-0 z-50 bg-white/80 backdrop-blur-md border-b border-stone-200">
        <div className="page-container flex items-center justify-between h-16">
          <Link href="/" className="flex items-center gap-2.5">
            <span className="w-8 h-8 bg-navy-700 rounded-lg flex items-center justify-center">
              <Printer className="w-4 h-4 text-amber-400" />
            </span>
            <span className="font-display font-bold text-navy-700 text-lg tracking-tight">
              Print<span className="text-amber-500">Flow</span>
            </span>
          </Link>

          <div className="hidden sm:flex items-center gap-6 text-sm font-medium text-stone-600">
            <a href="#how-it-works" className="hover:text-navy-700 transition-colors">How it works</a>
            <a href="#features"     className="hover:text-navy-700 transition-colors">Features</a>
            <a href="#pricing"      className="hover:text-navy-700 transition-colors">Pricing</a>
          </div>

          <div className="flex items-center gap-3">
            <Link href="/login"      className="btn-outline btn-sm hidden sm:inline-flex">Sign in</Link>
            <Link href="/order"      className="btn-accent btn-sm">Place Order</Link>
          </div>
        </div>
      </nav>

      {/* ── Hero ───────────────────────────────────────────────── */}
      <section className="pt-28 pb-20 sm:pt-36 sm:pb-28 relative overflow-hidden">
        {/* Background mesh */}
        <div className="absolute inset-0 bg-gradient-mesh pointer-events-none" />
        <div className="absolute top-0 right-0 w-[600px] h-[600px] bg-gradient-radial from-amber-500/8 to-transparent pointer-events-none" />
        <div className="absolute bottom-0 left-0 w-[400px] h-[400px] bg-gradient-radial from-navy-700/5 to-transparent pointer-events-none" />

        <div className="page-container relative">
          {/* Badge */}
          <div className="flex mb-8">
            <span className="inline-flex items-center gap-2 bg-amber-50 border border-amber-200 text-amber-700 rounded-full px-4 py-1.5 text-sm font-medium">
              <Zap className="w-3.5 h-3.5" />
              Built for university print shops
            </span>
          </div>

          <h1 className="font-display text-5xl sm:text-6xl lg:text-7xl font-bold text-navy-900 leading-[1.05] tracking-tight max-w-3xl">
            End the print<br />
            order <span className="text-gradient">chaos.</span>
          </h1>

          <p className="mt-6 text-lg sm:text-xl text-stone-500 max-w-xl leading-relaxed">
            PrintFlow replaces the midnight Telegram flood with a structured, 
            real-time queue. Students submit in 60 seconds. You print in order. 
            Everyone moves on with their night.
          </p>

          <div className="mt-10 flex flex-wrap gap-4">
            <Link href="/order" className="btn-accent btn-lg group">
              Place a Print Order
              <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
            </Link>
            <Link href="/login" className="btn-outline btn-lg">
              Admin Dashboard →
            </Link>
          </div>

          {/* Social proof */}
          <div className="mt-12 flex items-center gap-4 text-sm text-stone-500">
            <div className="flex -space-x-2">
              {['A', 'K', 'S', 'M', 'R'].map((l, i) => (
                <div
                  key={i}
                  className="w-8 h-8 rounded-full bg-navy-700 border-2 border-white flex items-center justify-center text-white text-xs font-bold"
                  style={{ backgroundColor: ['#1B3A5C','#E87722','#2D5A8C','#3a6fa3','#152d48'][i] }}
                >
                  {l}
                </div>
              ))}
            </div>
            <span>Trusted by <strong className="text-stone-700">500+ students</strong> across 3 universities</span>
          </div>
        </div>

        {/* Hero visual — mock dashboard */}
        <div className="page-container mt-16">
          <div className="relative max-w-4xl mx-auto">
            <div className="bg-navy-800 rounded-2xl p-4 shadow-strong">
              {/* Browser chrome */}
              <div className="flex items-center gap-2 mb-4">
                <div className="flex gap-1.5">
                  {['bg-red-400','bg-amber-400','bg-green-400'].map((c,i) => (
                    <div key={i} className={`w-2.5 h-2.5 rounded-full ${c}`} />
                  ))}
                </div>
                <div className="flex-1 bg-navy-900/50 rounded-lg px-3 py-1 text-xs text-stone-400 font-mono">
                  printflow.app/admin
                </div>
              </div>

              {/* Mock queue */}
              <div className="bg-stone-50 rounded-xl p-4 space-y-3">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="font-display font-semibold text-navy-700">Print Queue</h3>
                  <div className="flex gap-2">
                    <span className="badge bg-amber-50 border-amber-200 text-amber-700">
                      <span className="status-dot bg-amber-500 animate-pulse-soft" />
                      4 Pending
                    </span>
                    <span className="badge bg-emerald-50 border-emerald-200 text-emerald-700">
                      <span className="status-dot bg-emerald-500" />
                      12 Done today
                    </span>
                  </div>
                </div>

                {[
                  { name: 'Sarah Al-Rashidi', file: 'Site_Plan_Final_v3.pdf', size: 'A1', mode: 'Colour', copies: 2, status: 'printing', time: '2m ago' },
                  { name: 'Omar Khalid',      file: 'Section_Drawing.pdf',   size: 'A2', mode: 'B&W',    copies: 1, status: 'queued',   time: '5m ago' },
                  { name: 'Lina Farouk',      file: 'Portfolio_Final.pdf',   size: 'A4', mode: 'Colour', copies: 3, status: 'queued',   time: '8m ago' },
                ].map((order, i) => (
                  <div key={i} className="bg-white rounded-xl border border-stone-200 p-3.5 flex items-center gap-3">
                    <div className={`w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0 ${
                      order.status === 'printing' ? 'bg-violet-100' : 'bg-blue-50'
                    }`}>
                      <Printer className={`w-4 h-4 ${order.status === 'printing' ? 'text-violet-600 animate-pulse-soft' : 'text-blue-500'}`} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="font-medium text-sm text-stone-800">{order.name}</div>
                      <div className="text-xs text-stone-500 truncate">{order.file}</div>
                    </div>
                    <div className="hidden sm:flex items-center gap-2 text-xs">
                      <span className="badge bg-navy-50 border-navy-200 text-navy-700">{order.size}</span>
                      <span className="badge bg-stone-100 border-stone-200 text-stone-600">{order.mode}</span>
                      <span className="text-stone-400">{order.copies}x</span>
                    </div>
                    <div className="text-xs text-stone-400">{order.time}</div>
                    {order.status === 'printing' ? (
                      <span className="badge bg-violet-50 border-violet-200 text-violet-700">Printing…</span>
                    ) : (
                      <button className="btn-primary btn-sm">
                        Done <CheckCircle className="w-3 h-3" />
                      </button>
                    )}
                  </div>
                ))}
              </div>
            </div>

            {/* Floating notification */}
            <div className="absolute -right-4 top-1/3 bg-white rounded-xl shadow-strong border border-stone-200 p-3 w-52 hidden lg:block">
              <div className="flex items-start gap-2">
                <div className="w-7 h-7 bg-emerald-100 rounded-lg flex items-center justify-center flex-shrink-0">
                  <Bell className="w-3.5 h-3.5 text-emerald-600" />
                </div>
                <div>
                  <div className="text-xs font-semibold text-stone-800">Prints Ready!</div>
                  <div className="text-xs text-stone-500 mt-0.5">Sarah, your order is ready for pickup.</div>
                  <div className="text-xs text-stone-400 mt-1">Just now via Telegram</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── Problem section ────────────────────────────────────── */}
      <section className="section bg-navy-900 relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-radial from-navy-700/30 to-transparent pointer-events-none" />
        <div className="page-container relative">
          <div className="max-w-2xl">
            <div className="badge bg-red-900/40 border-red-700/40 text-red-400 mb-6">
              The Problem
            </div>
            <h2 className="font-display text-4xl font-bold text-white mb-6">
              Sound familiar?
            </h2>
            <p className="text-stone-400 text-lg mb-10">
              Before PrintFlow, print shop owners running near universities dealt with this every review week.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 max-w-3xl">
            {PROBLEMS.map((p, i) => (
              <div key={i} className="flex items-start gap-3 bg-white/5 rounded-xl p-4 border border-white/10">
                <span className="text-red-400 mt-0.5 flex-shrink-0">✗</span>
                <span className="text-stone-300 text-sm">{p}</span>
              </div>
            ))}
          </div>

          <div className="mt-12 p-6 bg-amber-500/10 border border-amber-500/30 rounded-2xl max-w-2xl">
            <p className="text-amber-300 font-medium text-lg">
              "I was up until 4 AM sorting through 200 Telegram messages, printing wrong sizes, 
              running out of A0 paper… every review week was a nightmare."
            </p>
            <div className="mt-4 flex items-center gap-3">
              <div className="w-9 h-9 bg-amber-500 rounded-full flex items-center justify-center text-white font-bold text-sm">S</div>
              <div>
                <div className="text-white font-medium text-sm">Sami</div>
                <div className="text-stone-400 text-xs">Print shop owner, serving 1,200+ students</div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── Stats ──────────────────────────────────────────────── */}
      <section className="py-14 border-y border-stone-200 bg-white">
        <div className="page-container">
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-8">
            {STATS.map((s, i) => (
              <div key={i} className="text-center">
                <div className="font-display text-4xl font-bold text-amber-500">{s.value}</div>
                <div className="text-sm text-stone-500 mt-1">{s.label}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── How it works ───────────────────────────────────────── */}
      <section id="how-it-works" className="section">
        <div className="page-container">
          <div className="text-center max-w-xl mx-auto mb-16">
            <div className="badge bg-navy-50 border-navy-200 text-navy-700 mb-4 mx-auto inline-flex">
              How It Works
            </div>
            <h2 className="font-display text-4xl font-bold text-navy-900">
              Four steps. Zero chaos.
            </h2>
            <p className="text-stone-500 mt-4">
              PrintFlow handles the coordination so you can focus on printing.
            </p>
          </div>

          <div className="relative">
            {/* Connector line (desktop) */}
            <div className="hidden lg:block absolute top-8 left-[12.5%] right-[12.5%] h-px bg-gradient-to-r from-transparent via-stone-300 to-transparent" />

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
              {STEPS.map((step, i) => (
                <div key={i} className="relative">
                  <div className="flex flex-col items-center text-center">
                    <div className="w-16 h-16 rounded-2xl bg-white border-2 border-stone-200 flex items-center justify-center shadow-soft relative z-10 mb-5">
                      <span className="font-display font-bold text-xl text-navy-700">{step.n}</span>
                    </div>
                    <span className="badge bg-amber-50 border-amber-200 text-amber-700 mb-3">
                      {step.who}
                    </span>
                    <h3 className="font-display font-semibold text-navy-800 mb-2">{step.title}</h3>
                    <p className="text-sm text-stone-500 leading-relaxed">{step.desc}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ── Features ───────────────────────────────────────────── */}
      <section id="features" className="section bg-stone-100/60">
        <div className="page-container">
          <div className="text-center max-w-xl mx-auto mb-16">
            <h2 className="font-display text-4xl font-bold text-navy-900">
              Everything you need. Nothing you don't.
            </h2>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {FEATURES.map((f, i) => (
              <div key={i} className="card-hover p-6">
                <div className={`w-11 h-11 rounded-xl ${f.color} flex items-center justify-center mb-4`}>
                  <f.icon className="w-5 h-5" />
                </div>
                <h3 className="font-display font-semibold text-navy-800 mb-2">{f.title}</h3>
                <p className="text-sm text-stone-500 leading-relaxed">{f.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Pricing ────────────────────────────────────────────── */}
      <section id="pricing" className="section">
        <div className="page-container">
          <div className="text-center max-w-xl mx-auto mb-16">
            <h2 className="font-display text-4xl font-bold text-navy-900">Simple, fair pricing</h2>
            <p className="text-stone-500 mt-4">Pay only for completed orders. No monthly fees, no setup costs.</p>
          </div>

          <div className="max-w-sm mx-auto card p-8 text-center border-2 border-amber-300 relative">
            <div className="absolute -top-4 left-1/2 -translate-x-1/2">
              <span className="badge bg-amber-500 border-amber-500 text-white px-4 py-1.5">
                <Star className="w-3 h-3" /> Most popular
              </span>
            </div>
            <div className="font-display text-5xl font-bold text-navy-700 mt-4">
              $0.15
            </div>
            <div className="text-stone-500 mt-1 text-sm">per completed order</div>

            <ul className="mt-8 space-y-3 text-sm text-stone-600 text-left">
              {[
                'First 30 days completely free',
                'Unlimited students & orders',
                'Real-time dashboard',
                'Telegram notifications',
                'Order tracking for students',
                'Analytics & demand forecast',
                'Setup support included',
              ].map((f, i) => (
                <li key={i} className="flex items-center gap-2">
                  <CheckCircle className="w-4 h-4 text-emerald-500 flex-shrink-0" />
                  {f}
                </li>
              ))}
            </ul>

            <Link href="/login" className="btn-accent w-full mt-8 py-3">
              Get started free
            </Link>
            <p className="text-xs text-stone-400 mt-3">No credit card required for trial</p>
          </div>
        </div>
      </section>

      {/* ── CTA ────────────────────────────────────────────────── */}
      <section className="section bg-navy-800 relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-radial from-amber-500/10 to-transparent" />
        <div className="page-container relative text-center">
          <h2 className="font-display text-4xl sm:text-5xl font-bold text-white">
            Ready to end the chaos?
          </h2>
          <p className="text-stone-400 mt-4 text-lg max-w-lg mx-auto">
            Set up your shop in under 30 minutes. Your next review deadline will be the easiest one yet.
          </p>
          <div className="flex flex-wrap gap-4 justify-center mt-10">
            <Link href="/order" className="btn-accent btn-xl group">
              Start Free Trial
              <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
            </Link>
            <a href="mailto:hello@printflow.app" className="btn-outline btn-xl text-white border-white/30 hover:bg-white/10 hover:border-white/50">
              Talk to us
            </a>
          </div>
        </div>
      </section>

      {/* ── Footer ─────────────────────────────────────────────── */}
      <footer className="py-10 bg-navy-950 border-t border-white/10">
        <div className="page-container flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <span className="w-7 h-7 bg-navy-700 rounded-lg flex items-center justify-center">
              <Printer className="w-3.5 h-3.5 text-amber-400" />
            </span>
            <span className="font-display font-bold text-white text-base">
              Print<span className="text-amber-500">Flow</span>
            </span>
          </div>
          <p className="text-stone-500 text-sm">
            © 2025 PrintFlow Technologies. Built for the print shops that never sleep.
          </p>
          <div className="flex gap-4 text-sm text-stone-500">
            <Link href="/privacy" className="hover:text-white transition-colors">Privacy</Link>
            <Link href="/terms"   className="hover:text-white transition-colors">Terms</Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
