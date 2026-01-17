import { Metadata } from "next";
import { LegalPage, LegalSection } from "@/components/legal/legal-page";

export const metadata: Metadata = {
  title: "DMCA Policy",
  description: "Digital Millennium Copyright Act policy",
};

export default function DmcaPage() {
  return (
    <LegalPage
      title="DMCA Policy"
      description="Digital Millennium Copyright Act Notice & Takedown Policy"
      lastUpdated="January 1, 2026"
    >
      <LegalSection title="1. Overview">
        <p>
          Prompt Gallery respects the intellectual property rights of others and expects users
          to do the same. In accordance with the Digital Millennium Copyright Act of 1998 (DMCA),
          we will respond expeditiously to claims of copyright infringement.
        </p>
      </LegalSection>

      <LegalSection title="2. Filing a DMCA Notice">
        <p>
          If you believe that your copyrighted work has been copied in a way that constitutes
          copyright infringement, please provide our designated copyright agent with the following
          information:
        </p>
        <ul className="list-disc pl-6 space-y-2">
          <li>
            A physical or electronic signature of the copyright owner or authorized representative
          </li>
          <li>
            Identification of the copyrighted work claimed to have been infringed
          </li>
          <li>
            Identification of the material that is claimed to be infringing, including its location
            on our website (URL)
          </li>
          <li>
            Your contact information, including address, telephone number, and email address
          </li>
          <li>
            A statement that you have a good faith belief that the use is not authorized by the
            copyright owner, its agent, or the law
          </li>
          <li>
            A statement, made under penalty of perjury, that the information in the notice is
            accurate and that you are authorized to act on behalf of the copyright owner
          </li>
        </ul>
      </LegalSection>

      <LegalSection title="3. Counter-Notification">
        <p>
          If you believe your content was wrongly removed due to a mistake or misidentification,
          you may submit a counter-notification containing:
        </p>
        <ul className="list-disc pl-6 space-y-2">
          <li>Your physical or electronic signature</li>
          <li>
            Identification of the material that was removed and the location where it appeared
            before removal
          </li>
          <li>
            A statement under penalty of perjury that you have a good faith belief that the
            material was removed by mistake or misidentification
          </li>
          <li>
            Your name, address, and telephone number, and a statement that you consent to the
            jurisdiction of the federal district court in your area
          </li>
        </ul>
      </LegalSection>

      <LegalSection title="4. Repeat Infringers">
        <p>
          In accordance with the DMCA, we will terminate the accounts of users who are found to
          be repeat infringers. We define a repeat infringer as a user who has had content removed
          for copyright infringement on more than two occasions.
        </p>
      </LegalSection>

      <LegalSection title="5. Designated Agent">
        <p>
          Our designated agent for receiving DMCA notices is:
        </p>
        <div className="mt-4 p-4 bg-muted rounded-lg">
          <p className="font-medium">DMCA Agent</p>
          <p>Prompt Gallery</p>
          <p>Email: dmca@promptgallery.com</p>
        </div>
      </LegalSection>

      <LegalSection title="6. Good Faith">
        <p>
          Please note that under Section 512(f) of the DMCA, any person who knowingly materially
          misrepresents that material is infringing may be subject to liability. Before submitting
          a DMCA notice, please ensure that you have a good faith belief that the use of the
          material is indeed infringing.
        </p>
      </LegalSection>
    </LegalPage>
  );
}
