/**
 * Test script — sends every notification email template variant to a single
 * address so the design & content can be reviewed before going live.
 *
 * Usage (from /backend):
 *   npm run test:emails
 */
import 'dotenv/config';
import { Resend } from 'resend';
import { render } from '@react-email/render';
import { TournamentRegistered } from '../infrastructure/email/templates/tournament-registered';
import { TournamentStarted } from '../infrastructure/email/templates/tournament-started';
import { MatchAssigned } from '../infrastructure/email/templates/match-assigned';
import { TournamentResult } from '../infrastructure/email/templates/tournament-result';
import { SupportNotification } from '../infrastructure/email/templates/support-notification';
import { UserConfirmation } from '../infrastructure/email/templates/user-confirmation';

const toArg = process.argv.find((a) => a.startsWith('--to='));
const TO = toArg ? toArg.replace('--to=', '') : 'kay@zetutech.co.tz';

const apiKey = process.env.RESEND_API_KEY;
if (!apiKey) {
  console.error('❌  RESEND_API_KEY not set in .env');
  process.exit(1);
}

const authDomain = process.env.RESEND_AUTH_DOMAIN || 'onboarding@resend.dev';
const FROM =
  authDomain === 'onboarding@resend.dev'
    ? authDomain
    : `TzDraft <noreply@${authDomain}>`;

const resend = new Resend(apiKey);

interface EmailCase {
  subject: string;
  html: () => Promise<string>;
}

async function buildCases(): Promise<EmailCase[]> {
  return [
    // ── 1. Tournament Registered ───────────────────────────────────────────
    {
      subject: '[Test] 1/8 – Tournament Registration Confirmed',
      html: () =>
        render(
          TournamentRegistered({
            name: 'Kayzo',
            tournamentName: 'TzDraft Open 2026',
            scheduledStartAt: 'Sun, 30 Mar 2026 14:00 EAT',
            format: 'SINGLE_ELIMINATION',
            style: 'RAPID',
          }),
        ),
    },

    // ── 2. Tournament Started ──────────────────────────────────────────────
    {
      subject: '[Test] 2/8 – Tournament Has Started',
      html: () =>
        render(
          TournamentStarted({
            name: 'Kayzo',
            tournamentName: 'TzDraft Open 2026',
            roundNumber: 1,
            matchesCount: 8,
          }),
        ),
    },

    // ── 3. Match Assigned ─────────────────────────────────────────────────
    {
      subject: '[Test] 3/8 – Match Assigned (Round 1)',
      html: () =>
        render(
          MatchAssigned({
            name: 'Kayzo',
            opponentDisplayName: 'DraughtsKing255',
            tournamentName: 'TzDraft Open 2026',
            roundNumber: 1,
            style: 'RAPID',
          }),
        ),
    },

    // ── 4. Match Result — Win ─────────────────────────────────────────────
    {
      subject: '[Test] 4/8 – Match Result: You Won!',
      html: () =>
        render(
          TournamentResult({
            name: 'Kayzo',
            tournamentName: 'TzDraft Open 2026',
            outcome: 'winner',
            score: '2-1',
            roundNumber: 1,
          }),
        ),
    },

    // ── 5. Match Result — Eliminated ──────────────────────────────────────
    {
      subject: '[Test] 5/8 – Match Result: Eliminated',
      html: () =>
        render(
          TournamentResult({
            name: 'Kayzo',
            tournamentName: 'TzDraft Open 2026',
            outcome: 'eliminated',
            score: '1-2',
            roundNumber: 2,
          }),
        ),
    },

    // ── 6. Tournament Completed — Champion ────────────────────────────────
    {
      subject: '[Test] 6/8 – Tournament Over: You\'re the Champion!',
      html: () =>
        render(
          TournamentResult({
            name: 'Kayzo',
            tournamentName: 'TzDraft Open 2026',
            outcome: 'completed',
            winnerDisplayName: 'Kayzo',
          }),
        ),
    },

    // ── 7. Tournament Completed — Non-champion ────────────────────────────
    {
      subject: '[Test] 7/8 – Tournament Over (not champion)',
      html: () =>
        render(
          TournamentResult({
            name: 'Kayzo',
            tournamentName: 'TzDraft Open 2026',
            outcome: 'completed',
            winnerDisplayName: 'DraughtsKing255',
          }),
        ),
    },

    // ── 8. Support confirmation (existing template sanity check) ──────────
    {
      subject: '[Test] 8/8 – Support Request Confirmation',
      html: () =>
        render(
          UserConfirmation({
            name: 'Kayzo',
            subject: 'Cannot join tournament',
          }),
        ),
    },
  ];
}

async function run() {
  const onlyArg = process.argv.find((a) => a.startsWith('--only='));
  const only = onlyArg
    ? new Set(onlyArg.replace('--only=', '').split(',').map(Number))
    : null;

  const allCases = await buildCases();
  const cases = only
    ? allCases.filter((_, i) => only.has(i + 1))
    : allCases;

  console.log(`\n📧  Sending ${cases.length} test email(s) to ${TO}\n`);

  let passed = 0;
  let failed = 0;

  for (const [i, { subject, html }] of cases.entries()) {
    try {
      const htmlContent = await html();
      const { error } = await resend.emails.send({
        from: FROM,
        to: [TO],
        subject,
        html: htmlContent,
      });

      if (error) {
        console.error(`  ❌  [${i + 1}/${cases.length}] FAILED  — ${subject}`);
        console.error(`       ${error.message}`);
        failed++;
      } else {
        console.log(`  ✅  [${i + 1}/${cases.length}] sent    — ${subject}`);
        passed++;
      }
    } catch (err: any) {
      console.error(`  ❌  [${i + 1}/${cases.length}] ERROR   — ${subject}`);
      console.error(`       ${err?.message}`);
      failed++;
    }

    // Small delay to avoid Resend rate limits
    await new Promise((r) => setTimeout(r, 300));
  }

  console.log(`\n─────────────────────────────────────────`);
  console.log(`  ✅  Passed : ${passed}`);
  if (failed > 0) console.log(`  ❌  Failed : ${failed}`);
  console.log(`─────────────────────────────────────────\n`);

  process.exit(failed > 0 ? 1 : 0);
}

run().catch((err) => {
  console.error('Unhandled error:', err);
  process.exit(1);
});
