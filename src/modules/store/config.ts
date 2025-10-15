import type { KvOptions } from '@nats-io/kv';
import type { Store } from './classes/store.class';

// Stream
// ===========================================================

export const bucketConfig = ({
    storeName,
    storeStorage,
    storeMaxAgeSeconds,
    storeMaxMegabytes,
}: Store.Config) => {
    const maxAgeSeconds = (storeMaxAgeSeconds ?? 1 * 60 * 60);
    const maxMegabytes = (storeMaxMegabytes ?? 256);
    return {
        // KvOptions
        "streamName": storeName,                        // The name of the stream to use for the KV
        "timeout": 10_000,                              // How long to wait in milliseconds for a response from the KV
        // KvLimits
        "replicas": 1,                                  // Use 3+ for HA, but 1 is fine locally
        "history": 1,                                   // The number of revisions to keep in the Kv (1)
        "max_bytes": maxMegabytes * 1024 * 1024,        // The maximum number of bytes on the KV
        "ttl": maxAgeSeconds * 1000,                    // The maximum number of ms the key should live in the KV
        "storage": storeStorage,                        // The storage type for the KV
    } satisfies Partial<KvOptions>;
};