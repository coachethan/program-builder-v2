import LegalPage, { EmailLink, Section } from "@/components/LegalPage";
import { BRAND_NAME, LEGAL_UPDATED, SITE_NAME } from "@/lib/siteConfig";

export const metadata = {
  title: `Terms of Service | ${SITE_NAME}`
};

export default function TermsPage() {
  return (
    <LegalPage title="Terms of Service" updated={LEGAL_UPDATED}>
      <p>
        These terms cover your use of {SITE_NAME}, run by {BRAND_NAME} (&ldquo;we&rdquo;,
        &ldquo;us&rdquo;). By using the site you agree to them. If you do not agree, please do not
        use the site.
      </p>

      <Section heading="What the site is">
        <p>
          {SITE_NAME} is a free tool that builds a general training program from a fixed set of
          rules and exercises. It is for general information and education. It is not medical advice,
          and using it does not create a coaching relationship between you and us.
        </p>
      </Section>

      <Section heading="Your health and safety">
        <p>
          Exercise carries a risk of injury. Talk to a doctor or other qualified professional before
          you start a program, especially if you have an injury or health condition, are pregnant, or
          are unsure whether exercise is right for you. Stop and get advice if you feel pain,
          dizziness or anything that does not feel right.
        </p>
        <p>
          You are responsible for the weights, technique and effort you choose, and for how you use
          the program.
        </p>
      </Section>

      <Section heading="Your Google Sheet">
        <p>
          If you export your program, the spreadsheet is created in your own Google Drive and
          belongs to you. Your use of Google services is covered by Google&rsquo;s own terms and
          privacy policy. See our Privacy Policy for how the export works.
        </p>
      </Section>

      <Section heading="Acceptable use">
        <p>Please do not:</p>
        <ul className="list-disc pl-5 space-y-1.5">
          <li>try to break, overload or gain unauthorized access to the site or its systems,</li>
          <li>copy the site in bulk with automated tools, or</li>
          <li>use the site for anything unlawful.</li>
        </ul>
      </Section>

      <Section heading="Our content">
        <p>
          The site&rsquo;s design, text, rules and exercise library belong to us. You may use the
          program the site gives you for your own personal training. Please do not copy or resell the
          site, its rules or its exercise library.
        </p>
      </Section>

      <Section heading="No warranty">
        <p>
          The site is provided &ldquo;as is&rdquo; and &ldquo;as available&rdquo;. We do not promise
          it will be free of errors, always available, or right for your goals.
        </p>
      </Section>

      <Section heading="Limits on our responsibility">
        <p>
          To the fullest extent the law allows, we are not responsible for any injury, loss or damage
          that results from using the site or any program it creates. If the law does not allow a
          limit described here, that limit applies only as far as the law permits.
        </p>
      </Section>

      <Section heading="Changes and ending">
        <p>
          We may change or stop the site, and we may update these terms. If you keep using the site
          after a change, you accept the updated terms. The date at the top shows when they were last
          changed.
        </p>
      </Section>

      <Section heading="Contact">
        <p>
          Questions about these terms: <EmailLink />
        </p>
      </Section>
    </LegalPage>
  );
}
