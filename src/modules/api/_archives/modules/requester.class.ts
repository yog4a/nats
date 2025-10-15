import type { Subscription, MsgHdrs } from '@nats-io/nats-core';
import type { PubAck } from '@nats-io/jetstream';
import type { Client } from "src/core/client.class";
import { withExpiration } from 'src/utils/timeout.utils';
import { decompress } from 'src/utils/snappy.utils';

import { streamConfig, type Config } from '../config/stream.config.js';
import { Common, type StreamConfig, type Request, type Response } from '../classes/common.class';

// Types
// ===========================================================

export type RequesterOptions = {
    maxAttempts: number;
    timeoutProcess: number;
    warnThreshold: number;
    maxConcurrent: number,
    debug: boolean;
};

export type RequesterQueue = {
    subject: string;
    payload: string;
    resolve: (value: any) => void;
    reject: (reason?: any) => void;
};

// Class
// ===========================================================

export class Requester extends Common {
    private readonly config: StreamConfig;
    private readonly options: RequesterOptions;

    private queue: Array<RequesterQueue> = [];
    private lastActiveRequestsAlert: number = 0;

    private isProcessing: boolean = false;
    private isShuttingDown: boolean = false;

    // Constructor

    constructor(
        client: Client,
        config: Config,
        options?: Partial<RequesterOptions>
    ) {
        super(client, {
            streamName: config.streamName,
            debug: options?.debug,
        });

        // Options (class)
        this.options = {
            maxAttempts: options?.maxAttempts ?? 2,
            timeoutProcess: options?.timeoutProcess ?? 15_000,
            warnThreshold: options?.warnThreshold ?? 100,
            maxConcurrent: options?.maxConcurrent ?? 10,
            debug: options?.debug ?? false,
        } satisfies RequesterOptions;

        // Setup the stream
        this.config = streamConfig(config);
        this.setupStream(this.config);
    }

    // Public

    public async request<T>(_subject: string, _request: Request['request']): Promise<T> {
        // Constants
        const subject = this.setSubject(_subject);
        const payload = this.createPayload({ request: _request });

        // Execute the request
        const result = (new Promise((resolve, reject) => {
            this.queue.push({ subject, payload, resolve, reject });
            this.processRequests();
        }));

        // Verify the active requests
        this.verifyActiveRequests();

        // Wait for the result
        return (await result) as T;
    }

    public async shutdown(): Promise<void> {
        if (this.isShuttingDown) {
            return;
        }

        this.isShuttingDown = true;
        this.logger.info(`Shutting down requester...`);

        try {
            while (true) {
                // Wait for all requests to finish
                while (this.queue.length > 0) {
                    this.logger.info(`Waiting ${this.queue.length} requests to process...`);
                    await new Promise(resolve => setTimeout(resolve, 1_000));
                }

                // Grace period
                await new Promise(resolve => setTimeout(resolve, 10_000));

                if (this.queue.length === 0) {
                    break; // All requests finished
                }
            }
        } finally {
            this.isShuttingDown = false;
            this.logger.info('All requests finished!');
        }
    }

    // Private

    private async processRequests(): Promise<void> {
        if (this.isProcessing || this.queue.length === 0) {
            return;
        }

        // Set the processing flag
        this.isProcessing = true;

        try {
            // Process the queue
            while (this.queue.length > 0) {
                this.processRequest();
            }

        } finally {
            this.isProcessing = false;
            setImmediate(() => this.processRequests());
        }
    }

    private async processRequest(): Promise<void> {
        // Process the queue
        const { subject, payload, resolve, reject } = this.queue.shift()!;

        // Create headers and reply data
        const inbox = this.setInbox(subject);
        const headers = this.setHeader(inbox);

        // Attempt to publish the message
        for (let attempt = 1; attempt <= this.options.maxAttempts; attempt++) {
            const expireAt = Date.now() + this.options.timeoutProcess;
            let subscription: Subscription | null = null;
            try {
                // Ensure the class is ready
                await withExpiration(this.isReady(), 'Timeout (class ready)', expireAt);

                // Create the subscription
                subscription = (await this.client.getNatsConnection()).subscribe(inbox);
                const responsePromise = this.waitResponse(subscription, inbox);

                // Send the request
                const sendPromise = this.sendMessage(subject, payload, headers);
                await withExpiration(sendPromise, 'Timeout (send request)', expireAt);

                // Wait for the response
                const response = await withExpiration(responsePromise, 'Timeout (wait response)', expireAt);
                if (response.result) {
                    resolve(response.result);
                } else {
                    reject(new Error(response.error ?? 'Unknown error'));
                }

                break;

            } catch (error) {
                this.logger.error(`Failed to process request in "${subject}" (attempt ${attempt}):`,
                    (error as Error).message,
                );
            } finally {
                subscription?.unsubscribe?.();
            }

            // Wait for the next attempt
            if (attempt < this.options.maxAttempts) {
                await new Promise(resolve => setTimeout(resolve, 100));
            } else {
                reject(new Error(`Failed to process request after ${this.options.maxAttempts} attempts!`, {
                    cause: { subject, payload },
                }));
            }
        }
    }

    private waitResponse(_subscription: Subscription, _inbox: string): Promise<API.Response> {
        return (async () => {
            for await (const msg of _subscription) {
                const result = await decompress(msg.data);
                return this.parsePayload(result);
            }
            throw new Error('Subscription closed before response');
        })();
    }

    private async sendMessage(_subject: string, _payload: string, _headers: MsgHdrs): Promise<PubAck> {
        return (await this.client.getJetstreamClient()).publish(_subject, _payload, {
            headers: _headers,
            timeout: 10_000,
        });
    }

    private verifyActiveRequests(): void {
        // Warn if the number of requests is too high
        if (this.queue.length > 15) {
            // Ensure the alert is not too frequent (10 seconds)
            if (this.lastActiveRequestsAlert < Date.now() - 10_000) { 
                this.logger.warn(`${this.queue.length} requests are active...`);
                this.lastActiveRequestsAlert = Date.now();
            }
        }
    }
}
