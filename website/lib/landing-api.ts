export type LandingCategory = {
  id: string;
  title: string;
  icon: string | null;
  slug: string;
  total_exams_count: number;
};

export type FeaturedExam = {
  id: string;
  title: string;
  short_name: string;
  conducting_body: string;
  topics: (string | { name?: string })[] | null;
  exam_level: string;
};

export type GetLandingDataResponse = {
  categories: LandingCategory[];
  featured_exams: FeaturedExam[];
};

const getLandingDataUrl = () => {
  const base = process.env.NEXT_PUBLIC_SUPABASE_URL;
  if (!base) return null;
  return `${base.replace(/\/$/, "")}/functions/v1/get-landing-data`;
};

export async function fetchLandingData(): Promise<GetLandingDataResponse> {
  const url = getLandingDataUrl();
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !anonKey) {
    console.error("Landing API: missing NEXT_PUBLIC_SUPABASE_URL or NEXT_PUBLIC_SUPABASE_ANON_KEY");
    return { categories: [], featured_exams: [] };
  }

  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 10000);
    const res = await fetch(url, {
      headers: { Authorization: `Bearer ${anonKey}` },
      next: { revalidate: 60 },
      signal: controller.signal,
    });
    clearTimeout(timeoutId);

    if (!res.ok) {
      const errText = await res.text();
      console.error(`get-landing-data HTTP ${res.status}:`, errText.slice(0, 200));
      return { categories: [], featured_exams: [] };
    }

    const data = (await res.json()) as GetLandingDataResponse;
    return {
      categories: data.categories ?? [],
      featured_exams: data.featured_exams ?? [],
    };
  } catch (e) {
    const err = e instanceof Error ? e : new Error(String(e));
    console.error("get-landing-data fetch failed:", err.message, "cause:", (e as { cause?: unknown })?.cause);
    return { categories: [], featured_exams: [] };
  }
}
