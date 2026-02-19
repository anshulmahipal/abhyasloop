import type { Metadata } from "next";
import Link from "next/link";
import { Card } from "@/components/Card";
import { CustomButton } from "@/components/CustomButton";

export const metadata: Metadata = {
  title: "About Us | TyariWale",
  description:
    "Learn how TyariWale helps you prepare for government exams with AI-powered mock tests and exam-aligned practice.",
};

export default function AboutPage() {
  return (
    <main
      className="min-h-screen px-4 py-12 sm:px-6 lg:px-8"
      style={{ background: "var(--color-background)" }}
    >
      <article className="mx-auto max-w-[800px] space-y-10">
        <header>
          <h1
            className="text-3xl font-bold tracking-tight sm:text-4xl"
            style={{ color: "var(--color-text)" }}
          >
            About Us
          </h1>
          <p
            className="mt-3 text-lg leading-relaxed"
            style={{ color: "var(--color-text-secondary)" }}
          >
            We&apos;re building the practice platform that bridges the gap between
            where you are and where you want to be—one sectional test at a time.
          </p>
        </header>

        <section className="space-y-4">
          <h2
            className="text-xl font-bold sm:text-2xl"
            style={{ color: "var(--color-text)" }}
          >
            Our story
          </h2>
          <p
            className="leading-relaxed"
            style={{ color: "var(--color-text-secondary)" }}
          >
            TyariWale started from a simple observation: lakhs of aspirants prepare
            for UPSC, SSC, Banking, Railway, and Defence exams every year, but
            most rely on the same few books and a handful of past papers. Toppers,
            on the other hand, practice in sections—Quant today, Reasoning
            tomorrow, English the day after—and only then sit for full-length
            mocks. We built TyariWale to give every aspirant that same edge:
            structured, exam-aligned practice without the guesswork.
          </p>
        </section>

        <section className="space-y-4">
          <h2
            className="text-xl font-bold sm:text-2xl"
            style={{ color: "var(--color-text)" }}
          >
            Why we exist
          </h2>
          <p
            className="leading-relaxed"
            style={{ color: "var(--color-text-secondary)" }}
          >
            Government exams are tough. Toppers don&apos;t just study more—they
            practice smarter: sectional tests, timed mocks, and honest analysis of
            weak areas. TyariWale gives you the same structure: exam-blueprint
            aligned tests, AI-generated questions so you never run out of
            practice, and instant feedback so you can improve faster.
          </p>
        </section>

        <section>
          <h2
            className="text-xl font-bold sm:text-2xl"
            style={{ color: "var(--color-text)" }}
          >
            Average Student vs. Topper
          </h2>
          <div className="mt-4">
            <Card variant="highlight">
              <div className="space-y-4">
                <p
                  className="font-semibold"
                  style={{ color: "var(--color-text)" }}
                >
                  The difference isn&apos;t just hours—it&apos;s how they practice.
                </p>
                <ul
                  className="list-inside list-disc space-y-2 pl-1 text-sm leading-relaxed sm:text-base"
                  style={{ color: "var(--color-text-secondary)" }}
                >
                  <li>
                    <strong style={{ color: "var(--color-text)" }}>Average student:</strong>{" "}
                    Reads once, does a full-length test occasionally, hopes for the best.
                  </li>
                  <li>
                    <strong style={{ color: "var(--color-text)" }}>Topper:</strong>{" "}
                    Breaks the syllabus into sections, takes sectional tests repeatedly,
                    identifies weak areas, and revises before moving on. Then does full-length
                    mocks to build stamina and accuracy.
                  </li>
                </ul>
                <p
                  className="text-sm leading-relaxed"
                  style={{ color: "var(--color-text-secondary)" }}
                >
                  We built TyariWale so everyone can practice like a topper—with
                  unlimited sectional tests, clear analytics, and a path that matches
                  your exam.
                </p>
              </div>
            </Card>
          </div>
        </section>

        <section className="space-y-4">
          <h2
            className="text-xl font-bold sm:text-2xl"
            style={{ color: "var(--color-text)" }}
          >
            What you get
          </h2>
          <p
            className="leading-relaxed"
            style={{ color: "var(--color-text-secondary)" }}
          >
            Everything you need to practice like a topper, in one place:
          </p>
          <ul
            className="list-inside list-disc space-y-2 pl-1 leading-relaxed"
            style={{ color: "var(--color-text-secondary)" }}
          >
            <li>
              <strong style={{ color: "var(--color-text)" }}>Exam categories</strong>—UPSC,
              SSC, Banking, Railway, Defence and more, with clear syllabus and
              pattern info for each.
            </li>
            <li>
              <strong style={{ color: "var(--color-text)" }}>Sectional mock tests</strong>—Take
              tests topic by topic (Quant, Reasoning, English, GK, etc.) instead of
              jumping straight into full-length papers.
            </li>
            <li>
              <strong style={{ color: "var(--color-text)" }}>AI-generated questions</strong>—Fresh
              practice every time, so you’re not limited to a fixed question bank.
            </li>
            <li>
              <strong style={{ color: "var(--color-text)" }}>Instant feedback</strong>—See
              where you stand right after each test and focus your revision on
              weak areas.
            </li>
          </ul>
          <p
            className="leading-relaxed"
            style={{ color: "var(--color-text-secondary)" }}
          >
            No more hunting for quality practice—it&apos;s all aligned to how real
            exams are designed.
          </p>
        </section>

        <section className="space-y-4">
          <h2
            className="text-xl font-bold sm:text-2xl"
            style={{ color: "var(--color-text)" }}
          >
            How it works
          </h2>
          <p
            className="leading-relaxed"
            style={{ color: "var(--color-text-secondary)" }}
          >
            Pick your exam, choose a section (e.g. Quantitative Aptitude or
            General Awareness), and start a mock test. You get a set of questions
            tailored to that section and the exam pattern. Submit when you’re
            done, review your score and answers, then repeat or move to the next
            section. When you’re confident across sections, you can ramp up to
            full-length mocks. We’re here to support you at every step—from
            syllabus and pattern to unlimited practice.
          </p>
        </section>

        <section className="flex flex-col items-center gap-6 pt-6">
          <p
            className="text-center text-lg font-medium"
            style={{ color: "var(--color-text)" }}
          >
            Ready to practice the right way?
          </p>
          <CustomButton href="/exams">
            Attempt Your First Sectional Test Now
          </CustomButton>
          <p
            className="text-center text-sm"
            style={{ color: "var(--color-text-muted)" }}
          >
            Questions?{" "}
            <Link href="/contact" className="underline hover:no-underline">
              Get in touch
            </Link>
            {" · "}
            <Link href="/" className="underline hover:no-underline">
              Back to home
            </Link>
          </p>
        </section>
      </article>
    </main>
  );
}
