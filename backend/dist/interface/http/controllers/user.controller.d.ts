import { UserService } from '../../../domain/user/user.service';
export declare class UserController {
    private userService;
    constructor(userService: UserService);
    searchUsers(query?: string): Promise<{
        id: string;
        username: string;
        displayName: string;
        rating: any;
        matchScore: number;
        isVerified: boolean;
    }[]>;
}
