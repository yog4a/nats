import type { ConnectionOptions, NatsConnection, ServerInfo } from "@nats-io/transport-node";
import type { JetStreamClient, JetStreamManager } from "@nats-io/jetstream";

// Components
import { Core } from "./core/core.class.js";
import { Jetstream } from "./core/jetstream.class.js";
import { Streams } from "./components/streams.module.js";
import { Consumers } from "./components/consumers.module.js";

// Class
// ===========================================================

export class Client {
    /* Core (manage NATS connection) */
    public readonly core: Core;
    /* Jetstream */
    public readonly jetstream: Jetstream;
    /* Streams */
    public readonly streams: Streams;
    /* Consumers */
    public readonly consumers: Consumers;
    /**
     * @constructor
     * @param connectionOptions - The connection options for the NATS connection
     * @param debug - Whether to enable debug mode
     */
    constructor(connectionOptions: ConnectionOptions) {
        // Initialize core
        this.core = new Core(connectionOptions);
        // Initialize jetstream
        this.jetstream = new Jetstream(connectionOptions);
        // Initialize components
        this.streams = new Streams(this, connectionOptions.debug);
        this.consumers = new Consumers(this, connectionOptions.debug);
    }

    // Public (main)

    public getServerInfo(): ServerInfo | undefined {
        // Get the server info
        return this.core.nc!.info;
    }

    public async isReady(): Promise<void> {
        // Wait for the connection to be ready
        return this.core.connection.enterOrWait();
    }

    public async shutdown(): Promise<void> {
        // Drain the connection and close it
        this.core.logger.info("Shutting down client, draining connection...");
        await this.core.nc!.drain();
    }

    // Public (variables)

    public async getNatsConnection(): Promise<NatsConnection> {
        await this.core.connection.enterOrWait();
        return this.core.nc!;
    }

    public async getJetstreamClient(): Promise<JetStreamClient> {
        await this.core.connection.enterOrWait();
        return this.jetstream.js!;
    }

    public async getJetstreamManager(): Promise<JetStreamManager> {
        await this.core.connection.enterOrWait();
        return this.jetstream.jsm!;
    }
}
