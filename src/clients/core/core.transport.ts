import type { NodeConnectionOptions, NatsConnection } from '../../libs/nats-transport.js';
import { connect } from '../../libs/nats-transport.js';
import { Gate } from '../../classes/index.js';
import { sleep } from '../utils.js';

// ===========================================================
// Types
// ===========================================================

export type CoreOptions = {
    onLog?: (...args: any[]) => void;
    onError?: (...args: any[]) => void;
    onConnected?: (nc: NatsConnection) => Promise<void>;
    onDisconnected?: (nc: NatsConnection) => Promise<void>;
}

// ===========================================================
// Class
// ===========================================================

export class CoreTransport {
    /* Gate (manage internal connection state) */
    public readonly connection = new Gate();
    /* Nats connection */
    public nc: NatsConnection | null = null;
    /* Runner */
    private wanted: boolean = false;
    /* Runner */
    private runner: Promise<void>;

    // ==============================
    // Constructor
    // ==============================

    constructor(
        public readonly config: NodeConnectionOptions,
        public readonly options: CoreOptions = {},
    ) {
        this.wanted = true;
        this.runner = this.run();
    }

    // ==============================
    // Public
    // ==============================

    public async destroy(): Promise<void> {
        this.wanted = false;

        const current = this.nc;
        this.nc = null;

        if (current) {
            try {
                // drain the NATS connection
                await current.drain();
                this.options.onLog?.(`NATS connection drained.`);
            } 
            catch (drainError) {
                try {
                    // close the NATS connection
                    await current.close();
                    this.options.onLog?.(`NATS connection closed.`);
                } 
                catch (closeError) {
                    this.options.onError?.(`Error destroying NATS connection:`,
                        (drainError as Error).message,
                        (closeError as Error).message
                    );
                }
            }
        }

        await this.runner.catch(() => undefined);
    }

    // ==============================
    // Private
    // ==============================

    private async run(): Promise<void> {
        while (this.wanted) {
            let connection: NatsConnection | null = null;
            try {
                connection = await this.connectLoop();

                if (!connection) {
                    // wanted = true, re-connect
                    // wanted = false, exit
                    continue;
                }

                this.nc = connection;
                this.watchServerStatus(connection).catch((err) => {
                    this.options.onError?.(
                        "NATS server status watcher error:",
                        (err as Error).message,
                    );
                });

                await this.options.onConnected?.(connection);
                this.connection.open();
                this.options.onLog?.("NATS connection initialized.");

                const closedError = await connection.closed();

                if (this.nc === connection) {
                    this.nc = null;
                    this.connection.close();
                    await this.options.onDisconnected?.(connection);
                }

                if (closedError) {
                    this.options.onError?.(
                        "NATS connection closed with an error:",
                        closedError.message,
                        closedError.cause,
                    );
                } else {
                    this.options.onLog?.("NATS connection closed.");
                }
            } 
            catch (runnerError) {
                if (this.nc === connection) {
                    this.nc = null;
                }
                this.connection.close();

                this.options.onError?.(
                    "NATS lifecycle error:",
                    (runnerError as Error).message,
                );
            }

            if (this.wanted) {
                await sleep(2_000);
            }
        }
    }

    private async connectLoop(): Promise<NatsConnection | null> {
        let attempt = 0;

        while (this.wanted) {
            try {
                return await connect(this.config);
            } 
            catch (error: unknown) {
                attempt++;
                this.options.onError?.(
                    `connect attempt ${attempt} failed:`, (error as Error).message
                );
                const delay = Math.min(1_000 * attempt, 15_000);
                await sleep(delay);
            }
        }

        return null;
    }

    private async watchServerStatus(natsConnection: NatsConnection): Promise<void> { 
        // Listen to server status events
        for await (const s of natsConnection.status()) {

            // stale connection
            if (this.nc !== natsConnection) { return; }

            // handle the server status event
            switch (s.type) {

                // Close
                case "close":
                    this.connection.close();
                    this.options.onLog?.(`client close`);
                    return; // Stop the status watcher

                // Client disconnected
                case "disconnect":
                    this.connection.close();
                    this.options.onLog?.(`client disconnected - ${s.server}`);
                    break;

                // Client is attempting to reconnect
                case "reconnecting":
                    this.connection.close();
                    this.options.onLog?.("client is attempting to reconnect...");
                    break;

                // Client reconnected
                case "reconnect":
                    if (this.wanted) {
                        this.connection.open();
                    }
                    this.options.onLog?.(`client reconnected - ${s.server}`);
                    break;

                // Client received a signal telling it that the server is transitioning to Lame Duck Mode
                case "ldm":
                    this.options.onLog?.(`client transitioning to Lame Duck Mode - ${s.server}`);
                    break;

                // Client received a cluster update
                case "update":
                    if (s.added?.length) {
                        this.options.onLog?.(`cluster update - ${s.added} added`);
                    }
                    if (s.deleted?.length) {
                        this.options.onLog?.(`cluster update - ${s.deleted} removed`);
                    }
                    break;

                // Client received an async error from the server
                case "error":
                    this.options.onLog?.(new Error(`client got an error - ${s.error}`));
                    break;

                // Client has a stale connection
                case "staleConnection":
                    this.options.onLog?.("client has a stale connection");
                    break;

                // Client initiated a reconnect
                case "forceReconnect":
                    this.options.onLog?.("client initiated a reconnect");
                    break;

                // Client is slow
                case "slowConsumer":
                    this.options.onLog?.(`client is slow - ${s.sub.getSubject()} ${s.pending} pending messages`);
                    break;

                // Ping
                case "ping":
                    break; // Do nothing

                // Unknown status
                default:
                    this.options.onLog?.(`got an unknown status: ${JSON.stringify(s)}`);
                    break;
            }
        }
    }
}
