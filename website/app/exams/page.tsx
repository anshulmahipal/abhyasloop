import type { Metadata } from "next";
import { createClient } from "@/utils/supabase/server";
import { CategoryDirectory, type DirectoryCategory } from "@/components/CategoryDirectory";

async function getAllCategories(): Promise<DirectoryCategory[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("exam_categories")
    .select("id, slug, title, icon, total_exams_count")
    .order("total_exams_count", { ascending: false });

  if (error) {
    console.error("getAllCategories error:", error);
    return [];
  }
  return (data ?? []) as DirectoryCategory[];
}

export const metadata: Metadata = {
  title: "All Government Exam Categories 2026 | TyariWale",
  description:
    "Explore all government exam categories. Browse syllabus, pattern, and mock tests for UPSC, SSC, Banking, Railway, Defence and more.",
};

export default async function ExamsDirectoryPage() {
  const categories = await getAllCategories();
  const totalExams = categories.reduce((sum, c) => sum + (c.total_exams_count ?? 0), 0);
  const displayTotal = totalExams >= 1000 ? `${(totalExams / 1000).toFixed(1)}k+` : `${totalExams}+`;

  return (
    <main className="min-h-screen bg-slate-50 dark:bg-slate-900/50">
      <div className="mx-auto max-w-6xl px-4 py-10 sm:px-6 lg:px-8">
        <header className="mb-8">
          <h1 className="text-3xl font-bold text-slate-900 dark:text-white sm:text-4xl">
            Explore All Categories
          </h1>
          <p className="mt-2 text-lg text-slate-600 dark:text-slate-400">
            Browse {displayTotal} exams across {categories.length} sector{categories.length !== 1 ? "s" : ""}.
          </p>
        </header>

        <CategoryDirectory categories={categories} />
      </div>
    </main>
  );
}
