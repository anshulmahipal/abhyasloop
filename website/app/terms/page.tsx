import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Terms of Service | TyariWale",
  description:
    "Terms and conditions for using TyariWale. User conduct, intellectual property, and disclaimers.",
};

export default function TermsPage() {
  return (
    <main className="min-h-screen bg-white px-4 py-12 sm:px-6 lg:px-8">
      <article className="mx-auto max-w-3xl">
        <h1 className="text-3xl font-bold text-gray-900">Terms of Service</h1>

        <div className="prose mt-10 space-y-10 text-gray-600">
          <section>
            <h2 className="text-xl font-semibold text-gray-900">Acceptance</h2>
            <p className="mt-2 leading-relaxed">
              By using TyariWale, you agree to these Terms of Service. If you do not agree, please do not use our platform. We may update these terms from time to time; continued use after changes constitutes acceptance.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-gray-900">User Conduct</h2>
            <p className="mt-2 leading-relaxed">
              You agree not to cheat, scrape or copy our content without permission, or engage in abusive behavior toward other users or our team. Use the platform only for personal, non-commercial exam preparation. We reserve the right to remove content or restrict access for violations.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-gray-900">Intellectual Property</h2>
            <p className="mt-2 leading-relaxed">
              All questions, explanations, and original content on TyariWale belong to TyariWale or are used under fair use for educational purposes. You may not redistribute, resell, or create derivative works from our content without written permission.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-gray-900">Disclaimer</h2>
            <p className="mt-2 leading-relaxed">
              We provide educational material to help you prepare for government exams. We do not guarantee selection in any government job or exam. Results depend on your preparation, exam performance, and official selection criteria. Use our platform as a study aid only.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-gray-900">Termination</h2>
            <p className="mt-2 leading-relaxed">
              We may suspend or permanently ban users who violate these terms or engage in harmful behavior. You may stop using the service at any time. For account deletion, see our{" "}
              <a href="/privacy" className="font-medium text-emerald-600 hover:text-emerald-700">
                Privacy Policy
              </a>
              .
            </p>
          </section>
        </div>
      </article>
    </main>
  );
}
