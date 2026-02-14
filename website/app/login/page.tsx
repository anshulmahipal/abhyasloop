import Link from "next/link";
import Image from "next/image";
import type { Metadata } from "next";

const APP_BASE = "https://app.tyariwale.com";

export const metadata: Metadata = {
  title: "Login | TyariWale",
  description: "Sign in to your TyariWale account to practice exams and track progress.",
};

export default function LoginPage() {
  return (
    <main className="flex min-h-[calc(100vh-4rem)] items-center justify-center bg-gray-50 px-4 py-12">
      <div className="w-full max-w-md rounded-xl border border-gray-200 bg-white p-8 shadow-sm">
        <div className="flex flex-col items-center text-center">
          <div className="relative mb-6 h-16 w-16 shrink-0">
            <Image
              src="/logo.png"
              alt="TyariWale Logo"
              fill
              className="object-contain"
              priority
            />
          </div>
          <h1 className="text-2xl font-bold text-gray-900">Welcome Back</h1>
          <p className="mt-2 text-gray-600">
            Sign in to continue to your practice dashboard.
          </p>
        </div>
        <div className="mt-8">
          <a
            href={APP_BASE}
            className="flex w-full items-center justify-center rounded-lg bg-emerald-600 px-4 py-3 text-base font-semibold text-white shadow-sm transition-colors hover:bg-emerald-700 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:ring-offset-2"
          >
            Continue to TyariWale
          </a>
          <p className="mt-4 text-center text-sm text-gray-500">
            You&apos;ll be redirected to sign in securely.
          </p>
        </div>
        <p className="mt-6 text-center text-sm text-gray-600">
          Don&apos;t have an account?{" "}
          <Link href="/signup" className="font-medium text-emerald-600 hover:text-emerald-700">
            Sign up
          </Link>
        </p>
      </div>
    </main>
  );
}
