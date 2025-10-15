import type { StorageType, RetentionPolicy, DiscardPolicy } from 'src/libs/nats-jetstream.js';
import type { StreamConfig as JetstreamStreamConfig } from 'src/libs/nats-jetstream.js';

// Types
// ===========================================================

/**
 * Configuration options for the StreamConfig
 */
export type StreamConfig = {
    /** Name of the NATS stream */
    streamName: string,
    /** Storage type for the stream (memory or file) */
    streamStorage: StorageType,
    /** Retention policy for messages in the stream */
    streamRetention: RetentionPolicy,
    /** Policy for discarding messages when limits are reached */
    streamDiscard: DiscardPolicy,
    /** Maximum number of consumers allowed for this stream (-1 for unlimited) */
    streamMaxConsumers?: number,
    /** Maximum age of messages in seconds before they are removed (0 for unlimited) */
    streamMaxAgeSeconds?: number,
    /** Maximum size of the stream in megabytes */
    streamMaxSizeMB: number,
};

// Stream
// ===========================================================

export const setStreamConfig = ({
    streamName,
    streamStorage,
    streamRetention,
    streamDiscard,
    streamMaxSizeMB,
    streamMaxConsumers = 10,            // 10 consumers
    streamMaxAgeSeconds = 0,            // Unlimited
}: StreamConfig) => ({
    "name": streamName,                                 // Set the stream name
    "subjects": [`${streamName}.>`],                    // Set the stream subjects
    "storage": streamStorage,                           // Set the stream storage
    "retention": streamRetention,                       // Set the stream retention
    "discard": streamDiscard,                           // Set the stream discard policy
    "max_msgs": -1,                                     // Max messages in the stream
    "max_msg_size": -1,                                 // Max stream message size
    "max_consumers": streamMaxConsumers,                // Max consumers for this stream
    "max_age": streamMaxAgeSeconds * 1_000_000_000,     // Nanoseconds
    "max_bytes": streamMaxSizeMB * 1024 * 1024,         // MB
} satisfies Partial<JetstreamStreamConfig>);