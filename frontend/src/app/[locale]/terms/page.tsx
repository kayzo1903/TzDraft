"use client";

import Link from "next/link";
import { Scale } from "lucide-react";

const EFFECTIVE_DATE = "24 April 2026";

export default function TermsOfServicePage() {
  return (
    <main className="min-h-screen bg-[#020205] text-white">
      <div className="max-w-3xl mx-auto px-4 py-16">
        {/* Header */}
        <div className="mb-10">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 rounded-xl bg-orange-500/10 border border-orange-500/20 flex items-center justify-center">
              <Scale className="w-5 h-5 text-orange-400" />
            </div>
            <span className="text-xs font-bold tracking-widest text-orange-400 uppercase">
              Legal
            </span>
          </div>
          <h1 className="text-3xl font-black text-white mb-2">
            Terms of Service
          </h1>
          <p className="text-stone-400 text-sm">
            Effective: {EFFECTIVE_DATE} · Version 1.0
          </p>
        </div>

        <div className="space-y-10 text-stone-300 leading-relaxed">
          <Section title="1. Agreement to Terms">
            <p>
              By accessing or using TzDraft — including the website and the
              TzDraft mobile application — you agree to be bound by these Terms
              of Service. If you do not agree, you must not use the platform.
            </p>
            <p className="mt-3">
              <strong className="text-white">Operator:</strong> TzDraft / ZetuTech, Dar es Salaam, Tanzania.
              Contact:{" "}
              <a href="mailto:legal@tzdraft.com" className="text-orange-400 hover:underline">
                legal@tzdraft.com
              </a>
            </p>
          </Section>

          <Section title="2. Eligibility">
            <ul className="list-disc pl-5 space-y-1">
              <li>You must be at least <strong className="text-white">13 years old</strong>.</li>
              <li>If you are between 13 and 18, you must have parental permission.</li>
              <li>You must not have been previously permanently banned from TzDraft.</li>
              <li>You must not be prohibited from using the platform under applicable laws.</li>
            </ul>
          </Section>

          <Section title="3. Account Registration">
            <p>You must provide an accurate username, display name, and password. Each person may register <strong className="text-white">one account only</strong>. Multi-accounting is prohibited.</p>
            <p className="mt-3">You are solely responsible for maintaining the confidentiality of your login credentials. TzDraft will never ask for your password via email or chat.</p>
          </Section>

          <Section title="4. Platform License">
            <p>
              TzDraft grants you a limited, non-exclusive, non-transferable,
              revocable license to use the platform for personal, non-commercial
              purposes. This license does not include reverse engineering,
              decompiling, automated scraping, or commercial use without written
              permission.
            </p>
          </Section>

          <Section title="5. Gameplay Rules and Fair Play">
            <p>All games are <strong className="text-white">server-authoritative</strong>. The server is the final authority on all moves, timers, and game outcomes.</p>
            <div className="mt-4 rounded-xl border border-white/10 overflow-hidden">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-white/5">
                    <th className="text-left px-4 py-2 text-stone-300 font-semibold">Violation</th>
                    <th className="text-left px-4 py-2 text-stone-300 font-semibold">Consequence</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5">
                  {[
                    ["Using external engines to assist play", "Permanent ban"],
                    ["Match-fixing / manipulating outcomes", "Permanent ban"],
                    ["Multi-accounting to inflate rating", "Permanent ban"],
                    ["Intentional disconnection to avoid losses", "Warning → ban"],
                    ["Exploiting software bugs for advantage", "Warning → ban"],
                  ].map(([v, c]) => (
                    <tr key={v} className="hover:bg-white/5 transition-colors">
                      <td className="px-4 py-2 text-stone-400">{v}</td>
                      <td className="px-4 py-2 text-orange-400 font-medium">{c}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Section>

          <Section title="6. User Conduct">
            <p>You agree not to harass, threaten, or abuse other users; post illegal or offensive content; impersonate TzDraft staff; attempt unauthorized system access; or use the platform for unlawful purposes.</p>
          </Section>

          <Section title="7. Social Features and Public Information">
            <p>Your <strong className="text-white">username, ELO rating, rank, win/loss record, and country flag</strong> are publicly visible on leaderboards. Your completed game replays are publicly viewable. By registering you consent to this visibility.</p>
          </Section>

          <Section title="8. Intellectual Property">
            <p>All platform content — including the TzDraft name, logo, UI, and game engine software — is owned by TzDraft or its licensors. By using the platform, you grant TzDraft a worldwide, royalty-free license to store, process, display your game data and username on leaderboards.</p>
          </Section>

          <Section title="9. Advertising">
            <p>TzDraft may display advertisements. By using TzDraft you agree to the display of ads. Ad preferences can be managed in Settings → Privacy.</p>
          </Section>

          <Section title="10. Account Termination">
            <p>You may delete your account at any time via <strong className="text-white">Settings → Account → Delete Account</strong>. TzDraft reserves the right to suspend or permanently ban accounts for violations of these Terms. Permanent ban appeals may be sent to{" "}
              <a href="mailto:appeals@tzdraft.com" className="text-orange-400 hover:underline">appeals@tzdraft.com</a>{" "}
              within 30 days.
            </p>
          </Section>

          <Section title="11. Disclaimer of Warranties">
            <p>
              The platform is provided <strong className="text-white">"as is"</strong> and{" "}
              <strong className="text-white">"as available"</strong> without warranty of any kind. TzDraft does not warrant that the platform will be uninterrupted, error-free, or secure.
            </p>
          </Section>

          <Section title="12. Limitation of Liability">
            <p>To the maximum extent permitted by law, TzDraft shall not be liable for loss of data, ELO rating due to bugs, losses from unauthorized account access, or any indirect damages. Total liability shall not exceed the amount you paid TzDraft in the preceding 12 months or USD $10, whichever is greater.</p>
          </Section>

          <Section title="13. Governing Law">
            <p>
              These Terms are governed by the laws of the{" "}
              <strong className="text-white">United Republic of Tanzania</strong>. Disputes shall first be attempted to resolve informally by emailing{" "}
              <a href="mailto:legal@tzdraft.com" className="text-orange-400 hover:underline">
                legal@tzdraft.com
              </a>
              , and if unresolved, by binding arbitration in Dar es Salaam, Tanzania.
            </p>
          </Section>

          <Section title="14. Changes to These Terms">
            <p>We may update these Terms. Material changes will be announced in-app at least 14 days before taking effect. Continued use of the platform after changes take effect constitutes acceptance.</p>
          </Section>

          <Section title="15. Contact">
            <p>
              Legal:{" "}
              <a href="mailto:legal@tzdraft.com" className="text-orange-400 hover:underline">legal@tzdraft.com</a>
              {" "}· Support:{" "}
              <a href="mailto:support@tzdraft.com" className="text-orange-400 hover:underline">support@tzdraft.com</a>
              {" "}· Appeals:{" "}
              <a href="mailto:appeals@tzdraft.com" className="text-orange-400 hover:underline">appeals@tzdraft.com</a>
            </p>
          </Section>
        </div>

        <div className="mt-12 pt-8 border-t border-white/10 flex flex-wrap gap-4 text-sm text-stone-500">
          <span>Last reviewed: {EFFECTIVE_DATE}</span>
          <span>·</span>
          <Link href="/privacy" className="text-orange-400 hover:underline">
            Privacy Policy →
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
