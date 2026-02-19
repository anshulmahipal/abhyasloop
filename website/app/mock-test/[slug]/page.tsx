import Link from "next/link";
import type { Metadata } from "next";
import { StartMockTest } from "@/components/StartMockTest";

type Props = { params: Promise<{ slug: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const name = slug.charAt(0).toUpperCase() + slug.slice(1);
  return {
    title: `${name} Mock Test | TyariWale`,
    description: `Take a free mock test for ${name}. Practice with AI-generated questions.`,
  };
}

export default async function MockTestPage({ params }: Props) {
  const { slug } = await params;
  const topicLabel = slug.charAt(0).toUpperCase() + slug.slice(1);

  return (
    <main className="mx-auto max-w-2xl px-4 py-16 text-center sm:px-6">
      <h1 className="text-3xl font-bold text-gray-900">{topicLabel} Mock Test</h1>
      <p className="mt-4 text-gray-600">
        Generate an AI test for {topicLabel}. You can have one incomplete test per topic—finish it or
        resume before starting a new one.
      </p>
      <div className="mt-10">
        <StartMockTest topic={slug} topicLabel={topicLabel} />
      </div>
      <div className="mt-12 flex flex-col items-center gap-4 sm:flex-row sm:justify-center">
        <Link
          href={`/exam/${slug}`}
          className="rounded-lg border border-gray-300 bg-white px-6 py-3 font-semibold text-gray-700 hover:bg-gray-50"
        >
          ← Back to {topicLabel} exam details
        </Link>
        <Link href="/" className="text-gray-600 hover:text-gray-900">
          Home
        </Link>
      </div>
    </main>
  );
}
