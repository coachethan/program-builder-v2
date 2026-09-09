import type { Metadata } from "next";
import { Inter } from "next/font/google";
import SessionProviderWrapper from "@/components/SessionProviderWrapper";
import "./globals.css";

const sans = Inter({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700", "800"],
  variable: "--font-sans"
});

export const metadata: Metadata = {
  title: "Build My Program — Free 8-Week Hypertrophy Program",
  description:
    "Pick your training days and priority muscles. Get a deterministic 8-week hypertrophy program, built from a fixed exercise database and rule set — no AI guesswork."
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={sans.variable}>
      <body className="font-sans antialiased min-h-screen">
        <SessionProviderWrapper>{children}</SessionProviderWrapper>
      </body>
    </html>
  );
}

