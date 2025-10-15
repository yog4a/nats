import type { ConnectionOptions, NatsConnection } from 'src/libs/nats-transport.js';
import { connect } from 'src/libs/nats-transport.js';
import { Logger, Gate } from 'src/classes/index.js';

// Class
// ===========================================================

export class Core {
    /* Gate (manage processing of messages) */
    public readonly connection = new Gate();
    /* Logger */
    public readonly logger: Logger = new Logger("[nats][client]");
    /* Nats connection */
    public nc: NatsConnection | null = null;
    /**
     * @constructor
     * @param connectionOptions - The connection options for the NATS connection
     * @param debug - Whether to enable debug mode
     */
    constructor(
        private readonly connectionOptions: ConnectionOptions,
        private readonly debug: boolean = false,
    ) {}

    // Private

    public async initialize(reset: boolean = false): Promise<void> {
        // Ensure the connection is closed
        this.connection.close();

        // Reset all
        if (reset) {
            await this.cleanup();
        }

        // Initialize
        await this.initNatsConnection();

        // Set the client as ready
        setImmediate(() => {
            this.connection.open();
        });
    }

    public async initNatsConnection(attempt: number = 0): Promise<void> {
        if (this.nc) {
            if (this.debug) {
                this.logger.info(`Connection to NATS server already initialized!`);
            }
            return;
        }
        while (!this.nc) {
            try {
                this.nc = await connect(this.connectionOptions!);
                this.listenServerEvents();
                if (this.debug) {
                    this.logger.info(`NATS connection initialized.`);
                }
                break;

            } catch (error) {
                attempt++;
                this.logger.error(`NATS connection failed (attempt ${attempt}):`, 
                    (error as Error).message
                );
            }
            // Wait for the next attempt (retry)
            const delay = Math.min(1_000 * attempt, 10_000); // 10s max delay
            await new Promise(resolve => setTimeout(resolve, delay));
        }
    }

    public async listenServerEvents(): Promise<void> {
        const natsConnection = this.nc!;

        // Listen to connection events
        natsConnection.closed().then((err: void | Error) => {
            this.connection.close();
            if (err) {
                this.logger.error(`NATS connection closed with an error:`, err.message, err.cause);
                this.initialize(true); // Reset the connection
            } else {
                if (this.debug) {
                    this.logger.info(`NATS connection closed.`);
                }
            }
        });

        (async () => {
            // Listen to connection events
            for await (const s of natsConnection.status()) {
                switch (s.type) {
                    // Client disconnected
                    case "disconnect":
                        this.connection.close();
                        if (this.debug) {
                            this.logger.info(`client disconnected - ${s.server}`);
                        }
                        break;
                    // Client is attempting to reconnect
                    case "reconnecting":
                        this.connection.close();
                        if (this.debug) {
                            this.logger.info("client is attempting to reconnect...");
                        }
                        break;
                    // Client reconnected
                    case "reconnect":
                        this.connection.open();
                        if (this.debug) {
                            this.logger.info(`client reconnected - ${s.server}`);
                        }
                        break;
                    // Client received a signal telling it that the server is transitioning to Lame Duck Mode
                    case "ldm":
                        if (this.debug) {
                            this.logger.info(`client transitioning to Lame Duck Mode - ${s.server}`);
                        }
                        break;
                    // Client received a cluster update
                    case "update":
                        if (this.debug) {
                            if (s.added && s.added?.length > 0) {
                                this.logger.info(`cluster update - ${s.added} added`);
                            }
                            if (s.deleted && s.deleted?.length > 0) {
                                this.logger.info(`cluster update - ${s.deleted} removed`);
                            }
                        }
                        break;
                    // Client received an async error from the server
                    case "error":
                        if (this.debug) {
                            this.logger.info(`client got an error - ${s.error}`);
                        }
                        break;
                    // Client has a stale connection
                    case "staleConnection":
                        if (this.debug) {
                            this.logger.info("client has a stale connection");
                        }
                        break;
                    // Client initiated a reconnect
                    case "forceReconnect":
                        if (this.debug) {
                            this.logger.info("client initiated a reconnect");
                        }
                        break;
                    // Client is slow
                    case "slowConsumer":
                        if (this.debug) {
                            this.logger.info(`client is slow - ${s.sub.getSubject()} ${s.pending} pending messages`);
                        }
                        break;
                    // Ping
                    case "ping":
                        break;
                    // Unknown status
                    default:
                        if (this.debug) {
                            this.logger.error(`got an unknown status (${s.type}): ${JSON.stringify(s)}`);
                        }
                        break;
                }
            }
        })().then();
    }

    public async cleanup(): Promise<void> {
        if (this.nc) {
            try {
                // drain and close the NATS connection
                await this.nc.drain();
                await this.nc.closed();

            } catch (error) {
                this.logger.error("Error closing NATS connection:",
                    (error as Error).message
                );
            }
            this.nc = null;
        }
    }
}
