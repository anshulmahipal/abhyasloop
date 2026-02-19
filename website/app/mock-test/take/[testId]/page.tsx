import type { Metadata } from "next";
import { TakeQuizClient } from "./TakeQuizClient";

type Props = { params: Promise<{ testId: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { testId } = await params;
  return {
    title: `Quiz | ${testId.slice(0, 8)}... | TyariWale`,
    description: "Complete your mock test.",
  };
}

export default async function TakeQuizPage({ params }: Props) {
  const { testId } = await params;
  return (
    <main className="mx-auto max-w-2xl px-4 py-8 sm:px-6">
      <TakeQuizClient testId={testId} />
    </main>
  );
}
