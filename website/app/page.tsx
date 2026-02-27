import Link from "next/link";
import Image from "next/image";
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
import { PhilosophySection } from "@/components/PhilosophySection";
import { RoadmapSection } from "@/components/RoadmapSection";
import { AnalyticsFeature } from "@/components/AnalyticsFeature";

const APP_BASE = "https://app.tyariwale.com";

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
          <Image
            src="/logo.png"
            alt="TyariWale - AI analytics for your exam preparation"
            width={120}
            height={120}
            priority
            sizes="(max-width: 768px) 80px, 120px"
            className="mx-auto"
          />
          <h1 className="mt-6 text-4xl font-bold tracking-tight text-gray-900 sm:text-5xl lg:text-6xl">
            Stop guessing why your score is stuck. Let AI find your exact
            weaknesses.
          </h1>
          <p className="mt-4 text-lg text-gray-600 sm:text-xl">
            Taking mock tests isn&apos;t enough. TyariWale&apos;s AI analytics
            engine tracks your speed, accuracy, and micro-topic performance to
            build a personalized roadmap to clear your target exam.
          </p>
          <div className="mt-10 flex flex-col items-center justify-center gap-4 sm:flex-row">
            <a
              href={APP_BASE}
              className="inline-flex w-full justify-center rounded-lg bg-emerald-600 px-6 py-3 text-base font-semibold text-white shadow-sm transition-colors hover:bg-emerald-700 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:ring-offset-2 sm:w-auto"
            >
              Get Your Free AI Diagnosis
            </a>
            <Link
              href="#analytics"
              className="inline-flex w-full justify-center rounded-lg border-2 border-gray-300 bg-white px-6 py-3 text-base font-semibold text-gray-700 transition-colors hover:border-gray-400 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:ring-offset-2 sm:w-auto"
            >
              See How It Works
            </Link>
          </div>
        </div>
      </section>

      <PhilosophySection />
      <RoadmapSection />

      <AnalyticsFeature />

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

      <FAQSection />
      <CTASection />
      <Footer />
    </main>
  );
}
