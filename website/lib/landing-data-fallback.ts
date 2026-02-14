import { createClient } from "@supabase/supabase-js";
import type { GetLandingDataResponse } from "@/lib/landing-api";

/**
 * Fallback when Edge Function (get-landing-data) fails in production.
 * Uses a plain Supabase client (no cookies) so it never throws from request context.
 */
export async function getLandingDataFromSupabase(): Promise<GetLandingDataResponse | null> {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !key) return null;

  try {
    const supabase = createClient(url, key);
    const [categoriesRes, examsRes] = await Promise.all([
      supabase
        .from("exam_categories")
        .select("id, title, icon, slug, total_exams_count")
        .order("total_exams_count", { ascending: false })
        .limit(8),
      supabase
        .from("exams")
        .select("id, title, short_name, conducting_body, topics, exam_level")
        .eq("exam_level", "National")
        .eq("is_active", true)
        .limit(6),
    ]);

    if (categoriesRes.error || examsRes.error) {
      console.error("Landing fallback DB error:", categoriesRes.error ?? examsRes.error);
      return null;
    }

    return {
      categories: categoriesRes.data ?? [],
      featured_exams: examsRes.data ?? [],
    };
  } catch (e) {
    console.error("Landing fallback error:", e);
    return null;
  }
}
