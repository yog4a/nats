import type { MsgHdrs } from 'src/libs/nats-core.js';
import type { PubAck } from 'src/libs/nats-jetstream.js';
import type { JetstreamClient } from "src/clients/client.jetstream.js";
import type { Payload } from '../types.js';
import { setStreamConfig, type StreamConfig } from '../config/stream.config.js';
import { Common } from '../classes/common.class.js';    

// Types
// ===========================================================

/**
 * Configuration options for the StreamPublisher
 */
export type PublisherOptions = {
    /** Flag to enable/disable debug mode */
    debug?: boolean;
}; 

// Class
// ===========================================================

/**
 * Class for publishing messages to a NATS stream
 * @extends Common
 * @param {Client} client - The NATS client instance
 * @param {Config} config - Configuration options for the stream
 * @param {Partial<PublisherOptions>} options - Optional publisher options
 */
export class StreamPublisher extends Common {
    /** Compression threshold in bytes (1 MB) */
    private readonly COMPRESSION_THRESHOLD: number = 1024 * 1024;
    /** Publisher configuration */
    private readonly config: ReturnType<typeof setStreamConfig>;
    /** Counter for tracking active publish operations */
    private activePublishes: number = 0;
    /** Timestamp of the last alert for active publishes */
    private lastActivePublishesAlert: number = 0;
    /** Flag indicating if the publisher has been shut down */
    private isShuttingDown: boolean = false;
    /**
     * Creates a new StreamPublisher instance
     * @param {Client} client - The NATS client instance
     * @param {Config} config - Configuration options for the stream
     * @param {Partial<PublisherOptions>} options - Optional publisher options
     */
    constructor(
        client: JetstreamClient,
        config: StreamConfig,
        options: PublisherOptions,
    ) {
        super(client, {
            streamName: config.streamName,
            consumerName: undefined,
            debug: options?.debug ?? false,
        });

        this.config = setStreamConfig(config);
        this.getStream(this.config);
    }

    // Public

    /**
     * Publish a message to a stream with retries
     * @param {string} subj - The subject to publish to
     * @param {Payload['data']} data - The data to publish
     * @param {Payload['metadata']} metadata - Optional metadata to publish
     * @returns {Promise<PubAck>} - The publish acknowledgment
     */
    public async publish(subj: string, data: Payload['data'], metadata?: Payload['metadata']): Promise<PubAck> {
        this.incrementActivePublishes();
        try {
            // Constants
            const headers = this.getHeader();
            const subject = this.setSubject(subj);
            const payload = this.createPayload({ metadata, data });

            // Compression
            const sizeInBytes = payload.byteLength;
            const compressed = sizeInBytes > this.COMPRESSION_THRESHOLD;

            // Set headers
            headers.set('created_at', Date.now().toString());           // Timestamp
            headers.set('compressed', String(compressed));              // Compression above 1 MB

            // Compress the payload
            const cPayload = compressed ? this.compressPayload(payload) : payload;

            // Publish the payload
            return await this.sendPayload(subject, cPayload, headers);
            
        } finally {
            this.decrementActivePublishes();
        }
    }

    /**
     * Shutdown the publisher
     * @description This method will wait for all publishes to finish before shutting down
     * @returns {Promise<void>} - A promise that resolves when the publisher is shutdown
     */
    public async shutdown(): Promise<void> {
        if (this.isShuttingDown) {
            if (this.options.debug) {
                this.logger.info(`Publisher is already shutting down...`);
            }
            return;
        }

        this.isShuttingDown = true;
        if (this.options.debug) {
            this.logger.info(`Shutting down publisher...`);
        }

        try {
            while (true) {
                let lastActivePublishes = -1;

                // Wait for all requests to finish
                while (this.activePublishes > 0) {
                    if (lastActivePublishes !== this.activePublishes) {
                        if (this.options.debug) {
                            this.logger.info(`Waiting ${this.activePublishes} publishes to process...`);
                        }
                        lastActivePublishes = this.activePublishes;
                    }
                    await new Promise(resolve => setTimeout(resolve, 1_000));
                }

                if (this.activePublishes === 0) {
                    break; // All publishes finished
                }
            }
        } finally {
            this.isShuttingDown = false;
            if (this.options.debug) {
                this.logger.info('All publishes finished!');
            }
        }
    }

    // Private

    /**
     * Publishes data to a NATS stream with retries
     * @param {string} subject - The subject to publish to
     * @param {Uint8Array} payload - The payload to publish (compressed)
     * @param {MsgHdrs} headers - The headers to publish
     * @returns {Promise<PubAck>} - The publish acknowledgment
     */
    private async sendPayload(subject: string, payload: Uint8Array, headers: MsgHdrs): Promise<PubAck> {
        const maxAttempts = 2;

        // Retry the publish (2 times)
        for (let attempt = 1; attempt <= maxAttempts; attempt++) { 

            // Ensure client is ready and stream exists
            const stream = await this.getStream(this.config);

            try {
                // Publish the payload
                return await stream.publish(subject, payload, {
                    headers: headers, 
                    timeout: 15_000,    // Override the timeout ack
                    retries: 0,         // Override the retries by myself (retry with connection ready)
                });
            } 
            catch (err) {
                // Log the error (debug mode or last attempt)
                if (this.options.debug || attempt === maxAttempts) {
                    this.logger.error(`cannot send payload (${subject}):`, 
                        (err as Error).message,
                    );
                }

                // Wait before retrying
                if (attempt < maxAttempts) {
                    const delay = Math.min(attempt * 1_000, 5_000); // 5 seconds max, 1 second min
                    await new Promise((resolve) => setTimeout(resolve, delay));
                }
            }
        }

        // Throw an error if the publish fails
        throw new Error(`cannot send payload (${subject}) after ${maxAttempts} attempts`);
    }

    /**
     * Increments the active publishes counter
     * Warns when there are too many active publishes (debug mode only)
     * @returns {void}
     */
    private incrementActivePublishes(): void {
        this.activePublishes += 1;

        // Check how many publishes are active (debug mode only)
        if (this.activePublishes > 10 && this.options.debug) {

            // Ensure the alert is not too frequent (10 seconds threshold)
            if (this.lastActivePublishesAlert < Date.now() - 10_000) { 
                this.lastActivePublishesAlert = Date.now();
                this.logger.info(`${this.activePublishes} publishes are active...`);
            }
        }
    }

    /**
     * Decrements the active publishes counter
     * @returns {void}
     */
    private decrementActivePublishes(): void {
        this.activePublishes -= 1;
    }
}
