import { Injectable, Inject, forwardRef, Logger } from '@nestjs/common';
import { randomUUID } from 'crypto';
import { PrismaService } from '../../infrastructure/database/prisma/prisma.service';
import { EmailService } from '../../infrastructure/email/email.service';
import { BeamAfricaService } from '../../infrastructure/sms/beam-africa.service';
import { GamesGateway } from '../../infrastructure/messaging/games.gateway';
import { ExpoPushService } from '../../infrastructure/push/expo-push.service';
import {
  Notification,
  NotificationType,
} from '../../domain/notification/notification.entity';
import type { INotificationRepository } from '../../domain/notification/repositories/notification.repository.interface';
import type { Tournament } from '../../domain/tournament/entities/tournament.entity';
import type { TournamentMatch } from '../../domain/tournament/entities/tournament-match.entity';

@Injectable()
export class TournamentNotificationService {
  private readonly logger = new Logger(TournamentNotificationService.name);

  constructor(
    @Inject('INotificationRepository')
    private readonly notifRepo: INotificationRepository,
    @Inject(forwardRef(() => GamesGateway))
    private readonly gateway: GamesGateway,
    private readonly emailService: EmailService,
    private readonly smsService: BeamAfricaService,
    private readonly prisma: PrismaService,
    private readonly expoPush: ExpoPushService,
  ) {}

  // ── Registration ─────────────────────────────────────────────────────────

  async notifyRegistered(
    userId: string,
    tournament: Tournament,
  ): Promise<void> {
    const notif = await this.persist(
      userId,
      NotificationType.TOURNAMENT_REGISTERED,
      {
        title: 'Registration Confirmed',
        body: `You are registered for "${tournament.name}".`,
        meta: { tournamentId: tournament.id, tournamentName: tournament.name },
      },
    );
    this.gateway.emitNotification(userId, notif);
    void this.expoPush.sendToUser(userId, notif.title, notif.body, {
      tournamentId: tournament.id,
      screen: 'tournament',
    });

    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (user?.email) {
      void this.emailService.sendTournamentRegistered(
        user.email,
        user.displayName,
        tournament.name,
        tournament.scheduledStartAt.toLocaleString(),
        tournament.format,
        tournament.style,
      );
    }
  }

  // ── Tournament Started ────────────────────────────────────────────────────

  async notifyTournamentStarted(
    participantIds: string[],
    tournament: Tournament,
    matchesCount: number,
  ): Promise<void> {
    const users = await this.prisma.user.findMany({
      where: { id: { in: participantIds } },
      select: { id: true, email: true, phoneNumber: true, displayName: true },
    });

    await Promise.all(
      users.map(async (user) => {
        const notif = await this.persist(
          user.id,
          NotificationType.TOURNAMENT_STARTED,
          {
            title: `${tournament.name} has started!`,
            body: `Round 1 is now live with ${matchesCount} matches.`,
            meta: {
              tournamentId: tournament.id,
              tournamentName: tournament.name,
            },
          },
        );
        this.gateway.emitNotification(user.id, notif);
        void this.expoPush.sendToUser(user.id, notif.title, notif.body, {
          tournamentId: tournament.id,
          screen: 'tournament',
        });

        if (user.email) {
          void this.emailService.sendTournamentStarted(
            user.email,
            user.displayName,
            tournament.name,
            1,
            matchesCount,
          );
        }
        // SMS for tournament start
        void this.smsService.sendTournamentAlert(
          user.phoneNumber,
          `TzDraft: Tournament "${tournament.name}" has started! Open the app to play your match.`,
        );
      }),
    );
  }

  // ── Match Assigned ────────────────────────────────────────────────────────

  async notifyMatchAssigned(
    player1Id: string,
    player2Id: string,
    match: TournamentMatch,
    tournament: Tournament,
    roundNumber: number,
  ): Promise<void> {
    const users = await this.prisma.user.findMany({
      where: { id: { in: [player1Id, player2Id] } },
      select: { id: true, email: true, phoneNumber: true, displayName: true },
    });

    const p1 = users.find((u) => u.id === player1Id);
    const p2 = users.find((u) => u.id === player2Id);
    if (!p1 || !p2) return;

    for (const [player, opponent] of [
      [p1, p2],
      [p2, p1],
    ] as const) {
      const notif = await this.persist(
        player.id,
        NotificationType.MATCH_ASSIGNED,
        {
          title: `Match vs ${opponent.displayName}`,
          body: `Your Round ${roundNumber} match in "${tournament.name}" is ready. Open the app to play!`,
          meta: {
            tournamentId: tournament.id,
            matchId: match.id,
            roundNumber,
            opponentId: opponent.id,
          },
        },
      );
      this.gateway.emitNotification(player.id, notif);
      void this.expoPush.sendToUser(player.id, notif.title, notif.body, {
        tournamentId: tournament.id,
        matchId: match.id,
        screen: 'tournament',
      });

      if (player.email) {
        void this.emailService.sendMatchAssigned(
          player.email,
          player.displayName,
          opponent.displayName,
          tournament.name,
          roundNumber,
          tournament.style,
        );
      }
      // SMS for match assignment
      void this.smsService.sendTournamentAlert(
        player.phoneNumber,
        `TzDraft: Your Round ${roundNumber} match vs ${opponent.displayName} in "${tournament.name}" is ready!`,
      );
    }
  }

  // ── Match Result ──────────────────────────────────────────────────────────

  async notifyMatchResult(
    winnerId: string | null,
    loserId: string | null,
    match: TournamentMatch,
    tournament: Tournament,
    score: string,
    roundNumber: number,
  ): Promise<void> {
    const ids = [winnerId, loserId].filter(Boolean) as string[];
    const users = await this.prisma.user.findMany({
      where: { id: { in: ids } },
      select: { id: true, email: true, displayName: true },
    });

    for (const user of users) {
      const isWinner = user.id === winnerId;
      const outcome = isWinner ? 'winner' : 'eliminated';

      const notif = await this.persist(
        user.id,
        isWinner ? NotificationType.MATCH_RESULT : NotificationType.ELIMINATED,
        {
          title: isWinner ? 'You won!' : 'Eliminated',
          body: isWinner
            ? `You won your Round ${roundNumber} match in "${tournament.name}" (${score}). You advance!`
            : `You were eliminated from "${tournament.name}" in Round ${roundNumber} (${score}).`,
          meta: {
            tournamentId: tournament.id,
            matchId: match.id,
            roundNumber,
            score,
          },
        },
      );
      this.gateway.emitNotification(user.id, notif);
      void this.expoPush.sendToUser(user.id, notif.title, notif.body, {
        tournamentId: tournament.id,
        matchId: match.id,
        screen: 'tournament',
      });

      if (user.email) {
        void this.emailService.sendMatchResult(
          user.email,
          user.displayName,
          tournament.name,
          outcome,
          score,
          roundNumber,
        );
      }
    }
  }

  // ── Tournament Completed ──────────────────────────────────────────────────

  async notifyTournamentCompleted(
    participantIds: string[],
    winnerId: string | null,
    tournament: Tournament,
  ): Promise<void> {
    const users = await this.prisma.user.findMany({
      where: { id: { in: participantIds } },
      select: { id: true, email: true, displayName: true },
    });

    const winner = users.find((u) => u.id === winnerId);

    await Promise.all(
      users.map(async (user) => {
        const isChampion = user.id === winnerId;
        const notif = await this.persist(
          user.id,
          NotificationType.TOURNAMENT_COMPLETED,
          {
            title: isChampion
              ? `You won ${tournament.name}!`
              : `${tournament.name} has ended`,
            body: isChampion
              ? `Congratulations! You are the champion of "${tournament.name}"!`
              : `"${tournament.name}" has concluded. Champion: ${winner?.displayName ?? 'Unknown'}.`,
            meta: { tournamentId: tournament.id, winnerId },
          },
        );
        this.gateway.emitNotification(user.id, notif);
        void this.expoPush.sendToUser(user.id, notif.title, notif.body, {
          tournamentId: tournament.id,
          screen: 'tournament',
        });

        if (user.email) {
          void this.emailService.sendTournamentCompleted(
            user.email,
            user.displayName,
            tournament.name,
            winner?.displayName ?? 'Unknown',
          );
        }
      }),
    );
  }

  // ── Tournament Cancelled ──────────────────────────────────────────────────

  async notifyTournamentCancelled(
    participantIds: string[],
    tournament: Tournament,
  ): Promise<void> {
    const users = await this.prisma.user.findMany({
      where: { id: { in: participantIds } },
      select: { id: true, email: true, phoneNumber: true, displayName: true },
    });

    await Promise.all(
      users.map(async (user) => {
        const notif = await this.persist(
          user.id,
          NotificationType.TOURNAMENT_CANCELLED,
          {
            title: `${tournament.name} was cancelled`,
            body: `The tournament "${tournament.name}" has been cancelled by an admin.`,
            meta: { tournamentId: tournament.id },
          },
        );
        this.gateway.emitNotification(user.id, notif);
        void this.expoPush.sendToUser(user.id, notif.title, notif.body, {
          tournamentId: tournament.id,
          screen: 'tournament',
        });

        // SMS for cancellation
        void this.smsService.sendTournamentAlert(
          user.phoneNumber,
          `TzDraft: Tournament "${tournament.name}" has been cancelled.`,
        );
      }),
    );
  }

  // ── Helpers ───────────────────────────────────────────────────────────────

  private async persist(
    userId: string,
    type: NotificationType,
    opts: { title: string; body: string; meta?: Record<string, any> },
  ): Promise<Notification> {
    try {
      return await this.notifRepo.create(
        new Notification(
          randomUUID(),
          userId,
          type,
          opts.title,
          opts.body,
          opts.meta ?? null,
          false,
          new Date(),
        ),
      );
    } catch (err) {
      this.logger.error(
        `Failed to persist notification for user ${userId}: ${err?.message}`,
      );
      // Return an unsaved instance so WS emit still works
      return new Notification(
        randomUUID(),
        userId,
        type,
        opts.title,
        opts.body,
        opts.meta ?? null,
        false,
        new Date(),
      );
    }
  }
}
