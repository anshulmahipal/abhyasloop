"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { ChevronRight } from "lucide-react";
import { getCategoryIcon } from "@/lib/iconMap";

export type DirectoryCategory = {
  id: string;
  slug: string;
  title: string;
  icon: string | null;
  total_exams_count: number;
};

type CategoryDirectoryProps = {
  categories: DirectoryCategory[];
};

export function CategoryDirectory({ categories }: CategoryDirectoryProps) {
  const [query, setQuery] = useState("");

  const filtered = useMemo(() => {
    if (!query.trim()) return categories;
    const q = query.trim().toLowerCase();
    return categories.filter(
      (c) =>
        c.title.toLowerCase().includes(q) || (c.slug && c.slug.toLowerCase().includes(q))
    );
  }, [categories, query]);

  return (
    <>
      <div className="mb-6">
        <label htmlFor="category-search" className="sr-only">
          Search categories
        </label>
        <input
          id="category-search"
          type="search"
          placeholder="Search categories..."
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          className="w-full max-w-md rounded-lg border border-slate-300 bg-white px-4 py-2.5 text-slate-900 placeholder-slate-500 focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500 dark:border-slate-600 dark:bg-slate-800 dark:text-white dark:placeholder-slate-400"
          aria-label="Search categories"
        />
      </div>

      {filtered.length > 0 ? (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {filtered.map((cat) => {
            const IconComponent = getCategoryIcon(cat.icon);
            return (
              <Link
                key={cat.id}
                href={`/exams/${cat.slug}`}
                className="group flex items-center gap-4 rounded-xl border border-slate-200 bg-white p-5 shadow-sm transition-shadow hover:shadow-md dark:border-slate-700 dark:bg-slate-800/50"
              >
                <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-lg bg-indigo-100 text-indigo-600 dark:bg-indigo-900/40 dark:text-indigo-400">
                  <IconComponent className="h-6 w-6" aria-hidden />
                </div>
                <div className="min-w-0 flex-1">
                  <h2 className="font-semibold text-slate-900 dark:text-white">
                    {cat.title}
                  </h2>
                  <span className="mt-1 inline-block text-sm text-slate-500 dark:text-slate-400">
                    {cat.total_exams_count ?? 0} exam{(cat.total_exams_count ?? 0) !== 1 ? "s" : ""}
                  </span>
                </div>
                <ChevronRight
                  className="h-5 w-5 shrink-0 text-slate-400 transition-transform group-hover:translate-x-0.5 group-hover:text-emerald-600 dark:group-hover:text-emerald-400"
                  aria-hidden
                />
              </Link>
            );
          })}
        </div>
      ) : (
        <p className="rounded-xl border border-slate-200 bg-white p-8 text-center text-slate-500 dark:border-slate-700 dark:bg-slate-800/50 dark:text-slate-400">
          No categories match &quot;{query}&quot;.
        </p>
      )}
    </>
  );
}
