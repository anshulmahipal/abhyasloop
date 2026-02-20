import type { Metadata } from "next";
import Script from "next/script";
import { Navbar } from "@/components/Navbar";
import { PostHogProvider } from "@/components/PostHogProvider";
import "./globals.css";

const GA_MEASUREMENT_ID = "G-ZDM3403YPM";

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
      <head>
        <Script
          src={`https://www.googletagmanager.com/gtag/js?id=${GA_MEASUREMENT_ID}`}
          strategy="afterInteractive"
        />
        <Script id="gtag-config" strategy="afterInteractive">
          {`
            window.dataLayer = window.dataLayer || [];
            function gtag(){dataLayer.push(arguments);}
            gtag('js', new Date());
            gtag('config', '${GA_MEASUREMENT_ID}');
          `}
        </Script>
      </head>
      <body className="min-h-screen bg-white font-sans text-gray-900 antialiased">
        <PostHogProvider>
          <Navbar />
          {children}
        </PostHogProvider>
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(organizationSchema) }}
        />
      </body>
    </html>
  );
}
