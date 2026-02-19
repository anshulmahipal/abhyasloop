import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/utils/supabase/server";

export interface GetTestResponse {
  topic?: string;
  questions: Array<{
    id: string;
    question: string;
    options: string[];
    correctIndex: number;
    difficulty?: string;
    explanation?: string;
  }>;
}

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ testId: string }> }
) {
  try {
    const { testId } = await params;
    if (!testId) {
      return NextResponse.json({ error: "testId is required" }, { status: 400 });
    }

    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: "Authentication required" }, { status: 401 });
    }

    const { data, error } = await supabase
      .from("mock_tests")
      .select("id, question_data, user_id, topic")
      .eq("id", testId)
      .maybeSingle();

    if (error) {
      console.error("Get test error:", error);
      return NextResponse.json(
        { error: "Failed to load test", details: error.message },
        { status: 500 }
      );
    }

    if (!data) {
      return NextResponse.json({ error: "Test not found" }, { status: 404 });
    }

    if (data.user_id && data.user_id !== user.id) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const payload = data.question_data as { questions?: unknown[] } | null;
    if (!payload || !Array.isArray(payload.questions) || payload.questions.length === 0) {
      return NextResponse.json({ error: "Test has no questions" }, { status: 404 });
    }

    const response: GetTestResponse = {
      ...(data.topic && { topic: data.topic as string }),
      questions: payload.questions.map((q: Record<string, unknown>) => ({
        id: String(q.id ?? ""),
        question: String(q.question ?? ""),
        options: Array.isArray(q.options) ? q.options as string[] : [],
        correctIndex: Number(q.correctIndex ?? 0),
        difficulty: q.difficulty as string | undefined,
        explanation: q.explanation as string | undefined,
      })),
    };
    return NextResponse.json(response);
  } catch (err) {
    console.error("Get test API error:", err);
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json(
      { error: "Internal server error", message },
      { status: 500 }
    );
  }
}
