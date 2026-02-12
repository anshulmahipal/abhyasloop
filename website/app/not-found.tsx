import Link from "next/link";

export default function NotFound() {
  return (
    <main className="mx-auto flex min-h-[60vh] max-w-md flex-col items-center justify-center px-4 text-center">
      <h1 className="text-2xl font-bold text-slate-900 dark:text-white">
        404 – Page not found
      </h1>
      <p className="mt-2 text-slate-600 dark:text-slate-400">
        This page doesn’t exist on the marketing site.
      </p>
      <Link
        href="/"
        className="mt-6 inline-block rounded-lg bg-emerald-600 px-4 py-2 font-medium text-white hover:bg-emerald-700"
      >
        Back to home
      </Link>
    </main>
  );
}
