const faqs = [
  {
    question: "What exams does TyariWale cover?",
    answer:
      "We cover UPSC, SSC, Banking, Railway, Defence, and other major government exams. You can browse by category or search for a specific exam to find aligned practice tests and blueprints.",
  },
  {
    question: "How are the practice questions generated?",
    answer:
      "Questions are AI-generated and aligned to official exam patterns and syllabi. You get unlimited practice with new content each time, so you never run out of relevant questions.",
  },
  {
    question: "Can I track my performance and weak areas?",
    answer:
      "Yes. After each test you get an instant analysis: score, time taken, topic-wise breakdown, and weak areas. Use these insights to focus your preparation where it matters most.",
  },
  {
    question: "Is TyariWale free to use?",
    answer:
      "You can explore exam categories and try practice tests on the platform. For full access to unlimited tests and detailed analytics, check the app for current plans.",
  },
];

export function FAQSection() {
  return (
    <section className="border-b border-gray-200 bg-white px-4 py-16 sm:px-6 sm:py-20 lg:px-8">
      <div className="mx-auto max-w-3xl">
        <h2 className="text-2xl font-bold text-gray-900 sm:text-3xl">
          Frequently asked questions
        </h2>
        <p className="mt-2 text-gray-600">
          Quick answers to common doubts about TyariWale.
        </p>
        <dl className="mt-10 space-y-8">
          {faqs.map(({ question, answer }) => (
            <div key={question}>
              <dt className="text-base font-semibold text-gray-900">
                {question}
              </dt>
              <dd className="mt-2 text-gray-600">{answer}</dd>
            </div>
          ))}
        </dl>
      </div>
    </section>
  );
}
