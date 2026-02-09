import type { NodeConnectionOptions, NatsConnection } from 'src/libs/nats-transport.js';
import type { JetStreamClient, JetStreamManager } from 'src/libs/nats-jetstream.js';
import { jetstream, jetstreamManager } from 'src/libs/nats-jetstream.js';
import { connect } from 'src/libs/nats-transport.js';
import { Logger, Gate } from 'src/classes/index.js';

// Class
// ===========================================================

export class JetstreamCore {
    /* Gate (manage internal connection state) */
    public readonly connection = new Gate();
    /* Logger (manage internal logging messages) */
    public readonly logger: Logger = new Logger("[Nats][Jetstream]");
    /* Nats connection */
    public nc: NatsConnection | null = null;
    /* Jetstream client */
    public js: JetStreamClient | null = null;
    /* Jetstream manager */
    public jsm: JetStreamManager | null = null;
    /* Starting flag */
    private starting: boolean = false;
    /* Stopping flag */
    private stopping: boolean = false;
    
    /**
     * @constructor
     * @param connectionOptions - The connection options for the NATS connection
     * @param debug - Whether to enable debug mode
     */
    constructor(
        private readonly connectionOptions: NodeConnectionOptions,
        private readonly debug: boolean = false,
    ) {}

    // ===========================================================
    // Public
    // ===========================================================

    public async start(): Promise<void> {
        if (this.starting) {
            if (this.debug) {
                this.logger.info("Start already in progress, skipping...");
            }
            return;
        }
        this.starting = true;

        try {
            if (this.nc || this.js || this.jsm) {
                await this.stop(); // Reset connections
            }

            await this.initNatsConnection();
            await this.initJetstreamClient();
            await this.initJetstreamManager();

            setImmediate(() => {
                this.connection.open();
            });
        } finally {
            this.starting = false;
        }
    }

    public async stop(): Promise<void> {
        if (this.stopping) {
            if (this.debug) {
                this.logger.info("Stop already in progress, skipping...");
            }
            return;
        }
        this.stopping = true;

        try {
            this.connection.close();

            if (this.jsm) {
                // destroy the jetstream manager (only a wrapper)
                this.jsm = null;
                if (this.debug) {
                    this.logger.info(`Jetstream manager stopped.`);
                }
            }
            if (this.js) {
                // destroy the jetstream client (only a wrapper)
                this.js = null;
                if (this.debug) {
                    this.logger.info(`Jetstream client stopped.`);
                }
            }
            if (this.nc) {
                try {
                    // drain the NATS connection
                    await this.nc.drain();
                    if (this.debug) {
                        this.logger.info(`NATS connection drained.`);
                    }
                } catch (error) {
                    this.logger.error("Error draining NATS connection:",
                        (error as Error).message
                    );
                }
                try {
                    // close the NATS connection
                    await this.nc.close();
                    if (this.debug) {
                        this.logger.info(`NATS connection closed.`);
                    }
                } catch (error) {
                    this.logger.error("Error closing NATS connection:",
                        (error as Error).message
                    );
                }

                // Remove the NATS connection
                this.nc = null;
                if (this.debug) {
                    this.logger.info(`NATS connection removed.`);
                }
            }
        } finally {
            this.stopping = false;
        }
    }

    // ===========================================================
    // Private
    // ===========================================================

    private async initNatsConnection(attempt: number = 0): Promise<void> {
        if (this.nc) {
            if (this.debug) {
                this.logger.info(`Connection to NATS server already initialized!`);
            }
            return;
        }
        while (!this.nc) {
            try {
                this.nc = await connect(this.connectionOptions);
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
            const delay = Math.min(1_000 * attempt, 10_000); // Delay (min: 1s, max: 10s)
            await new Promise(resolve => setTimeout(resolve, delay));
        }
    }

    private async initJetstreamManager(attempt: number = 0): Promise<void> {
        if (!this.nc) {
            this.logger.error(`Cannot initialize Jetstream manager: Nats connection not initialized!`);
            return;
        }
        if (this.jsm) {
            if (this.debug) {
                this.logger.info(`Jetstream manager already initialized!`);
            }
            return;
        }
        while (!this.jsm) {
            try {
                this.jsm = await jetstreamManager(this.nc);
                if (this.debug) {
                    this.logger.info(`Jetstream manager initialized.`);
                }
                break;

            } catch (error) {
                attempt++;
                this.logger.error( `Failed to initialize jetstream manager (attempt ${attempt}):`, 
                    (error as Error).message
                );
            }
            // Wait for the next attempt (retry)
            const delay = Math.min(1_000 * attempt, 10_000); // Delay (min: 1s, max: 10s)
            await new Promise(resolve => setTimeout(resolve, delay));
        }
    }

    private async initJetstreamClient(attempt: number = 0): Promise<void> {
        if (!this.nc) {
            this.logger.error(`Cannot initialize Jetstream client: Nats connection not initialized!`);
            return;
        }
        if (this.js) {
            if (this.debug) {
                this.logger.info(`Jetstream client already initialized!`);
            }
            return;
        }
        while (!this.js) {
            try {
                this.js = jetstream(this.nc);
                if (this.debug) {
                    this.logger.info(`Jetstream client initialized.`);
                }
                break;

            } catch (error) {
                attempt++;
                this.logger.error(`Failed to initialize jetstream client (attempt ${attempt}):`, 
                    (error as Error).message
                );
            }
            // Wait for the next attempt (retry)
            const delay = Math.min(1_000 * attempt, 10_000); // Delay (min: 1s, max: 10s)
            await new Promise(resolve => setTimeout(resolve, delay));
        }
    }

    private listenServerEvents(): void {
        const natsConnection = this.nc!;

        // Listen to connection events
        natsConnection.closed().then((err: void | Error) => {
            // Set the connection as closed
            this.connection.close();
            if (err) {
                // Log the error and reset the connection
                this.logger.error(`NATS connection closed with an error:`, err.message, err.cause);
                setTimeout(() => { this.start(); }, 1_000);
            } else {
                this.logger.info(`NATS connection closed.`);
            }
        });

        (async () => {
            // Listen to connection events
            for await (const s of natsConnection.status()) {
                switch (s.type) {
                    // Client disconnected
                    case "disconnect":
                        this.connection.close();
                        this.logger.info(`client disconnected - ${s.server}`);
                        break;
                    // Client is attempting to reconnect
                    case "reconnecting":
                        this.connection.close();
                        this.logger.info("client is attempting to reconnect...");
                        break;
                    // Client reconnected
                    case "reconnect":
                        this.connection.open();
                        this.logger.info(`client reconnected - ${s.server}`);
                        break;
                    // Client received a signal telling it that the server is transitioning to Lame Duck Mode
                    case "ldm":
                        this.logger.info(`client transitioning to Lame Duck Mode - ${s.server}`);
                        break;
                    // Client received a cluster update
                    case "update":
                        if (s.added && s.added.length > 0) {
                            this.logger.info(`cluster update - ${s.added} added`);
                        }
                        if (s.deleted && s.deleted.length > 0) {
                            this.logger.info(`cluster update - ${s.deleted} removed`);
                        }
                        break;
                    // Client received an async error from the server
                    case "error":
                        this.logger.info(`client got an error - ${s.error}`);
                        break;
                    // Client has a stale connection
                    case "staleConnection":
                        this.logger.info("client has a stale connection");
                        break;
                    // Client initiated a reconnect
                    case "forceReconnect":
                        this.logger.info("client initiated a reconnect");
                        break;
                    // Client is slow
                    case "slowConsumer":
                        this.logger.info(`client is slow - ${s.sub.getSubject()} ${s.pending} pending messages`);
                        break;
                    // Ping
                    case "ping":
                        break;
                    // Unknown status
                    default:
                        this.logger.error(`got an unknown status (${s.type}): ${JSON.stringify(s)}`);
                        break;
                }
            }
        })().then();
    }
}
