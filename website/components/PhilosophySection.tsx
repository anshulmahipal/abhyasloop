import { CheckCircle2, Lightbulb, HandMetal } from "lucide-react";

const columns = [
  {
    title: "Verified Patterns",
    description:
      "Every mock test is mapped to the exact syllabus and pattern of your target exam. No generic questions—only what aligns with how you'll be assessed.",
    icon: CheckCircle2,
  },
  {
    title: "AI Explanations",
    description:
      "Learn from every mistake. Get clear, instant explanations after each question so you improve instead of just scoring.",
    icon: Lightbulb,
  },
  {
    title: "Handcrafted Banks",
    description:
      "We launch slowly by design. We'd rather ship one exam with 100% accuracy than 100 exams with guesswork. Quality takes time.",
    icon: HandMetal,
  },
];

export function PhilosophySection() {
  return (
    <section
      className="border-b border-gray-200 bg-white px-4 py-16 sm:px-6 sm:py-20 lg:px-8"
      aria-label="Our philosophy"
    >
      <div className="mx-auto max-w-6xl">
        <h2 className="text-center text-2xl font-bold text-gray-900 sm:text-3xl">
          Our Philosophy: Quality takes time.
        </h2>
        <div className="mt-12 grid gap-8 sm:grid-cols-2 lg:grid-cols-3">
          {columns.map(({ title, description, icon: Icon }) => (
            <article
              key={title}
              className="rounded-xl border border-gray-200 bg-white p-6 text-center shadow-sm"
            >
              <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full border border-gray-200 bg-gray-50 text-emerald-600">
                <Icon className="h-6 w-6" aria-hidden />
              </div>
              <h3 className="mt-4 text-lg font-semibold text-gray-900">
                {title}
              </h3>
              <p className="mt-3 text-gray-600">{description}</p>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}
