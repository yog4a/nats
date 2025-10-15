import type { Msg, MsgHdrs, RequestError } from '@nats-io/nats-core';
import type { Core } from "src/core/core.class";
import type { API } from '../types.js';
import { Common } from '../classes/common.class';
import { formatTime } from 'src/utils/time.utils';

// Types
// ===========================================================

export type RequesterOptions = {
    /** The endpoint for the request */
    endpoint: API.Endpoint;
    /** The timeout for the request in milliseconds */
    timeout: number;
    /** The maximum number of retry attempts */
    maxAttempts: number;
    /** Enable debug logging (optional) */
    debug?: boolean;
};

// Class
// ===========================================================

export class Requester extends Common {
    /** Maximum number of concurrent requests before warning */
    private readonly MAX_ACTIVE_REQUESTS = 15;
    /** Minimum time between alerts in milliseconds (10 seconds) */
    private readonly ALERT_INTERVAL = 10_000;
    /** Maximum number of retry attempts */
    private readonly SEND_MAX_ATTEMPTS = 3;
    /** Base delay in milliseconds between retries */
    private readonly SEND_DELAY_MULTIPLIER = 1_000;
    /** Options */
    private readonly options: RequesterOptions;
    /** Active requests */
    private activeRequests: number = 0;
    /** Last active requests alert */
    private lastActiveRequestsAlert: number = 0;
    /** Shutting down */
    private isShuttingDown: boolean = false;

    // Constructor

    constructor(
        client: Core,
        options: RequesterOptions
    ) {
        if (!client) throw new Error('Core is required!');
        if (!options.endpoint) throw new Error('Endpoint is required!');
        if (!options.timeout) throw new Error('Timeout is required!');
        if (!options.maxAttempts) throw new Error('Max attempts is required!');

        // Setup common
        super(client, {
            type: "requester",
            debug: options?.debug,
        });

        // Options (class)
        this.options = {
            endpoint: options.endpoint,
            timeout: Math.max(options?.timeout ?? 0, 10_000),
            maxAttempts: Math.max(options?.maxAttempts ?? 0, 1),
            debug: options?.debug ?? false,
        } satisfies RequesterOptions;
    }

    // Public

    public async request<T>(endpoint: string, request: API.Request['request'], metadata?: API.Request['metadata']): Promise<T> {
        this.activeRequests += 1;
        this.warnActiveRequests();
        try {
            // Constants
            const headers = this.getHeaders();
            const subject = `api.${endpoint}`;
            const payload = this.createPayload({ request, metadata });

            // Send the request
            const response = await this.sendRequest(subject, payload, headers);

            // Process the response
            const message = await this.processResponse(response);

            // Result
            if ('result' in message) {
                return message.result as T;
            } else if ('error' in message) {
                throw new Error(message.error?.message, {
                    cause: message.error?.code,
                });
            } else {
                throw new Error('Unknown error');
            }
        }
        finally {
            this.activeRequests -= 1;
        }
    }

    public async shutdown(): Promise<void> {
        if (this.isShuttingDown) {
            return;
        }

        this.isShuttingDown = true;
        this.logger.info(`Shutting down...`);

        try {
            while (true) {
                // Wait for all requests to finish
                while (this.activeRequests > 0) {
                    this.logger.info(`Waiting ${this.activeRequests} requests to process...`);
                    await new Promise(resolve => setTimeout(resolve, 1_000));
                }

                // Grace period
                await new Promise(resolve => setTimeout(resolve, 10_000));

                if (this.activeRequests === 0) {
                    break; // All requests finished
                }
            }
        } finally {
            this.isShuttingDown = false;
            this.logger.info('Shutdown complete!');
        }
    }

    // Request / Response

    private async sendRequest(subject: string, payload: Uint8Array, headers: MsgHdrs): Promise<Msg> {
        // Request creation timestamp
        headers.set('createdAt', Date.now().toString());
        headers.set('subject', subject);

        // Attempt to send the request with retries
        for (let attempt = 1; attempt <= this.options.maxAttempts; attempt++) {

            // Establish NATS connection
            const natsConnection = await this.client.getNatsConnection();

            // Set request expiration timestamp in headers
            const expireAt = Date.now() + this.options.timeout;
            headers.set('expireAt', expireAt.toString());

            try {
                // Execute NATS request with timeout and headers
                return await natsConnection.request(subject, payload, { 
                    timeout: this.options.timeout,
                    noMux: false,
                    headers
                });

            } catch (error) {
                // Handle no-responders error with exponential backoff
                if ((error as RequestError)?.isNoResponders?.()) {
                    if (attempt < this.options.maxAttempts) {
                        // Calculate exponential backoff delay
                        const delay = this.SEND_DELAY_MULTIPLIER * attempt;
                        await new Promise(resolve => setTimeout(resolve, delay));
                        continue; // Retry the request
                    }
                }
                // Propagate other errors immediately
                throw error;
            }
        }

        // All retry attempts failed
        throw new Error(`Failed to send request (${subject}) after ${this.SEND_MAX_ATTEMPTS} attempts!`);
    }

    private async processResponse(msg: Msg): Promise<API.Response> {
        // Decode the headers
        const createdAt = msg.headers!.get('createdAt');
        const subject = msg.headers!.get('subject');

        // Log the response time
        if (this.options.debug) {
            const duration = Date.now() - parseInt(createdAt);
            this.logger.debug(`response ${subject} processed after: ${formatTime(duration)}`);
        }

        //const message = decompress(msg.data, this.options.debug);
        return this.parsePayload(msg.data) as API.Response;
    }

    // Utilities

    private warnActiveRequests(): void {
        // Check if we've exceeded the maximum concurrent requests threshold
        if (this.activeRequests > this.MAX_ACTIVE_REQUESTS) {
            // Rate limit alerts to prevent log spam
            if (this.lastActiveRequestsAlert < Date.now() - this.ALERT_INTERVAL) { 
                // Only log if enough time has passed since the last alert
                this.logger.warn(`High concurrency detected: ${this.activeRequests} active requests`);
                this.lastActiveRequestsAlert = Date.now();
            }
        }
    }
}
