import Link from "next/link";
import type { ReactNode } from "react";

type CustomButtonProps = {
  children: ReactNode;
  href: string;
  className?: string;
};

/** Primary CTA button using theme colors. Use for main actions like "Attempt Your First Sectional Test". */
export function CustomButton({ children, href, className = "" }: CustomButtonProps) {
  return (
    <Link
      href={href}
      className={
        `inline-flex w-full items-center justify-center rounded-lg px-6 py-4 text-lg font-semibold text-white shadow-sm transition-colors focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)] focus:ring-offset-2 sm:w-auto [background:var(--color-primary)] hover:[background:var(--color-primary-hover)] ${className}`
          .trim()
      }
    >
      {children}
    </Link>
  );
}
