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
import { Footer } from "@/components/Footer";
import { FeaturesSection } from "@/components/FeaturesSection";
import { StatsSection } from "@/components/StatsSection";
import { FAQSection } from "@/components/FAQSection";
import { CTASection } from "@/components/CTASection";

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

export default async function HomePage() {
  let categories: LandingCategory[] = [];
  let featured_exams: FeaturedExam[] = [];

  try {
    let data = await fetchLandingData();
    categories = Array.isArray(data.categories) ? data.categories : [];
    featured_exams = Array.isArray(data.featured_exams) ? data.featured_exams : [];
    if (categories.length === 0 && featured_exams.length === 0) {
      const fallback = await getLandingDataFromSupabase();
      if (fallback) {
        categories = fallback.categories ?? [];
        featured_exams = fallback.featured_exams ?? [];
      }
    }
  } catch (_e) {
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
    <main className="bg-white">
      {/* Hero */}
      <section className="relative overflow-hidden border-b border-gray-200 bg-white px-4 py-20 sm:px-6 sm:py-28 lg:px-8">
        <div className="mx-auto max-w-4xl text-center">
          <h1 className="text-4xl font-bold tracking-tight text-gray-900 sm:text-5xl lg:text-6xl">
            India&apos;s First <span className="text-emerald-600">AI-Powered</span> Exam Hall.
          </h1>
          <p className="mt-4 text-lg text-gray-600 sm:text-xl">
            <span className="font-semibold text-emerald-700">
              Built by Aspirants, For Aspirants.
            </span>{" "}
            The most trusted community for Government Exam preparation in India.
          </p>
          <div className="mt-10">
            <a
              href={APP_BASE}
              className="inline-flex items-center justify-center rounded-lg bg-emerald-600 px-6 py-3 text-base font-semibold text-white shadow-sm transition-colors hover:bg-emerald-700 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:ring-offset-2"
            >
              Start Practicing Now
            </a>
          </div>
        </div>
      </section>

      <FeaturesSection />
      <StatsSection />

      {/* Explore by Category */}
      <section className="border-b border-gray-200 bg-white px-4 py-16 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-6xl">
          <div className="mb-12 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <h2 className="text-3xl font-bold text-gray-900">
                Explore Exams by Category
              </h2>
              <p className="mt-2 text-gray-600">
                Find the perfect government job based on your skills.
              </p>
            </div>
            <Link
              href="/exams"
              className="inline-flex shrink-0 items-center font-semibold text-emerald-600 transition-colors hover:text-emerald-700"
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
                  className="flex flex-col items-center rounded-xl border border-gray-200 bg-white p-6 text-center shadow-sm transition-colors hover:border-emerald-200 hover:shadow-md"
                >
                  <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-emerald-100 text-emerald-600">
                    <Icon className="h-6 w-6" aria-hidden />
                  </div>
                  <h3 className="mt-3 font-semibold text-gray-900">
                    {cat.title}
                  </h3>
                  <p className="mt-1 text-sm text-gray-500">
                    {cat.total_exams_count} exam{cat.total_exams_count !== 1 ? "s" : ""}
                  </p>
                </Link>
              );
            })}
          </div>
        </div>
      </section>

      {/* Featured National Exams */}
      <section className="border-b border-gray-200 bg-gray-50 px-4 py-16 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-6xl">
          <h2 className="text-2xl font-bold text-gray-900 sm:text-3xl">
            Featured National Exams
          </h2>
          <div className="mt-8 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {featured_exams.map((exam) => {
              const topicTags = getFirstTwoTopicLabels(exam.topics);
              return (
                <article
                  key={exam.id}
                  className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm transition-shadow hover:shadow-md"
                >
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="text-lg font-bold text-emerald-600">
                      {exam.short_name}
                    </span>
                    <span className="rounded-full bg-emerald-100 px-2.5 py-0.5 text-xs font-medium text-emerald-800">
                      {exam.exam_level}
                    </span>
                  </div>
                  <h3 className="mt-3 text-base font-semibold text-gray-900">
                    {exam.title}
                  </h3>
                  <p className="mt-2 text-sm text-gray-600">
                    {exam.conducting_body}
                  </p>
                  {topicTags.length > 0 && (
                    <div className="mt-3 flex flex-wrap gap-1.5">
                      {topicTags.map((topic) => (
                        <span
                          key={topic}
                          className="rounded-md bg-gray-100 px-2 py-0.5 text-xs text-gray-600"
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
      <section className="bg-white px-4 py-16 sm:px-6 sm:py-20 lg:px-8">
        <div className="mx-auto max-w-6xl">
          <h2 className="sr-only">Features</h2>
          <div className="grid gap-8 sm:grid-cols-2 lg:grid-cols-3">
            {features.map(({ title, description, icon: Icon }) => (
              <article
                key={title}
                className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm transition-shadow hover:shadow-md"
              >
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-emerald-100 text-emerald-600">
                  <Icon className="h-5 w-5" aria-hidden />
                </div>
                <h3 className="mt-4 text-lg font-semibold text-gray-900">
                  {title}
                </h3>
                <p className="mt-2 text-gray-600">
                  {description}
                </p>
              </article>
            ))}
          </div>
        </div>
      </section>

      <FAQSection />
      <CTASection />
      <Footer />
    </main>
  );
}
