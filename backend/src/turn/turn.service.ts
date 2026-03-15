import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as crypto from 'crypto';

export interface TurnCredentialsResponse {
  iceServers: RTCIceServer[];
  ttl: number;
}

@Injectable()
export class TurnService {
  constructor(private readonly config: ConfigService) {}

  getCredentials(userId: string): TurnCredentialsResponse {
    const secret = this.config.get<string>('TURN_SECRET');
    const serverUrl = this.config.get<string>('TURN_SERVER_URL');

    // If TURN is not configured, return STUN-only (graceful fallback)
    if (!secret || !serverUrl) {
      return {
        iceServers: [
          { urls: 'stun:stun.l.google.com:19302' },
          { urls: 'stun:stun1.l.google.com:19302' },
        ],
        ttl: 3600,
      };
    }

    const ttlSeconds = 3600;
    const expiry = Math.floor(Date.now() / 1000) + ttlSeconds;
    const username = `${expiry}:${userId}`;
    const credential = crypto
      .createHmac('sha1', secret)
      .update(username)
      .digest('base64');

    return {
      iceServers: [
        { urls: 'stun:stun.l.google.com:19302' },
        { urls: 'stun:stun1.l.google.com:19302' },
        {
          urls: [
            `turn:${serverUrl}:3478`,
            `turns:${serverUrl}:5349`,
          ],
          username,
          credential,
        },
      ],
      ttl: ttlSeconds,
    };
  }
}
