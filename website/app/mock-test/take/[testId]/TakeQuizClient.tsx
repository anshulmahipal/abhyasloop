"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";

const STORAGE_KEY_PREFIX = "quiz_";

interface QuestionItem {
  id: string;
  question: string;
  options: string[];
  correctIndex: number;
  difficulty?: string;
  explanation?: string;
}

interface TakeQuizClientProps {
  testId: string;
}

export function TakeQuizClient({ testId }: TakeQuizClientProps) {
  const router = useRouter();
  const [questions, setQuestions] = useState<QuestionItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [topicLabel, setTopicLabel] = useState<string>("Quiz");
  const [currentIndex, setCurrentIndex] = useState(0);
  const [answers, setAnswers] = useState<(number | null)[]>([]);
  const [submitted, setSubmitted] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [score, setScore] = useState<number | null>(null);

  useEffect(() => {
    const load = async () => {
      try {
        const stored = typeof window !== "undefined" ? sessionStorage.getItem(`${STORAGE_KEY_PREFIX}${testId}`) : null;
        if (stored) {
          const parsed = JSON.parse(stored) as { questions: QuestionItem[]; topic?: string; difficulty?: string };
          if (Array.isArray(parsed.questions) && parsed.questions.length > 0) {
            setQuestions(parsed.questions);
            setAnswers(new Array(parsed.questions.length).fill(null));
            setTopicLabel(parsed.topic ?? "Quiz");
            setLoading(false);
            return;
          }
        }

        const res = await fetch(`/api/quiz/test/${testId}`);
        const data = await res.json();
        if (!res.ok) {
          setError(data?.error ?? "Failed to load test.");
          setLoading(false);
          return;
        }
        if (data.questions?.length) {
          setQuestions(data.questions);
          setAnswers(new Array(data.questions.length).fill(null));
          if (data.topic) setTopicLabel(data.topic);
          setLoading(false);
        } else {
          setError("No questions in this test.");
          setLoading(false);
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to load test.");
        setLoading(false);
      }
    };
    load();
  }, [testId]);

  const handleOptionSelect = (optionIndex: number) => {
    setAnswers((prev) => {
      const next = [...prev];
      next[currentIndex] = optionIndex;
      return next;
    });
  };

  const handleSubmit = async () => {
    if (questions.length === 0) return;
    setSubmitting(true);
    let correct = 0;
    for (let i = 0; i < questions.length; i++) {
      if (answers[i] === questions[i].correctIndex) correct++;
    }
    setScore(correct);

    try {
      await fetch(`/api/quiz/test/${testId}/complete`, { method: "POST" });
    } catch (_) {
      // non-blocking
    }
    try {
      sessionStorage.removeItem(`${STORAGE_KEY_PREFIX}${testId}`);
    } catch (_) {}
    setSubmitted(true);
    setSubmitting(false);
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-16">
        <p className="text-gray-600">Loading test…</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="rounded-xl border border-red-200 bg-red-50 p-6 text-center">
        <p className="text-red-700">{error}</p>
        <Link href="/" className="mt-4 inline-block text-emerald-600 hover:underline">
          Back to Home
        </Link>
      </div>
    );
  }

  if (questions.length === 0) {
    return (
      <div className="text-center text-gray-600">
        <p>No questions in this test.</p>
        <Link href="/" className="mt-4 inline-block text-emerald-600 hover:underline">
          Back to Home
        </Link>
      </div>
    );
  }

  if (submitted && score !== null) {
    return (
      <div className="rounded-xl border border-gray-200 bg-white p-8 shadow-sm">
        <h2 className="text-xl font-bold text-gray-900">Test complete</h2>
        <p className="mt-4 text-2xl font-semibold text-emerald-600">
          Score: {score} / {questions.length}
        </p>
        <div className="mt-6 flex flex-col gap-3 sm:flex-row">
          <Link
            href={`/mock-test/${topicLabel.toLowerCase()}`}
            className="rounded-lg bg-emerald-600 px-4 py-3 text-center font-semibold text-white hover:bg-emerald-700"
          >
            Start another test
          </Link>
          <Link
            href="/"
            className="rounded-lg border border-gray-300 px-4 py-3 text-center font-semibold text-gray-700 hover:bg-gray-50"
          >
            Home
          </Link>
        </div>
      </div>
    );
  }

  const q = questions[currentIndex];
  const selected = answers[currentIndex];

  return (
    <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
      <p className="text-sm font-medium text-gray-500">
        Question {currentIndex + 1} of {questions.length}
      </p>
      <h3 className="mt-4 text-lg font-semibold text-gray-900">{q.question}</h3>
      <ul className="mt-6 space-y-3">
        {q.options.map((opt, idx) => (
          <li key={idx}>
            <button
              type="button"
              onClick={() => handleOptionSelect(idx)}
              className={`w-full rounded-lg border px-4 py-3 text-left text-sm font-medium transition-colors ${
                selected === idx
                  ? "border-emerald-600 bg-emerald-50 text-emerald-800"
                  : "border-gray-200 bg-gray-50 text-gray-800 hover:border-gray-300"
              }`}
            >
              {opt}
            </button>
          </li>
        ))}
      </ul>
      <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:justify-between">
        <button
          type="button"
          onClick={() => setCurrentIndex((i) => Math.max(0, i - 1))}
          disabled={currentIndex === 0}
          className="rounded-lg border border-gray-300 px-4 py-2 font-medium text-gray-700 disabled:opacity-50"
        >
          Previous
        </button>
        {currentIndex < questions.length - 1 ? (
          <button
            type="button"
            onClick={() => setCurrentIndex((i) => i + 1)}
            className="rounded-lg bg-emerald-600 px-4 py-2 font-medium text-white hover:bg-emerald-700"
          >
            Next
          </button>
        ) : (
          <button
            type="button"
            onClick={handleSubmit}
            disabled={submitting}
            className="rounded-lg bg-emerald-600 px-4 py-2 font-medium text-white hover:bg-emerald-700 disabled:opacity-70"
          >
            {submitting ? "Submitting…" : "Submit test"}
          </button>
        )}
      </div>
    </div>
  );
}
