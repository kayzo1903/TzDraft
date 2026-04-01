import * as React from 'react';
import {
    Body, Button, Container, Head, Heading, Hr, Html, Preview, Section, Text, Link,
} from '@react-email/components';
import { emailTheme, sharedStyles as s } from './theme';

interface TournamentResultProps {
    name: string;
    tournamentName: string;
    outcome: 'winner' | 'eliminated' | 'completed';
    score?: string;
    winnerDisplayName?: string;
    roundNumber?: number;
}

export const TournamentResult = ({
    name,
    tournamentName,
    outcome,
    score,
    winnerDisplayName,
    roundNumber,
}: TournamentResultProps) => {
    const isWinner = outcome === 'winner';
    const isEliminated = outcome === 'eliminated';
    const isCompleted = outcome === 'completed';
    const isSelfChampion = isCompleted && winnerDisplayName === name;

    const previewText = isWinner
        ? `Umeshinda Raundi ${roundNumber} katika ${tournamentName} — unaendelea!`
        : isEliminated
        ? `Safari yako katika ${tournamentName} imekwisha. Hongera kwa juhudi!`
        : isSelfChampion
        ? `Hongera Bingwa! Umeshinda ${tournamentName}!`
        : `${tournamentName} imekwisha — ${winnerDisplayName} ndiye bingwa!`;

    // Hero gradient config per outcome
    const heroGradient = isWinner
        ? 'linear-gradient(135deg, #14532d 0%, #166534 50%, #15803d 100%)'
        : isEliminated
        ? 'linear-gradient(135deg, #3b0764 0%, #4c1d95 50%, #5b21b6 100%)'
        : isSelfChampion
        ? 'linear-gradient(135deg, #78350f 0%, #92400e 40%, #b45309 100%)'
        : 'linear-gradient(135deg, #1c1917 0%, #292524 100%)';

    const heroAccent = isWinner ? '#86efac' : isEliminated ? '#c4b5fd' : '#fcd34d';
    const heroTitle = isWinner
        ? 'Unaendelea!'
        : isEliminated
        ? 'Umetolewa'
        : isSelfChampion
        ? '🏆 Bingwa!'
        : 'Mashindano Yamekwisha';

    return (
        <Html lang="en">
            <Head />
            <Preview children={previewText} />
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

                    {/* Outcome hero */}
                    <Section style={{
                        background: heroGradient,
                        borderRadius: '12px',
                        margin: '0 20px 8px',
                        padding: '28px 36px',
                        textAlign: 'center' as const,
                    }}>
                        <Text style={{ color: heroAccent, fontSize: '11px', fontWeight: '800', letterSpacing: '0.2em', textTransform: 'uppercase' as const, margin: '0 0 8px' }}>
                            {isWinner ? 'Matokeo ya Mechi' : isEliminated ? 'Matokeo ya Mechi' : 'Matokeo ya Mwisho'}
                        </Text>
                        <Text style={{ color: '#ffffff', fontSize: '28px', fontWeight: '900', margin: '0 0 4px', letterSpacing: '-0.5px', lineHeight: '1.2' }}>
                            {heroTitle}
                        </Text>
                        {score && (
                            <Text style={{ color: heroAccent, fontSize: '18px', fontWeight: '800', margin: '0', letterSpacing: '0.05em' }}>
                                {score}
                            </Text>
                        )}
                    </Section>

                    {/* Main card */}
                    <Section style={{ ...s.card, marginTop: '8px' }}>

                        {/* Winner path */}
                        {isWinner && (
                            <>
                                <Text style={s.eyebrow}>Raundi {roundNumber != null ? String(roundNumber) : ''} Imekamilika</Text>
                                <Heading style={{ ...s.h1, color: emailTheme.colors.success }}>
                                    Umecheza Vizuri, {name}!
                                </Heading>
                                <Text style={s.body}>
                                    Umeshinda mechi ya Raundi {roundNumber != null ? String(roundNumber) : ''} katika{' '}
                                    <strong style={{ color: emailTheme.colors.primary }}>{tournamentName}</strong>
                                    {score ? ` (${score})` : ''}. Unaendelea hadi raundi inayofuata — endelea na nguvu hiyo!
                                </Text>
                                <Section style={{
                                    backgroundColor: emailTheme.colors.successBg,
                                    border: `1px solid ${emailTheme.colors.success}33`,
                                    borderRadius: '10px',
                                    padding: '16px 20px',
                                    margin: '16px 0',
                                    textAlign: 'center' as const,
                                }}>
                                    <Text style={{ color: emailTheme.colors.success, fontSize: '16px', fontWeight: '800', margin: '0' }}>
                                        ✓ Unaendelea hadi Raundi Inayofuata
                                    </Text>
                                </Section>
                                <Section style={s.buttonContainer}>
                                    <Button style={s.button} href={emailTheme.appUrl}>Endelea na Mechi Inayofuata</Button>
                                </Section>
                            </>
                        )}

                        {/* Eliminated path */}
                        {isEliminated && (
                            <>
                                <Text style={s.eyebrow}>Matokeo ya Mechi</Text>
                                <Heading style={s.h1}>Usikate Tamaa, {name}</Heading>
                                <Text style={s.body}>
                                    Safari yako katika{' '}
                                    <strong style={{ color: emailTheme.colors.primary }}>{tournamentName}</strong>{' '}
                                    imekwisha{score ? ` (${score})` : ''}. Kila mechi ni somo — kagua michezo yako,
                                    fanya mazoezi, na urudi imara zaidi kwenye mashindano yajayo.
                                </Text>
                                <Section style={{
                                    backgroundColor: '#1c0a0a',
                                    border: '1px solid #ef444433',
                                    borderRadius: '10px',
                                    padding: '16px 20px',
                                    margin: '16px 0',
                                    textAlign: 'center' as const,
                                }}>
                                    <Text style={{ color: '#ffffff', fontSize: '15px', fontWeight: '700', margin: '0' }}>
                                        Umetolewa mashindanoni
                                    </Text>
                                </Section>
                                <Section style={s.buttonContainer}>
                                    <Button style={s.button} href={emailTheme.appUrl}>Fanya Mazoezi &amp; Boresha</Button>
                                </Section>
                            </>
                        )}

                        {/* Tournament completed path */}
                        {isCompleted && (
                            <>
                                <Text style={s.eyebrow}>Mashindano Yamekamilika</Text>
                                <Heading style={s.h1}>
                                    {isSelfChampion ? `Hongera Sana, Bingwa ${name}!` : `${tournamentName} Imekwisha`}
                                </Heading>
                                <Text style={s.body}>
                                    {isSelfChampion
                                        ? `Wewe ndiye bingwa wa ${tournamentName}! Mchezo bora kutoka mwanzo hadi mwisho. Tanzania Draughts inakujivunia.`
                                        : `${tournamentName} imekamilika. ${winnerDisplayName ? `Bingwa ni ${winnerDisplayName}.` : ''} Asante kwa kushiriki — tutaonana kwenye mashindano yajayo!`
                                    }
                                </Text>
                                <Section style={{
                                    backgroundColor: emailTheme.colors.goldBg,
                                    border: `1px solid ${emailTheme.colors.gold}44`,
                                    borderRadius: '10px',
                                    padding: '16px 20px',
                                    margin: '16px 0',
                                    textAlign: 'center' as const,
                                }}>
                                    <Text style={{ color: '#d97706', fontSize: '11px', fontWeight: '700', margin: '0 0 4px', letterSpacing: '0.1em', textTransform: 'uppercase' as const }}>
                                        Bingwa
                                    </Text>
                                    <Text style={{ color: '#ffffff', fontSize: '20px', fontWeight: '900', margin: '0', letterSpacing: '-0.3px' }}>
                                        🏆 {winnerDisplayName ?? 'Hajulikani'}
                                    </Text>
                                </Section>
                                <Section style={s.buttonContainer}>
                                    <Button style={s.button} href={emailTheme.appUrl}>Tazama Matokeo ya Mwisho</Button>
                                </Section>
                            </>
                        )}

                        <Hr style={s.hr} />
                        <Text style={s.hint}>
                            Tembelea TzDraft kukagua jedwali kamili, kurudia michezo yako, na kuangalia mashindano yajayo.
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
};

export default TournamentResult;
