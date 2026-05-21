import type { PubAck } from '../../../libs/nats-jetstream.js';
import type { JetstreamClient } from '../../../clients.js';
import type { Payload } from '../types.js';
import type { PublisherConfig, PublisherOptions } from './publisher.types.js';

import { PublisherSetup } from './publisher.setup.js';
import { setHeaders } from '../utils/header.utils.js';
import { packPayload, compressPayload } from '../utils/payload.utils.js';

// ===========================================================
// Class
// ===========================================================

/**
 * Class for publishing messages to a NATS stream
 * @extends Common
 * @param {Client} client - The NATS client instance
 * @param {Config} config - Configuration options for the stream
 * @param {Partial<PublisherOptions>} options - Optional publisher options
 */
export class StreamPublisher extends PublisherSetup {   
    /** Compression threshold in bytes (1 MB) */
    private readonly COMPRESSION_THRESHOLD: number = 1024 * 1024;
    /** Counter for tracking active publish operations */
    private activePublishes: number = 0;
    /** Flag indicating if the publisher has been shut down */
    private isShuttingDown: boolean = false;
    /** Resolve promise for draining publishes */
    private drainResolve: (() => void) | null = null;

    // ==============================
    // Constructor
    // ==============================

    /**
     * Creates a new StreamPublisher instance
     * @param {Client} client - The NATS client instance
     * @param {Config} config - Configuration options for the stream
     * @param {Partial<PublisherOptions>} options - Optional publisher options
     */
    constructor(
        client: JetstreamClient,
        config: PublisherConfig,
        options: PublisherOptions,
    ) {
        super(client, config, options);
    }

    // ==============================
    // Public
    // ==============================

    /**
     * Publish a message to a stream with retries
     * @param {string} subject - The subject to publish to
     * @param {Payload} payload - The payload to publish
     * @returns {Promise<PubAck>} - The publish acknowledgment
     */
    public async publish(subject: string, payload: Payload): Promise<PubAck> {
        if (this.isShuttingDown) {
            throw new Error('Publisher is shutting down, cannot publish messages');
        }

        this.incrementActivePublishes();
        try {
            // Payload (convert JSON to buffer)
            const bufferPayload = packPayload(payload, this.options.onLog);
            const needsCompression = bufferPayload.byteLength > this.COMPRESSION_THRESHOLD;

            // Set headers
            const contentType = "application/json";
            const contentEncoding = needsCompression ? "snappy" : "none";
            const createdAt = Date.now().toString();
            const headers = setHeaders({ contentType, contentEncoding, createdAt });

            // Publish the payload
            if (bufferPayload.byteLength > this.COMPRESSION_THRESHOLD) {
                const compressedPayload = compressPayload(bufferPayload, this.options.onLog);
                return await this.send(subject, compressedPayload, headers);
            } else {
                return await this.send(subject, bufferPayload, headers);
            }
        } 
        finally {
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
            this.options.onLog?.(`Publisher is already shutting down...`);
            return; // Already shutting down
        }

        this.isShuttingDown = true;
        this.options.onLog?.(`Shutting down publisher...`);

        if (this.activePublishes > 0) {
            this.options.onLog?.(`Waiting ${this.activePublishes} publishes to process...`);
            await new Promise<void>(r => this.drainResolve = r);
        }

        this.isShuttingDown = false;
        this.options.onLog?.(`Publisher shutdown complete!`);
    }

    // ==============================
    // Private
    // ==============================

    /**
     * Increments the active publishes counter
     * @description This method will increment the active publishes counter
     */
    private incrementActivePublishes(): void {
        this.activePublishes += 1;
    }

    /**
     * Decrements the active publishes counter
     * @description This method will resolve the drain promise if all publishes are finished
     */
    private decrementActivePublishes(): void {
        this.activePublishes -= 1;

        if (this.activePublishes === 0) {
            this.drainResolve?.();
            this.drainResolve = null;
        }
    }
}
