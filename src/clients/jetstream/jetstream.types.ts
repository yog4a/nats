import type { NodeConnectionOptions } from '../../libs/nats-transport.js';

// ===========================================================
// Types
// ===========================================================

export type JetstreamConfig = NodeConnectionOptions & {
    servers: string | string[];
    reconnect: boolean;
    maxReconnectAttempts: number;
};

export type JetstreamOptions = {
    onLog?: (...args: any[]) => void;
    onError?: (...args: any[]) => void;
};
