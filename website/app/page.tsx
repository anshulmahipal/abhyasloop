import Link from "next/link";
import {
  Infinity,
  LayoutTemplate,
  BarChart3,
} from "lucide-react";
import { getCategoryIcon } from "@/lib/iconMap";
import {
  fetchLandingData,
  type FeaturedExam,
  type LandingCategory,
} from "@/lib/landing-api";
import { getLandingDataFromSupabase } from "@/lib/landing-data-fallback";

const APP_BASE = "https://app.tyariwale.com";

function getFirstTwoTopicLabels(topics: FeaturedExam["topics"]): string[] {
  if (!Array.isArray(topics)) return [];
  return topics.slice(0, 2).map((t) => (typeof t === "string" ? t : t?.name ?? "")).filter(Boolean);
}

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

export default async function HomePage() {
  let categories: LandingCategory[] = [];
  let featured_exams: FeaturedExam[] = [];

  try {
    let data = await fetchLandingData();
    categories = Array.isArray(data.categories) ? data.categories : [];
    featured_exams = Array.isArray(data.featured_exams) ? data.featured_exams : [];
    // Production fallback: if Edge Function failed (empty data), fetch directly from Supabase
    if (categories.length === 0 && featured_exams.length === 0) {
      const fallback = await getLandingDataFromSupabase();
      if (fallback) {
        categories = fallback.categories ?? [];
        featured_exams = fallback.featured_exams ?? [];
      }
    }
  } catch (_e) {
    // already logged; try fallback once
    try {
      const fallback = await getLandingDataFromSupabase();
      if (fallback) {
        categories = fallback.categories ?? [];
        featured_exams = fallback.featured_exams ?? [];
      }
    } catch {
      // render with empty data
    }
  }

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
              href={APP_BASE}
              className="inline-flex items-center justify-center rounded-lg bg-emerald-600 px-6 py-3 text-base font-semibold text-white shadow-sm transition-colors hover:bg-emerald-700 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:ring-offset-2 dark:bg-emerald-500 dark:hover:bg-emerald-600"
            >
              Start Practicing Now
            </a>
          </div>
        </div>
      </section>

      {/* Explore by Category */}
      <section className="border-b border-slate-200 bg-white px-4 py-16 dark:border-slate-800 dark:bg-slate-900/30 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-6xl">
          <div className="mb-12 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <h2 className="text-3xl font-bold text-gray-900 dark:text-white">
                Explore Exams by Category
              </h2>
              <p className="mt-2 text-gray-600 dark:text-slate-400">
                Find the perfect government job based on your skills.
              </p>
            </div>
            <Link
              href="/exams"
              className="inline-flex shrink-0 items-center font-semibold text-indigo-600 transition-colors hover:text-indigo-700 dark:text-indigo-400 dark:hover:text-indigo-300"
            >
              View All Categories <span className="ml-2">→</span>
            </Link>
          </div>
          <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
            {categories.map((cat) => {
              const Icon = getCategoryIcon(cat.icon);
              return (
                <Link
                  key={cat.id}
                  href={`/exams/${cat.slug}`}
                  className="flex flex-col items-center rounded-xl border border-slate-200 bg-slate-50/50 p-6 text-center transition-colors hover:border-indigo-300 hover:bg-indigo-50/50 dark:border-slate-700 dark:bg-slate-800/50 dark:hover:border-indigo-600 dark:hover:bg-indigo-950/30"
                >
                  <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-indigo-100 text-indigo-600 dark:bg-indigo-900/40 dark:text-indigo-400">
                    <Icon className="h-6 w-6" aria-hidden />
                  </div>
                  <h3 className="mt-3 font-semibold text-slate-900 dark:text-white">
                    {cat.title}
                  </h3>
                  <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
                    {cat.total_exams_count} exam{cat.total_exams_count !== 1 ? "s" : ""}
                  </p>
                </Link>
              );
            })}
          </div>
        </div>
      </section>

      {/* Featured National Exams */}
      <section className="border-b border-slate-200 bg-slate-50/50 px-4 py-16 dark:border-slate-800 dark:bg-slate-900/50 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-6xl">
          <h2 className="text-2xl font-bold text-slate-900 dark:text-white sm:text-3xl">
            Featured National Exams
          </h2>
          <div className="mt-8 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {featured_exams.map((exam) => {
              const topicTags = getFirstTwoTopicLabels(exam.topics);
              return (
                <article
                  key={exam.id}
                  className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm transition-shadow hover:shadow-md dark:border-slate-700 dark:bg-slate-800/50"
                >
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="text-lg font-bold text-indigo-600 dark:text-indigo-400">
                      {exam.short_name}
                    </span>
                    <span className="rounded-full bg-indigo-100 px-2.5 py-0.5 text-xs font-medium text-indigo-700 dark:bg-indigo-900/50 dark:text-indigo-300">
                      {exam.exam_level}
                    </span>
                  </div>
                  <h3 className="mt-3 text-base font-semibold text-slate-900 dark:text-white">
                    {exam.title}
                  </h3>
                  <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">
                    {exam.conducting_body}
                  </p>
                  {topicTags.length > 0 && (
                    <div className="mt-3 flex flex-wrap gap-1.5">
                      {topicTags.map((topic) => (
                        <span
                          key={topic}
                          className="rounded-md bg-slate-100 px-2 py-0.5 text-xs text-slate-600 dark:bg-slate-700 dark:text-slate-300"
                        >
                          {topic}
                        </span>
                      ))}
                    </div>
                  )}
                </article>
              );
            })}
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
