import type { ExecutionContext } from '@nestjs/common';
declare const GoogleOAuthGuard_base: import("@nestjs/passport").Type<import("@nestjs/passport").IAuthGuard>;
export declare class GoogleOAuthGuard extends GoogleOAuthGuard_base {
    getAuthenticateOptions(context: ExecutionContext): {
        session: boolean;
        failureRedirect: string;
    };
}
export {};
