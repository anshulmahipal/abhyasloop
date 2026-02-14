import Link from "next/link";
import Image from "next/image";

const examLinks = [
  { label: "UPSC", slug: "upsc" },
  { label: "SSC", slug: "ssc" },
  { label: "Banking", slug: "banking" },
  { label: "Railway", slug: "railway" },
  { label: "Defence", slug: "defence" },
];

export function Footer() {
  return (
    <footer className="border-t border-gray-200 bg-gray-50 px-4 py-10 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-6xl">
        <div className="flex flex-col gap-8 sm:flex-row sm:items-start sm:justify-between">
          {/* Brand column */}
          <div className="flex items-center gap-2">
            <div className="relative h-8 w-8 shrink-0">
              <Image
                src="/logo.png"
                alt="TyariWale Logo"
                fill
                className="object-contain"
              />
            </div>
            <span className="text-lg font-bold text-gray-900">TyariWale</span>
          </div>
          <nav
            className="flex flex-wrap gap-x-6 gap-y-1 text-sm"
            aria-label="Exams"
          >
            {examLinks.map(({ label, slug }) => (
              <Link
                key={slug}
                href={`/exams/${slug}`}
                className="text-gray-600 transition-colors hover:text-gray-900"
              >
                {label}
              </Link>
            ))}
          </nav>
        </div>
        <p className="mt-8 border-t border-gray-200 pt-8 text-sm text-gray-500">
          © 2026 TyariWale. All rights reserved.
        </p>
      </div>
    </footer>
  );
}
