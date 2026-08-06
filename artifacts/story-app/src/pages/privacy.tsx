import { Logo } from "@/components/logo";
import { Link } from "wouter";

const LAST_UPDATED = "August 6, 2026";
const CONTACT_EMAIL = "sionlegacyoriginals@gmail.com";

export default function Privacy() {
  return (
    <div className="min-h-screen bg-white text-gray-800 font-sans">
      {/* Minimal header */}
      <header className="border-b border-gray-100 py-4 px-6">
        <Link href="/" className="inline-flex items-center gap-2 text-violet-700 hover:opacity-80 transition-opacity">
          <Logo size={24} />
          <span className="font-bold text-lg">Sion Kids Read</span>
        </Link>
      </header>

      <main className="max-w-3xl mx-auto px-6 py-12 pb-20">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">Privacy Policy</h1>
        <p className="text-sm text-gray-500 mb-10">Last updated: {LAST_UPDATED}</p>

        {/* ── 1. Overview & COPPA ──────────────────────────────────── */}
        <section className="mb-10">
          <h2 className="text-xl font-semibold text-gray-900 mb-3">1. Overview &amp; COPPA Compliance</h2>
          <p className="mb-3 leading-relaxed">
            Sion Kids Read is a literacy and character-building application designed for children
            and families. We are committed to protecting the privacy of children who use our service,
            in accordance with the Children's Online Privacy Protection Act (<strong>COPPA</strong>),
            the Family Educational Rights and Privacy Act (<strong>FERPA</strong>), and applicable
            state and international privacy laws.
          </p>
          <p className="mb-3 leading-relaxed">
            <strong>We do not collect, share, or sell personal information about children for
            advertising, marketing, or data-broker purposes.</strong> We do not serve behaviorally
            targeted advertisements within the app. We do not allow third-party advertisers to
            track children's activity within Sion Kids Read.
          </p>
          <p className="leading-relaxed">
            If you are a parent or guardian and believe that we have inadvertently collected
            personal information from a child under the age of 13 without your consent, please
            contact us immediately at{" "}
            <a href={`mailto:${CONTACT_EMAIL}`} className="text-violet-700 underline">
              {CONTACT_EMAIL}
            </a>{" "}
            and we will delete the information as quickly as possible.
          </p>
        </section>

        {/* ── 2. Data Collected ────────────────────────────────────── */}
        <section className="mb-10">
          <h2 className="text-xl font-semibold text-gray-900 mb-3">2. Data We Collect</h2>
          <p className="mb-3 leading-relaxed">
            We collect the minimum information necessary to operate the app and fulfil your
            requests. Specifically:
          </p>
          <ul className="list-disc list-outside pl-5 space-y-2 leading-relaxed">
            <li>
              <strong>Account information</strong> — An email address and display name when you
              create a parent or teacher account, used solely for account management and
              authentication.
            </li>
            <li>
              <strong>Subscription data</strong> — Purchase and entitlement information processed
              through Google Play or RevenueCat to verify active subscriptions. We do not store
              full payment card details; all payment processing is handled by these third-party
              providers under their own privacy policies.
            </li>
            <li>
              <strong>Physical book orders</strong> — Shipping name and address collected only
              when you place an order for a printed book, processed securely through Stripe. This
              information is used exclusively to fulfil your order.
            </li>
            <li>
              <strong>Child profile details</strong> — Optional information you choose to provide
              (such as a child's first name, age, and interests) to personalise AI-generated
              stories. This information is stored on your account and is never shared with third
              parties for advertising.
            </li>
            <li>
              <strong>Usage data</strong> — Basic, anonymised app usage information (such as
              which games are played) to improve the product. This data is not linked to
              individual children and is not sold.
            </li>
          </ul>
          <p className="mt-4 leading-relaxed">
            <strong>We do not sell user data to any third party.</strong>
          </p>
        </section>

        {/* ── 3. Audio & Speech Features ───────────────────────────── */}
        <section className="mb-10">
          <h2 className="text-xl font-semibold text-gray-900 mb-3">3. App Features &amp; Audio / Speech Data</h2>
          <p className="mb-3 leading-relaxed">
            Sion Kids Read includes a read-along feature that uses your device's built-in
            text-to-speech engine (via the Web Speech API) to narrate stories aloud. It may also
            include practice activities where children follow along with highlighted text.
          </p>
          <p className="mb-3 leading-relaxed">
            <strong>We do not use a microphone. We do not record, capture, transmit, or store
            any audio or speech data from the child or their device.</strong> The text-to-speech
            playback is generated entirely on-device using the operating system's built-in voice
            engine. No audio data leaves the device, and no external profiling of a child's speech
            or reading ability is performed.
          </p>
          <p className="leading-relaxed">
            AI-generated story content is created server-side using OpenAI's API based on
            prompts you provide (character name, interests, etc.). Story content is stored on your
            account so you can read it again. We do not use story content to train external AI
            models.
          </p>
        </section>

        {/* ── 4. Data Protection ───────────────────────────────────── */}
        <section className="mb-10">
          <h2 className="text-xl font-semibold text-gray-900 mb-3">4. Data Protection &amp; Security</h2>
          <p className="mb-3 leading-relaxed">
            We take reasonable technical and organisational measures to protect all user and
            subscription data against unauthorised access, disclosure, or loss. These include:
          </p>
          <ul className="list-disc list-outside pl-5 space-y-2 leading-relaxed">
            <li>Encrypted HTTPS connections for all data in transit.</li>
            <li>
              Industry-standard authentication provided by Clerk, a SOC 2 Type II certified
              identity platform.
            </li>
            <li>
              Payment information handled exclusively by Stripe and Google Play, both of which
              are PCI-DSS compliant.
            </li>
            <li>
              Database access restricted to authorised application services; no direct public
              database access.
            </li>
          </ul>
          <p className="mt-4 leading-relaxed">
            While we work hard to protect your data, no method of transmission over the internet
            is 100% secure. If you have concerns about the security of your account, please
            contact us at the address below.
          </p>
        </section>

        {/* ── 5. Data Retention ────────────────────────────────────── */}
        <section className="mb-10">
          <h2 className="text-xl font-semibold text-gray-900 mb-3">5. Data Retention &amp; Deletion</h2>
          <p className="mb-3 leading-relaxed">
            We retain account data for as long as your account is active. You may request
            deletion of your account and associated data at any time by emailing us at{" "}
            <a href={`mailto:${CONTACT_EMAIL}`} className="text-violet-700 underline">
              {CONTACT_EMAIL}
            </a>
            . We will delete your data within 30 days of a verified request, except where
            retention is required by law (for example, for tax or legal compliance purposes).
          </p>
        </section>

        {/* ── 6. Third-Party Services ──────────────────────────────── */}
        <section className="mb-10">
          <h2 className="text-xl font-semibold text-gray-900 mb-3">6. Third-Party Services</h2>
          <p className="mb-3 leading-relaxed">
            Sion Kids Read uses a small number of third-party services to operate:
          </p>
          <ul className="list-disc list-outside pl-5 space-y-2 leading-relaxed">
            <li>
              <strong>Clerk</strong> — user authentication and account management (
              <a href="https://clerk.com/privacy" target="_blank" rel="noopener noreferrer" className="text-violet-700 underline">privacy policy</a>).
            </li>
            <li>
              <strong>OpenAI</strong> — AI story generation (
              <a href="https://openai.com/privacy" target="_blank" rel="noopener noreferrer" className="text-violet-700 underline">privacy policy</a>).
            </li>
            <li>
              <strong>Stripe</strong> — payment processing for subscriptions and physical book orders (
              <a href="https://stripe.com/privacy" target="_blank" rel="noopener noreferrer" className="text-violet-700 underline">privacy policy</a>).
            </li>
            <li>
              <strong>Google Play / RevenueCat</strong> — in-app subscription management on Android (
              <a href="https://policies.google.com/privacy" target="_blank" rel="noopener noreferrer" className="text-violet-700 underline">Google privacy policy</a>).
            </li>
            <li>
              <strong>Lulu</strong> — fulfilment of printed book orders (
              <a href="https://www.lulu.com/about/privacy-policy" target="_blank" rel="noopener noreferrer" className="text-violet-700 underline">privacy policy</a>).
            </li>
          </ul>
          <p className="mt-4 leading-relaxed">
            Each of these services operates under its own privacy policy. We encourage you to
            review them. We do not permit these providers to use data about Sion Kids Read users
            for their own advertising purposes.
          </p>
        </section>

        {/* ── 7. Changes ───────────────────────────────────────────── */}
        <section className="mb-10">
          <h2 className="text-xl font-semibold text-gray-900 mb-3">7. Changes to This Policy</h2>
          <p className="leading-relaxed">
            We may update this Privacy Policy from time to time. When we do, we will update the
            "Last updated" date at the top of this page. Continued use of the app after any
            changes constitutes acceptance of the revised policy. For material changes that affect
            children's data, we will notify account holders by email.
          </p>
        </section>

        {/* ── 8. Contact ───────────────────────────────────────────── */}
        <section className="mb-10">
          <h2 className="text-xl font-semibold text-gray-900 mb-3">8. Contact Us</h2>
          <p className="mb-3 leading-relaxed">
            If you have questions, concerns, or requests relating to this Privacy Policy or your
            data — including requests to access, correct, or delete information — please contact
            us:
          </p>
          <address className="not-italic leading-relaxed">
            <strong>Sion Kids Read / Sion Legacy Originals</strong><br />
            Email:{" "}
            <a href={`mailto:${CONTACT_EMAIL}`} className="text-violet-700 underline">
              {CONTACT_EMAIL}
            </a>
          </address>
          <p className="mt-4 leading-relaxed">
            We will respond to all privacy inquiries within 30 days.
          </p>
        </section>
      </main>

      {/* Minimal footer */}
      <footer className="border-t border-gray-100 py-6 px-6 text-center text-sm text-gray-400">
        © {new Date().getFullYear()} Sion Legacy Originals. All rights reserved.{" "}
        <Link href="/" className="text-violet-600 hover:underline">Back to app</Link>
      </footer>
    </div>
  );
}
