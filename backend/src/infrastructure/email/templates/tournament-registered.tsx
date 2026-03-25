import * as React from 'react';
import {
    Body, Button, Container, Head, Heading, Hr, Html, Preview, Section, Text, Link,
} from '@react-email/components';
import { emailTheme, sharedStyles as s } from './theme';

interface TournamentRegisteredProps {
    name: string;
    tournamentName: string;
    scheduledStartAt: string;
    format: string;
    style: string;
}

export const TournamentRegistered = ({
    name,
    tournamentName,
    scheduledStartAt,
    format,
    style,
}: TournamentRegisteredProps) => (
    <Html lang="sw">
        <Head />
        <Preview>Umesajiliwa kwenye {tournamentName} — nakutarajia ubaoní!</Preview>
        <Body style={s.main}>
            <Container style={s.container}>

                {/* Orange accent bar */}
                <Section style={s.topBar} />

                {/* Wordmark header */}
                <Section style={s.header}>
                    <Heading style={s.wordmark}>
                        Tz<span style={{ color: '#fbbf24' }}>Draft</span>
                    </Heading>
                    <Text style={s.tagline}>Tanzania Draughts</Text>
                </Section>

                {/* Main card */}
                <Section style={s.card}>
                    <Text style={s.eyebrow}>Usajili wa Mashindano</Text>
                    <Heading style={s.h1}>Umesajiliwa! 🎉</Heading>
                    <Text style={s.body}>
                        Habari {name}, usajili wako katika <strong style={{ color: emailTheme.colors.primary }}>{tournamentName}</strong> umethibitishwa.
                        Jiandae vizuri na ustudie mwanzo wa mchezo — wakati wa kushindana umefika.
                    </Text>

                    {/* Tournament details */}
                    <Section style={s.infoBox}>
                        <Text style={{ ...s.infoLine, margin: '0 0 8px', fontWeight: '700', color: '#fafaf9' }}>
                            Maelezo ya Mashindano
                        </Text>
                        <Text style={s.infoLine}>
                            <span style={s.infoLineLabel}>Mashindano — </span>{tournamentName}
                        </Text>
                        <Text style={s.infoLine}>
                            <span style={s.infoLineLabel}>Muundo — </span>{format.replace('_', ' ')}
                        </Text>
                        <Text style={s.infoLine}>
                            <span style={s.infoLineLabel}>Muda wa Mchezo — </span>{style}
                        </Text>
                        <Text style={{ ...s.infoLine, margin: '0' }}>
                            <span style={s.infoLineLabel}>Inaanza — </span>{scheduledStartAt}
                        </Text>
                    </Section>

                    {/* CTA */}
                    <Section style={s.buttonContainer}>
                        <Button style={s.button} href={emailTheme.appUrl}>
                            Fungua TzDraft
                        </Button>
                    </Section>

                    <Hr style={s.hr} />

                    <Text style={s.hint}>
                        Utaarifiwa kupitia barua pepe hii na programu mara mashindano yatakapoanza
                        na mechi yako ya kwanza itakapopangwa. Kaa mtandaoni!
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

export default TournamentRegistered;
