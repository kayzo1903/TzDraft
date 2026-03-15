import { z } from "zod";

export const playerColorSchema = z.enum(["WHITE", "BLACK"]);

export const joinQueueRequestSchema = z.object({
  timeMs: z.number().int().positive(),
  socketId: z.string(),
});

export const joinQueueResponseSchema = z.object({
  success: z.boolean(),
  data: z.object({
    status: z.enum(["waiting", "matched"]),
    gameId: z.string().optional(),
  }),
});

export const createInviteRequestSchema = z.object({
  color: z.string(),
  timeMs: z.number().int().positive(),
});

export type PlayerColor = z.infer<typeof playerColorSchema>;
export type JoinQueueRequest = z.infer<typeof joinQueueRequestSchema>;
export type JoinQueueResponse = z.infer<typeof joinQueueResponseSchema>;
export type CreateInviteRequest = z.infer<typeof createInviteRequestSchema>;
