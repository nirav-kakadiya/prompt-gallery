import { Metadata } from "next";
import { LegalPage, LegalSection } from "@/components/legal/legal-page";

export const metadata: Metadata = {
  title: "Terms of Service",
  description: "Terms and conditions for using Prompt Gallery",
};

export default function TermsPage() {
  return (
    <LegalPage
      title="Terms of Service"
      description="Please read these terms carefully before using our service"
      lastUpdated="January 1, 2026"
    >
      <LegalSection title="1. Acceptance of Terms">
        <p>
          By accessing or using Prompt Gallery, you agree to be bound by these Terms of Service
          and all applicable laws and regulations. If you do not agree with any of these terms,
          you are prohibited from using or accessing this site.
        </p>
      </LegalSection>

      <LegalSection title="2. Use License">
        <p>
          Permission is granted to temporarily access and use Prompt Gallery for personal,
          non-commercial purposes. This license does not include:
        </p>
        <ul className="list-disc pl-6 space-y-2">
          <li>Modifying or copying our materials except as expressly permitted</li>
          <li>Using materials for commercial purposes without authorization</li>
          <li>Attempting to reverse engineer any software on our platform</li>
          <li>Removing any copyright or proprietary notations</li>
          <li>Transferring materials to another person or mirroring on any other server</li>
        </ul>
      </LegalSection>

      <LegalSection title="3. User Content">
        <p>
          You retain ownership of content you submit to Prompt Gallery. By submitting content,
          you grant us a worldwide, non-exclusive, royalty-free license to use, reproduce,
          modify, and distribute your content in connection with operating our service.
        </p>
        <p>You represent and warrant that:</p>
        <ul className="list-disc pl-6 space-y-2">
          <li>You own or have the right to submit the content</li>
          <li>Your content does not violate any third-party rights</li>
          <li>Your content does not contain unlawful, harmful, or offensive material</li>
        </ul>
      </LegalSection>

      <LegalSection title="4. Prohibited Uses">
        <p>You agree not to use Prompt Gallery to:</p>
        <ul className="list-disc pl-6 space-y-2">
          <li>Upload malicious code or attempt to compromise our systems</li>
          <li>Harass, abuse, or harm other users</li>
          <li>Impersonate others or provide false information</li>
          <li>Spam or send unsolicited communications</li>
          <li>Violate any applicable laws or regulations</li>
          <li>Scrape or collect data without authorization</li>
        </ul>
      </LegalSection>

      <LegalSection title="5. Account Termination">
        <p>
          We reserve the right to terminate or suspend your account at any time, without prior
          notice, for conduct that we believe violates these Terms or is harmful to other users,
          us, or third parties, or for any other reason.
        </p>
      </LegalSection>

      <LegalSection title="6. Disclaimer">
        <p>
          Prompt Gallery is provided &quot;as is&quot; without warranties of any kind. We do not guarantee
          that our service will be uninterrupted, secure, or error-free. We are not responsible
          for the accuracy, reliability, or legality of user-submitted content.
        </p>
      </LegalSection>

      <LegalSection title="7. Limitation of Liability">
        <p>
          In no event shall Prompt Gallery be liable for any indirect, incidental, special,
          consequential, or punitive damages arising out of your use of or inability to use
          the service.
        </p>
      </LegalSection>

      <LegalSection title="8. Changes to Terms">
        <p>
          We reserve the right to modify these terms at any time. We will notify users of any
          material changes by posting the updated terms on this page. Your continued use of
          the service after changes are posted constitutes acceptance of the modified terms.
        </p>
      </LegalSection>

      <LegalSection title="9. Governing Law">
        <p>
          These terms shall be governed by and construed in accordance with applicable laws,
          without regard to conflict of law principles.
        </p>
      </LegalSection>

      <LegalSection title="10. Contact">
        <p>
          Questions about these Terms should be sent to legal@promptgallery.com.
        </p>
      </LegalSection>
    </LegalPage>
  );
}
