import * as React from 'react';
interface SupportNotificationProps {
    name: string;
    email: string;
    subject: string;
    message: string;
}
export declare const SupportNotification: ({ name, email, subject, message, }: SupportNotificationProps) => React.JSX.Element;
export default SupportNotification;
