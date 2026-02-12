import { Link } from 'react-router-dom';
import {
  Infinity,
  Target,
  FileCheck,
  Smartphone,
  Check,
  ChevronRight,
  BookOpen,
  Zap,
} from 'lucide-react';

/**
 * High-conversion landing page for TyariWale — Jeet Ki Tayari.
 * Mobile-first, Tailwind + Lucide. Royal Blue + Electric Green.
 */
export default function LandingPage() {
  return (
    <div className="bg-white text-slate-900">
      {/* ——— Section 1: Hero (Above the Fold) ——— */}
      <section className="min-h-[85vh] flex flex-col justify-center py-12 md:py-16 lg:py-20">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 w-full">
          <div className="flex flex-col lg:flex-row lg:items-center lg:gap-16">
            <div className="flex-1 text-center lg:text-left order-2 lg:order-1">
              <h1 className="text-4xl sm:text-5xl lg:text-6xl font-extrabold text-slate-900 leading-tight mb-6">
                Never Run Out of Practice Questions Again.
              </h1>
              <p className="text-lg sm:text-xl text-slate-600 mb-8 max-w-xl mx-auto lg:mx-0 leading-relaxed">
                India's First AI-Powered Exam Hall. Generate unlimited, pattern-accurate mock tests for UPSC, SSC, and Banking instantly.
              </p>
              <div className="flex flex-col sm:flex-row gap-4 justify-center lg:justify-start">
                <Link
                  to="/signup"
                  className="inline-flex items-center justify-center gap-2 px-8 py-4 bg-green-600 hover:bg-green-700 text-white font-bold rounded-xl text-lg shadow-lg hover:shadow-xl transition-all"
                >
                  Start Practicing for Free
                  <ChevronRight className="w-5 h-5" />
                </Link>
                <a
                  href="#sample"
                  className="inline-flex items-center justify-center gap-2 px-8 py-4 border-2 border-blue-700 text-blue-700 hover:bg-blue-50 font-semibold rounded-xl text-lg transition-colors"
                >
                  View Sample Questions
                </a>
              </div>
            </div>
            <div className="flex-1 flex justify-center order-1 lg:order-2 mb-10 lg:mb-0" id="sample">
              {/* Mock mobile: Question Card with green tick on correct answer */}
              <div className="relative w-[280px] sm:w-[320px]">
                <div className="rounded-[2rem] border-8 border-slate-800 bg-slate-800 overflow-hidden shadow-2xl">
                  <div className="h-10 bg-slate-700 flex items-center justify-center">
                    <span className="text-slate-400 text-xs font-medium">Mock Test</span>
                  </div>
                  <div className="p-4 bg-slate-900 min-h-[360px]">
                    <p className="text-slate-400 text-xs mb-2">Q. 1 of 10 — History</p>
                    <p className="text-white text-sm leading-snug mb-4">
                      The Cabinet Mission Plan (1946) proposed which of the following?
                    </p>
                    <div className="space-y-2">
                      <div className="flex items-center gap-2 rounded-lg bg-slate-800 py-2.5 px-3">
                        <span className="text-slate-400 text-xs">A</span>
                        <span className="text-slate-300 text-sm">Three-tier administration</span>
                      </div>
                      <div className="flex items-center gap-2 rounded-lg bg-green-900/50 border border-green-600/50 py-2.5 px-3">
                        <Check className="w-4 h-4 text-green-500 shrink-0" strokeWidth={3} />
                        <span className="text-green-100 text-sm">Grouping of provinces</span>
                      </div>
                      <div className="flex items-center gap-2 rounded-lg bg-slate-800 py-2.5 px-3">
                        <span className="text-slate-400 text-xs">C</span>
                        <span className="text-slate-300 text-sm">Direct elections</span>
                      </div>
                      <div className="flex items-center gap-2 rounded-lg bg-slate-800 py-2.5 px-3">
                        <span className="text-slate-400 text-xs">D</span>
                        <span className="text-slate-300 text-sm">Partition of India</span>
                      </div>
                    </div>
                  </div>
                </div>
                <div className="absolute -bottom-2 -right-2 rounded-lg bg-green-600 px-2 py-1 text-white text-xs font-semibold flex items-center gap-1">
                  <Smartphone className="w-3.5 h-3.5" /> Question Card
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ——— Section 2: Why Us (Problem vs Solution) ——— */}
      <section className="py-16 lg:py-24 bg-slate-50">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <h2 className="text-3xl sm:text-4xl font-bold text-slate-900 text-center mb-4">
            Why TyariWale is better than Books
          </h2>
          <p className="text-slate-600 text-center mb-12 max-w-2xl mx-auto">
            Stop buying test series that run out. Practice the way you need.
          </p>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-200 hover:border-blue-200 hover:shadow-md transition-all">
              <div className="w-14 h-14 rounded-xl bg-blue-100 flex items-center justify-center mb-5">
                <Infinity className="w-7 h-7 text-blue-700" strokeWidth={2} />
              </div>
              <h3 className="text-xl font-bold text-slate-900 mb-2">Infinite Content</h3>
              <p className="text-slate-600 text-sm leading-relaxed">
                Books have 500 questions. TyariWale has infinite. Our AI creates new questions every time you click &quot;Generate&quot;.
              </p>
            </div>
            <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-200 hover:border-blue-200 hover:shadow-md transition-all">
              <div className="w-14 h-14 rounded-xl bg-green-100 flex items-center justify-center mb-5">
                <Target className="w-7 h-7 text-green-600" strokeWidth={2} />
              </div>
              <h3 className="text-xl font-bold text-slate-900 mb-2">Subject Mastery</h3>
              <p className="text-slate-600 text-sm leading-relaxed">
                Weak in Polity? Don&apos;t waste time on a full test. Generate a 20-question Polity set and master it.
              </p>
            </div>
            <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-200 hover:border-blue-200 hover:shadow-md transition-all">
              <div className="w-14 h-14 rounded-xl bg-blue-100 flex items-center justify-center mb-5">
                <FileCheck className="w-7 h-7 text-blue-700" strokeWidth={2} />
              </div>
              <h3 className="text-xl font-bold text-slate-900 mb-2">Exam Blueprints</h3>
              <p className="text-slate-600 text-sm leading-relaxed">
                Not random. Our AI follows the strict weightage of UPSC Prelims and SSC CGL.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* ——— Section 3: How it Works (3 Steps) ——— */}
      <section className="py-16 lg:py-24 bg-white">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <h2 className="text-3xl sm:text-4xl font-bold text-slate-900 text-center mb-12">
            How it Works
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-10 md:gap-6">
            <div className="flex flex-col items-center text-center">
              <div className="w-16 h-16 rounded-2xl bg-blue-700 text-white flex items-center justify-center mb-4">
                <BookOpen className="w-8 h-8" strokeWidth={2} />
              </div>
              <span className="text-xs font-bold text-blue-700 uppercase tracking-wider mb-2">Step 1</span>
              <h3 className="text-lg font-bold text-slate-900 mb-2">Choose Your Exam</h3>
              <p className="text-slate-600 text-sm">Select UPSC, SSC, Banking, or Railways.</p>
            </div>
            <div className="flex flex-col items-center text-center">
              <div className="w-16 h-16 rounded-2xl bg-blue-700 text-white flex items-center justify-center mb-4">
                <Target className="w-8 h-8" strokeWidth={2} />
              </div>
              <span className="text-xs font-bold text-blue-700 uppercase tracking-wider mb-2">Step 2</span>
              <h3 className="text-lg font-bold text-slate-900 mb-2">Pick Your Weakness</h3>
              <p className="text-slate-600 text-sm">Select History, English, or Full Mock Test.</p>
            </div>
            <div className="flex flex-col items-center text-center">
              <div className="w-16 h-16 rounded-2xl bg-green-600 text-white flex items-center justify-center mb-4">
                <Zap className="w-8 h-8" strokeWidth={2} />
              </div>
              <span className="text-xs font-bold text-green-600 uppercase tracking-wider mb-2">Step 3</span>
              <h3 className="text-lg font-bold text-slate-900 mb-2">Instant Analysis</h3>
              <p className="text-slate-600 text-sm">Get detailed AI explanations immediately.</p>
            </div>
          </div>
        </div>
      </section>

      {/* ——— Section 4: Launch Offer (Pricing) ——— */}
      <section className="py-16 lg:py-24 bg-slate-50" id="pricing">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="max-w-md mx-auto">
            <div className="relative bg-white rounded-3xl shadow-xl border-2 border-green-200 overflow-hidden">
              <div className="absolute top-0 left-0 right-0 h-1.5 bg-gradient-to-r from-green-500 to-green-700" />
              <div className="pt-8 pb-8 px-6 sm:px-8">
                <span className="inline-block px-4 py-1.5 bg-green-100 text-green-700 font-bold text-sm rounded-full mb-6">
                  Launch Offer
                </span>
                <h3 className="text-2xl font-bold text-slate-900 mb-2">TyariWale Pro</h3>
                <div className="flex flex-wrap items-baseline gap-2 mb-6">
                  <span className="text-slate-400 line-through text-lg">₹999/Year</span>
                  <span className="text-4xl font-extrabold text-green-600">FREE</span>
                  <span className="text-slate-500 text-sm">Limited Time</span>
                </div>
                <ul className="space-y-3 mb-8">
                  {['Unlimited Generations', 'Detailed Solutions', 'Performance Analytics', 'All Exam Categories'].map((item) => (
                    <li key={item} className="flex items-center gap-3 text-slate-800">
                      <Check className="w-5 h-5 text-green-600 shrink-0" strokeWidth={2.5} />
                      {item}
                    </li>
                  ))}
                </ul>
                <Link
                  to="/signup"
                  className="block w-full py-4 bg-green-600 hover:bg-green-700 text-white font-bold rounded-xl text-center shadow-lg hover:shadow-xl transition-all"
                >
                  Claim Free Access Now
                </Link>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ——— Section 5: SEO Footer ——— */}
      <footer className="bg-slate-900 text-slate-300">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-12 lg:py-16">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-10 md:gap-8">
            {/* Column 1: Brand */}
            <div>
              <div className="flex items-center gap-2 mb-3">
                <span className="text-2xl font-bold text-white">TW</span>
                <span className="text-xl font-bold text-white">TyariWale</span>
              </div>
              <p className="text-slate-400 text-sm">Making India Exam Ready.</p>
            </div>

            {/* Column 2: Quick Links */}
            <div>
              <h4 className="text-white font-semibold mb-4">Quick Links</h4>
              <ul className="space-y-2 text-sm">
                <li><Link to="/" className="hover:text-white transition-colors">Home</Link></li>
                <li><Link to="/login" className="hover:text-white transition-colors">Login</Link></li>
                <li><Link to="/signup" className="hover:text-white transition-colors">Signup</Link></li>
                <li><a href="#pricing" className="hover:text-white transition-colors">Pricing</a></li>
                <li><a href="#" className="hover:text-white transition-colors">Contact</a></li>
              </ul>
            </div>

            {/* Column 3: Exams We Cover (SEO) */}
            <div>
              <h4 className="text-white font-semibold mb-4">Exams We Cover</h4>
              <ul className="text-sm space-y-3 text-slate-400">
                <li>
                  <span className="font-medium text-slate-300">UPSC:</span> Civil Services (CSE), CDS, NDA, CAPF.
                </li>
                <li>
                  <span className="font-medium text-slate-300">SSC:</span> CGL, CHSL, MTS, GD Constable.
                </li>
                <li>
                  <span className="font-medium text-slate-300">Banking:</span> IBPS PO, SBI Clerk, RBI Grade B.
                </li>
                <li>
                  <span className="font-medium text-slate-300">Railways:</span> RRB NTPC, Group D.
                </li>
              </ul>
            </div>
          </div>
          <div className="border-t border-slate-700 mt-10 pt-6 text-center text-sm text-slate-500">
            © 2026 TyariWale. Jeet Ki Tayari.
          </div>
        </div>
      </footer>
    </div>
  );
}
