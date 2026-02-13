import Link from "next/link";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { createClient } from "@/utils/supabase/server";
import { getCategoryIcon } from "@/lib/iconMap";
import { ExamCard } from "@/components/ExamCard";
import { ArrowLeft } from "lucide-react";

type Props = { params: Promise<{ categorySlug: string }> };

/** ISR: revalidate every 1 hour — new exams may be added more often */
export const revalidate = 3600;

type Category = {
  id: string;
  slug: string;
  title: string;
  icon: string | null;
};

type ExamForCard = {
  title: string;
  exam_level: string | null;
  slug: string;
};

async function getCategoryBySlug(slug: string): Promise<Category | null> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("exam_categories")
    .select("id, slug, title, icon")
    .eq("slug", slug)
    .maybeSingle();

  if (error) {
    console.error("getCategoryBySlug error:", error);
    return null;
  }
  return data as Category | null;
}

async function getExamsByCategoryId(categoryId: string): Promise<ExamForCard[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("exams")
    .select("title, exam_level, slug")
    .eq("category_id", categoryId)
    .eq("is_active", true)
    .order("title");

  if (error) {
    console.error("getExamsByCategoryId error:", error);
    return [];
  }
  return (data ?? []) as ExamForCard[];
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { categorySlug } = await params;
  const category = await getCategoryBySlug(categorySlug);
  if (!category) {
    return { title: "Category Not Found | TyariWale" };
  }
  return {
    title: `${category.title} Exams | TyariWale`,
    description: `Browse all ${category.title} exams. Syllabus, pattern, and mock tests.`,
  };
}

export default async function CategoryListingPage({ params }: Props) {
  const { categorySlug } = await params;
  const category = await getCategoryBySlug(categorySlug);
  if (!category) notFound();

  const exams = await getExamsByCategoryId(category.id);
  const IconComponent = getCategoryIcon(category.icon);

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

      {/* Header: icon, title, "X Exams Found" */}
      <header className="border-b border-slate-200 bg-white px-4 py-8 sm:px-6 lg:px-8 dark:border-slate-700 dark:bg-slate-800/50">
        <div className="mx-auto max-w-6xl">
          <div className="flex items-center gap-4">
            <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-xl bg-indigo-100 text-indigo-600 dark:bg-indigo-900/40 dark:text-indigo-400">
              <IconComponent className="h-7 w-7" aria-hidden />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-slate-900 dark:text-white sm:text-3xl">
                {category.title}
              </h1>
              <p className="mt-1 text-slate-600 dark:text-slate-400">
                {exams.length} exam{exams.length !== 1 ? "s" : ""} found
              </p>
            </div>
          </div>
        </div>
      </header>

      <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6 lg:px-8">
        {exams.length > 0 ? (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {exams.map((exam) => (
              <ExamCard key={exam.slug} exam={exam} />
            ))}
          </div>
        ) : (
          <p className="rounded-xl border border-slate-200 bg-white p-8 text-center text-slate-500 dark:border-slate-700 dark:bg-slate-800/50 dark:text-slate-400">
            No exams in this category yet. Check back soon.
          </p>
        )}
      </div>
    </main>
  );
}
