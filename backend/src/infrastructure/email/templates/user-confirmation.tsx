import * as React from 'react';
import {
    Body,
    Button,
    Container,
    Head,
    Heading,
    Hr,
    Html,
    Img,
    Link,
    Preview,
    Section,
    Text,
} from '@react-email/components';
import { emailTheme } from './theme';

interface UserConfirmationProps {
    name: string;
}

export const UserConfirmation = ({ name }: UserConfirmationProps) => (
    <Html>
        <Head />
        <Preview>We received your support request</Preview>
        <Body style={main}>
            <Container style={container}>
                {/* Header */}
                <Section style={header}>
                    <Heading style={logo}>TzDraft</Heading>
                </Section>

                <Section style={contentContainer}>
                    <Heading style={h1}>Hello {name},</Heading>
                    <Text style={text}>
                        Thank you for reaching out to <strong>{emailTheme.appName} Support</strong>. We have received your message and our team is already reviewing it.
                    </Text>
                    <Text style={text}>
                        We aim to respond to all inquiries within 24 hours. While you wait, you might find the answer you're looking for in our Help Center.
                    </Text>

                    <Section style={btnContainer}>
                        <Button style={button} href={emailTheme.companyUrl}>
                            Visit Help Center
                        </Button>
                    </Section>

                    <Hr style={hr} />

                    <Text style={subText}>
                        This is an automated response to confirm receipt of your message. Please do not reply to this email directly.
                    </Text>
                </Section>

                {/* Footer */}
                <Section style={footer}>
                    <Text style={footerText}>
                        © {new Date().getFullYear()} {emailTheme.companyName}. All rights reserved.
                    </Text>
                    <Text style={footerText}>
                        Dar es Salaam, Tanzania
                    </Text>
                    <Section style={{ textAlign: 'center' as const, marginTop: '12px' }}>
                        <Link href={emailTheme.companyUrl} style={footerLink}>Website</Link>
                        <span style={{ margin: '0 8px', color: '#666' }}>•</span>
                        <Link href="#" style={footerLink}>Privacy Policy</Link>
                        <span style={{ margin: '0 8px', color: '#666' }}>•</span>
                        <Link href="#" style={footerLink}>Terms of Service</Link>
                    </Section>
                </Section>
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
    marginBottom: '32px',
};

const logo = {
    color: emailTheme.colors.primary,
    fontSize: '32px',
    fontWeight: '800',
    margin: '0',
    letterSpacing: '-1px',
};

const contentContainer = {
    backgroundColor: '#111',
    borderRadius: '12px',
    border: `1px solid ${emailTheme.colors.border}`,
    padding: '40px',
    marginBottom: '32px',
};

const h1 = {
    color: emailTheme.colors.text,
    fontSize: '24px',
    fontWeight: '600',
    lineHeight: '1.3',
    margin: '0 0 24px',
};

const text = {
    color: '#e5e7eb', // gray-200
    fontSize: '16px',
    lineHeight: '1.6',
    marginBottom: '24px',
};

const subText = {
    color: '#9ca3af', // gray-400
    fontSize: '14px',
    lineHeight: '1.5',
    margin: '0',
};

const btnContainer = {
    textAlign: 'center' as const,
    marginBottom: '32px',
};

const button = {
    backgroundColor: emailTheme.colors.primary,
    borderRadius: '8px',
    color: '#fff',
    fontSize: '16px',
    fontWeight: '600',
    textDecoration: 'none',
    textAlign: 'center' as const,
    display: 'inline-block',
    padding: '12px 32px',
    boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)',
};

const hr = {
    borderColor: emailTheme.colors.border,
    margin: '32px 0 24px',
};

const footer = {
    textAlign: 'center' as const,
};

const footerText = {
    color: '#6b7280', // gray-500
    fontSize: '13px',
    lineHeight: '1.5',
    margin: '4px 0',
};

const footerLink = {
    color: '#9ca3af',
    textDecoration: 'underline',
    fontSize: '13px',
};

export default UserConfirmation;
