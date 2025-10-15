import type { StreamConfig } from '@nats-io/jetstream';
import { StorageType, RetentionPolicy, DiscardPolicy } from '@nats-io/jetstream';

// Types
// ===========================================================

export type Config = {
    streamName: string,
    streamMaxConsumers: number,
    streamMaxAgeSeconds?: number,
    streamMaxMegabytes?: number,
};

// Stream
// ===========================================================

export const streamConfig = ({
    streamName,
    streamMaxConsumers,
    streamMaxAgeSeconds = 1 * 60 * 60, // 1 hour
    streamMaxMegabytes = 100, // 100 MB
}: Config) => {
    const maxAge = streamMaxAgeSeconds * 1_000_000_000;
    const maxBytes = streamMaxMegabytes * 1024 * 1024;
    return {
        // Configurable values
        "name": streamName,                           // Set the name
        "subjects": [`${streamName}.>`],              // Set the subjects
        "max_consumers": streamMaxConsumers,          // Max consumers for this stream
        "max_age": maxAge,                            // Nanoseconds
        "max_bytes": maxBytes,                        // MB
        // Fixed values
        "retention": RetentionPolicy.Workqueue,       // Set the retention
        "storage": StorageType.Memory,                // Set the storage
        "discard": DiscardPolicy.Old,                 // Set the discard policy
        "max_msgs": 10_000,                           // Max messages in the stream
        "max_msgs_per_subject": 1_000,                // Per subject retention limit
        "max_msg_size": -1,                           // Max message size
    } satisfies Partial<StreamConfig>;
};