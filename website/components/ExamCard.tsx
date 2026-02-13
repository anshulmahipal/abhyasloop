import Link from "next/link";
import { ChevronRight } from "lucide-react";

export type ExamCardExam = {
  title: string;
  exam_level: string | null;
  slug: string;
};

type ExamCardProps = {
  exam: ExamCardExam;
};

export function ExamCard({ exam }: ExamCardProps) {
  return (
    <article className="flex flex-col rounded-xl border border-slate-200 bg-white p-5 shadow-sm transition-shadow hover:shadow-md dark:border-slate-700 dark:bg-slate-800/50">
      <h3 className="text-lg font-semibold text-slate-900 dark:text-white">
        {exam.title}
      </h3>
      {exam.exam_level && (
        <span className="mt-2 inline-flex w-fit rounded-full bg-indigo-100 px-2.5 py-0.5 text-xs font-medium text-indigo-700 dark:bg-indigo-900/50 dark:text-indigo-300">
          {exam.exam_level}
        </span>
      )}
      <Link
        href={`/exam/${exam.slug}`}
        className="mt-4 inline-flex items-center gap-1 text-sm font-medium text-emerald-600 hover:text-emerald-700 dark:text-emerald-400 dark:hover:text-emerald-300"
      >
        View Details
        <ChevronRight className="h-4 w-4" aria-hidden />
      </Link>
    </article>
  );
}
