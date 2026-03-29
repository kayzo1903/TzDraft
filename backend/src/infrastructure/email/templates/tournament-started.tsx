import * as React from 'react';
import {
    Body, Button, Container, Head, Heading, Hr, Html, Preview, Section, Text, Link,
} from '@react-email/components';
import { emailTheme, sharedStyles as s } from './theme';

interface TournamentStartedProps {
    name: string;
    tournamentName: string;
    roundNumber: number;
    matchesCount: number;
}

export const TournamentStarted = ({
    name,
    tournamentName,
    roundNumber,
    matchesCount,
}: TournamentStartedProps) => (
    <Html lang="sw">
        <Head />
        <Preview>{tournamentName} INAENDELEA — Raundi {String(roundNumber)} imeanza. Fungua TzDraft sasa!</Preview>
        <Body style={s.main}>
            <Container style={s.container}>

                {/* Orange accent bar */}
                <Section style={s.topBar} />

                {/* Wordmark */}
                <Section style={s.header}>
                    <Heading style={s.wordmark}>
                        Tz<span style={{ color: '#fbbf24' }}>Draft</span>
                    </Heading>
                    <Text style={s.tagline}>Tanzania Draughts</Text>
                </Section>

                {/* Hero callout — board-inspired orange strip */}
                <Section style={{
                    background: 'linear-gradient(135deg, #9a3412 0%, #c2410c 40%, #f97316 100%)',
                    borderRadius: '12px',
                    margin: '0 20px 8px',
                    padding: '28px 36px',
                    textAlign: 'center' as const,
                }}>
                    <Text style={{ color: '#fbbf24', fontSize: '11px', fontWeight: '800', letterSpacing: '0.2em', textTransform: 'uppercase' as const, margin: '0 0 8px' }}>
                        Mashindano Yanaendelea
                    </Text>
                    <Heading style={{ color: '#ffffff', fontSize: '26px', fontWeight: '900', margin: '0 0 4px', letterSpacing: '-0.5px' }}>
                        Raundi {String(roundNumber)} Imeanza!
                    </Heading>
                    <Text style={{ color: '#fed7aa', fontSize: '14px', margin: '0', fontWeight: '500' }}>
                        Mechi {String(matchesCount)} zinaendelea
                    </Text>
                </Section>

                {/* Main card */}
                <Section style={{ ...s.card, marginTop: '8px' }}>
                    <Text style={s.body}>
                        Habari {name}, <strong style={{ color: '#fafaf9' }}>{tournamentName}</strong> inaendelea sasa.
                        Mechi yako inafanyiwa utaratibu — fungua TzDraft kuona mpinzani wako na kuanza kucheza.
                    </Text>

                    <Section style={s.callout(emailTheme.colors.primary, '#2c1a0e')}>
                        <Text style={{ color: emailTheme.colors.primary, fontSize: '14px', fontWeight: '700', margin: '0 0 4px' }}>
                            Hatua Inahitajika
                        </Text>
                        <Text style={{ color: '#d6d3d1', fontSize: '14px', margin: '0', lineHeight: '1.5' }}>
                            Utapokea taarifa nyingine mechi yako maalum itakapopangwa.
                            Jiandae kucheza!
                        </Text>
                    </Section>

                    {/* CTA */}
                    <Section style={s.buttonContainer}>
                        <Button style={s.button} href={emailTheme.appUrl}>
                            Nenda Mashindanoni
                        </Button>
                    </Section>

                    <Hr style={s.hr} />

                    <Text style={s.hint}>
                        Kushindwa kucheza mechi yako iliyopangwa ndani ya muda uliowekwa kunaweza kusababisha kushindwa.
                        Hakikisha uko mtandaoni na uko tayari.
                    </Text>
                </Section>

                {/* Footer */}
                <Section style={s.footer}>
                    <Text style={s.footerText}>
                        © {new Date().getFullYear()} {emailTheme.companyName} · {emailTheme.location}
                    </Text>
                    <Section style={{ textAlign: 'center' as const, marginTop: '8px' }}>
                        <Link href={emailTheme.appUrl} style={s.footerLink}>TzDraft</Link>
                        <span style={s.footerDivider}>·</span>
                        <Link href={emailTheme.companyUrl} style={s.footerLink}>{emailTheme.companyName}</Link>
                    </Section>
                </Section>

            </Container>
        </Body>
    </Html>
);

export default TournamentStarted;
