import type { Metadata } from "next";
import { GoogleAnalytics } from "@next/third-parties/google";
import { Navbar } from "@/components/Navbar";
import "./globals.css";

const BASE_URL = "https://www.tyariwale.com";

const organizationSchema = {
  "@context": "https://schema.org",
  "@type": "Organization",
  name: "TyariWale",
  url: BASE_URL,
  logo: `${BASE_URL}/logo.png`,
};

export const metadata: Metadata = {
  title: "TyariWale | India's First AI-Powered Exam Hall",
  description:
    "Unlimited practice for UPSC, SSC, and Banking. Infinite questions, exam blueprints, and instant analysis.",
  openGraph: {
    title: "TyariWale | India's First AI-Powered Exam Hall",
    description:
      "Unlimited practice for UPSC, SSC, and Banking. Infinite questions, exam blueprints, and instant analysis.",
  },
  icons: {
    icon: "/logo.png",
    shortcut: "/logo.png",
    apple: "/logo.png",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className="min-h-screen bg-white font-sans text-gray-900 antialiased">
        <GoogleAnalytics gaId="G-ZDM3403YPM" />
        <Navbar />
        {children}
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(organizationSchema) }}
        />
      </body>
    </html>
  );
}
