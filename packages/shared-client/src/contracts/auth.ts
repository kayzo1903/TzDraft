import { z } from "zod";

export const ratingSchema = z.object({
  id: z.string(),
  userId: z.string(),
  rating: z.number(),
  gamesPlayed: z.number(),
  wins: z.number(),
  losses: z.number(),
  draws: z.number(),
});

export const userSchema = z.object({
  id: z.string(),
  phoneNumber: z.string(),
  email: z.string().email().optional(),
  username: z.string(),
  displayName: z.string(),
  isVerified: z.boolean(),
  rating: z.union([z.number(), ratingSchema]),
  role: z.enum(["USER", "ADMIN"]).optional(),
  isBanned: z.boolean().optional(),
});

export const authTokensSchema = z.object({
  accessToken: z.string(),
  refreshToken: z.string(),
});

export const authResponseSchema = z.object({
  user: userSchema,
  accessToken: z.string(),
  refreshToken: z.string(),
});

export const loginRequestSchema = z.object({
  identifier: z.string(),
  password: z.string(),
});

export const registerRequestSchema = z
  .object({
    phoneNumber: z.string(),
    username: z.string(),
    password: z.string(),
    confirmPassword: z.string(),
    displayName: z.string().optional(),
    email: z.string().email().optional(),
    country: z.string().optional(),
    region: z.string().optional(),
  })
  .refine((value) => value.password === value.confirmPassword, {
    message: "Passwords must match",
    path: ["confirmPassword"],
  });

export type Rating = z.infer<typeof ratingSchema>;
export type User = z.infer<typeof userSchema>;
export type AuthTokens = z.infer<typeof authTokensSchema>;
export type AuthResponse = z.infer<typeof authResponseSchema>;
export type LoginRequest = z.infer<typeof loginRequestSchema>;
export type RegisterRequest = z.infer<typeof registerRequestSchema>;
