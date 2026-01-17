import { Metadata } from "next";
import { LegalPage, LegalSection } from "@/components/legal/legal-page";

export const metadata: Metadata = {
  title: "Cookie Policy",
  description: "How Prompt Gallery uses cookies",
};

export default function CookiesPage() {
  return (
    <LegalPage
      title="Cookie Policy"
      description="How we use cookies and similar technologies"
      lastUpdated="January 1, 2026"
    >
      <LegalSection title="1. What Are Cookies">
        <p>
          Cookies are small text files that are stored on your device when you visit a website.
          They help websites remember your preferences and improve your browsing experience.
        </p>
      </LegalSection>

      <LegalSection title="2. How We Use Cookies">
        <p>Prompt Gallery uses cookies for the following purposes:</p>
        <ul className="list-disc pl-6 space-y-2">
          <li>
            <strong>Essential Cookies:</strong> Required for the website to function properly.
            These include authentication cookies that keep you logged in.
          </li>
          <li>
            <strong>Preference Cookies:</strong> Remember your settings and preferences, such as
            your preferred theme (light/dark mode) and language.
          </li>
          <li>
            <strong>Analytics Cookies:</strong> Help us understand how visitors interact with
            our website so we can improve our services.
          </li>
          <li>
            <strong>Performance Cookies:</strong> Collect information about how you use our
            website to help us optimize performance.
          </li>
        </ul>
      </LegalSection>

      <LegalSection title="3. Cookies We Use">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b">
                <th className="text-left py-2 pr-4">Cookie Name</th>
                <th className="text-left py-2 pr-4">Purpose</th>
                <th className="text-left py-2">Duration</th>
              </tr>
            </thead>
            <tbody>
              <tr className="border-b">
                <td className="py-2 pr-4 font-mono text-xs">auth_token</td>
                <td className="py-2 pr-4">Authentication session</td>
                <td className="py-2">7 days</td>
              </tr>
              <tr className="border-b">
                <td className="py-2 pr-4 font-mono text-xs">theme</td>
                <td className="py-2 pr-4">Theme preference</td>
                <td className="py-2">1 year</td>
              </tr>
              <tr className="border-b">
                <td className="py-2 pr-4 font-mono text-xs">preferences</td>
                <td className="py-2 pr-4">User preferences</td>
                <td className="py-2">1 year</td>
              </tr>
            </tbody>
          </table>
        </div>
      </LegalSection>

      <LegalSection title="4. Third-Party Cookies">
        <p>
          We may use third-party services that set their own cookies. These services include:
        </p>
        <ul className="list-disc pl-6 space-y-2">
          <li>Analytics providers to measure website performance</li>
          <li>Content delivery networks to serve static assets</li>
        </ul>
        <p>
          We do not have control over these third-party cookies. Please refer to the respective
          privacy policies of these providers for more information.
        </p>
      </LegalSection>

      <LegalSection title="5. Managing Cookies">
        <p>
          You can control and manage cookies through your browser settings. Most browsers allow you to:
        </p>
        <ul className="list-disc pl-6 space-y-2">
          <li>View what cookies are stored and delete them individually</li>
          <li>Block third-party cookies</li>
          <li>Block all cookies from all sites</li>
          <li>Delete all cookies when you close your browser</li>
        </ul>
        <p>
          Please note that blocking or deleting cookies may impact your experience on our website.
          Some features may not work properly without certain cookies enabled.
        </p>
      </LegalSection>

      <LegalSection title="6. Updates to This Policy">
        <p>
          We may update this Cookie Policy from time to time. Any changes will be posted on this
          page with an updated revision date.
        </p>
      </LegalSection>

      <LegalSection title="7. Contact Us">
        <p>
          If you have questions about our use of cookies, please contact us at privacy@promptgallery.com.
        </p>
      </LegalSection>
    </LegalPage>
  );
}
