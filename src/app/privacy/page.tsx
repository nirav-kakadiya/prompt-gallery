import { Metadata } from "next";
import { LegalPage, LegalSection } from "@/components/legal/legal-page";

export const metadata: Metadata = {
  title: "Privacy Policy",
  description: "How we handle your data at Prompt Gallery",
};

export default function PrivacyPage() {
  return (
    <LegalPage
      title="Privacy Policy"
      description="How we collect, use, and protect your information"
      lastUpdated="January 1, 2026"
    >
      <LegalSection title="1. Information We Collect">
        <p>
          We collect information you provide directly to us, such as when you create an account,
          submit a prompt, or contact us for support.
        </p>
        <p>
          <strong>Account Information:</strong> When you register, we collect your email address,
          username, and password (stored securely using industry-standard encryption).
        </p>
        <p>
          <strong>Content:</strong> We collect prompts, collections, and other content you submit
          to the platform.
        </p>
        <p>
          <strong>Usage Data:</strong> We automatically collect information about how you interact
          with our service, including pages visited, features used, and time spent on the platform.
        </p>
      </LegalSection>

      <LegalSection title="2. How We Use Your Information">
        <p>We use the information we collect to:</p>
        <ul className="list-disc pl-6 space-y-2">
          <li>Provide, maintain, and improve our services</li>
          <li>Process transactions and send related information</li>
          <li>Send technical notices, updates, and support messages</li>
          <li>Respond to your comments, questions, and requests</li>
          <li>Monitor and analyze trends, usage, and activities</li>
          <li>Detect and prevent fraudulent transactions and abuse</li>
        </ul>
      </LegalSection>

      <LegalSection title="3. Information Sharing">
        <p>
          We do not sell your personal information. We may share information in the following circumstances:
        </p>
        <ul className="list-disc pl-6 space-y-2">
          <li>With your consent or at your direction</li>
          <li>With service providers who perform services on our behalf</li>
          <li>To comply with legal obligations</li>
          <li>To protect the rights and safety of our users and third parties</li>
        </ul>
      </LegalSection>

      <LegalSection title="4. Data Security">
        <p>
          We take reasonable measures to help protect your personal information from loss, theft,
          misuse, unauthorized access, disclosure, alteration, and destruction. All passwords are
          hashed using bcrypt and data is transmitted over encrypted connections.
        </p>
      </LegalSection>

      <LegalSection title="5. Your Rights">
        <p>You have the right to:</p>
        <ul className="list-disc pl-6 space-y-2">
          <li>Access and receive a copy of your personal data</li>
          <li>Rectify inaccurate personal data</li>
          <li>Request deletion of your personal data</li>
          <li>Object to processing of your personal data</li>
          <li>Data portability</li>
        </ul>
        <p>
          To exercise these rights, please contact us at privacy@promptgallery.com.
        </p>
      </LegalSection>

      <LegalSection title="6. Cookies">
        <p>
          We use cookies and similar technologies to provide and support our services. For more
          information, please see our Cookie Policy.
        </p>
      </LegalSection>

      <LegalSection title="7. Changes to This Policy">
        <p>
          We may update this privacy policy from time to time. We will notify you of any changes
          by posting the new policy on this page and updating the &quot;Last updated&quot; date.
        </p>
      </LegalSection>

      <LegalSection title="8. Contact Us">
        <p>
          If you have any questions about this Privacy Policy, please contact us at
          privacy@promptgallery.com.
        </p>
      </LegalSection>
    </LegalPage>
  );
}
