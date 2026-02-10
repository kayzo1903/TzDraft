"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.UserConfirmation = void 0;
const React = __importStar(require("react"));
const components_1 = require("@react-email/components");
const theme_1 = require("./theme");
const UserConfirmation = ({ name }) => (React.createElement(components_1.Html, null,
    React.createElement(components_1.Head, null),
    React.createElement(components_1.Preview, null, "We received your support request"),
    React.createElement(components_1.Body, { style: main },
        React.createElement(components_1.Container, { style: container },
            React.createElement(components_1.Section, { style: header },
                React.createElement(components_1.Heading, { style: logo }, "TzDraft")),
            React.createElement(components_1.Section, { style: contentContainer },
                React.createElement(components_1.Heading, { style: h1 },
                    "Hello ",
                    name,
                    ","),
                React.createElement(components_1.Text, { style: text },
                    "Thank you for reaching out to ",
                    React.createElement("strong", null,
                        theme_1.emailTheme.appName,
                        " Support"),
                    ". We have received your message and our team is already reviewing it."),
                React.createElement(components_1.Text, { style: text }, "We aim to respond to all inquiries within 24 hours. While you wait, you might find the answer you're looking for in our Help Center."),
                React.createElement(components_1.Section, { style: btnContainer },
                    React.createElement(components_1.Button, { style: button, href: theme_1.emailTheme.companyUrl }, "Visit Help Center")),
                React.createElement(components_1.Hr, { style: hr }),
                React.createElement(components_1.Text, { style: subText }, "This is an automated response to confirm receipt of your message. Please do not reply to this email directly.")),
            React.createElement(components_1.Section, { style: footer },
                React.createElement(components_1.Text, { style: footerText },
                    "\u00A9 ",
                    new Date().getFullYear(),
                    " ",
                    theme_1.emailTheme.companyName,
                    ". All rights reserved."),
                React.createElement(components_1.Text, { style: footerText }, "Dar es Salaam, Tanzania"),
                React.createElement(components_1.Section, { style: { textAlign: 'center', marginTop: '12px' } },
                    React.createElement(components_1.Link, { href: theme_1.emailTheme.companyUrl, style: footerLink }, "Website"),
                    React.createElement("span", { style: { margin: '0 8px', color: '#666' } }, "\u2022"),
                    React.createElement(components_1.Link, { href: "#", style: footerLink }, "Privacy Policy"),
                    React.createElement("span", { style: { margin: '0 8px', color: '#666' } }, "\u2022"),
                    React.createElement(components_1.Link, { href: "#", style: footerLink }, "Terms of Service")))))));
exports.UserConfirmation = UserConfirmation;
const main = {
    backgroundColor: theme_1.emailTheme.colors.background,
    fontFamily: '-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,Oxygen-Sans,Ubuntu,Cantarell,"Helvetica Neue",sans-serif',
};
const container = {
    margin: '0 auto',
    padding: '40px 20px',
    width: '100%',
    maxWidth: '600px',
};
const header = {
    textAlign: 'center',
    marginBottom: '32px',
};
const logo = {
    color: theme_1.emailTheme.colors.primary,
    fontSize: '32px',
    fontWeight: '800',
    margin: '0',
    letterSpacing: '-1px',
};
const contentContainer = {
    backgroundColor: '#111',
    borderRadius: '12px',
    border: `1px solid ${theme_1.emailTheme.colors.border}`,
    padding: '40px',
    marginBottom: '32px',
};
const h1 = {
    color: theme_1.emailTheme.colors.text,
    fontSize: '24px',
    fontWeight: '600',
    lineHeight: '1.3',
    margin: '0 0 24px',
};
const text = {
    color: '#e5e7eb',
    fontSize: '16px',
    lineHeight: '1.6',
    marginBottom: '24px',
};
const subText = {
    color: '#9ca3af',
    fontSize: '14px',
    lineHeight: '1.5',
    margin: '0',
};
const btnContainer = {
    textAlign: 'center',
    marginBottom: '32px',
};
const button = {
    backgroundColor: theme_1.emailTheme.colors.primary,
    borderRadius: '8px',
    color: '#fff',
    fontSize: '16px',
    fontWeight: '600',
    textDecoration: 'none',
    textAlign: 'center',
    display: 'inline-block',
    padding: '12px 32px',
    boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)',
};
const hr = {
    borderColor: theme_1.emailTheme.colors.border,
    margin: '32px 0 24px',
};
const footer = {
    textAlign: 'center',
};
const footerText = {
    color: '#6b7280',
    fontSize: '13px',
    lineHeight: '1.5',
    margin: '4px 0',
};
const footerLink = {
    color: '#9ca3af',
    textDecoration: 'underline',
    fontSize: '13px',
};
exports.default = exports.UserConfirmation;
//# sourceMappingURL=user-confirmation.js.map