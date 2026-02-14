import Link from "next/link";
import Image from "next/image";
import type { Metadata } from "next";

const APP_BASE = "https://app.tyariwale.com";

export const metadata: Metadata = {
  title: "Sign Up | TyariWale",
  description: "Create your TyariWale account and start practicing for government exams.",
};

export default function SignupPage() {
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
          <h1 className="text-2xl font-bold text-gray-900">Create your account</h1>
          <p className="mt-2 text-gray-600">
            Join TyariWale and start practicing for UPSC, SSC, and Banking exams.
          </p>
        </div>
        <div className="mt-8">
          <a
            href={APP_BASE}
            className="flex w-full items-center justify-center rounded-lg bg-emerald-600 px-4 py-3 text-base font-semibold text-white shadow-sm transition-colors hover:bg-emerald-700 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:ring-offset-2"
          >
            Sign up with TyariWale
          </a>
          <p className="mt-4 text-center text-sm text-gray-500">
            You&apos;ll be redirected to create your account securely.
          </p>
        </div>
        <p className="mt-6 text-center text-sm text-gray-600">
          Already have an account?{" "}
          <Link href="/login" className="font-medium text-emerald-600 hover:text-emerald-700">
            Sign in
          </Link>
        </p>
      </div>
    </main>
  );
}
