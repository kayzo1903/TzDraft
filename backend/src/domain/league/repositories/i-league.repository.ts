import { League } from '../entities/league.entity';
import { LeagueParticipant } from '../entities/league-participant.entity';
import { LeagueRound } from '../entities/league-round.entity';
import { LeagueMatch } from '../entities/league-match.entity';
import { LeagueGame } from '../entities/league-game.entity';

export interface ILeagueRepository {
  createLeague(name: string, maxPlayers: number, roundDurationDays: number, createdById: string): Promise<League>;
  findLeagueById(id: string): Promise<League | null>;
  addParticipant(leagueId: string, userId: string): Promise<LeagueParticipant>;
  getParticipants(leagueId: string): Promise<LeagueParticipant[]>;
  saveSchedule(leagueId: string, rounds: LeagueRound[], matches: LeagueMatch[]): Promise<void>;
  
  findRound(leagueId: string, roundNumber: number): Promise<LeagueRound | null>;
  findMatchById(id: string): Promise<LeagueMatch | null>;
  findMatchWithGames(id: string): Promise<LeagueMatch | null>;
  
  createLeagueGame(data: Omit<LeagueGame, 'id'>): Promise<LeagueGame>;
  updateLeagueGame(id: string, data: Partial<LeagueGame>): Promise<LeagueGame>;
  
  updateMatch(id: string, data: Partial<LeagueMatch>): Promise<LeagueMatch>;
  updateParticipant(leagueId: string, userId: string, data: Partial<LeagueParticipant>): Promise<LeagueParticipant>;
  
  getStandings(leagueId: string): Promise<LeagueParticipant[]>;
  getSchedule(leagueId: string): Promise<LeagueRound[]>;
  
  findParticipant(leagueId: string, userId: string): Promise<LeagueParticipant | null>;
  getMatchesByPlayer(leagueId: string, userId: string): Promise<LeagueMatch[]>;
  updateLeague(id: string, data: Partial<League>): Promise<League>;

  // Additional methods needed for game flow, cron jobs, and inactivity handling
  findGameById(id: string): Promise<LeagueGame | null>;
  findActiveLeagues(): Promise<League[]>;
  findMatchesPastDeadline(leagueId: string): Promise<LeagueMatch[]>;
  getAllMatchesWithGames(leagueId: string): Promise<LeagueMatch[]>;
  voidMatchesByPlayer(leagueId: string, userId: string): Promise<void>;
  forfeitRemainingMatchesByPlayer(leagueId: string, userId: string): Promise<LeagueMatch[]>;
  getAllLeagues(): Promise<League[]>;
}
