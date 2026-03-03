"use client";

import { useState } from "react";
import Link from "next/link";
import { Rocket, Mail } from "lucide-react";

const APP_BASE = "https://app.tyariwale.com";

const LIVE_EXAMS = [
  {
    id: "ssc-cgl",
    title: "SSC CGL",
    subtitle: "Combined Graduate Level",
    tag: "Staff Selection Commission",
    slug: "ssc-cgl",
  },
  {
    id: "ssc-chsl",
    title: "SSC CHSL",
    subtitle: "Combined Higher Secondary Level",
    tag: "Staff Selection Commission",
    slug: "ssc-chsl",
  },
];

const UPCOMING_EXAMS = [
  { id: "rrb-ntpc", name: "RRB NTPC", tag: "Railway Recruitment Board" },
  {
    id: "delhi-police",
    name: "Delhi Police Constable",
    tag: "Delhi Police",
  },
  { id: "upsc-prelims", name: "UPSC CSE Prelims", tag: "Union Public Service Commission" },
];

export function RoadmapSection() {
  const [activeTab, setActiveTab] = useState<"live" | "upcoming">("live");
  const [email, setEmail] = useState("");
  const [submitted, setSubmitted] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleWaitlistSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim()) return;
    setLoading(true);
    try {
      await new Promise((r) => setTimeout(r, 600));
      setSubmitted(true);
      setEmail("");
    } catch (err) {
      console.error("Waitlist submit error:", err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <section
      id="roadmap"
      className="border-b border-gray-200 bg-gray-50 px-4 py-16 sm:px-6 sm:py-20 lg:px-8"
      aria-label="Exam availability and roadmap"
    >
      <div className="mx-auto max-w-6xl">
        <h2 className="text-2xl font-bold text-gray-900 sm:text-3xl">
          Our Current Focus
        </h2>
        <p className="mt-2 text-gray-600">
          We build deep, not wide. We construct our AI question banks exam by
          exam. Right now, 100% of our focus is on mastering the Staff
          Selection Commission (SSC) patterns.
        </p>

        {/* Tabs */}
        <div className="mt-8 border-b border-gray-200">
          <nav className="flex gap-8" aria-label="Roadmap tabs">
            <button
              type="button"
              onClick={() => setActiveTab("live")}
              className={`border-b-2 py-3 text-sm font-medium transition-colors ${
                activeTab === "live"
                  ? "border-emerald-600 text-emerald-600"
                  : "border-transparent text-gray-500 hover:border-gray-300 hover:text-gray-700"
              }`}
            >
              Live Now
            </button>
            <button
              type="button"
              onClick={() => setActiveTab("upcoming")}
              className={`border-b-2 py-3 text-sm font-medium transition-colors ${
                activeTab === "upcoming"
                  ? "border-emerald-600 text-emerald-600"
                  : "border-transparent text-gray-500 hover:border-gray-300 hover:text-gray-700"
              }`}
            >
              Upcoming Roadmap
            </button>
          </nav>
        </div>

        {/* Live Now — SSC CGL & SSC CHSL */}
        <div
          className={activeTab === "live" ? "block pt-8" : "hidden"}
          role="tabpanel"
          aria-labelledby="tab-live"
        >
          <div className="grid gap-6 sm:grid-cols-2">
            {LIVE_EXAMS.map((exam) => {
              const href = exam.slug
                ? `/mock-test/${exam.slug}`
                : APP_BASE;
              return (
                <article
                  key={exam.id}
                  className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm"
                >
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <span className="text-lg font-bold text-emerald-600">
                        {exam.title}
                      </span>
                      <h3 className="mt-1 text-base font-semibold text-gray-900">
                        {exam.subtitle}
                      </h3>
                      <span className="mt-1 inline-block rounded-full bg-gray-100 px-2.5 py-0.5 text-xs font-medium text-gray-700">
                        {exam.tag}
                      </span>
                    </div>
                    <Link
                      href={href}
                      className="inline-flex shrink-0 items-center gap-2 rounded-lg bg-emerald-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-emerald-700 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:ring-offset-2"
                    >
                      <Rocket className="h-4 w-4" aria-hidden />
                      Start Now
                    </Link>
                  </div>
                </article>
              );
            })}
          </div>
        </div>

        {/* Upcoming — cards with Join Waitlist */}
        <div
          className={activeTab === "upcoming" ? "block pt-8" : "hidden"}
          role="tabpanel"
          aria-labelledby="tab-upcoming"
        >
          <p className="mb-6 text-gray-600">
            We&apos;re building mocks for these exams next. Join the waitlist to
            be notified when they go live.
          </p>
          <div className="mb-8 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {UPCOMING_EXAMS.map((exam) => (
              <article
                key={exam.id}
                className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm"
              >
                <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <h3 className="text-base font-semibold text-gray-900">
                      {exam.name}
                    </h3>
                    <span className="mt-1 inline-block rounded-full bg-gray-100 px-2.5 py-0.5 text-xs font-medium text-gray-700">
                      {exam.tag}
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      const el = document.getElementById("waitlist-form");
                      el?.scrollIntoView({ behavior: "smooth" });
                    }}
                    className="inline-flex shrink-0 items-center justify-center gap-2 rounded-lg border-2 border-gray-300 bg-white px-4 py-2.5 text-sm font-semibold text-gray-700 transition-colors hover:border-gray-400 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:ring-offset-2"
                    aria-label={`Join waitlist for ${exam.name}`}
                  >
                    Join Waitlist
                  </button>
                </div>
              </article>
            ))}
          </div>
          <div id="waitlist-form" className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm sm:p-8">
            <form
              onSubmit={handleWaitlistSubmit}
              className="flex flex-col gap-3 sm:flex-row sm:items-center sm:gap-4"
            >
              <div className="relative flex-1 max-w-sm">
                <Mail
                  className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400"
                  aria-hidden
                />
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="you@example.com"
                  required
                  disabled={submitted}
                  className="w-full rounded-lg border border-gray-200 py-2.5 pl-10 pr-3 text-sm text-gray-900 placeholder:text-gray-400 focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500 disabled:bg-gray-50"
                />
              </div>
              <button
                type="submit"
                disabled={loading || submitted}
                className="shrink-0 rounded-lg border border-gray-200 bg-white px-4 py-2.5 text-sm font-semibold text-gray-700 transition-colors hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:ring-offset-2 disabled:opacity-60"
              >
                {submitted ? "Joined" : loading ? "..." : "Join the Waitlist"}
              </button>
            </form>
            {submitted && (
              <p className="mt-4 text-sm text-emerald-600">
                Thanks! We&apos;ll notify you when new exams are live.
              </p>
            )}
          </div>
        </div>
      </div>
    </section>
  );
}
