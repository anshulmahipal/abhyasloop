"use client";

import { motion } from "framer-motion";
import { Check } from "lucide-react";

const checklistItems = [
  "Micro-Topic Granularity",
  "Speed vs. Accuracy Tracking",
  "Custom AI Action Plans",
];

const viewport = { once: true };

export function AnalyticsFeature() {
  return (
    <section
      id="analytics"
      className="border-b border-gray-200 bg-gray-50 px-4 py-16 sm:px-6 sm:py-20 lg:px-8"
      aria-label="AI Analytics feature"
    >
      <div className="mx-auto max-w-6xl">
        <div className="grid items-center gap-12 lg:grid-cols-2 lg:gap-16">
          {/* Left: Copy — fade + slide up, once */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={viewport}
            transition={{ duration: 0.6 }}
          >
            <h2 className="text-2xl font-bold tracking-tight text-slate-800 sm:text-3xl lg:text-4xl">
              Stop guessing. Let AI find your exact weaknesses.
            </h2>
            <p className="mt-4 text-lg text-gray-600">
              Our engine tracks your speed, accuracy, and pattern recognition
              across hundreds of micro-topics to build a personalized roadmap to
              selection.
            </p>
            <ul className="mt-6 space-y-3" role="list">
              {checklistItems.map((item) => (
                <li key={item} className="flex items-center gap-3">
                  <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-emerald-100 text-emerald-600">
                    <Check className="h-4 w-4" aria-hidden />
                  </span>
                  <span className="font-medium text-gray-800">{item}</span>
                </li>
              ))}
            </ul>
          </motion.div>

          {/* Right: Dashboard card — staggered reveal when in view */}
          <div className="relative flex justify-center lg:justify-end">
            {/* Card: float up, slightly delayed after text */}
            <motion.div
              className="w-full max-w-md rounded-xl border border-gray-100 bg-white p-6 shadow-2xl"
              initial={{ opacity: 0, y: 24 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={viewport}
              transition={{ duration: 0.6, delay: 0.2 }}
            >
              {/* Warning banner: scale + fade in */}
              <motion.div
                className="flex items-center gap-2 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2.5 text-sm"
                initial={{ scale: 0.9, opacity: 0 }}
                whileInView={{ scale: 1, opacity: 1 }}
                viewport={viewport}
                transition={{ duration: 0.35, delay: 0.4 }}
              >
                <span aria-hidden>⚠️</span>
                <span className="font-medium text-amber-800">
                  Speed drop detected in Indian Polity
                </span>
              </motion.div>

              {/* Accuracy progress */}
              <div className="mt-4">
                <div className="flex items-center justify-between text-sm">
                  <span className="font-medium text-gray-700">Accuracy</span>
                  <span className="text-gray-500">45%</span>
                </div>
                <div className="mt-1.5 h-2 w-full overflow-hidden rounded-full bg-gray-200">
                  <motion.div
                    className="h-full rounded-full bg-emerald-500"
                    initial={{ width: 0 }}
                    whileInView={{ width: "45%" }}
                    viewport={viewport}
                    transition={{
                      duration: 1.2,
                      delay: 0.6,
                      ease: "easeOut",
                    }}
                  />
                </div>
              </div>

              {/* AI Tip: fade in last, like AI just finished */}
              <motion.div
                className="mt-4 rounded-lg border border-gray-100 bg-slate-50 p-3 text-sm"
                initial={{ opacity: 0 }}
                whileInView={{ opacity: 1 }}
                viewport={viewport}
                transition={{ duration: 0.5, delay: 1.5 }}
              >
                <p className="flex gap-2 text-gray-700">
                  <span aria-hidden>💡</span>
                  <span>
                    <strong className="font-semibold text-slate-800">
                      AI Tip:
                    </strong>{" "}
                    You are spending 80s on Assertion-Reason questions. Review
                    the core concepts before your next attempt.
                  </span>
                </p>
              </motion.div>
            </motion.div>
          </div>
        </div>
      </div>
    </section>
  );
}
