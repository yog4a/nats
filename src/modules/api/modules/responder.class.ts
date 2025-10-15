import type { Msg, Subscription } from '@nats-io/nats-core';
import type { Core } from "src/core/core.class";
import type { API } from '../types.js';
import { Common } from '../classes/common.class';
import { Mutex } from 'src/classes/mutex.class';
import { formatTime } from 'src/utils/time.utils';

// Types
// ===========================================================

export interface ResponderOptions {
    /** The base endpoint for all API calls, must be unique */
    baseEndpoint: API.Endpoint;
    /** Maximum number of concurrent requests allowed */
    maxConcurrentRequests: number;
    /** The queue group name for the responder */
    queueName: string;
    /** Enable debug logging (optional) */
    debug?: boolean;
};

export type Callback = (
    /* Request */
    request: API.Request['request'], 
    /* Metadata */
    metadata?: API.Request['metadata']
) => (
    Promise<API.Response['result']>
);

// Class
// ===========================================================

export class Responder extends Common {
    /** 1 MiB */
    private readonly ONE_MIB = 1 * 1024 * 1024;
    /** Options */
    private readonly options: ResponderOptions;
    /** Mutex */
    private readonly mutex: Mutex;
    /** Subscription */
    private subscription: Subscription | null = null;
    /** Flags */
    private subscribeActive: boolean = false;
    /** Flags */
    private unsubscribeActive: boolean = false;

    // Constructor

    constructor(
        client: Core,
        options: ResponderOptions
    ) {
        if (!client) throw new Error('Client is required!');
        if (!options.baseEndpoint) throw new Error('Base endpoint is required!');
        if (!options.maxConcurrentRequests) throw new Error('Max concurrent requests is required!');

        // Setup common
        super(client, {
            type: "responder",
            debug: options?.debug ?? false,
        });

        // Options
        this.options = {
            baseEndpoint: options.baseEndpoint,
            maxConcurrentRequests: options.maxConcurrentRequests,
            queueName: options.queueName,
            debug: options.debug,
        } satisfies ResponderOptions;

        // Setup the mutex
        this.mutex = new Mutex({
            maxConcurrent: this.options.maxConcurrentRequests,
        });
    }

    // Public

    public async subscribe(callback: Callback): Promise<void> {
        if (this.subscribeActive) {
            throw new Error("Subscription is already active!");
        }
        if (this.unsubscribeActive) {
            throw new Error("Unsubscribe is already running...");
        }

        // Setup
        this.subscribeActive = true;

        try {
            // This is the basic pattern for processing messages forever
            while (true) {
                try {
                    // Create the subscription
                    await this.createSubscription(this.options.baseEndpoint, this.options.queueName);

                    // Consume messages (infinite loop)
                    for await (const msg of this.subscription!) {
                        const loopEntryTime = Date.now();
                        const createdAt = parseInt(msg.headers!.get('createdAt')!);
                        const loopDelay = loopEntryTime - createdAt;
                        
                        if (this.options.debug) {
                            this.logger.debug(`Loop entry delay: ${loopDelay}ms`);
                        }

                        // Log
                        if (this.options.debug) {
                            this.logger.debug(
                                `active: ${this.mutex.activeCount}`,
                                `waiting: ${this.mutex.waitingCount + 1}`,
                            );
                        }

                        // Lock the mutex
                        await this.mutex.lock();

                        // Process the message
                        this.processRequest(msg, callback)
                            .finally(() => this.mutex.unlock());
                    }

                    // Log the unsubscribe
                    this.logger.info(`subscription stopped!`);

                    // If the processing is stop without an error,
                    // Normal stop (break the while loop)
                    break;
        
                } catch (error) {
                    this.logger.error(`subscription error:`, 
                        (error as Error).message,
                    );
                }

                // Wait for 1 second before retrying
                await new Promise(resolve => setTimeout(resolve, 1_000));
            }

        } finally { 
            // Reset flags
            this.subscribeActive = false;
        }
    }

    public async unsubscribe(): Promise<void> {
        if (!this.subscribeActive) {
            throw new Error("Subscription is not active!");
        }
        if (this.unsubscribeActive) {
            throw new Error("Unsubscribe is already running...");
        }
        if (!this.subscription) {
            throw new Error("Subscription is not created!");
        }

        // Set flags
        this.unsubscribeActive = true;

        try {
            // Drain the subscription - Tells the server to stop sending new messages 
            // and waits for all in-flight messages to be processed before closing
            const drain = this.subscription.drain();

            // Log the max messages before the subscription will unsubscribe
            const max = this.subscription.getMax();
            if (max && max > 0) {
                this.logger.info(`${max} messages before the subscription will unsubscribe.`);
            }

            // Wait for all messages to be processed and finished
            while (this.mutex.activeCount > 0 || this.mutex.waitingCount > 0) {

                // Wait for all messages to be processed
                while (this.mutex.waitingCount > 0) {
                    this.logger.info(`waiting for ${this.mutex.waitingCount} messages to be processed...`);
                    await new Promise(resolve => setTimeout(resolve, 1_000));
                }

                // Wait for all messages to finish
                while (this.mutex.activeCount > 0) {
                    this.logger.info(`waiting for ${this.mutex.activeCount} messages to finish...`);
                    await new Promise(resolve => setTimeout(resolve, 1_000));
                }

                // Wait for 1 second before re-verify
                await new Promise(resolve => setTimeout(resolve, 1_000));
            }

            // Metrics
            this.printMetrics();

            // Wait for drain to finish
            await drain;

            // Wait for the subscription to be stopped
            while (this.subscribeActive) {
                this.logger.info(`waiting for consumer to finish processing...`);
                await new Promise(resolve => setTimeout(resolve, 1_000));
            }

        } finally {
            // Reset the status
            this.unsubscribeActive = false;
            this.logger.info(`unsubscribe terminated!`);
        }
    }

    // Request / Response

    private async processRequest(msg: Msg, callback: Callback): Promise<void> {
        try {
            // Decode the headers
            const createdAt = parseInt(msg.headers!.get('createdAt')!);
            const expireAt = parseInt(msg.headers!.get('expireAt')!);

            // Log the request time
            if (this.options.debug) {
                const duration = Date.now() - createdAt;
                this.logger.debug(`request ${msg.subject} processed after: ${formatTime(duration)}`);
            }

            // Decode the request
            const payload = this.parsePayload(msg.data) as API.Request;

            // Ensure the request is not expired
            if (Date.now() > expireAt) {
                const expired = Date.now() - expireAt;
                this.logger.debug(`request ${msg.subject} expired since: ${formatTime(expired)}`, payload);
                return;
            }

            try {
                // Process the request
                const response = await callback(payload.request, payload?.metadata);
                this.sendResult(msg, response);
                
            } catch (error) {
                this.sendError(msg, {
                    code: (error as any)?.code ?? 500,
                    message: (error as Error).message,
                });
            }
        } catch (error) {
            this.sendError(msg, {
                code: (error as any)?.code ?? 500,
                message: (error as Error).message,
            });
        }
    }

    private async sendResult(msg: Msg, result: API.Response['result']): Promise<void> {
        // Constants
        const headers = this.getHeaders();
        try {
            // Create the payload
            const payload = this.createPayload({ result });
            const isMoreThanOneMiB = payload.byteLength > this.ONE_MIB;

            // Add the timestamp to the headers
            headers.set('createdAt', Date.now().toString());
            headers.set("compressed", isMoreThanOneMiB ? "true" : "false");

            // Compress the payload if it's larger than 1 MiB
            if (isMoreThanOneMiB) {
                //const compressed = await compress(payload, this.options.debug);
                msg.respond(payload, { headers });
            } else {
                msg.respond(payload, { headers });
            }
        } 
        catch (error) {
            // Log the error
            this.logger.error(`cannot send result (${msg?.subject}):`, 
                (error as Error).message,
            );
        }
    }

    private async sendError(msg: Msg, error: API.Response['error']): Promise<void> {
        // Log the error
        this.logger.error(`error processing (${msg?.subject}):`, 
            (error as Error).message,
        );

        // Constants
        const headers = this.getHeaders();
        
        try {
            // Add the timestamp to the headers
            headers.set('createdAt', Date.now().toString());
            headers.set("compressed", "false");

            // Create the payload
            const payload = this.createPayload({ error });

            // Send the response
            msg.respond(payload, { headers });            
        } 
        catch (error) {
            // Log the error
            this.logger.error(`cannot send error (${msg?.subject}):`, 
                (error as Error).message,
            );
        }
    }

    // Subscription

    private async createSubscription(endpoint: string, queue?: string | undefined): Promise<void> {
        // Get subject from endpoint
        const subject = `api.${endpoint}.>`;

        // Get the NATS connection
        const natsConnection = await this.client.getNatsConnection();

        // Subscribe to the subject
        this.subscription = natsConnection.subscribe(subject, { queue });

        // Log the subscribe
        this.logger.info(`subscription started for ${subject} (group: ${queue})`);
    }

    private printMetrics(): void {
        if (this.subscription) {
            // Metrics
            const pending = this.subscription.getPending();
            const received = this.subscription.getReceived();
            const processed = this.subscription.getProcessed();

            // Log the metrics
            this.logger.info(`metrics: ${pending} pending, ${received} received, ${processed} processed`);
        }
    }
}