import type { ConsumerConfig } from '@nats-io/jetstream';
import { AckPolicy, DeliverPolicy, ReplayPolicy } from '@nats-io/jetstream';

// Types
// ===========================================================

export type Config = {
    streamName: string,
    consumerName: string,
    filterSubject?: string,
    ackWaitMs?: number,
};

// Consumer
// ===========================================================

export const consumerConfig = ({
    streamName,
    consumerName,
    filterSubject = '>',
    ackWaitMs = 30 * 1_000, // 30 seconds
}: Config) => {
    const durableName = `${streamName}_${consumerName}`;
    const subject = `${streamName}.${filterSubject}`;
    const ackWait = ackWaitMs * 1_000_000;
    return {
        // Configurable values
        "durable_name": durableName,
        "filter_subject": subject,
        "ack_wait": ackWait,                       // 30-second ack wait
        // Fixed values
        "ack_policy": AckPolicy.Explicit,          // Explicit ack policy
        "deliver_policy": DeliverPolicy.All,       // Deliver all messages
        "replay_policy": ReplayPolicy.Original,    // Replay original messages
    } satisfies Partial<ConsumerConfig>;
};