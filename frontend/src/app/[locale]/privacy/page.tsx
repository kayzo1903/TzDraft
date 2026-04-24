"use client";

import Link from "next/link";
import { Shield } from "lucide-react";

const EFFECTIVE_DATE = "24 April 2026";

export default function PrivacyPolicyPage() {
  return (
    <main className="min-h-screen bg-[#020205] text-white">
      <div className="max-w-3xl mx-auto px-4 py-16">
        {/* Header */}
        <div className="mb-10">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 rounded-xl bg-orange-500/10 border border-orange-500/20 flex items-center justify-center">
              <Shield className="w-5 h-5 text-orange-400" />
            </div>
            <span className="text-xs font-bold tracking-widest text-orange-400 uppercase">
              Legal
            </span>
          </div>
          <h1 className="text-3xl font-black text-white mb-2">
            Privacy Policy
          </h1>
          <p className="text-stone-400 text-sm">
            Effective: {EFFECTIVE_DATE} · Version 1.0
          </p>
        </div>

        <div className="space-y-10 text-stone-300 leading-relaxed">
          <Section title="1. Introduction">
            <p>
              TzDraft ("we", "us", "our") operates the TzDraft game platform. This Privacy Policy
              explains how we collect, use, store, share, and protect your personal information.
            </p>
            <p className="mt-3">
              <strong className="text-white">Controller:</strong> TzDraft / ZetuTech, Dar es Salaam, Tanzania.
              Contact:{" "}
              <a href="mailto:privacy@tzdraft.com" className="text-orange-400 hover:underline">
                privacy@tzdraft.com
              </a>
            </p>
          </Section>

          <Section title="2. Information We Collect">
            <p className="font-semibold text-white mb-2">Information you provide directly:</p>
            <InfoTable rows={[
              ["Username & display name", "Account identification, leaderboards (public)"],
              ["Email address (optional)", "Verification, password reset, notifications"],
              ["Password (hashed, never plain text)", "Authentication"],
              ["Country / Region", "Matchmaking, regional leaderboards"],
              ["Profile avatar (optional)", "Profile display"],
            ]} />
            <p className="font-semibold text-white mt-4 mb-2">Collected automatically:</p>
            <InfoTable rows={[
              ["IP address", "Security, fraud detection, rate limiting"],
              ["Device type and OS", "App compatibility, analytics"],
              ["Game moves and timestamps", "Game storage, replay, dispute resolution"],
              ["ELO rating and results", "Leaderboards, matchmaking"],
            ]} />
          </Section>

          <Section title="3. How We Use Your Information">
            <InfoTable rows={[
              ["Operating the platform & authentication", "Contract performance"],
              ["ELO ratings and leaderboards", "Contract performance"],
              ["Game replays and history", "Contract performance"],
              ["Fraud and cheat detection", "Legitimate interest"],
              ["Platform analytics and improvement", "Legitimate interest"],
              ["Promotional emails (opt-in only)", "Consent"],
              ["Targeted ads (opt-in only)", "Consent"],
            ]} />
          </Section>

          <Section title="4. Public Information">
            <p>
              The following is <strong className="text-white">publicly visible</strong> by default:
              your username, display name, ELO rating, rank, win/loss record, country flag, and
              completed game replays. By registering you consent to this visibility.
            </p>
          </Section>

          <Section title="5. Data Sharing">
            <p className="mb-3">We do <strong className="text-white">not sell</strong> your personal data. We share data only with:</p>
            <InfoTable rows={[
              ["Hetzner Online GmbH", "VPS hosting, database storage (EU)"],
              ["Cloudflare Inc. (R2)", "Media asset storage — avatars, ad creatives"],
              ["Ad network partners (consent only)", "Hashed identifiers for relevant ads"],
              ["Legal authorities", "When required by law or court order"],
            ]} />
          </Section>

          <Section title="6. Data Retention">
            <InfoTable rows={[
              ["Active account data", "Until account deletion"],
              ["Game move history", "3 years from game date, then anonymized"],
              ["Login / security logs", "12 months"],
              ["Deleted account personal data", "Anonymized within 30 days"],
              ["Anonymized analytics data", "Indefinitely"],
            ]} />
          </Section>

          <Section title="7. Your Rights">
            <InfoTable rows={[
              ["Access — obtain a copy of your data", "Settings → Privacy → Download My Data"],
              ["Deletion — delete your account", "Settings → Account → Delete Account"],
              ["Correction — update inaccurate data", "Settings → Profile"],
              ["Withdraw consent (marketing/ads)", "Settings → Privacy"],
              ["Data portability or other requests", "privacy@tzdraft.com"],
            ]} />
            <p className="mt-3 text-stone-400">We respond to all requests within 30 days.</p>
          </Section>

          <Section title="8. Data Security">
            <ul className="list-disc pl-5 space-y-1 text-sm">
              <li>All data in transit encrypted via <strong className="text-white">HTTPS / WSS (TLS 1.2+)</strong></li>
              <li>Passwords stored using <strong className="text-white">bcrypt with salt</strong></li>
              <li>Database not publicly exposed — restricted to app server only</li>
              <li>Sessions use signed, short-lived JWT tokens</li>
              <li>Data breach notification within <strong className="text-white">72 hours</strong> of discovery</li>
            </ul>
          </Section>

          <Section title="9. Cookies">
            <p>
              We use essential cookies (session management, cannot be disabled) and optional analytics
              and advertising cookies. You will see a consent banner on first visit and can change
              preferences via <strong className="text-white">Settings → Privacy</strong>.
            </p>
          </Section>

          <Section title="10. Children's Privacy">
            <p>
              TzDraft does not knowingly collect data from children under 13. If you believe your
              child has provided us data, contact{" "}
              <a href="mailto:privacy@tzdraft.com" className="text-orange-400 hover:underline">
                privacy@tzdraft.com
              </a>{" "}
              and we will delete it within 14 days.
            </p>
          </Section>

          <Section title="11. Changes to This Policy">
            <p>
              We may update this policy. Material changes will be announced in-app and by email
              (where provided). Continued use after changes constitutes acceptance.
            </p>
          </Section>

          <Section title="12. Contact">
            <p>
              <a href="mailto:privacy@tzdraft.com" className="text-orange-400 hover:underline">
                privacy@tzdraft.com
              </a>
              {" "}· TzDraft / ZetuTech, Dar es Salaam, Tanzania
            </p>
          </Section>
        </div>

        <div className="mt-12 pt-8 border-t border-white/10 flex flex-wrap gap-4 text-sm text-stone-500">
          <span>Last reviewed: {EFFECTIVE_DATE}</span>
          <span>·</span>
          <Link href="/terms" className="text-orange-400 hover:underline">
            Terms of Service →
          </Link>
        </div>
      </div>
    </main>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section>
      <h2 className="text-lg font-bold text-white mb-3 border-l-4 border-orange-500 pl-3">
        {title}
      </h2>
      <div className="text-stone-300 text-sm leading-relaxed">{children}</div>
    </section>
  );
}

function InfoTable({ rows }: { rows: [string, string][] }) {
  return (
    <div className="rounded-xl border border-white/10 overflow-hidden">
      <table className="w-full text-sm">
        <tbody className="divide-y divide-white/5">
          {rows.map(([label, value]) => (
            <tr key={label} className="hover:bg-white/5 transition-colors">
              <td className="px-4 py-2 text-stone-300 font-medium w-1/2">{label}</td>
              <td className="px-4 py-2 text-stone-400">{value}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
