import Link from "next/link";
import type { Metadata } from "next";

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
  const name = slug.charAt(0).toUpperCase() + slug.slice(1);

  return (
    <main className="mx-auto max-w-2xl px-4 py-16 text-center sm:px-6">
      <h1 className="text-3xl font-bold text-gray-900">
        {name} Mock Test
      </h1>
      <p className="mt-4 text-gray-600">
        Free mock tests for {name} are coming soon. You&apos;ll be able to start a timed test with AI-generated questions here.
      </p>
      <div className="mt-8 flex flex-col items-center gap-4 sm:flex-row sm:justify-center">
        <Link
          href={`/exam/${slug}`}
          className="rounded-lg border border-gray-300 bg-white px-6 py-3 font-semibold text-gray-700 shadow-sm hover:bg-gray-50"
        >
          ← Back to {name} exam details
        </Link>
        <Link
          href="/"
          className="text-gray-600 hover:text-gray-900"
        >
          Home
        </Link>
      </div>
    </main>
  );
}
