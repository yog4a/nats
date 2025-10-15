import type { KvOptions, KvWatchEntry } from '@nats-io/kv';
import type { StorageType } from "@nats-io/jetstream";
import type { Client } from "src/core/client.class";
import { BucketStore } from './bucket.class';

// Types
// ===========================================================

export namespace Store {
    export type Config = {
        storeName: KvOptions['streamName'],
        storeStorage: StorageType,
        storeMaxAgeSeconds?: number,
        storeMaxMegabytes?: number,
    };
    export type Payload = {
        timestamp: number;
        data: Record<string, any>;
    };
    export type Watch = {
        callback: ({
            element,
            value,
            error,
        }: {
            element: KvWatchEntry;
            value: string | null;
            error: Error | null;
        }) => void;
    };
};

// Class
// ===========================================================

export class Store extends BucketStore {
    
    // Constructor

    constructor(
        client: Client,
        config: Store.Config,
    ) {
        super(client, config);

        // Setup
        this.setupBucket()
            .then(() => {
                this.manager.setReady();
            });
    }

    // Public

    public async getAllKeys(filter?: string | string[]): Promise<string[]> {
        const kv = await this.getKv();

        // Fetch all keys (iterator)
        const keysIterator = await kv.keys(filter);

        // Convert iterator to array
        const keys: string[] = [];
        for await (const key of keysIterator) {
            keys.push(key);
        }

        return keys;
    }

    public async get(key: string): Promise<Record<string, any> | null> {
        const kv = await this.getKv();

        // Fetch from bucket
        const entry = await kv.get(key);

        if (entry) {
            // Decode payload
            const payload = this.decodePayload(entry.string());
            if (payload) {
                return payload;
            }
        }

        // Nothing found
        return null;
    }

    public async create(key: string, value: Store.Payload['data']): Promise<number> {
        const kv = await this.getKv();

        // Encode payload
        const payload = this.encodePayload(value);

        // Create
        return await kv.create(key, payload);
    }

    public async put(key: string, value: Store.Payload['data']): Promise<number> {
        const kv = await this.getKv();

        // Encode payload
        const payload = this.encodePayload(value);

        // Put
        return await kv.put(key, payload);
    }

    public async purge(key: string): Promise<void> {
        const kv = await this.getKv();

        // Purge
        return await kv.purge(key);
    }

    public async watch(callback: Store.Watch['callback']): Promise<() => void> {
        const kv = await this.getKv();

        // KV Iterator
        const watch = await kv.watch();

        // Watch
        (async () => {
            for await (const e of watch) {
                try {   
                    callback({
                        element: e,
                        value: e.string(),
                        error: null,
                    });
                } catch (error) {
                    callback({
                        element: e,
                        value: null,
                        error: error as Error,
                    });
                }
            }
        })();

        return () => watch.stop();
    }
}
