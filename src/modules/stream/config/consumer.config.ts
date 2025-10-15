import type { ConsumerConfig as JetstreamConsumerConfig } from 'src/libs/nats-jetstream.js';
import { AckPolicy, DeliverPolicy, ReplayPolicy } from 'src/libs/nats-jetstream.js';

// Types
// ===========================================================

/**
 * Configuration options for the ConsumerConfig
 */
export type ConsumerConfig = {
    /** Name of the NATS stream */
    streamName: string,
    /** Name of the consumer */
    consumerName: string,
    /** Subject filter for the consumer */
    consumerFilterSubject?: string,
    /** Policy for delivering messages to the consumer */
    consumerDeliverPolicy?: DeliverPolicy,
    /** The maximum number of messages without acknowledgement that can be outstanding, once this limit is reached message delivery will be suspended */
    consumerMaxAckPending?: number,
};

// Consumer
// ===========================================================

export const setConsumerConfig = ({
    streamName,
    consumerName,
    consumerFilterSubject = '>',
    consumerDeliverPolicy = DeliverPolicy.All,
    consumerMaxAckPending = 1,
}: ConsumerConfig) => ({
    "durable_name": consumerName,
    "filter_subject": `${streamName}.${consumerFilterSubject}`,
    "max_ack_pending": consumerMaxAckPending,
    "deliver_policy": consumerDeliverPolicy,               // Deliver all messages
    "ack_wait": 10 * 1_000 * 1_000_000,                    // 10-second ack wait
    "ack_policy": AckPolicy.Explicit,                      // Explicit ack policy
    "replay_policy": ReplayPolicy.Instant,                 // Replay original messages
} satisfies Partial<JetstreamConsumerConfig>);
