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
exports.SupportNotification = void 0;
const React = __importStar(require("react"));
const components_1 = require("@react-email/components");
const theme_1 = require("./theme");
const SupportNotification = ({ name, email, subject, message, }) => (React.createElement(components_1.Html, null,
    React.createElement(components_1.Head, null),
    React.createElement(components_1.Preview, null,
        "New Support Ticket from ",
        name),
    React.createElement(components_1.Body, { style: main },
        React.createElement(components_1.Container, { style: container },
            React.createElement(components_1.Section, { style: header },
                React.createElement(components_1.Heading, { style: logo }, "TzDraft"),
                React.createElement(components_1.Text, { style: headerSub }, "Internal Support Notification")),
            React.createElement(components_1.Section, { style: contentContainer },
                React.createElement(components_1.Heading, { style: h1 }, "New Support Request"),
                React.createElement(components_1.Section, { style: infoBox },
                    React.createElement(components_1.Text, { style: infoLine },
                        React.createElement("strong", null, "From:"),
                        " ",
                        React.createElement("span", { style: { color: theme_1.emailTheme.colors.primary } }, name)),
                    React.createElement(components_1.Text, { style: infoLine },
                        React.createElement("strong", null, "Email:"),
                        " ",
                        React.createElement("a", { href: `mailto:${email}`, style: { color: theme_1.emailTheme.colors.text, textDecoration: 'none' } }, email)),
                    React.createElement(components_1.Text, { style: infoLine },
                        React.createElement("strong", null, "Subject:"),
                        " ",
                        subject)),
                React.createElement(components_1.Hr, { style: hr }),
                React.createElement(components_1.Text, { style: label }, "Message:"),
                React.createElement(components_1.Section, { style: messageBox },
                    React.createElement(components_1.Text, { style: messageText }, message))),
            React.createElement(components_1.Text, { style: footer },
                "Sent via ",
                theme_1.emailTheme.appName,
                " System \u2022 ",
                new Date().toLocaleString())))));
exports.SupportNotification = SupportNotification;
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
    marginBottom: '24px',
};
const logo = {
    color: theme_1.emailTheme.colors.primary,
    fontSize: '24px',
    fontWeight: '800',
    margin: '0 0 8px',
    letterSpacing: '-0.5px',
};
const headerSub = {
    color: '#6b7280',
    fontSize: '14px',
    margin: '0',
    textTransform: 'uppercase',
    letterSpacing: '1px',
    fontWeight: '600',
};
const contentContainer = {
    backgroundColor: '#111',
    borderRadius: '12px',
    border: `1px solid ${theme_1.emailTheme.colors.border}`,
    padding: '32px',
    marginBottom: '24px',
};
const h1 = {
    color: theme_1.emailTheme.colors.text,
    fontSize: '20px',
    fontWeight: '600',
    lineHeight: '1.3',
    margin: '0 0 24px',
    borderBottom: `1px solid ${theme_1.emailTheme.colors.border}`,
    paddingBottom: '16px',
};
const infoBox = {
    marginBottom: '24px',
};
const infoLine = {
    color: theme_1.emailTheme.colors.text,
    fontSize: '15px',
    margin: '0 0 8px',
};
const label = {
    color: '#9ca3af',
    fontSize: '14px',
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: '0.5px',
    marginBottom: '8px',
};
const messageBox = {
    backgroundColor: theme_1.emailTheme.colors.secondary,
    borderRadius: '8px',
    padding: '16px',
    border: '1px solid #374151',
};
const messageText = {
    color: '#e5e7eb',
    fontSize: '15px',
    lineHeight: '1.6',
    margin: '0',
    whiteSpace: 'pre-wrap',
};
const hr = {
    borderColor: theme_1.emailTheme.colors.border,
    margin: '24px 0',
};
const footer = {
    color: '#6b7280',
    fontSize: '12px',
    textAlign: 'center',
};
exports.default = exports.SupportNotification;
//# sourceMappingURL=support-notification.js.map