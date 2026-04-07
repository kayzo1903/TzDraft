import { Injectable } from '@nestjs/common';
import { PrismaService } from '../database/prisma/prisma.service';
import { ILeagueRepository } from '../../domain/league/repositories/i-league.repository';
import { League, LeagueStatus } from '../../domain/league/entities/league.entity';
import { LeagueParticipant, LeagueParticipantStatus } from '../../domain/league/entities/league-participant.entity';
import { LeagueRound, LeagueRoundStatus } from '../../domain/league/entities/league-round.entity';
import { LeagueMatch, LeagueMatchStatus, LeagueMatchResult } from '../../domain/league/entities/league-match.entity';
import { LeagueGame, LeagueGameStatus, LeagueGameResult } from '../../domain/league/entities/league-game.entity';

@Injectable()
export class PrismaLeagueRepository implements ILeagueRepository {
  constructor(private readonly prisma: PrismaService) {}

  private mapLeague(row: any): League {
    return new League(
      row.id, row.name, row.status as LeagueStatus, row.currentRound, 
      row.maxPlayers, row.roundDurationDays, row.createdById, row.createdAt,
      row.startDate, row.endDate
    );
  }

  private mapParticipant(row: any): LeagueParticipant {
    return new LeagueParticipant(
      row.id, row.leagueId, row.userId, row.status as LeagueParticipantStatus,
      row.matchPoints, row.matchWins, row.matchDraws, row.matchLosses,
      row.matchesPlayed, row.consecutiveMissed, Number(row.goalsFor), 
      Number(row.goalsAgainst), Number(row.goalDifference), row.registeredAt
    );
  }

  private mapRound(row: any): LeagueRound {
    return new LeagueRound(row.id, row.leagueId, row.roundNumber, row.status as LeagueRoundStatus, row.deadline);
  }

  private mapMatch(row: any): LeagueMatch {
    const match = new LeagueMatch(
      row.id, row.leagueId, row.roundId, row.player1Id, row.player2Id,
      row.status as LeagueMatchStatus, row.result as LeagueMatchResult,
      Number(row.player1Goals), Number(row.player2Goals), row.deadline, 
      row.forfeitedBy, row.voidReason, row.completedAt
    );
    if (row.games) match.games = row.games.map(this.mapGame.bind(this));
    return match;
  }

  private mapGame(row: any): LeagueGame {
    return new LeagueGame(
      row.id, row.matchId, row.leagueId, row.gameNumber, 
      row.whitePlayerId, row.blackPlayerId, row.status as LeagueGameStatus,
      row.result as LeagueGameResult, row.forfeitedBy, row.completedAt
    );
  }

  async createLeague(name: string, maxPlayers: number, roundDurationDays: number, createdById: string): Promise<League> {
    const created = await this.prisma.league.create({
      data: { name, maxPlayers, roundDurationDays, createdById }
    });
    return this.mapLeague(created);
  }

  async findLeagueById(id: string): Promise<League | null> {
    const league = await this.prisma.league.findUnique({ where: { id }, include: { participants: true } });
    if (!league) return null;
    const mapped = this.mapLeague(league);
    mapped.participants = league.participants.map(this.mapParticipant.bind(this));
    return mapped;
  }

  async addParticipant(leagueId: string, userId: string): Promise<LeagueParticipant> {
    const added = await this.prisma.leagueParticipant.create({
      data: { leagueId, userId }
    });
    return this.mapParticipant(added);
  }

  async getParticipants(leagueId: string): Promise<LeagueParticipant[]> {
    const parts = await this.prisma.leagueParticipant.findMany({ where: { leagueId } });
    return parts.map(this.mapParticipant.bind(this));
  }

  async saveSchedule(leagueId: string, rounds: LeagueRound[], matches: LeagueMatch[]): Promise<void> {
    await this.prisma.$transaction(async (tx) => {
      for (const round of rounds) {
        await tx.leagueRound.create({
          data: {
            id: round.id, leagueId, roundNumber: round.roundNumber,
            status: round.status, deadline: round.deadline
          }
        });
      }
      for (const match of matches) {
        await tx.leagueMatch.create({
          data: {
            id: match.id, leagueId, roundId: match.roundId,
            player1Id: match.player1Id, player2Id: match.player2Id,
            status: match.status, deadline: match.deadline
          }
        });
      }
    });
  }

  async findRound(leagueId: string, roundNumber: number): Promise<LeagueRound | null> {
    const r = await this.prisma.leagueRound.findUnique({
      where: { leagueId_roundNumber: { leagueId, roundNumber } },
      include: { matches: true }
    });
    if (!r) return null;
    const mapped = this.mapRound(r);
    mapped.matches = r.matches.map(this.mapMatch.bind(this));
    return mapped;
  }

  async findMatchById(id: string): Promise<LeagueMatch | null> {
    const m = await this.prisma.leagueMatch.findUnique({ where: { id } });
    return m ? this.mapMatch(m) : null;
  }

  async findMatchWithGames(id: string): Promise<LeagueMatch | null> {
    const m = await this.prisma.leagueMatch.findUnique({
      where: { id },
      include: { games: { orderBy: { gameNumber: 'asc' } } }
    });
    return m ? this.mapMatch(m) : null;
  }

  async createLeagueGame(data: Omit<LeagueGame, 'id'>): Promise<LeagueGame> {
    const g = await this.prisma.leagueGame.create({
      data: {
        matchId: data.matchId, leagueId: data.leagueId, gameNumber: data.gameNumber,
        whitePlayerId: data.whitePlayerId, blackPlayerId: data.blackPlayerId,
        status: data.status, result: data.result, forfeitedBy: data.forfeitedBy, completedAt: data.completedAt
      }
    });
    return this.mapGame(g);
  }

  async updateLeagueGame(id: string, data: Partial<LeagueGame>): Promise<LeagueGame> {
    const updated = await this.prisma.leagueGame.update({
      where: { id }, data: { ...data } as any
    });
    return this.mapGame(updated);
  }

  async updateMatch(id: string, data: Partial<LeagueMatch>): Promise<LeagueMatch> {
    const updated = await this.prisma.leagueMatch.update({
      where: { id }, data: { ...data } as any
    });
    return this.mapMatch(updated);
  }

  async updateParticipant(leagueId: string, userId: string, data: Partial<LeagueParticipant>): Promise<LeagueParticipant> {
    const updated = await this.prisma.leagueParticipant.update({
      where: { leagueId_userId: { leagueId, userId } },
      data: { ...data } as any
    });
    return this.mapParticipant(updated);
  }

  async getStandings(leagueId: string): Promise<LeagueParticipant[]> {
    const parts = await this.prisma.leagueParticipant.findMany({
      where: { leagueId, status: { not: 'WITHDRAWN' } }, // Hide entirely voided/expunged?
      orderBy: { matchPoints: 'desc' }
    });
    return parts.map(this.mapParticipant.bind(this));
  }

  async getSchedule(leagueId: string): Promise<LeagueRound[]> {
    const rounds = await this.prisma.leagueRound.findMany({
      where: { leagueId },
      include: { matches: true },
      orderBy: { roundNumber: 'asc' }
    });
    return rounds.map(r => {
      const mapped = this.mapRound(r);
      mapped.matches = r.matches.map(this.mapMatch.bind(this));
      return mapped;
    });
  }

  async findParticipant(leagueId: string, userId: string): Promise<LeagueParticipant | null> {
    const p = await this.prisma.leagueParticipant.findUnique({
      where: { leagueId_userId: { leagueId, userId } }
    });
    return p ? this.mapParticipant(p) : null;
  }

  async getMatchesByPlayer(leagueId: string, userId: string): Promise<LeagueMatch[]> {
    const matches = await this.prisma.leagueMatch.findMany({
      where: { leagueId, OR: [{ player1Id: userId }, { player2Id: userId }] },
      include: { games: true },
      orderBy: { roundId: 'asc' } // Approximate order
    });
    return matches.map(this.mapMatch.bind(this));
  }
  
  async updateLeague(id: string, data: Partial<League>): Promise<League> {
    const updated = await this.prisma.league.update({
      where: { id }, data: { ...data } as any
    });
    return this.mapLeague(updated);
  }

  async findGameById(id: string): Promise<LeagueGame | null> {
    const g = await this.prisma.leagueGame.findUnique({ where: { id } });
    return g ? this.mapGame(g) : null;
  }

  async findActiveLeagues(): Promise<League[]> {
    const leagues = await this.prisma.league.findMany({
      where: { status: 'ACTIVE' },
    });
    return leagues.map(this.mapLeague.bind(this));
  }

  async getAllLeagues(): Promise<League[]> {
    const leagues = await this.prisma.league.findMany({
      orderBy: { createdAt: 'desc' },
      include: { participants: true },
    });
    return leagues.map((l) => {
      const mapped = this.mapLeague(l);
      mapped.participants = (l as any).participants.map(this.mapParticipant.bind(this));
      return mapped;
    });
  }

  async findMatchesPastDeadline(leagueId: string): Promise<LeagueMatch[]> {
    const now = new Date();
    const matches = await this.prisma.leagueMatch.findMany({
      where: {
        leagueId,
        status: { in: ['SCHEDULED', 'IN_PROGRESS'] },
        deadline: { lt: now },
      },
      include: { games: { orderBy: { gameNumber: 'asc' } } },
    });
    return matches.map(this.mapMatch.bind(this));
  }

  async getAllMatchesWithGames(leagueId: string): Promise<LeagueMatch[]> {
    const matches = await this.prisma.leagueMatch.findMany({
      where: { leagueId },
      include: { games: { orderBy: { gameNumber: 'asc' } } },
      orderBy: { roundId: 'asc' },
    });
    return matches.map(this.mapMatch.bind(this));
  }

  async voidMatchesByPlayer(leagueId: string, userId: string): Promise<void> {
    await this.prisma.$transaction(async (tx) => {
      // Void all matches involving the player
      await tx.leagueMatch.updateMany({
        where: {
          leagueId,
          OR: [{ player1Id: userId }, { player2Id: userId }],
          status: { notIn: ['VOIDED'] },
        },
        data: {
          status: 'VOIDED',
          voidReason: 'PLAYER_EXPELLED',
          result: 'PENDING',
          player1Goals: 0,
          player2Goals: 0,
        },
      });

      // Get the non-expelled participants
      const participants = await tx.leagueParticipant.findMany({
        where: { leagueId, userId: { not: userId } },
      });

      // Recalculate stats for all remaining participants from scratch
      for (const participant of participants) {
        const completedMatches = await tx.leagueMatch.findMany({
          where: {
            leagueId,
            status: 'COMPLETED',
            OR: [{ player1Id: participant.userId }, { player2Id: participant.userId }],
          },
        });

        let matchPoints = 0, matchWins = 0, matchDraws = 0, matchLosses = 0;
        let goalsFor = 0, goalsAgainst = 0;

        for (const m of completedMatches) {
          const isP1 = m.player1Id === participant.userId;
          const myGoals = isP1 ? Number(m.player1Goals) : Number(m.player2Goals);
          const oppGoals = isP1 ? Number(m.player2Goals) : Number(m.player1Goals);

          goalsFor += myGoals;
          goalsAgainst += oppGoals;

          if (myGoals > oppGoals) { matchPoints += 3; matchWins++; }
          else if (myGoals < oppGoals) { matchLosses++; }
          else { matchPoints += 1; matchDraws++; }
        }

        await tx.leagueParticipant.update({
          where: { leagueId_userId: { leagueId, userId: participant.userId } },
          data: {
            matchPoints, matchWins, matchDraws, matchLosses,
            matchesPlayed: completedMatches.length,
            goalsFor, goalsAgainst,
            goalDifference: goalsFor - goalsAgainst,
          },
        });
      }

      // Remove expelled player from standings (mark WITHDRAWN)
      await tx.leagueParticipant.update({
        where: { leagueId_userId: { leagueId, userId } },
        data: { status: 'WITHDRAWN' },
      });
    });
  }

  async forfeitRemainingMatchesByPlayer(leagueId: string, userId: string): Promise<LeagueMatch[]> {
    const matches = await this.prisma.leagueMatch.findMany({
      where: {
        leagueId,
        OR: [{ player1Id: userId }, { player2Id: userId }],
        status: { in: ['SCHEDULED', 'IN_PROGRESS'] },
      },
    });

    const forfeited: LeagueMatch[] = [];

    for (const m of matches) {
      const isP1 = m.player1Id === userId;
      // Forfeit: opponent gets 2-0 walkover
      const p1Goals = isP1 ? 0 : 2;
      const p2Goals = isP1 ? 2 : 0;
      const result = isP1 ? 'PLAYER2_WIN' : 'PLAYER1_WIN';
      const opponentId = isP1 ? m.player2Id : m.player1Id;

      const updated = await this.prisma.leagueMatch.update({
        where: { id: m.id },
        data: {
          status: 'FORFEITED',
          result,
          player1Goals: p1Goals,
          player2Goals: p2Goals,
          forfeitedBy: userId,
          completedAt: new Date(),
        },
      });
      forfeited.push(this.mapMatch(updated));

      // Award opponent stats
      await this.prisma.leagueParticipant.update({
        where: { leagueId_userId: { leagueId, userId: opponentId } },
        data: {
          matchPoints: { increment: 3 },
          matchWins: { increment: 1 },
          matchesPlayed: { increment: 1 },
          goalsFor: { increment: 2 },
          goalDifference: { increment: 2 },
        },
      });

      // Losing stats for forfeiting player
      await this.prisma.leagueParticipant.update({
        where: { leagueId_userId: { leagueId, userId } },
        data: {
          matchLosses: { increment: 1 },
          matchesPlayed: { increment: 1 },
          goalsAgainst: { increment: 2 },
          goalDifference: { decrement: 2 },
        },
      });
    }

    return forfeited;
  }
}
