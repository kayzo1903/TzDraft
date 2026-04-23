import { z } from "zod";

export const challengeRequestSchema = z.object({
  challengerId: z.string(),
  challengerName: z.string(),
  challengerAvatarUrl: z.string().optional(),
  challengerRating: z.number().optional(),
  inviteCode: z.string(),
  gameId: z.string(),
});

export type ChallengeRequest = z.infer<typeof challengeRequestSchema>;
