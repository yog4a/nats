import type { NatsConnection } from "../../libs/nats-transport.js";
import type { JetStreamClient, JetStreamManager } from "../../libs/nats-jetstream.js";
import type { JetstreamConfig, JetstreamOptions } from './jetstream.types.js';

import { JetstreamCore } from "./jetstream.core.js";
import { streamsModule } from "./jetstream.streams.js";
import { consumersModule } from "./jetstream.consumers.js";

// ===========================================================
// Class
// ===========================================================

export class JetstreamClient extends JetstreamCore {
    /* Streams component */
    public readonly streams: ReturnType<typeof streamsModule>;
    /* Consumers component */
    public readonly consumers: ReturnType<typeof consumersModule>;

    /**
     * @constructor
     * @param connectionOptions - The connection options for the NATS connection
     * @param debug - Whether to enable debug mode
     */
    constructor(
        config: JetstreamConfig,
        options: JetstreamOptions = {},
    ) {
        // Initialize core
        super(config, options);

        // Initialize components
        this.streams = streamsModule.call(this);
        this.consumers = consumersModule.call(this);
    }

    // Public (main)

    public async isReady(): Promise<void> {
        // Wait for the connection to be ready
        return this.connection.enterOrWait();
    }

    public async getNatsConnection(): Promise<NatsConnection> {
        await this.connection.enterOrWait();
        if (!this.nc) {
            throw new Error("NATS connection not available");
        }
        return this.nc;
    }

    public async getJetstreamClient(): Promise<JetStreamClient> {
        await this.connection.enterOrWait();
        if (!this.jsc) {
            throw new Error("Jetstream client not available");
        }
        return this.jsc;
    }

    public async getJetstreamManager(): Promise<JetStreamManager> {
        await this.connection.enterOrWait();
        if (!this.jsm) {
            throw new Error("Jetstream manager not available");
        }
        return this.jsm;
    }
}
