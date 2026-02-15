import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Contact Us | TyariWale",
  description:
    "Get in touch with TyariWale. Email support and contact form for exam preparation help.",
};

export default function ContactLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}
