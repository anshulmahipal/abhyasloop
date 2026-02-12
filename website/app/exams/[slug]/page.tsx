import Link from "next/link";
import type { Metadata } from "next";

const EXAM_NAMES: Record<string, string> = {
  upsc: "UPSC",
  ssc: "SSC",
  banking: "Banking",
  railway: "Railway",
  defence: "Defence",
};

const APP_BASE = "https://app.tyariwale.com";

type Props = { params: Promise<{ slug: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const name = EXAM_NAMES[slug] ?? slug;
  return {
    title: `${name} Practice Tests | TyariWale`,
    description: `Unlimited AI-powered practice for ${name} exams. Start practicing now.`,
  };
}

export default async function ExamPage({ params }: Props) {
  const { slug } = await params;
  const name = EXAM_NAMES[slug] ?? slug;

  return (
    <main className="mx-auto max-w-2xl px-4 py-16 text-center sm:px-6">
      <h1 className="text-3xl font-bold text-slate-900 dark:text-white">
        {name} Practice
      </h1>
      <p className="mt-4 text-slate-600 dark:text-slate-400">
        Unlimited AI-powered practice tests for {name}. Get started free.
      </p>
      <a
        href={`${APP_BASE}/auth`}
        className="mt-8 inline-block rounded-lg bg-emerald-600 px-6 py-3 font-semibold text-white hover:bg-emerald-700"
      >
        Start Practicing
      </a>
      <p className="mt-8">
        <Link href="/" className="text-slate-500 hover:text-slate-700 dark:hover:text-slate-300">
          ← Back to home
        </Link>
      </p>
    </main>
  );
}
