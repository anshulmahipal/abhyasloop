import Link from "next/link";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { createClient } from "@/utils/supabase/server";
import { getCategoryIcon } from "@/lib/iconMap";
import {
  ClipboardList,
  BookOpen,
  Info,
  Rocket,
  ArrowLeft,
} from "lucide-react";

type Props = { params: Promise<{ slug: string }> };

/** ISR: revalidate every 24 hours — syllabus/pattern rarely change */
export const revalidate = 86400;

export type ExamDetails = {
  title: string;
  description: string | null;
  topics: (string | { name?: string })[] | null;
  exam_level: string | null;
  conducting_body: string | null;
  icon: string | null;
  color: string | null;
  slug: string;
  recruitment_type: string | null;
};

async function getExamBySlug(slug: string): Promise<ExamDetails | null> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("exams")
    .select("title, description, topics, exam_level, conducting_body, icon, color, slug, recruitment_type")
    .eq("slug", slug)
    .eq("is_active", true)
    .maybeSingle();

  if (error) {
    console.error("getExamBySlug error:", error);
    return null;
  }
  return data as ExamDetails | null;
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
  const description = `Complete guide for ${exam.title}. Level: ${exam.exam_level ?? "—"}. Conducting Body: ${exam.conducting_body ?? "—"}.`;
  return {
    title: `${exam.title} Syllabus, Pattern & Mock Tests 2026 | TyariWale`,
    description,
  };
}

export default async function ExamDetailsPage({ params }: Props) {
  const { slug } = await params;
  const exam = await getExamBySlug(slug);
  if (!exam) notFound();

  const topicLabels = getTopicLabels(exam.topics);
  const primaryColor = safeColor(exam.color);
  const IconComponent = getCategoryIcon(exam.icon);

  return (
    <main className="min-h-screen bg-slate-50 dark:bg-slate-900/50">
      {/* Top nav */}
      <div className="border-b border-slate-200 bg-white dark:border-slate-700 dark:bg-slate-800/50">
        <div className="mx-auto max-w-6xl px-4 py-3 sm:px-6 lg:px-8">
          <Link
            href="/"
            className="inline-flex items-center gap-2 text-sm font-medium text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white"
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
              <h1 className="text-2xl font-bold text-slate-900 dark:text-white sm:text-3xl">
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
            </div>
          </div>
        </div>
      </header>

      <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6 lg:px-8">
        <div className="grid gap-8 lg:grid-cols-[1fr_340px]">
          {/* Left: Content */}
          <div className="space-y-8">
            {/* Overview */}
            <section className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-700 dark:bg-slate-800/50">
              <h2 className="flex items-center gap-2 text-lg font-semibold text-slate-900 dark:text-white">
                <BookOpen className="h-5 w-5 text-emerald-600 dark:text-emerald-400" aria-hidden />
                Overview
              </h2>
              <div className="mt-4">
                {exam.description ? (
                  <p className="whitespace-pre-wrap text-slate-600 dark:text-slate-300">
                    {exam.description}
                  </p>
                ) : (
                  <p className="text-slate-500 dark:text-slate-400">
                    No description available for this exam.
                  </p>
                )}
              </div>
            </section>

            {/* Syllabus Topics */}
            <section className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-700 dark:bg-slate-800/50">
              <h2 className="flex items-center gap-2 text-lg font-semibold text-slate-900 dark:text-white">
                <ClipboardList className="h-5 w-5 text-emerald-600 dark:text-emerald-400" aria-hidden />
                Syllabus Topics
              </h2>
              {topicLabels.length > 0 ? (
                <div className="mt-4 grid grid-cols-1 gap-2 sm:grid-cols-2">
                  {topicLabels.map((label) => (
                    <div
                      key={label}
                      className="rounded-lg border border-slate-200 bg-slate-50/80 px-4 py-3 text-sm font-medium text-slate-700 dark:border-slate-600 dark:bg-slate-700/30 dark:text-slate-300"
                    >
                      {label}
                    </div>
                  ))}
                </div>
              ) : (
                <p className="mt-4 text-slate-500 dark:text-slate-400">
                  Syllabus topics will be updated soon.
                </p>
              )}
            </section>
          </div>

          {/* Right: Sticky sidebar */}
          <aside className="space-y-6 lg:sticky lg:top-24 lg:self-start">
            <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-700 dark:bg-slate-800/50">
              <h3 className="flex items-center gap-2 text-base font-semibold text-slate-900 dark:text-white">
                <Info className="h-4 w-4 text-emerald-600 dark:text-emerald-400" aria-hidden />
                Exam Facts
              </h3>
              <dl className="mt-4 space-y-4">
                <div>
                  <dt className="text-xs font-medium uppercase tracking-wide text-slate-500 dark:text-slate-400">Level</dt>
                  <dd className="mt-1 text-sm font-medium text-slate-900 dark:text-white">{exam.exam_level ?? "—"}</dd>
                </div>
                <div>
                  <dt className="text-xs font-medium uppercase tracking-wide text-slate-500 dark:text-slate-400">Type</dt>
                  <dd className="mt-1 text-sm font-medium text-slate-900 dark:text-white">{exam.recruitment_type ?? "—"}</dd>
                </div>
                <div>
                  <dt className="text-xs font-medium uppercase tracking-wide text-slate-500 dark:text-slate-400">Mode</dt>
                  <dd className="mt-1 text-sm font-medium text-slate-900 dark:text-white">Online</dd>
                </div>
              </dl>
            </div>
            <div className="rounded-xl border-2 border-emerald-200 bg-emerald-50/50 p-6 dark:border-emerald-800 dark:bg-emerald-950/30">
              <p className="text-base font-semibold text-slate-900 dark:text-white">Ready to practice?</p>
              <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">Start a free mock test and get instant feedback.</p>
              <Link
                href={`/mock-test/${slug}`}
                className="mt-4 flex w-full items-center justify-center gap-2 rounded-lg bg-emerald-600 px-4 py-3.5 text-base font-semibold text-white shadow-sm transition-colors hover:bg-emerald-700 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:ring-offset-2 dark:bg-emerald-500 dark:hover:bg-emerald-600"
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
