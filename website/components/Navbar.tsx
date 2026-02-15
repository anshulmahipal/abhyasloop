import Link from "next/link";
import Image from "next/image";

const APP_BASE = "https://app.tyariwale.com";

export function Navbar() {
  return (
    <header className="navbar sticky top-0 z-50 w-full border-b border-gray-200 bg-white">
      <nav className="mx-auto flex h-16 max-w-6xl items-center justify-between px-4 sm:px-6 lg:px-8">
        <Link
          href="/"
          className="flex items-center tracking-tight text-emerald-600 hover:text-emerald-700"
        >
          <div className="relative mr-2 h-10 w-10">
            <Image
              src="/logo.png"
              alt="TyariWale Logo"
              fill
              className="object-contain"
              priority
            />
          </div>
          <span className="text-xl font-bold text-gray-900">TyariWale</span>
        </Link>
        <div className="flex items-center gap-4">
          <a
            href={APP_BASE}
            className="text-sm font-medium text-gray-600 transition-colors hover:text-gray-900"
          >
            Login
          </a>
          <a
            href={APP_BASE}
            className="rounded-lg bg-emerald-600 px-4 py-2 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-emerald-700 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:ring-offset-2"
          >
            Sign Up Free
          </a>
        </div>
      </nav>
    </header>
  );
}
