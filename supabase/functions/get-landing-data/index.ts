import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, OPTIONS",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Max-Age": "86400",
};

Deno.serve(async (req) => {
  // CORS preflight: browser sends OPTIONS before GET; must return 2xx with CORS headers
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 204, headers: corsHeaders });
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

    const [categoriesRes, featuredExamsRes] = await Promise.all([
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

    if (categoriesRes.error) {
      console.error("get-landing-data categories error:", categoriesRes.error);
      return new Response(
        JSON.stringify({ error: categoriesRes.error.message }),
        { status: 502, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }
    if (featuredExamsRes.error) {
      console.error("get-landing-data featured exams error:", featuredExamsRes.error);
      return new Response(
        JSON.stringify({ error: featuredExamsRes.error.message }),
        { status: 502, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const body = {
      categories: categoriesRes.data ?? [],
      featured_exams: featuredExamsRes.data ?? [],
    };

    return new Response(JSON.stringify(body), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("get-landing-data error:", e);
    return new Response(
      JSON.stringify({ error: e instanceof Error ? e.message : "Internal error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
