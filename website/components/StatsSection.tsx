const stats = [
  { value: "10K+", label: "Practice questions" },
  { value: "50+", label: "Exam blueprints" },
  { value: "UPSC · SSC · Banking", label: "Covered" },
];

export function StatsSection() {
  return (
    <section
      className="bg-emerald-600 px-4 py-12 sm:px-6 sm:py-14 lg:px-8"
      aria-label="Platform stats"
    >
      <div className="mx-auto max-w-6xl">
        <div className="grid grid-cols-1 gap-8 text-center sm:grid-cols-3">
          {stats.map(({ value, label }) => (
            <div key={label}>
              <p className="text-2xl font-bold text-white sm:text-3xl">
                {value}
              </p>
              <p className="mt-1 text-emerald-100">{label}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
