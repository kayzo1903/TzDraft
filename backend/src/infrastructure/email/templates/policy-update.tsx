import * as React from 'react';
import {
  Body, Button, Container, Head, Heading, Hr, Html, Preview, Section, Text, Link,
} from '@react-email/components';
import { emailTheme, sharedStyles as s } from './theme';

interface PolicyUpdateProps {
  name: string;
  termsUrl: string;
  privacyUrl: string;
}

export const PolicyUpdate = ({ name, termsUrl, privacyUrl }: PolicyUpdateProps) => (
  <Html lang="sw">
    <Head />
    <Preview>Masharti ya Matumizi na Sera ya Faragha imesasishwa — tafadhali pitia</Preview>
    <Body style={s.main}>
      <Container style={s.container}>

        <Section style={s.topBar} />

        <Section style={s.header}>
          <Heading style={s.wordmark}>
            Tz<span style={{ color: '#fbbf24' }}>Draft</span>
          </Heading>
          <Text style={s.tagline}>Tanzania Draughts</Text>
        </Section>

        <Section style={s.card}>
          <Text style={s.eyebrow}>Taarifa ya Kisheria</Text>
          <Heading style={s.h1}>Masharti Yamesasishwa</Heading>

          <Text style={s.body}>
            Habari {name}, tumesasisha <strong style={{ color: emailTheme.colors.primary }}>Masharti ya Matumizi</strong> na{' '}
            <strong style={{ color: emailTheme.colors.primary }}>Sera ya Faragha</strong> ya TzDraft.
            Mabadiliko haya yanaanza kutumika tarehe{' '}
            <strong style={{ color: '#fafaf9' }}>24 Aprili 2026</strong>.
          </Text>

          <Section style={s.infoBox}>
            <Text style={{ ...s.infoLine, margin: '0 0 8px', fontWeight: '700', color: '#fafaf9' }}>
              Mabadiliko Makuu
            </Text>
            <Text style={s.infoLine}>
              <span style={s.infoLineLabel}>Sera ya Faragha — </span>
              Tunaeleza wazi data tunayokusanya, jinsi inavyotumiwa, na haki zako
            </Text>
            <Text style={s.infoLine}>
              <span style={s.infoLineLabel}>Masharti ya Matumizi — </span>
              Tumeongeza kanuni za mchezo wa haki, haki za miliki, na mipaka ya dhima
            </Text>
            <Text style={{ ...s.infoLine, margin: '0' }}>
              <span style={s.infoLineLabel}>Matangazo — </span>
              Tumeeleza jinsi matangazo yatakavyofanya kazi kwenye jukwaa
            </Text>
          </Section>

          <Text style={s.body}>
            Unapoendelea kutumia TzDraft, unakubaliana na masharti haya mapya.
            Tafadhali pitia hati zote kabla ya kuendelea.
          </Text>

          <Section style={{ ...s.buttonContainer, display: 'flex', gap: '12px' }}>
            <Button style={s.button} href={termsUrl}>
              Soma Masharti ya Matumizi
            </Button>
          </Section>

          <Section style={{ textAlign: 'center' as const, margin: '12px 0 8px' }}>
            <Link href={privacyUrl} style={{ color: '#f97316', fontSize: '14px', fontWeight: '600' }}>
              Soma Sera ya Faragha →
            </Link>
          </Section>

          <Hr style={s.hr} />

          <Text style={s.hint}>
            Ikiwa una maswali, wasiliana nasi kupitia{' '}
            <Link href="mailto:legal@tzdraft.com" style={{ color: '#78716c' }}>
              legal@tzdraft.com
            </Link>.
            Ukitaka kufuta akaunti yako, nenda Settings → Account → Delete Account.
          </Text>
        </Section>

        <Section style={s.footer}>
          <Text style={s.footerText}>
            © {new Date().getFullYear()} {emailTheme.companyName} · {emailTheme.location}
          </Text>
          <Section style={{ textAlign: 'center' as const, marginTop: '8px' }}>
            <Link href={termsUrl} style={s.footerLink}>Masharti</Link>
            <span style={s.footerDivider}>·</span>
            <Link href={privacyUrl} style={s.footerLink}>Faragha</Link>
            <span style={s.footerDivider}>·</span>
            <Link href={emailTheme.appUrl} style={s.footerLink}>TzDraft</Link>
          </Section>
        </Section>

      </Container>
    </Body>
  </Html>
);

export default PolicyUpdate;
