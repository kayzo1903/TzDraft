import * as React from 'react';
import {
    Body, Button, Container, Head, Heading, Hr, Html, Preview, Section, Text, Link,
} from '@react-email/components';
import { emailTheme, sharedStyles as s } from './theme';

interface MatchAssignedProps {
    name: string;
    opponentDisplayName: string;
    tournamentName: string;
    roundNumber: number;
    style: string;
}

export const MatchAssigned = ({
    name,
    opponentDisplayName,
    tournamentName,
    roundNumber,
    style,
}: MatchAssignedProps) => (
    <Html lang="sw">
        <Head />
        <Preview>Mechi yako ya Raundi {String(roundNumber)} dhidi ya {opponentDisplayName} iko tayari — cheza sasa!</Preview>
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

                {/* Main card */}
                <Section style={s.card}>
                    <Text style={s.eyebrow}>Mechi Imepangwa · Raundi {String(roundNumber)}</Text>
                    <Heading style={s.h1}>Mechi Yako Iko Tayari!</Heading>
                    <Text style={s.body}>
                        Habari {name}, mechi yako ya Raundi {String(roundNumber)} katika{' '}
                        <strong style={{ color: emailTheme.colors.primary }}>{tournamentName}</strong>{' '}
                        imepangwa. Ubao umewekwa — fanya hatua yako.
                    </Text>

                    {/* VS matchup box */}
                    <Section style={{
                        backgroundColor: '#1c1917',
                        border: `1px solid ${emailTheme.colors.border}`,
                        borderRadius: '12px',
                        padding: '24px',
                        textAlign: 'center' as const,
                        margin: '20px 0',
                    }}>
                        <Text style={{ margin: '0 0 4px', fontSize: '11px', color: '#78716c', fontWeight: '700', letterSpacing: '0.15em', textTransform: 'uppercase' as const }}>
                            {tournamentName}
                        </Text>
                        <Section style={{ margin: '12px 0' }}>
                            <Text style={{ color: '#f97316', fontSize: '20px', fontWeight: '900', margin: '0', letterSpacing: '-0.5px' }}>
                                {name}
                            </Text>
                            <Text style={{ color: '#78716c', fontSize: '13px', fontWeight: '700', margin: '6px 0', letterSpacing: '0.15em' }}>
                                DHIDI YA
                            </Text>
                            <Text style={{ color: '#fbbf24', fontSize: '20px', fontWeight: '900', margin: '0', letterSpacing: '-0.5px' }}>
                                {opponentDisplayName}
                            </Text>
                        </Section>
                        <Text style={{ color: '#78716c', fontSize: '12px', margin: '12px 0 0', fontWeight: '600' }}>
                            {style} · Bora 3 kati ya 3
                        </Text>
                    </Section>

                    {/* Match info */}
                    <Section style={s.infoBox}>
                        <Text style={s.infoLine}>
                            <span style={s.infoLineLabel}>Raundi — </span>Raundi {String(roundNumber)}
                        </Text>
                        <Text style={{ ...s.infoLine, margin: '0' }}>
                            <span style={s.infoLineLabel}>Muda wa Mchezo — </span>{style}
                        </Text>
                    </Section>

                    {/* CTA */}
                    <Section style={s.buttonContainer}>
                        <Button style={s.button} href={emailTheme.appUrl}>
                            Cheza Sasa
                        </Button>
                    </Section>

                    <Hr style={s.hr} />

                    <Text style={s.hint}>
                        Kushindwa kucheza ndani ya muda uliowekwa kunaweza kusababisha kushindwa. Fungua TzDraft
                        haraka iwezekanavyo kuanza mechi yako.
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

export default MatchAssigned;
