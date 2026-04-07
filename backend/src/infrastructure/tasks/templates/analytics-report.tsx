import * as React from 'react';
import {
    Body, Container, Head, Heading, Hr, Html, Preview, Section, Text, Link,
} from '@react-email/components';
import { emailTheme, sharedStyles as s } from '../../email/templates/theme';

interface AnalyticsReportProps {
    reportType?: 'Daily' | 'Weekly' | 'Monthly';
    generatedAt: string;
    overview: {
        totalUsers: number;
        totalRegisteredUsers: number;
        activeGames: number;
        totalGames: number;
        totalMatchmakingSearches: number;
        totalTournamentParticipants: number;
        totalTournamentGames: number;
        dailyVisits: number;
        dailyGuestUsers: number;
        dailyRegisteredRevisits: number;
        dailyAiGames: number;
        dailyMatchmakingSearches: number;
        dailyMatchPairings: number;
        dailyFriendMatches: number;
    };
    liveBreakdown: {
        ranked: number;
        casual: number;
        ai: number;
        tournament: number;
        friend: number;
    };
    windows: Array<{
        days: number;
        visits: number;
        guestUsers: number;
        revisitUsers: number;
        aiGames: number;
        gamesPlayed: number;
        friendGamesPlayed: number;
        matchPairings: number;
        searches: number;
        matchedSearches: number;
        expiredSearches: number;
        newRegisteredUsers: number;
        tournamentParticipants: number;
        tournamentGamesPlayed: number;
    }>;
}

export const AnalyticsReport = ({
    reportType = 'Daily',
    generatedAt,
    overview,
    liveBreakdown,
    windows,
}: AnalyticsReportProps) => {
    const reportDate = new Date(generatedAt).toLocaleDateString('en-US', {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric',
    });

    const formatNumber = (num: number) => new Intl.NumberFormat('en-US').format(num);

    const isDaily = reportType === 'Daily';
    
    // Choose the target window for "Highlights" based on reportType
    const targetDays = isDaily ? 1 : (reportType === 'Weekly' ? 7 : 30);
    const windowStats = windows.find(w => w.days === targetDays) || windows[0];

    return (
        <Html lang="en">
            <Head />
            <Preview children={`TzDraft ${reportType} Analytics Report - ${reportDate}`} />
            <Body style={s.main}>
                <Container style={s.container}>

                    {/* Orange accent bar */}
                    <Section style={s.topBar} />

                    {/* Wordmark header */}
                    <Section style={s.header}>
                        <Heading style={s.wordmark}>
                            Tz<span style={{ color: '#fbbf24' }}>Draft</span>
                        </Heading>
                        <Text style={s.tagline}>{reportType} Analytics Report</Text>
                    </Section>

                    {/* Main card */}
                    <Section style={s.card}>
                        <Text style={s.eyebrow}>{reportType} Report</Text>
                        <Heading style={s.h1}>{reportDate}</Heading>
                        <Text style={s.body}>
                            Here's your {reportType.toLowerCase()} TzDraft analytics summary. All metrics exclude admin activity.
                        </Text>

                        {/* Highlights */}
                        <Section style={{ margin: '24px 0' }}>
                            <Heading style={{ ...s.h2, marginBottom: '16px' }}>📊 {reportType} Highlights</Heading>
                            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '12px' }}>
                                <div style={s.metricBox}>
                                    <Text style={s.metricLabel}>New Visits</Text>
                                    <Text style={s.metricValue}>{formatNumber(isDaily ? overview.dailyVisits : windowStats.visits)}</Text>
                                </div>
                                <div style={s.metricBox}>
                                    <Text style={s.metricLabel}>Guest Users</Text>
                                    <Text style={s.metricValue}>{formatNumber(isDaily ? overview.dailyGuestUsers : windowStats.guestUsers)}</Text>
                                </div>
                                <div style={s.metricBox}>
                                    <Text style={s.metricLabel}>Registered Revisits</Text>
                                    <Text style={s.metricValue}>{formatNumber(isDaily ? overview.dailyRegisteredRevisits : windowStats.revisitUsers)}</Text>
                                </div>
                                <div style={s.metricBox}>
                                    <Text style={s.metricLabel}>AI Games</Text>
                                    <Text style={s.metricValue}>{formatNumber(isDaily ? overview.dailyAiGames : windowStats.aiGames)}</Text>
                                </div>
                                <div style={s.metricBox}>
                                    <Text style={s.metricLabel}>{reportType} Searches</Text>
                                    <Text style={s.metricValue}>{formatNumber(isDaily ? overview.dailyMatchmakingSearches : windowStats.searches)}</Text>
                                </div>
                                <div style={s.metricBox}>
                                    <Text style={s.metricLabel}>Match Pairings</Text>
                                    <Text style={s.metricValue}>{formatNumber(isDaily ? overview.dailyMatchPairings : windowStats.matchPairings)}</Text>
                                </div>
                                <div style={s.metricBox}>
                                    <Text style={s.metricLabel}>Friend Matches</Text>
                                    <Text style={s.metricValue}>{formatNumber(isDaily ? overview.dailyFriendMatches : windowStats.friendGamesPlayed)}</Text>
                                </div>
                                {!isDaily && (
                                    <div style={s.metricBox}>
                                        <Text style={s.metricLabel}>New Registered</Text>
                                        <Text style={s.metricValue}>{formatNumber(windowStats.newRegisteredUsers)}</Text>
                                    </div>
                                )}
                            </div>
                        </Section>

                        {/* Live Games Breakdown (Relevant for all reports, good to see current state) */}
                        <Section style={{ margin: '24px 0' }}>
                            <Heading style={{ ...s.h2, marginBottom: '16px' }}>🎮 Live Games Right Now</Heading>
                            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '12px' }}>
                                <div style={s.metricBox}>
                                    <Text style={s.metricLabel}>Ranked</Text>
                                    <Text style={s.metricValue}>{formatNumber(liveBreakdown.ranked)}</Text>
                                </div>
                                <div style={s.metricBox}>
                                    <Text style={s.metricLabel}>Casual</Text>
                                    <Text style={s.metricValue}>{formatNumber(liveBreakdown.casual)}</Text>
                                </div>
                                <div style={s.metricBox}>
                                    <Text style={s.metricLabel}>vs AI</Text>
                                    <Text style={s.metricValue}>{formatNumber(liveBreakdown.ai)}</Text>
                                </div>
                                <div style={s.metricBox}>
                                    <Text style={s.metricLabel}>Tournament</Text>
                                    <Text style={s.metricValue}>{formatNumber(liveBreakdown.tournament)}</Text>
                                </div>
                                <div style={s.metricBox}>
                                    <Text style={s.metricLabel}>Friend</Text>
                                    <Text style={s.metricValue}>{formatNumber(liveBreakdown.friend)}</Text>
                                </div>
                                <div style={s.metricBox}>
                                    <Text style={s.metricLabel}>Total Active</Text>
                                    <Text style={s.metricValue}>{formatNumber(overview.activeGames)}</Text>
                                </div>
                            </div>
                        </Section>

                        {/* Trend sections depending on report type */}
                        {isDaily && (
                            <Section style={{ margin: '24px 0' }}>
                                <Heading style={{ ...s.h2, marginBottom: '16px' }}>📈 7-Day Trends</Heading>
                                {windows.filter(w => w.days === 7).map(window => (
                                    <div key={window.days} style={{ marginBottom: '16px' }}>
                                        <Text style={{ fontSize: '14px', color: '#9ca3af', marginBottom: '8px' }}>
                                            Last 7 days (rolling totals)
                                        </Text>
                                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '8px' }}>
                                            <div style={s.smallMetricBox}>
                                                <Text style={s.smallMetricLabel}>Visits</Text>
                                                <Text style={s.smallMetricValue}>{formatNumber(window.visits)}</Text>
                                            </div>
                                            <div style={s.smallMetricBox}>
                                                <Text style={s.smallMetricLabel}>AI Games</Text>
                                                <Text style={s.smallMetricValue}>{formatNumber(window.aiGames)}</Text>
                                            </div>
                                            <div style={s.smallMetricBox}>
                                                <Text style={s.smallMetricLabel}>Pairings</Text>
                                                <Text style={s.smallMetricValue}>{formatNumber(window.matchPairings)}</Text>
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </Section>
                        )}
                        {!isDaily && (
                            <Section style={{ margin: '24px 0' }}>
                                <Heading style={{ ...s.h2, marginBottom: '16px' }}>📈 30-Day Trends</Heading>
                                {windows.filter(w => w.days === 30).map(window => (
                                    <div key={window.days} style={{ marginBottom: '16px' }}>
                                        <Text style={{ fontSize: '14px', color: '#9ca3af', marginBottom: '8px' }}>
                                            Last 30 days (rolling totals)
                                        </Text>
                                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '8px' }}>
                                            <div style={s.smallMetricBox}>
                                                <Text style={s.smallMetricLabel}>Visits</Text>
                                                <Text style={s.smallMetricValue}>{formatNumber(window.visits)}</Text>
                                            </div>
                                            <div style={s.smallMetricBox}>
                                                <Text style={s.smallMetricLabel}>AI Games</Text>
                                                <Text style={s.smallMetricValue}>{formatNumber(window.aiGames)}</Text>
                                            </div>
                                            <div style={s.smallMetricBox}>
                                                <Text style={s.smallMetricLabel}>Pairings</Text>
                                                <Text style={s.smallMetricValue}>{formatNumber(window.matchPairings)}</Text>
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </Section>
                        )}

                        {/* Overall Stats */}
                        <Section style={{ margin: '24px 0' }}>
                            <Heading style={{ ...s.h2, marginBottom: '16px' }}>📊 Overall Platform Stats</Heading>
                            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '12px' }}>
                                <div style={s.metricBox}>
                                    <Text style={s.metricLabel}>Total Users</Text>
                                    <Text style={s.metricValue}>{formatNumber(overview.totalUsers)}</Text>
                                </div>
                                <div style={s.metricBox}>
                                    <Text style={s.metricLabel}>Registered Users</Text>
                                    <Text style={s.metricValue}>{formatNumber(overview.totalRegisteredUsers)}</Text>
                                </div>
                                <div style={s.metricBox}>
                                    <Text style={s.metricLabel}>Total Games</Text>
                                    <Text style={s.metricValue}>{formatNumber(overview.totalGames)}</Text>
                                </div>
                                <div style={s.metricBox}>
                                    <Text style={s.metricLabel}>Tournament Games</Text>
                                    <Text style={s.metricValue}>{formatNumber(overview.totalTournamentGames)}</Text>
                                </div>
                            </div>
                        </Section>

                        <Hr style={s.hr} />

                        <Text style={{ ...s.body, fontSize: '12px', color: '#6b7280', textAlign: 'center' }}>
                            This report was generated at {new Date(generatedAt).toLocaleTimeString('en-US', {
                                hour: '2-digit',
                                minute: '2-digit',
                                timeZone: 'Africa/Dar_es_Salaam'
                            })} EAT
                        </Text>
                    </Section>

                    {/* Footer */}
                    <Section style={s.footer}>
                        <Text style={s.footerText}>
                            TzDraft Analytics • <Link href="https://tzdraft.com/admin" style={s.footerLink}>View Full Dashboard</Link>
                        </Text>
                    </Section>
                </Container>
            </Body>
        </Html>
    );
};