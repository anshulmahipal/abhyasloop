import Link from "next/link";

const APP_BASE = "https://app.tyariwale.com";

export function CTASection() {
  return (
    <section
      className="bg-emerald-600 px-4 py-12 sm:px-6 sm:py-14 lg:px-8"
      aria-label="Call to action"
    >
      <div className="mx-auto max-w-4xl text-center">
        <h2 className="text-2xl font-bold text-white sm:text-3xl">
          Ready to practice?
        </h2>
        <p className="mt-2 text-emerald-100">
          Explore exams or sign in to pick up where you left off.
        </p>
        <div className="mt-8 flex flex-col items-center justify-center gap-4 sm:flex-row">
          <Link
            href="/exams"
            className="w-full shrink-0 rounded-lg bg-white px-6 py-3 text-base font-semibold text-emerald-600 shadow-sm transition-colors hover:bg-gray-100 focus:outline-none focus:ring-2 focus:ring-white focus:ring-offset-2 focus:ring-offset-emerald-600 sm:w-auto"
          >
            Explore exams
          </Link>
          <a
            href={APP_BASE}
            className="w-full shrink-0 rounded-lg border-2 border-white px-6 py-3 text-base font-semibold text-white transition-colors hover:bg-white/10 focus:outline-none focus:ring-2 focus:ring-white focus:ring-offset-2 focus:ring-offset-emerald-600 sm:w-auto"
          >
            Log in
          </a>
        </div>
      </div>
    </section>
  );
}
