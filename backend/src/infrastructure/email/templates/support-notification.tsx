import * as React from 'react';
import {
    Body,
    Container,
    Head,
    Heading,
    Hr,
    Html,
    Preview,
    Section,
    Text,
} from '@react-email/components';
import { emailTheme } from './theme';

interface SupportNotificationProps {
    name: string;
    email: string;
    subject: string;
    message: string;
}

export const SupportNotification = ({
    name,
    email,
    subject,
    message,
}: SupportNotificationProps) => (
    <Html>
        <Head />
        <Preview>New Support Ticket from {name}</Preview>
        <Body style={main}>
            <Container style={container}>
                <Section style={header}>
                    <Heading style={logo}>TzDraft</Heading>
                    <Text style={headerSub}>Internal Support Notification</Text>
                </Section>

                <Section style={contentContainer}>
                    <Heading style={h1}>New Support Request</Heading>

                    <Section style={infoBox}>
                        <Text style={infoLine}>
                            <strong>From:</strong> <span style={{ color: emailTheme.colors.primary }}>{name}</span>
                        </Text>
                        <Text style={infoLine}>
                            <strong>Email:</strong> <a href={`mailto:${email}`} style={{ color: emailTheme.colors.text, textDecoration: 'none' }}>{email}</a>
                        </Text>
                        <Text style={infoLine}>
                            <strong>Subject:</strong> {subject}
                        </Text>
                    </Section>

                    <Hr style={hr} />

                    <Text style={label}>Message:</Text>
                    <Section style={messageBox}>
                        <Text style={messageText}>{message}</Text>
                    </Section>
                </Section>

                <Text style={footer}>
                    Sent via {emailTheme.appName} System • {new Date().toLocaleString()}
                </Text>
            </Container>
        </Body>
    </Html>
);

const main = {
    backgroundColor: emailTheme.colors.background,
    fontFamily:
        '-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,Oxygen-Sans,Ubuntu,Cantarell,"Helvetica Neue",sans-serif',
};

const container = {
    margin: '0 auto',
    padding: '40px 20px',
    width: '100%',
    maxWidth: '600px',
};

const header = {
    textAlign: 'center' as const,
    marginBottom: '24px',
};

const logo = {
    color: emailTheme.colors.primary,
    fontSize: '24px',
    fontWeight: '800',
    margin: '0 0 8px',
    letterSpacing: '-0.5px',
};

const headerSub = {
    color: '#6b7280',
    fontSize: '14px',
    margin: '0',
    textTransform: 'uppercase' as const,
    letterSpacing: '1px',
    fontWeight: '600',
};

const contentContainer = {
    backgroundColor: '#111',
    borderRadius: '12px',
    border: `1px solid ${emailTheme.colors.border}`,
    padding: '32px',
    marginBottom: '24px',
};

const h1 = {
    color: emailTheme.colors.text,
    fontSize: '20px',
    fontWeight: '600',
    lineHeight: '1.3',
    margin: '0 0 24px',
    borderBottom: `1px solid ${emailTheme.colors.border}`,
    paddingBottom: '16px',
};

const infoBox = {
    marginBottom: '24px',
};

const infoLine = {
    color: emailTheme.colors.text,
    fontSize: '15px',
    margin: '0 0 8px',
};

const label = {
    color: '#9ca3af',
    fontSize: '14px',
    fontWeight: '600',
    textTransform: 'uppercase' as const,
    letterSpacing: '0.5px',
    marginBottom: '8px',
};

const messageBox = {
    backgroundColor: emailTheme.colors.secondary,
    borderRadius: '8px',
    padding: '16px',
    border: '1px solid #374151',
};

const messageText = {
    color: '#e5e7eb',
    fontSize: '15px',
    lineHeight: '1.6',
    margin: '0',
    whiteSpace: 'pre-wrap' as const,
};

const hr = {
    borderColor: emailTheme.colors.border,
    margin: '24px 0',
};

const footer = {
    color: '#6b7280',
    fontSize: '12px',
    textAlign: 'center' as const,
};

export default SupportNotification;
