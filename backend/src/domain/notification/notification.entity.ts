export enum NotificationType {
  TOURNAMENT_REGISTERED = 'TOURNAMENT_REGISTERED',
  TOURNAMENT_STARTED = 'TOURNAMENT_STARTED',
  TOURNAMENT_CANCELLED = 'TOURNAMENT_CANCELLED',
  TOURNAMENT_COMPLETED = 'TOURNAMENT_COMPLETED',
  MATCH_ASSIGNED = 'MATCH_ASSIGNED',
  MATCH_STARTED = 'MATCH_STARTED',
  MATCH_RESULT = 'MATCH_RESULT',
  ROUND_ADVANCED = 'ROUND_ADVANCED',
  ELIMINATED = 'ELIMINATED',
  SOCIAL_FOLLOW = 'SOCIAL_FOLLOW',
  FRIENDSHIP_ESTABLISHED = 'FRIENDSHIP_ESTABLISHED',
  POLICY_UPDATE = 'POLICY_UPDATE',
  MATCH_DEADLINE_REMINDER = 'MATCH_DEADLINE_REMINDER',
}

export class Notification {
  constructor(
    public id: string,
    public userId: string,
    public type: NotificationType,
    public title: string,
    public body: string,
    public metadata: Record<string, any> | null,
    public read: boolean,
    public createdAt: Date,
  ) {}
}
