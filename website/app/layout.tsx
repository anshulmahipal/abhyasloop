import type { Metadata } from "next";
import { Inter } from "next/font/google";
import { Navbar } from "@/components/Navbar";
import "./globals.css";

const inter = Inter({ subsets: ["latin"], variable: "--font-sans" });

export const metadata: Metadata = {
  title: "TyariWale | India's First AI-Powered Exam Hall",
  description:
    "Unlimited practice for UPSC, SSC, and Banking. Infinite questions, exam blueprints, and instant analysis.",
  openGraph: {
    title: "TyariWale | India's First AI-Powered Exam Hall",
    description:
      "Unlimited practice for UPSC, SSC, and Banking. Infinite questions, exam blueprints, and instant analysis.",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={inter.variable}>
      <body className="min-h-screen bg-white font-sans text-slate-900 antialiased dark:bg-slate-900 dark:text-slate-100">
        <Navbar />
        {children}
      </body>
    </html>
  );
}
