import type { ReactNode } from "react";

type CardProps = {
  children: ReactNode;
  /** "highlight" for the Average Student vs Topper–style callout (distinct background) */
  variant?: "default" | "highlight";
  className?: string;
};

export function Card({ children, variant = "default", className = "" }: CardProps) {
  const base =
    "rounded-xl border p-6";
  const styles =
    variant === "highlight"
      ? "border-[var(--color-highlight-border)] bg-[var(--color-highlight-bg)]"
      : "border-[var(--color-border)] bg-[var(--color-background)]";

  return (
    <div className={`${base} ${styles} ${className}`.trim()}>
      {children}
    </div>
  );
}
