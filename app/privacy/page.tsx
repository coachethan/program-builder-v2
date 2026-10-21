import LegalPage, { EmailLink, Section } from "@/components/LegalPage";
import { BRAND_NAME, LEGAL_UPDATED, SITE_NAME } from "@/lib/siteConfig";

export const metadata = {
  title: `Privacy Policy | ${SITE_NAME}`
};

export default function PrivacyPage() {
  return (
    <LegalPage title="Privacy Policy" updated={LEGAL_UPDATED}>
      <p>
        {BRAND_NAME} (&ldquo;we&rdquo;, &ldquo;us&rdquo;) runs {SITE_NAME}, a free tool that builds a
        training program from your answers. This page explains what information the site handles
        and what we do with it.
      </p>

      <Section heading="What you tell us">
        <p>
          The training days and priority muscles you choose are used in your browser to build your
          program. You do not need an account, and we do not save your answers or your program on
          our servers.
        </p>
      </Section>

      <Section heading="If you export to Google Sheets">
        <p>
          When you click the export button, you are asked to sign in with Google. From that sign-in
          we receive:
        </p>
        <ul className="list-disc pl-5 space-y-1.5">
          <li>your basic profile: name, email address and profile picture, and</li>
          <li>your permission to create a file in your Google Drive.</li>
        </ul>
        <p>
          We use that permission for one thing: creating a spreadsheet that contains your program, in
          your own Google Drive. The permission only lets us see and change files that this site
          creates. We cannot see your other files. We also use your first name from your Google
          profile to title the spreadsheet. The spreadsheet belongs to you, and you can edit or
          delete it at any time.
        </p>
        <p>
          Your program travels from your browser to our server for the moment it takes to create the
          spreadsheet through Google. We do not keep a copy.
        </p>
      </Section>

      <Section heading="Information stored on your device">
        <p>
          If you sign in with Google, we set cookies in your browser to keep you signed in for up to
          30 days. Your name, email address and picture are kept inside that cookie. We do not store
          them in a database.
        </p>
        <p>
          While you are sent to Google to sign in, your program is held briefly in your
          browser&rsquo;s session storage so the page can pick up where you left off. It is cleared
          when you return.
        </p>
      </Section>

      <Section heading="Hosting and logs">
        <p>
          The site is hosted by Vercel. Like most hosts, Vercel may record technical details of each
          visit, such as IP address, browser type and time of the request, to run and secure the
          service. We do not use this information to track you across other sites.
        </p>
      </Section>

      <Section heading="What we do not do">
        <ul className="list-disc pl-5 space-y-1.5">
          <li>We do not sell your information.</li>
          <li>We do not use Google user data for advertising.</li>
          <li>We do not share Google user data with anyone else.</li>
          <li>We do not use Google user data to train AI or machine learning models.</li>
          <li>
            We do not let people read your Google data, unless you ask us to for support or the law
            requires it.
          </li>
        </ul>
      </Section>

      <Section heading="Google API Services User Data Policy">
        <p>
          {SITE_NAME}&rsquo;s use and transfer to any other app of information received from Google
          APIs will adhere to the{" "}
          <a
            href="https://developers.google.com/terms/api-services-user-data-policy"
            className="text-emerald-bright underline underline-offset-4"
            target="_blank"
            rel="noreferrer"
          >
            Google API Services User Data Policy
          </a>
          , including the Limited Use requirements.
        </p>
      </Section>

      <Section heading="Your choices">
        <ul className="list-disc pl-5 space-y-1.5">
          <li>
            To remove this site&rsquo;s access to your Google account, open your Google Account, go
            to Security, and look for third-party apps and services.
          </li>
          <li>To delete an exported program, delete the spreadsheet from your Google Drive.</li>
          <li>To sign out on this device, clear this site&rsquo;s cookies in your browser.</li>
        </ul>
        <p>
          Because we do not keep your answers or your program, there is usually nothing for us to
          delete. If you have a question or request about your information, contact us and we will
          help.
        </p>
      </Section>

      <Section heading="Children">
        <p>This site is not meant for children under 13.</p>
      </Section>

      <Section heading="Changes to this policy">
        <p>
          If we change how the site handles information, we will update this page and the date at
          the top.
        </p>
      </Section>

      <Section heading="Contact">
        <p>
          Questions about this policy: <EmailLink />
        </p>
      </Section>
    </LegalPage>
  );
}
