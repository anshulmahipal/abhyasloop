"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { createClient } from "@/utils/supabase/client";
import { Rocket, Loader2, FileQuestion } from "lucide-react";
import type { StartQuizResponse } from "@/app/api/quiz/start/route";

const STORAGE_KEY_PREFIX = "quiz_";

type Difficulty = "easy" | "medium" | "hard";

interface StartMockTestProps {
  topic: string;
  topicLabel: string;
  difficulty?: Difficulty;
}

export function StartMockTest({
  topic,
  topicLabel,
  difficulty = "medium",
}: StartMockTestProps) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pendingModal, setPendingModal] = useState<{
    testId: string;
    message: string;
  } | null>(null);

  const handleStart = async () => {
    setError(null);
    setLoading(true);
    try {
      const supabase = createClient();
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) {
        setError("Please sign in to start an AI test.");
        setLoading(false);
        return;
      }

      const res = await fetch("/api/quiz/start", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userId: user.id,
          topic,
          difficulty,
        }),
      });

      const data = (await res.json()) as StartQuizResponse & { error?: string; details?: string };

      if (!res.ok) {
        setError((data as { error?: string }).error ?? "Failed to start test.");
        setLoading(false);
        return;
      }

      if (data.status === "pending") {
        setPendingModal({
          testId: data.testId,
          message: data.message,
        });
        setLoading(false);
        return;
      }

      if (data.status === "new") {
        try {
          sessionStorage.setItem(
            `${STORAGE_KEY_PREFIX}${data.testId}`,
            JSON.stringify({ questions: data.data.questions, topic: topicLabel, difficulty })
          );
        } catch (_) {
          // ignore storage errors
        }
        router.push(`/mock-test/take/${data.testId}`);
        return;
      }

      setError("Unexpected response from server.");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong.");
    } finally {
      setLoading(false);
    }
  };

  const handleResume = () => {
    if (!pendingModal) return;
    router.push(`/mock-test/take/${pendingModal.testId}`);
    setPendingModal(null);
  };

  return (
    <>
      <div className="flex flex-col items-center gap-4">
        <button
          type="button"
          onClick={handleStart}
          disabled={loading}
          className="inline-flex items-center justify-center gap-2 rounded-lg bg-emerald-600 px-6 py-3.5 text-base font-semibold text-white shadow-sm transition-colors hover:bg-emerald-700 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:ring-offset-2 disabled:opacity-70"
        >
          {loading ? (
            <Loader2 className="h-5 w-5 animate-spin" aria-hidden />
          ) : (
            <Rocket className="h-5 w-5" aria-hidden />
          )}
          {loading ? "Creating test…" : "Generate AI Test"}
        </button>
        {error && (
          <p className="text-sm text-red-600" role="alert">
            {error}
          </p>
        )}
        <p className="text-sm text-gray-500">
          Sign in required. You can only have one incomplete test per topic at a time.
        </p>
      </div>

      {/* Pending (unfinished) test modal */}
      {pendingModal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
          role="dialog"
          aria-modal="true"
          aria-labelledby="pending-title"
        >
          <div className="w-full max-w-md rounded-xl bg-white p-6 shadow-xl">
            <div className="flex items-center gap-3 text-emerald-600">
              <FileQuestion className="h-10 w-10 shrink-0" aria-hidden />
              <h2 id="pending-title" className="text-lg font-semibold text-gray-900">
                Unfinished test
              </h2>
            </div>
            <p className="mt-4 text-gray-600">{pendingModal.message}</p>
            <div className="mt-6 flex flex-col gap-3 sm:flex-row">
              <button
                type="button"
                onClick={handleResume}
                className="flex-1 rounded-lg bg-emerald-600 px-4 py-3 font-semibold text-white transition-colors hover:bg-emerald-700"
              >
                Resume Test
              </button>
              <button
                type="button"
                onClick={() => setPendingModal(null)}
                className="flex-1 rounded-lg border border-gray-300 bg-white px-4 py-3 font-semibold text-gray-700 transition-colors hover:bg-gray-50"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
