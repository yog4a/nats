import type { NodeConnectionOptions, NatsConnection } from "src/libs/nats-transport.js";
import type { JetStreamClient, JetStreamManager } from "src/libs/nats-jetstream.js";
import { JetstreamCore } from "./core/jetstream.class.js";
import { streamsModule } from "./modules/streams.module.js";
import { consumersModule } from "./modules/consumers.module.js";

// Class
// ===========================================================

export class JetstreamClient {
    /* Jetstream core */
    protected readonly core: JetstreamCore;
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
        protected readonly connectionOptions: NodeConnectionOptions,
        protected readonly debug: boolean = false,
    ) {
        // Initialize core
        this.core = new JetstreamCore(connectionOptions, debug);
        // Initialize components
        this.streams = streamsModule.call(this);
        this.consumers = consumersModule.call(this);
    }

    // Public (main)

    public async start(): Promise<void> {
        // Start the core
        await this.core.start();
    }

    public async stop(): Promise<void> {
        // Stop the core
        await this.core.stop();
    }

    public async isReady(): Promise<void> {
        // Wait for the connection to be ready
        return this.core.connection.enterOrWait();
    }

    // Public (variables)

    public async getNatsConnection(): Promise<NatsConnection> {
        await this.core.connection.enterOrWait();
        return this.core.nc!;
    }

    public async getJetstreamClient(): Promise<JetStreamClient> {
        await this.core.connection.enterOrWait();
        return this.core.js!;
    }

    public async getJetstreamManager(): Promise<JetStreamManager> {
        await this.core.connection.enterOrWait();
        return this.core.jsm!;
    }
}
