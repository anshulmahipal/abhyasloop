import { Zap, Gauge, Target } from "lucide-react";

const benefits = [
  {
    title: "Kill anxiety",
    description:
      "Practice in exam-like conditions so exam day feels familiar. No surprises—just confidence.",
    icon: Zap,
  },
  {
    title: "Track speed",
    description:
      "See how fast you solve. Improve time management and pacing before the real test.",
    icon: Gauge,
  },
  {
    title: "Know where you stand",
    description:
      "Instant breakdown of weak areas. Focus your prep on what actually moves the needle.",
    icon: Target,
  },
];

export function FeaturesSection() {
  return (
    <section
      className="min-h-[280px] border-b border-gray-200 bg-gray-100 px-4 py-16 sm:px-6 sm:py-20 lg:px-8"
      aria-label="Why TyariWale works"
    >
      <div className="mx-auto max-w-6xl">
        <h2 className="mb-10 text-2xl font-bold text-gray-900 sm:text-3xl">
          Why TyariWale works
        </h2>
        <div className="grid gap-8 sm:grid-cols-2 lg:grid-cols-3">
          {benefits.map(({ title, description, icon: Icon }) => (
            <article
              key={title}
              className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm transition-shadow hover:shadow-md"
            >
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-emerald-100 text-emerald-600">
                <Icon className="h-5 w-5" aria-hidden />
              </div>
              <h3 className="mt-4 text-lg font-semibold text-gray-900">
                {title}
              </h3>
              <p className="mt-2 text-gray-600">{description}</p>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}
