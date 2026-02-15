import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Privacy Policy | TyariWale",
  description:
    "How TyariWale collects, uses, and protects your data. We respect your privacy.",
};

function formatDate() {
  return new Date().toLocaleDateString("en-IN", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}

export default function PrivacyPage() {
  return (
    <main className="min-h-screen bg-white px-4 py-12 sm:px-6 lg:px-8">
      <article className="mx-auto max-w-3xl">
        <h1 className="text-3xl font-bold text-gray-900">Privacy Policy</h1>
        <p className="mt-2 text-sm text-gray-500">Last updated: {formatDate()}</p>

        <div className="prose mt-10 space-y-10 text-gray-600">
          <section>
            <h2 className="text-xl font-semibold text-gray-900">Introduction</h2>
            <p className="mt-2 leading-relaxed">
              We respect your privacy. This Privacy Policy explains how TyariWale (&quot;we&quot;, &quot;us&quot;, &quot;our&quot;) collects, uses, and protects your information when you use our platform.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-gray-900">Data Collection</h2>
            <p className="mt-2 leading-relaxed">
              We collect basic information such as your <strong>name</strong> and <strong>email</strong> when you sign up (e.g. via Google Login). We also collect <strong>usage data</strong>, including quiz scores and practice history, to help you track your progress and improve your preparation.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-gray-900">How We Use Data</h2>
            <p className="mt-2 leading-relaxed">
              We use your data to provide exam analysis, improve the app experience, and send you relevant updates (e.g. new exams or features). We do not sell your personal information to third parties.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-gray-900">Data Security</h2>
            <p className="mt-2 leading-relaxed">
              We use industry-standard encryption and security practices to protect your data. Our infrastructure is designed to keep your information safe from unauthorized access.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-gray-900">Your Rights</h2>
            <p className="mt-2 leading-relaxed">
              You can request account deletion at any time. To do so, contact us at{" "}
              <a href="mailto:support@tyariwale.com" className="font-medium text-emerald-600 hover:text-emerald-700">
                support@tyariwale.com
              </a>
              . We will process your request in accordance with applicable law.
            </p>
          </section>
        </div>
      </article>
    </main>
  );
}
