import { Injectable, Inject, NotFoundException } from '@nestjs/common';
import type { ITournamentRepository } from '../../../domain/tournament/repositories/tournament.repository.interface';
import { Tournament } from '../../../domain/tournament/entities/tournament.entity';
import { TournamentParticipant } from '../../../domain/tournament/entities/tournament-participant.entity';
import { TournamentRound } from '../../../domain/tournament/entities/tournament-round.entity';
import { TournamentMatch } from '../../../domain/tournament/entities/tournament-match.entity';
import { PrismaService } from '../../../infrastructure/database/prisma/prisma.service';

export interface TournamentParticipantView extends TournamentParticipant {
  displayName: string;
  username: string;
}

export interface TournamentDetail {
  tournament: Tournament;
  participants: TournamentParticipantView[];
  rounds: TournamentRound[];
  matches: TournamentMatch[];
}

@Injectable()
export class GetTournamentUseCase {
  constructor(
    @Inject('ITournamentRepository')
    private readonly repo: ITournamentRepository,
    private readonly prisma: PrismaService,
  ) {}

  async execute(id: string): Promise<TournamentDetail> {
    const tournament = await this.repo.findById(id);
    if (!tournament) throw new NotFoundException('Tournament not found');

    const [participants, rounds, matches] = await Promise.all([
      this.repo.findParticipantsByTournament(id),
      this.repo.findRoundsByTournament(id),
      this.repo.findMatchesByTournament(id),
    ]);

    const users = await this.prisma.user.findMany({
      where: {
        id: { in: participants.map((participant) => participant.userId) },
      },
      select: {
        id: true,
        displayName: true,
        username: true,
      },
    });

    const userMap = new Map(users.map((user) => [user.id, user]));
    const participantViews: TournamentParticipantView[] = participants.map(
      (participant) => {
        const user = userMap.get(participant.userId);
        return {
          ...participant,
          displayName: user?.displayName ?? participant.userId.slice(0, 8),
          username: user?.username ?? participant.userId.slice(0, 8),
        };
      },
    );

    return { tournament, participants: participantViews, rounds, matches };
  }
}
