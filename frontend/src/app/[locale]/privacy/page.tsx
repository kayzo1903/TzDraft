"use client";

import Link from "next/link";
import { Shield } from "lucide-react";

const EFFECTIVE_DATE = "24 April 2026";

export default function PrivacyPolicyPage() {
  return (
    <main className="min-h-screen bg-background text-foreground">
      <div className="max-w-7xl mx-auto px-4 py-16 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="mb-10">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 rounded-xl bg-primary/10 border border-primary/20 flex items-center justify-center">
              <Shield className="w-5 h-5 text-primary" />
            </div>
            <span className="text-xs font-bold tracking-widest text-primary uppercase">
              Legal
            </span>
          </div>
          <h1 className="text-3xl font-black text-foreground mb-2">
            Privacy Policy
          </h1>
          <p className="text-foreground/40 text-sm">
            Effective: {EFFECTIVE_DATE} · Version 1.0
          </p>
        </div>

        <div className="space-y-10 text-foreground/80 leading-relaxed">
          <Section title="1. Introduction">
            <p>
              TzDraft ("we", "us", "our") operates the TzDraft game platform, accessible at www.tzdraft.co.tz and via the TzDraft mobile application. This Privacy Policy explains how we collect, use, store, share, and protect your personal information when you use our Platform.
            </p>
            <p className="mt-3">
              By registering an account or using TzDraft, you agree to the collection and use of information as described in this Policy.
            </p>
            <p className="mt-3">
              <strong className="text-foreground">Controller:</strong> TzDraft, Mkuranga, Pwani, Tanzania.
              Contact:{" "}
              <a href="mailto:support@tzdraft.co.tz" className="text-primary hover:underline">
                support@tzdraft.co.tz
              </a>
            </p>
          </Section>

          <Section title="2. Who This Policy Applies To">
            <p>This Policy applies to registered users, mobile application users, and platform visitors.</p>
            <p className="mt-2 text-sm italic">
              TzDraft is not intended for children under 13 years of age. If you are between 13 and 18, you should review this policy with a parent or guardian.
            </p>
          </Section>

          <Section title="3. Information We Collect">
            <p className="font-semibold text-foreground mb-2">3.1 Information You Provide Directly:</p>
            <InfoTable rows={[
              ["Username", "Account identification, leaderboards (publicly visible)"],
              ["Display name", "Profile display"],
              ["Email address", "Account verification, notifications, password reset"],
              ["Password", "Authentication (hashed, never stored in plain text)"],
              ["Country / Region", "Matchmaking, regional leaderboards, analytics"],
              ["Profile avatar (optional)", "Profile display"],
            ]} />
            <p className="font-semibold text-foreground mt-4 mb-2">3.2 Information Collected Automatically:</p>
            <InfoTable rows={[
              ["IP address", "Security, fraud detection, rate limiting"],
              ["Device type and OS", "App compatibility, analytics"],
              ["Session tokens", "Authentication state"],
              ["Game moves and timestamps", "Game storage, replay, dispute resolution"],
              ["Game results", "ELO rating calculation, leaderboards"],
              ["AI level selections", "Personalization, analytics"],
            ]} />
          </Section>

          <Section title="4. How We Use Your Information">
            <InfoTable rows={[
              ["Providing and operating the Platform", "Contract performance"],
              ["Account creation and authentication", "Contract performance"],
              ["Calculating ELO ratings and leaderboards", "Contract performance"],
              ["Storing and displaying game replays", "Contract performance"],
              ["Detecting cheating, fraud, and abuse", "Legitimate interest"],
              ["Security monitoring and incident response", "Legitimate interest"],
              ["Improving matchmaking and gameplay", "Legitimate interest"],
              ["Promotional emails (opt-in only)", "Consent"],
              ["Targeted advertisements (opt-in only)", "Consent"],
              ["Compliance with legal obligations", "Legal obligation"],
            ]} />
          </Section>

          <Section title="5. Public Information">
            <p>
              The following information is <strong className="text-foreground">publicly visible</strong> on TzDraft by default:
            </p>
            <ul className="list-disc pl-5 mt-2 space-y-1 text-sm">
              <li>Your username and display name</li>
              <li>Your ELO rating and rank on leaderboards</li>
              <li>Your win/loss/draw record</li>
              <li>Your game replays (move history)</li>
              <li>Your country/region flag on leaderboards</li>
            </ul>
          </Section>

          <Section title="6. Data Sharing and Third Parties">
            <p className="mb-3">We do <strong className="text-foreground">not sell</strong> your personal data. We share data with:</p>
            <InfoTable rows={[
              ["Hetzner Online GmbH", "Cloud VPS hosting, database storage (Germany, EU)"],
              ["Cloudflare Inc. (R2)", "Media asset storage (avatars, ad creatives)"],
              ["Redis (self-hosted)", "Session and leaderboard cache"],
              ["Advertising Partners", "Limited identifiers (consent only)"],
              ["Legal Authorities", "When required by law or court order"],
            ]} />
          </Section>

          <Section title="7. Data Retention">
            <InfoTable rows={[
              ["Active account data", "Until account deletion"],
              ["Game move history", "3 years from game date, then anonymized"],
              ["Login / security logs", "12 months"],
              ["Deleted account personal data", "Anonymized within 30 days"],
              ["Anonymized analytics data", "Indefinitely"],
            ]} />
          </Section>

          <Section title="8. Your Rights">
            <InfoTable rows={[
              ["Access — obtain a copy of your data", "Settings → Privacy → Download My Data"],
              ["Deletion — delete your account", "Settings → Account → Delete Account"],
              ["Correction — update inaccurate data", "Settings → Profile"],
              ["Withdraw consent (marketing/ads)", "Settings → Privacy"],
              ["Portability or Object", "support@tzdraft.co.tz"],
            ]} />
            <p className="mt-3 text-foreground/40">We respond to all requests within 30 days.</p>
          </Section>

          <Section title="9. Data Security">
            <ul className="list-disc pl-5 space-y-1 text-sm">
              <li>All data in transit is encrypted via <strong className="text-foreground">HTTPS / WSS (TLS 1.2+)</strong></li>
              <li>Passwords are stored using <strong className="text-foreground">bcrypt hashing with salt</strong></li>
              <li>Database access is restricted to the application server only</li>
              <li>Sessions use signed, short-lived JWT tokens</li>
              <li>Data breach notification within <strong className="text-foreground">72 hours</strong> of discovery</li>
            </ul>
          </Section>

          <Section title="10. International Data Transfers">
            <p>
              TzDraft is operated from Tanzania. Our hosting is located in the EU. By using the Platform, you consent to the transfer and processing of your data in these locations.
            </p>
          </Section>

          <Section title="11. Children's Privacy">
            <p>
              TzDraft does not knowingly collect personal information from children under 13. If you believe your child has provided us data, contact{" "}
              <a href="mailto:support@tzdraft.co.tz" className="text-primary hover:underline">
                support@tzdraft.co.tz
              </a>{" "}
              and we will delete it within 14 days.
            </p>
          </Section>

          <Section title="12. Changes to This Policy">
            <p>
              We may update this policy. Material changes will be announced in-app or via email. Continued use after changes constitutes acceptance.
            </p>
          </Section>

          <Section title="13. Contact">
            <p>
              <a href="mailto:support@tzdraft.co.tz" className="text-primary hover:underline">
                support@tzdraft.co.tz
              </a>
              {" "}· TzDraft, Mkuranga, Pwani, Tanzania
            </p>
          </Section>
        </div>

        <div className="mt-12 pt-8 border-t border-white/10 flex flex-wrap gap-4 text-sm text-foreground/40">
          <span>Last reviewed: {EFFECTIVE_DATE}</span>
          <span>·</span>
          <Link href="/terms" className="text-primary hover:underline">
            Terms of Service →
          </Link>
        </div>

      </div>
    </main>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="group">
      <h2 className="text-xl font-bold text-foreground mb-4 border-l-4 border-primary pl-4 group-hover:border-primary-hover transition-colors">
        {title}
      </h2>
      <div className="text-foreground/80 text-sm leading-relaxed pl-5">{children}</div>
    </section>
  );
}

function InfoTable({ rows }: { rows: [string, string][] }) {
  return (
    <div className="mt-4 rounded-xl border border-white/5 overflow-hidden bg-secondary/20 shadow-inner">
      <table className="w-full text-sm">
        <tbody className="divide-y divide-white/5">
          {rows.map(([label, value]) => (
            <tr key={label} className="hover:bg-primary/5 transition-colors group/row">
              <td className="px-5 py-3 text-foreground font-semibold w-1/3 border-r border-white/5 group-hover/row:text-primary transition-colors">{label}</td>
              <td className="px-5 py-3 text-foreground/70">{value}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
