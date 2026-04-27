import type { Metadata } from "next";
import { buildPageMetadata, isAppLocale } from "@/lib/seo";
import Link from "next/link";
import { Scale } from "lucide-react";

const EFFECTIVE_DATE = "24 April 2026";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  const isSw = locale === "sw";
  
  return buildPageMetadata({
    locale: isAppLocale(locale) ? locale : "en",
    path: "/terms",
    title: isSw ? "Masharti ya Huduma | TzDraft" : "Terms of Service | TzDraft",
    description: isSw 
      ? "Soma masharti ya huduma ya TzDraft kabla ya kutumia jukwaa letu kucheza Drafti mtandaoni."
      : "Read the TzDraft Terms of Service before using our platform to play Drafti online.",
  });
}

export default function TermsOfServicePage() {
  return (
    <main className="min-h-screen bg-background text-foreground">
      <div className="max-w-7xl mx-auto px-4 py-16 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="mb-10">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 rounded-xl bg-primary/10 border border-primary/20 flex items-center justify-center">
              <Scale className="w-5 h-5 text-primary" />
            </div>
            <span className="text-xs font-bold tracking-widest text-primary uppercase">
              Legal
            </span>
          </div>
          <h1 className="text-3xl font-black text-foreground mb-2">
            Terms of Service
          </h1>
          <p className="text-foreground/40 text-sm">
            Effective: {EFFECTIVE_DATE} · Version 1.0
          </p>
        </div>

        <div className="space-y-10 text-foreground/80 leading-relaxed">
          <Section title="1. Agreement to Terms">
            <p>
              By accessing or using TzDraft — including the website and the TzDraft mobile application — you agree to be bound by these Terms of Service. If you do not agree, you must not use the Platform.
            </p>
            <p className="mt-3">
              <strong className="text-foreground">Operator:</strong> TzDraft, Mkuranga, Pwani, Tanzania.
              Contact:{" "}
              <a href="mailto:support@tzdraft.co.tz" className="text-primary hover:underline">
                support@tzdraft.co.tz
              </a>
            </p>
          </Section>

          <Section title="2. Eligibility">
            <ul className="list-disc pl-5 space-y-1">
              <li>You must be at least <strong className="text-foreground">13 years old</strong>.</li>
              <li>If you are between 13 and 18, you must have parental or guardian permission.</li>
              <li>You must not have been previously permanently banned from TzDraft.</li>
              <li>You must not be prohibited from using the platform under applicable laws.</li>
            </ul>
          </Section>

          <Section title="3. Account Registration">
            <p>You must provide accurate account information. Each person may register <strong className="text-foreground">only one account</strong>. Multi-accounting is strictly prohibited.</p>
            <p className="mt-3 text-sm italic">You are responsible for your account security. TzDraft will never ask for your password via email or chat.</p>
          </Section>

          <Section title="4. Platform License">
            <p>
              TzDraft grants you a limited, non-exclusive, non-transferable, revocable license for personal, non-commercial use. Automated access via bots or scrapers is prohibited unless explicitly permitted.
            </p>
          </Section>

          <Section title="5. Gameplay Rules and Fair Play">
            <p>All games are <strong className="text-foreground">server-authoritative</strong>. The server is the final authority on legal moves and outcomes.</p>
            <div className="mt-4 rounded-xl border border-white/5 overflow-hidden bg-secondary/20 shadow-inner">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-white/5">
                    <th className="text-left px-5 py-3 text-foreground/60 font-semibold border-b border-white/5">Violation</th>
                    <th className="text-left px-5 py-3 text-foreground/60 font-semibold border-b border-white/5">Consequence</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5">
                  {[
                    ["Using external draughts engines", "Permanent ban"],
                    ["Match-fixing / sandbagging", "Permanent ban"],
                    ["Multi-accounting for ELO manipulation", "Permanent ban"],
                    ["Intentional disconnection to avoid losses", "Warning → ban"],
                    ["Exploiting software bugs", "Warning → ban"],
                  ].map(([v, c]) => (
                    <tr key={v} className="hover:bg-primary/5 transition-colors group/row">
                      <td className="px-5 py-3 text-foreground font-semibold group-hover/row:text-primary transition-colors border-r border-white/5">{v}</td>
                      <td className="px-5 py-3 text-primary font-bold">{c}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Section>

          <Section title="6. User Conduct">
            <p>You agree not to harass other users, post offensive content, impersonate staff, or interfere with the platform's operation.</p>
          </Section>

          <Section title="7. Social Features">
            <p>Your username, ELO, and game history are <strong className="text-foreground">publicly visible</strong>. This is an inherent feature of the platform.</p>
          </Section>

          <Section title="8. Intellectual Property">
            <p>All platform content is owned by TzDraft. You grant us a license to display your game data and username on leaderboards.</p>
          </Section>

          <Section title="9. Advertising">
            <p>TzDraft may display advertisements. Ad preferences can be managed in Settings.</p>
          </Section>

          <Section title="10. Premium Features and Payments">
            <p>Digital purchases are eligible for a refund within 14 days if unused. Subscriptions auto-renew unless cancelled.</p>
          </Section>

          <Section title="11. Account Termination">
            <p>You may delete your account at any time. TzDraft may suspend or ban accounts for violations. Appeals can be sent to <a href="mailto:support@tzdraft.co.tz" className="text-primary hover:underline">support@tzdraft.co.tz</a> within 30 days.</p>
          </Section>

          <Section title="12. Disclaimer of Warranties">
            <p>The Platform is provided "AS IS" and "AS AVAILABLE" without warranty of any kind.</p>
          </Section>

          <Section title="13. Limitation of Liability">
            <p>To the maximum extent permitted by law, TzDraft and its operators are not liable for data loss or indirect damages.</p>
          </Section>

          <Section title="14. Indemnification">
            <p>You agree to indemnify TzDraft from claims arising from your violation of these Terms.</p>
          </Section>

          <Section title="15. Governing Law">
            <p>These Terms are governed by the laws of the <strong className="text-foreground">United Republic of Tanzania</strong>.</p>
          </Section>

          <Section title="16. Changes to These Terms">
            <p>We may update these Terms. Material changes will be announced in-app 14 days before taking effect.</p>
          </Section>

          <Section title="17. Miscellaneous">
            <p>These Terms and the Privacy Policy constitute the entire agreement between you and TzDraft.</p>
          </Section>

          <Section title="18. Contact">
            <p>
              Support & Legal: <a href="mailto:support@tzdraft.co.tz" className="text-primary hover:underline">support@tzdraft.co.tz</a>
              {" "}· Mkuranga, Pwani, Tanzania
            </p>
          </Section>
        </div>

        <div className="mt-12 pt-8 border-t border-white/10 flex flex-wrap gap-4 text-sm text-foreground/40">
          <span>Last reviewed: {EFFECTIVE_DATE}</span>
          <span>·</span>
          <Link href="/privacy" className="text-primary hover:underline">
            Privacy Policy →
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
