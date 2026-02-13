import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
    const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY") ?? "";
    if (!supabaseUrl || !supabaseAnonKey) {
      return new Response(
        JSON.stringify({ error: "Missing Supabase env" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const supabase = createClient(supabaseUrl, supabaseAnonKey);

    const [categoriesRes, examsRes] = await Promise.all([
      supabase
        .from("exam_categories")
        .select("id, title, slug, icon, total_exams_count")
        .order("total_exams_count", { ascending: false })
        .limit(8),
      supabase
        .from("exams")
        .select("id, title, short_name, conducting_body, exam_level, topics, is_active")
        .eq("exam_level", "National")
        .eq("is_active", true)
        .limit(6),
    ]);

    if (categoriesRes.error) {
      console.error("exam_categories error:", categoriesRes.error);
      return new Response(
        JSON.stringify({ error: categoriesRes.error.message }),
        { status: 502, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }
    if (examsRes.error) {
      console.error("exams error:", examsRes.error);
      return new Response(
        JSON.stringify({ error: examsRes.error.message }),
        { status: 502, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const body = {
      categories: categoriesRes.data ?? [],
      featuredExams: examsRes.data ?? [],
    };

    return new Response(JSON.stringify(body), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("website-api error:", e);
    return new Response(
      JSON.stringify({ error: e instanceof Error ? e.message : "Internal error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
