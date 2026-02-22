import { Game } from '../entities/game.entity';
import { Winner } from '../../../shared/constants/game.constants';
import { UserService } from '../../user/user.service';
export declare class RatingService {
    private readonly userService;
    private readonly K_FACTOR;
    constructor(userService: UserService);
    updateRatings(game: Game, winner: Winner): Promise<void>;
    private calculateAndApply;
}
