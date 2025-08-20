import type { Metadata } from "next";
import { Header } from "@/components/sections/Header";
import { Footer } from "@/components/sections/Footer";

export const metadata: Metadata = {
  title: "Privacy Policy • Clancy AI",
  description:
    "Learn how Clancy AI collects, uses, and protects your information. Read our privacy practices and your rights.",
};

export default function PrivacyPage() {
  return (
    <main>
      <Header />
      <section className="section-container section-padding">
        <article className="prose-enhanced">
          <h1>Privacy Policy</h1>
          <p>
            This Privacy Policy explains how Clancy AI (&quot;Clancy&quot;,
            &quot;we&quot;, &quot;us&quot;) collects, uses, and safeguards
            information when you use our website, products, and services
            (collectively, the &quot;Services&quot;).
          </p>

          <p>
            <strong>Last updated:</strong> September 1, 2025
          </p>

          <h2>Information We Collect</h2>
          <ul>
            <li>
              <strong>Account information</strong>: name, email address,
              organization details, and authentication data.
            </li>
            <li>
              <strong>Usage data</strong>: interactions with our app, device and
              browser information, and standard log data.
            </li>
            <li>
              <strong>Customer content</strong>: data you choose to connect or
              upload to Clancy (e.g., documents, messages, calendar events),
              processed only to provide the Services you configure.
            </li>
          </ul>

          <h2>How We Use Information</h2>
          <ul>
            <li>Provide, operate, and secure the Services.</li>
            <li>Improve features, performance, and user experience.</li>
            <li>Provide support and communicate about updates.</li>
            <li>Comply with legal obligations and enforce terms.</li>
          </ul>

          <h2>Data Sharing</h2>
          <p>
            We do <strong>not</strong> sell your personal information. We may
            share information with:
          </p>
          <ul>
            <li>
              <strong>Service providers</strong> who help us operate the
              Services under appropriate confidentiality and security
              obligations.
            </li>
            <li>
              <strong>Third-party integrations</strong> you explicitly connect
              (e.g., Google, Microsoft, Slack). Data shared is limited to what
              is necessary to perform the actions you authorize.
            </li>
            <li>
              <strong>Legal and safety</strong> purposes when required by law or
              to protect rights, safety, or the integrity of the Services.
            </li>
          </ul>

          <h2>Data Retention</h2>
          <p>
            We retain information for as long as needed to provide the Services,
            comply with legal obligations, resolve disputes, and enforce our
            agreements. You can request deletion of your account data at any
            time.
          </p>

          <h2>Security</h2>
          <p>
            We apply administrative, technical, and organizational measures to
            protect information. No system is completely secure; please use
            strong, unique credentials and protect your access tokens.
          </p>

          <h2>Your Rights</h2>
          <p>
            Depending on your location, you may have rights to access, correct,
            delete, or restrict processing of your personal information, and to
            portability. To exercise these rights, contact us using the details
            below.
          </p>

          <h2>International Transfers</h2>
          <p>
            If data is transferred across borders, we use appropriate safeguards
            consistent with applicable laws.
          </p>

          <h2>Children&apos;s Privacy</h2>
          <p>
            Our Services are not directed to children under 13 (or the age
            required by local law). We do not knowingly collect personal
            information from children.
          </p>

          <h2>Changes to This Policy</h2>
          <p>
            We may update this Privacy Policy from time to time. We will post
            the updated version on this page and update the date above. Your
            continued use of the Services after changes become effective
            signifies acceptance of the updated policy.
          </p>

          <h2>Contact Us</h2>
          <p>
            Questions or requests? Contact us at{" "}
            <a href="mailto:hello@clancy.ai">hello@clancy.ai</a>.
          </p>
        </article>
      </section>
      <Footer />
    </main>
  );
}
