import type { Client } from "src/core/client.class";
import type { Store } from './store.class';
import { Kvm, KV } from '@nats-io/kv';
import { bucketConfig } from '../config';

import Logger from 'src/classes/logger.class';
import Manager from 'src/classes/manager.class';

// Class
// ===========================================================

export class BucketStore {
    protected readonly client: Client;
    protected readonly logger: Logger;
    protected readonly manager: Manager;

    protected readonly bucketConfig: ReturnType<typeof bucketConfig>;
    
    protected kvm: Kvm | null = null;
    protected kv: KV | null = null;

    // Constructor

    constructor(
        client: Client, 
        config: Store.Config
    ) {
        if (!client) throw new Error('Client is required!');
        if (!config) throw new Error('Config is required!');

        // Private
        this.client = client;
        this.manager = new Manager();
        this.logger = new Logger(`[nats][store][${config.storeName}]`, false);

        // Public
        this.bucketConfig = bucketConfig(config);
        this.setupBucket();
    }

    // Protected

    protected async getKv(): Promise<KV> {
        await this.client.isReady();
        await this.manager.isReady();

        if (!this.kv) {
            throw new Error('Bucket is not ready!');
        }

        return this.kv;
    }

    protected async setupBucket(): Promise<void> {
        await this.client.isReady();

        // Create the Kv manager
        if (!this.kvm) {
            this.kvm = new Kvm(await this.client.getJetstreamClient());
        }

        // Get or create the KV
        if (!this.kv) {
            const { streamName, ...options } = this.bucketConfig;
            this.kv = await this.kvm.create(streamName, options);
        }

        // Ready
        this.logger.info(`KV Store initialized!`);
        this.manager.setReady();
    }

    protected encodePayload(data: Store.Payload['data']): string {
        const payload = JSON.stringify({ timestamp: Date.now(), data });
        return payload;
    }

    protected decodePayload(data: string): Store.Payload['data'] | null {
        const payload = JSON.parse(data) as Store.Payload;
        return payload.data;
    }
}
