import type { Metadata } from "next";
import { Header } from "@/components/sections/Header";
import { Footer } from "@/components/sections/Footer";

export const metadata: Metadata = {
  title: "Terms of Service • Clancy AI",
  description:
    "Read the terms governing your use of Clancy AI's website, products, and services.",
};

export default function TermsPage() {
  return (
    <main>
      <Header />
      <section className="section-container section-padding">
        <article className="prose-enhanced">
          <h1>Terms of Service</h1>
          <p>
            These Terms of Service (&quot;Terms&quot;) govern your access to and
            use of Clancy AI’s website, products, and services (collectively,
            the &quot;Services&quot;). By using the Services, you agree to these
            Terms.
          </p>

          <p>
            <strong>Last updated:</strong> September 1, 2025
          </p>

          <h2>1. Acceptance of Terms</h2>
          <p>
            By accessing or using the Services, you confirm that you can form a
            binding contract with Clancy AI (&quot;Clancy&quot;, &quot;we&quot;,
            &quot;us&quot;) and that you accept these Terms and our Privacy
            Policy.
          </p>

          <h2>2. Services and Changes</h2>
          <p>
            We may update or modify the Services over time. We may also suspend
            or discontinue features with reasonable notice where practicable.
          </p>

          <h2>3. Accounts and Security</h2>
          <ul>
            <li>
              You are responsible for maintaining the confidentiality of your
              credentials.
            </li>
            <li>
              You must promptly notify us of any unauthorized use of your
              account.
            </li>
            <li>
              You are responsible for activities that occur under your account.
            </li>
          </ul>

          <h2>4. Acceptable Use</h2>
          <ul>
            <li>
              Do not misuse the Services or interfere with their operation.
            </li>
            <li>Do not attempt to access data without authorization.</li>
            <li>
              Do not upload or transmit malicious code or content that violates
              laws or rights.
            </li>
          </ul>

          <h2>5. Third-Party Services and Integrations</h2>
          <p>
            The Services may integrate with third-party products (e.g., Google,
            Microsoft, Slack). Your use of third-party services is governed by
            their terms and policies. We are not responsible for third-party
            services.
          </p>

          <h2>6. Intellectual Property</h2>
          <p>
            We retain all rights, title, and interest in and to the Services,
            including software, documentation, and branding. You retain rights
            to content you submit to the Services. You grant us a limited
            license to use your content solely to operate and provide the
            Services.
          </p>

          <h2>7. Confidentiality</h2>
          <p>
            Each party agrees to protect the other’s confidential information
            and use it only as necessary to provide or receive the Services.
          </p>

          <h2>8. Privacy</h2>
          <p>
            Our handling of personal information is described in our
            <a href="/privacy">Privacy Policy</a>.
          </p>

          <h2>9. Warranties and Disclaimers</h2>
          <p>
            THE SERVICES ARE PROVIDED “AS IS” AND “AS AVAILABLE.” TO THE MAXIMUM
            EXTENT PERMITTED BY LAW, WE DISCLAIM ALL WARRANTIES, EXPRESS OR
            IMPLIED, INCLUDING MERCHANTABILITY, FITNESS FOR A PARTICULAR
            PURPOSE, AND NON-INFRINGEMENT.
          </p>

          <h2>10. Limitation of Liability</h2>
          <p>
            TO THE MAXIMUM EXTENT PERMITTED BY LAW, CLANCY AND ITS AFFILIATES
            WILL NOT BE LIABLE FOR INDIRECT, INCIDENTAL, SPECIAL, CONSEQUENTIAL,
            EXEMPLARY, OR PUNITIVE DAMAGES, OR ANY LOSS OF PROFITS, REVENUE, OR
            DATA, ARISING OUT OF OR RELATED TO YOUR USE OF THE SERVICES.
          </p>

          <h2>11. Indemnification</h2>
          <p>
            You will indemnify and hold harmless Clancy, its affiliates, and
            their personnel from and against any claims, liabilities, damages,
            losses, and expenses arising from your use of the Services or
            violation of these Terms.
          </p>

          <h2>12. Termination</h2>
          <p>
            You may stop using the Services at any time. We may suspend or
            terminate access if you violate these Terms or if required by law.
          </p>

          <h2>13. Governing Law</h2>
          <p>
            These Terms are governed by the laws of the jurisdiction where
            Clancy is organized, without regard to conflict of laws principles.
          </p>

          <h2>14. Changes to Terms</h2>
          <p>
            We may update these Terms from time to time. The updated version
            will be posted on this page with a revised date. Your continued use
            of the Services constitutes acceptance of the updated Terms.
          </p>

          <h2>15. Contact</h2>
          <p>
            Questions about these Terms? Contact us at{" "}
            <a href="mailto:hello@clancy.ai">hello@clancy.ai</a>.
          </p>
        </article>
      </section>
      <Footer />
    </main>
  );
}
