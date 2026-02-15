import Link from "next/link";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { createClient } from "@/utils/supabase/server";
import { getCategoryIcon } from "@/lib/iconMap";
import { Breadcrumbs, type BreadcrumbItem } from "@/components/Breadcrumbs";
import { DownloadSyllabusBtn } from "@/components/DownloadSyllabusBtn";
import {
  ClipboardList,
  BookOpen,
  Info,
  Rocket,
  ArrowLeft,
} from "lucide-react";

type Props = { params: Promise<{ slug: string }> };

const ACTIVE_USERS_PLACEHOLDER = "50,000+";

/** ISR: revalidate every 24 hours — syllabus/pattern rarely change */
export const revalidate = 86400;

export type ExamDetails = {
  title: string;
  short_name: string | null;
  description: string | null;
  topics: (string | { name?: string })[] | null;
  exam_level: string | null;
  conducting_body: string | null;
  icon: string | null;
  color: string | null;
  slug: string;
  recruitment_type: string | null;
  category_id: string | null;
};

type CategoryInfo = { title: string; slug: string } | null;

async function getExamBySlug(slug: string): Promise<ExamDetails | null> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("exams")
    .select("title, short_name, description, topics, exam_level, conducting_body, icon, color, slug, recruitment_type, category_id")
    .eq("slug", slug)
    .eq("is_active", true)
    .maybeSingle();

  if (error) {
    console.error("getExamBySlug error:", error);
    return null;
  }
  return data as ExamDetails | null;
}

async function getCategoryById(id: string): Promise<CategoryInfo> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("exam_categories")
    .select("title, slug")
    .eq("id", id)
    .maybeSingle();
  if (error || !data) return null;
  return { title: data.title, slug: data.slug };
}

function getTopicLabels(topics: ExamDetails["topics"]): string[] {
  if (!Array.isArray(topics)) return [];
  return topics.map((t) => (typeof t === "string" ? t : t?.name ?? "")).filter(Boolean);
}

function safeColor(hexOrName: string | null): string {
  if (!hexOrName) return "#0d9488";
  if (hexOrName.startsWith("#")) return hexOrName;
  return `#${hexOrName.replace(/^#/, "")}`;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const exam = await getExamBySlug(slug);
  if (!exam) {
    return { title: "Exam Not Found | TyariWale" };
  }
  const examName = exam.title;
  const shortName = exam.short_name ?? examName;
  const title = `${examName} 2026: Syllabus, Pattern, Free Mock Test - TyariWale`;
  const description = `Crack ${examName} with TyariWale. Get latest syllabus, exam pattern, previous year papers, and attempt free mock tests. Join ${ACTIVE_USERS_PLACEHOLDER} aspirants today.`;
  const keywords = [
    examName,
    shortName,
    `${examName} syllabus`,
    "free mock test",
    `${examName} 2026`,
  ].join(", ");
  return {
    title,
    description,
    keywords,
    openGraph: {
      title,
      description,
    },
  };
}

export default async function ExamDetailsPage({ params }: Props) {
  const { slug } = await params;
  const exam = await getExamBySlug(slug);
  if (!exam) notFound();

  const category = exam.category_id ? await getCategoryById(exam.category_id) : null;
  const breadcrumbItems: BreadcrumbItem[] = [
    { label: "Home", href: "/" },
    ...(category ? [{ label: category.title, href: `/exams/${category.slug}` }] : []),
    { label: exam.title },
  ];

  const topicLabels = getTopicLabels(exam.topics);
  const primaryColor = safeColor(exam.color);
  const IconComponent = getCategoryIcon(exam.icon);

  return (
    <main className="min-h-screen bg-gray-50">
      {/* Breadcrumbs — above everything for SEO */}
      <div className="print-hidden border-b border-gray-200 bg-white">
        <div className="mx-auto max-w-6xl px-4 py-3 sm:px-6 lg:px-8">
          <Breadcrumbs items={breadcrumbItems} />
        </div>
      </div>

      {/* Top nav */}
      <div className="print-hidden border-b border-gray-200 bg-white">
        <div className="mx-auto max-w-6xl px-4 py-3 sm:px-6 lg:px-8">
          <Link
            href="/"
            className="inline-flex items-center gap-2 text-sm font-medium text-gray-600 hover:text-gray-900"
          >
            <ArrowLeft className="h-4 w-4" aria-hidden />
            Back to All Exams
          </Link>
        </div>
      </div>

      {/* Header: subtle gradient, icon, title, conducting body badge */}
      <header
        className="px-4 py-10 sm:px-6 lg:px-8"
        style={{
          background: `linear-gradient(135deg, ${primaryColor}22 0%, ${primaryColor}08 50%, transparent 100%)`,
        }}
      >
        <div className="mx-auto max-w-6xl">
          <div className="flex items-start gap-4">
            <div
              className="flex h-16 w-16 shrink-0 items-center justify-center rounded-2xl text-white"
              style={{ backgroundColor: primaryColor }}
            >
              <IconComponent className="h-8 w-8" aria-hidden />
            </div>
            <div className="min-w-0 flex-1">
              <h1 className="text-2xl font-bold text-gray-900 sm:text-3xl">
                {exam.title}
              </h1>
              {exam.conducting_body && (
                <span
                  className="mt-2 inline-block rounded-full px-4 py-1.5 text-sm font-medium text-white"
                  style={{ backgroundColor: primaryColor }}
                >
                  {exam.conducting_body}
                </span>
              )}
              <div className="mt-6 flex flex-wrap items-center gap-3">
                <DownloadSyllabusBtn />
                <Link
                  href={`/mock-test/${slug}`}
                  className="print-hidden inline-flex items-center justify-center gap-2 rounded-lg bg-emerald-600 px-4 py-3.5 text-base font-semibold text-white shadow-sm transition-colors hover:bg-emerald-700 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:ring-offset-2"
                >
                  <Rocket className="h-5 w-5" aria-hidden />
                  Start Free Mock Test
                </Link>
              </div>
            </div>
          </div>
        </div>
      </header>

      <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6 lg:px-8">
        <div className="grid gap-8 lg:grid-cols-[1fr_340px]">
          {/* Left: Content */}
          <div className="space-y-8">
            {/* Overview */}
            <section className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
              <h2 className="flex items-center gap-2 text-lg font-semibold text-gray-900">
                <BookOpen className="h-5 w-5 text-emerald-600" aria-hidden />
                Overview
              </h2>
              <div className="mt-4">
                {exam.description ? (
                  <p className="whitespace-pre-wrap text-gray-600">
                    {exam.description}
                  </p>
                ) : (
                  <p className="text-gray-500">
                    No description available for this exam.
                  </p>
                )}
              </div>
            </section>

            {/* Syllabus Topics */}
            <section className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
              <h2 className="flex items-center gap-2 text-lg font-semibold text-gray-900">
                <ClipboardList className="h-5 w-5 text-emerald-600" aria-hidden />
                Syllabus Topics
              </h2>
              {topicLabels.length > 0 ? (
                <div className="mt-4 grid grid-cols-1 gap-2 sm:grid-cols-2">
                  {topicLabels.map((label) => (
                    <div
                      key={label}
                      className="rounded-lg border border-gray-200 bg-gray-50 px-4 py-3 text-sm font-medium text-gray-700"
                    >
                      {label}
                    </div>
                  ))}
                </div>
              ) : (
                <p className="mt-4 text-gray-500">
                  Syllabus topics will be updated soon.
                </p>
              )}
            </section>
          </div>

          {/* Right: Sticky sidebar — hidden in print */}
          <aside className="sidebar space-y-6 lg:sticky lg:top-24 lg:self-start">
            <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
              <h3 className="flex items-center gap-2 text-base font-semibold text-gray-900">
                <Info className="h-4 w-4 text-emerald-600" aria-hidden />
                Exam Facts
              </h3>
              <dl className="mt-4 space-y-4">
                <div>
                  <dt className="text-xs font-medium uppercase tracking-wide text-gray-500">Level</dt>
                  <dd className="mt-1 text-sm font-medium text-gray-900">{exam.exam_level ?? "—"}</dd>
                </div>
                <div>
                  <dt className="text-xs font-medium uppercase tracking-wide text-gray-500">Type</dt>
                  <dd className="mt-1 text-sm font-medium text-gray-900">{exam.recruitment_type ?? "—"}</dd>
                </div>
                <div>
                  <dt className="text-xs font-medium uppercase tracking-wide text-gray-500">Mode</dt>
                  <dd className="mt-1 text-sm font-medium text-gray-900">Online</dd>
                </div>
              </dl>
            </div>
            <div className="rounded-xl border-2 border-emerald-200 bg-emerald-50 p-6">
              <p className="text-base font-semibold text-gray-900">Ready to practice?</p>
              <p className="mt-1 text-sm text-gray-600">Start a free mock test and get instant feedback.</p>
              <Link
                href={`/mock-test/${slug}`}
                className="mt-4 flex w-full items-center justify-center gap-2 rounded-lg bg-emerald-600 px-4 py-3.5 text-base font-semibold text-white shadow-sm transition-colors hover:bg-emerald-700 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:ring-offset-2"
              >
                <Rocket className="h-5 w-5" aria-hidden />
                Start Free Mock Test
              </Link>
            </div>
          </aside>
        </div>
      </div>
    </main>
  );
}
