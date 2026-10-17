import Link from "next/link";
import { ReactNode } from "react";
import { CONTACT_EMAIL, SITE_NAME } from "@/lib/siteConfig";

interface LegalPageProps {
  title: string;
  updated: string;
  children: ReactNode;
}

export default function LegalPage({ title, updated, children }: LegalPageProps) {
  return (
    <main className="min-h-screen bg-bg">
      <nav className="flex items-center px-6 py-5 max-w-2xl mx-auto">
        <Link href="/" className="flex items-center gap-2.5">
          <span className="h-7 w-7 rounded-full bg-ink text-bg font-bold text-xs flex items-center justify-center">
            PB
          </span>
          <span className="font-semibold text-ink">{SITE_NAME}</span>
        </Link>
      </nav>

      <article className="max-w-2xl mx-auto px-6 pb-24">
        <h1 className="text-3xl font-bold text-ink mb-2">{title}</h1>
        <p className="text-sm text-muted mb-10">Last updated: {updated}</p>

        <div className="space-y-8 text-ink-2 leading-relaxed">{children}</div>

        <div className="mt-12 pt-6 border-t border-border-soft flex flex-wrap gap-x-6 gap-y-2 text-sm text-muted">
          <Link href="/privacy" className="hover:text-ink underline underline-offset-4">
            Privacy Policy
          </Link>
          <Link href="/terms" className="hover:text-ink underline underline-offset-4">
            Terms of Service
          </Link>
          <a href={`mailto:${CONTACT_EMAIL}`} className="hover:text-ink underline underline-offset-4">
            Contact
          </a>
        </div>
      </article>
    </main>
  );
}

export function Section({ heading, children }: { heading: string; children: ReactNode }) {
  return (
    <section>
      <h2 className="text-lg font-semibold text-ink mb-3">{heading}</h2>
      <div className="space-y-3">{children}</div>
    </section>
  );
}

export function EmailLink() {
  return (
    <a href={`mailto:${CONTACT_EMAIL}`} className="text-emerald-bright underline underline-offset-4">
      {CONTACT_EMAIL}
    </a>
  );
}
