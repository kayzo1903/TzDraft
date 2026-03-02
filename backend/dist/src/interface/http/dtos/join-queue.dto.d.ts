export declare const QUEUE_TIME_OPTIONS: readonly [180000, 300000, 600000, 1800000];
export type QueueTimeMs = (typeof QUEUE_TIME_OPTIONS)[number];
export declare class JoinQueueDto {
    timeMs: QueueTimeMs;
    socketId?: string;
}
