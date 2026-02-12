import Link from "next/link";
import {
  Infinity,
  LayoutTemplate,
  BarChart3,
} from "lucide-react";

const APP_BASE = "https://app.tyariwale.com";

const features = [
  {
    title: "Infinite Questions",
    description:
      "AI-generated questions so you never run out of practice. New content every time you start a test.",
    icon: Infinity,
  },
  {
    title: "Exam Blueprints",
    description:
      "Tests aligned to UPSC, SSC, and Banking exam patterns. Practice the way you'll be assessed.",
    icon: LayoutTemplate,
  },
  {
    title: "Instant Analysis",
    description:
      "Get detailed breakdowns of your performance, weak areas, and actionable insights right after each test.",
    icon: BarChart3,
  },
];

const examLinks = [
  { label: "UPSC", slug: "upsc" },
  { label: "SSC", slug: "ssc" },
  { label: "Banking", slug: "banking" },
  { label: "Railway", slug: "railway" },
  { label: "Defence", slug: "defence" },
];

export default function HomePage() {
  return (
    <main>
      {/* Hero */}
      <section className="relative overflow-hidden border-b border-slate-200 bg-gradient-to-b from-slate-50 to-white px-4 py-20 dark:border-slate-800 dark:from-slate-900 dark:to-slate-900 sm:px-6 sm:py-28 lg:px-8">
        <div className="mx-auto max-w-4xl text-center">
          <h1 className="text-4xl font-bold tracking-tight text-slate-900 dark:text-white sm:text-5xl lg:text-6xl">
            India&apos;s First AI-Powered Exam Hall.
          </h1>
          <p className="mt-4 text-lg text-slate-600 dark:text-slate-400 sm:text-xl">
            Unlimited Practice for UPSC, SSC, and Banking.
          </p>
          <div className="mt-10">
            <a
              href={`${APP_BASE}/auth`}
              className="inline-flex items-center justify-center rounded-lg bg-emerald-600 px-6 py-3 text-base font-semibold text-white shadow-sm transition-colors hover:bg-emerald-700 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:ring-offset-2 dark:bg-emerald-500 dark:hover:bg-emerald-600"
            >
              Start Practicing Now
            </a>
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="px-4 py-16 sm:px-6 sm:py-20 lg:px-8">
        <div className="mx-auto max-w-6xl">
          <h2 className="sr-only">Features</h2>
          <div className="grid gap-8 sm:grid-cols-2 lg:grid-cols-3">
            {features.map(({ title, description, icon: Icon }) => (
              <article
                key={title}
                className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm transition-shadow hover:shadow-md dark:border-slate-800 dark:bg-slate-900/50"
              >
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-emerald-100 text-emerald-600 dark:bg-emerald-900/30 dark:text-emerald-400">
                  <Icon className="h-5 w-5" aria-hidden />
                </div>
                <h3 className="mt-4 text-lg font-semibold text-slate-900 dark:text-white">
                  {title}
                </h3>
                <p className="mt-2 text-slate-600 dark:text-slate-400">
                  {description}
                </p>
              </article>
            ))}
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-slate-200 bg-slate-50 px-4 py-10 dark:border-slate-800 dark:bg-slate-900/50 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-6xl">
          <div className="flex flex-col items-center justify-between gap-6 sm:flex-row">
            <p className="text-sm text-slate-500 dark:text-slate-400">
              © 2026 TyariWale. All rights reserved.
            </p>
            <nav
              className="flex flex-wrap justify-center gap-x-6 gap-y-1 text-sm"
              aria-label="Exams"
            >
              {examLinks.map(({ label, slug }) => (
                <Link
                  key={slug}
                  href={`/exams/${slug}`}
                  className="text-slate-600 transition-colors hover:text-slate-900 dark:text-slate-400 dark:hover:text-white"
                >
                  {label}
                </Link>
              ))}
            </nav>
          </div>
        </div>
      </footer>
    </main>
  );
}
