import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/utils/supabase/server";

type Difficulty = "easy" | "medium" | "hard";

interface StartQuizBody {
  userId: string;
  topic: string;
  difficulty: Difficulty;
  subtopic?: string | null;
}

interface QuestionItem {
  id: string;
  question: string;
  options: string[];
  correctIndex: number;
  difficulty: Difficulty;
  explanation?: string;
}

// Engagement-gated: pending = user has unfinished test for this topic
export interface StartQuizPendingResponse {
  status: "pending";
  testId: string;
  message: string;
  questionData?: { questions: QuestionItem[] };
}

// New test generated and stored in mock_tests
export interface StartQuizNewResponse {
  status: "new";
  testId: string;
  data: { questions: QuestionItem[] };
}

export type StartQuizResponse = StartQuizPendingResponse | StartQuizNewResponse;

const DIFFICULTIES: Difficulty[] = ["easy", "medium", "hard"];

function normalizeDifficulty(d: string): Difficulty {
  const lower = d?.toLowerCase() ?? "medium";
  return DIFFICULTIES.includes(lower as Difficulty) ? (lower as Difficulty) : "medium";
}

export async function POST(request: NextRequest) {
  try {
    const body = (await request.json()) as Partial<StartQuizBody>;
    const { userId, topic, difficulty, subtopic } = body;

    if (!userId || typeof userId !== "string" || !userId.trim()) {
      return NextResponse.json(
        { error: "userId is required and must be a non-empty string" },
        { status: 400 }
      );
    }
    if (!topic || typeof topic !== "string" || !topic.trim()) {
      return NextResponse.json(
        { error: "topic is required and must be a non-empty string" },
        { status: 400 }
      );
    }
    if (!difficulty || !DIFFICULTIES.includes(difficulty.toLowerCase() as Difficulty)) {
      return NextResponse.json(
        { error: "difficulty must be one of: easy, medium, hard" },
        { status: 400 }
      );
    }

    const normalizedDifficulty = normalizeDifficulty(difficulty);
    const supabase = await createClient();

    const {
      data: { user: sessionUser },
    } = await supabase.auth.getUser();
    if (sessionUser && sessionUser.id !== userId.trim()) {
      return NextResponse.json({ error: "userId does not match authenticated user" }, { status: 403 });
    }

    const uid = userId.trim();
    const topicTrimmed = topic.trim();

    // Step A: Engagement gate – check for unattempted test in mock_tests
    const { data: existing, error: checkError } = await supabase
      .from("mock_tests")
      .select("id, question_data")
      .eq("user_id", uid)
      .eq("topic", topicTrimmed)
      .eq("is_completed", false)
      .limit(1)
      .maybeSingle();

    if (checkError) {
      console.error("Engagement gate check error:", checkError);
      return NextResponse.json(
        { error: "Failed to check existing tests", details: checkError.message },
        { status: 500 }
      );
    }

    // Step B: Block – return pending so frontend can show "Resume Test"
    if (existing) {
      const payload = existing.question_data as { questions?: QuestionItem[] } | null;
      const questionData =
        payload && typeof payload === "object" && Array.isArray(payload.questions)
          ? { questions: payload.questions }
          : undefined;

      const pendingResponse: StartQuizPendingResponse = {
        status: "pending",
        testId: existing.id,
        message: `You have an incomplete AI-generated test for ${topicTrimmed}. You must complete it before generating a new one.`,
        ...(questionData && { questionData }),
      };
      return NextResponse.json(pendingResponse);
    }

    // Step C: No unattempted test – call generate-exam Edge Function
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
    if (!supabaseUrl || !anonKey) {
      return NextResponse.json(
        { error: "Server configuration error: Supabase URL or anon key missing" },
        { status: 500 }
      );
    }

    const { data: sessionData } = await supabase.auth.getSession();
    const accessToken = sessionData?.session?.access_token;
    if (!accessToken) {
      return NextResponse.json(
        { error: "Authentication required to generate a new quiz" },
        { status: 401 }
      );
    }

    const invokeRes = await fetch(`${supabaseUrl}/functions/v1/generate-exam`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${accessToken}`,
        apikey: anonKey,
      },
      body: JSON.stringify({
        topic: topicTrimmed,
        difficulty: normalizedDifficulty,
      }),
    });

    const invokeJson = (await invokeRes.json()) as Record<string, unknown>;

    if (!invokeRes.ok) {
      console.error("generate-exam invocation failed:", invokeRes.status, invokeJson);
      return NextResponse.json(
        {
          error: (invokeJson?.error as string) ?? "Quiz generation failed",
          details: (invokeJson?.details as string) ?? (invokeJson?.message as string),
        },
        { status: invokeRes.status >= 500 ? 500 : 400 }
      );
    }

    if (invokeJson?.error) {
      return NextResponse.json(
        {
          error: invokeJson.error as string,
          details: invokeJson.details as string,
        },
        { status: 400 }
      );
    }

    const id = invokeJson?.id as string | undefined;
    const questions = invokeJson?.questions as QuestionItem[] | undefined;
    if (!id || !Array.isArray(questions) || questions.length === 0) {
      return NextResponse.json(
        { error: "Invalid response from quiz generation service" },
        { status: 500 }
      );
    }

    const newResponse: StartQuizNewResponse = {
      status: "new",
      testId: id,
      data: { questions },
    };
    return NextResponse.json(newResponse);
  } catch (err) {
    console.error("Quiz start API error:", err);
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json(
      { error: "Internal server error", message },
      { status: 500 }
    );
  }
}
