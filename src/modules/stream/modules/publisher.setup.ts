import type { JetStreamApiError, JetStreamClient, MsgHdrs, PubAck, StreamInfo } from '../../../libs.js';
import type { JetstreamClient } from '../../../clients.js';
import type { PublisherConfig, PublisherOptions } from './publisher.types.js';
import { Common } from '../classes/common.class.js';

// ===========================================================
// Class
// ===========================================================

/**
 * Class for setting up a publisher
 * @extends Common
 * @param {JetstreamClient} client - The NATS jetstream client instance
 * @param {PublisherConfig} config - The publisher config
 * @param {PublisherOptions} options - The publisher options
 */
export class PublisherSetup extends Common {
    /** Stream setup promise */
    private streamSetup: Promise<StreamInfo> | null = null;

    // ==============================
    // Constructor
    // ==============================

    /**
     * @constructor
     * @param {JetstreamClient} client - NATS Jetstream client instance
     * @param {PublisherConfig} config - The publisher config
     * @param {PublisherOptions} options - The publisher options
     */
    constructor(
        protected readonly client: JetstreamClient,
        protected readonly config: PublisherConfig,
        protected readonly options: PublisherOptions,
    ) {
        if (!client) {
            throw new Error('Jetstream client is required!');
        }
        if (!config.stream_name) {
            throw new Error('Stream name is required!');
        }
        super(options);
        this.streamSetup = this.ensureStream();
    }

    // ==============================
    // Public
    // ==============================

    /**
     * Publish a message to a stream with retries
     * @param {string} subject - The subject to publish to
     * @param {Uint8Array} payload - The payload to publish (compressed)
     * @param {MsgHdrs} headers - The headers to publish
     * @returns {Promise<PubAck>} - The publish acknowledgment
     */
    public async send(subject: string, payload: Uint8Array, headers: MsgHdrs): Promise<PubAck> {
        const maxAttempts = Math.max(2, this.options.maxAttempts ?? 2);

        // Retry the publish (X times)
        for (let attempt = 1; attempt <= maxAttempts; attempt++) {
            
            // Ensure client is ready and stream exists
            const jetstreamClient = await this.getJetstreamClient();

            try {
                // Publish the payload
                return await jetstreamClient.publish(subject, payload, {
                    headers: headers,   // Add the headers to the publish options
                    timeout: 15_000,    // Override the timeout ack
                    retries: 0,         // Override the retries by myself (retry with connection ready)
                });
            }
            catch (err: unknown) {
                const name = (err as JetStreamApiError).name;
                       
                // JetStream errors
                if (
                    name === "StreamNotFoundError" || 
                    name === "JetStreamNotEnabled"
                ) {
                    this.streamSetup = null; // force re-create on next attempt with this.getJetstreamClient()
                }
                // Max attempts reached
                if (attempt === maxAttempts) {
                    throw new Error(`cannot send payload (${subject}) after ${maxAttempts} attempts: ${(err as Error).message}`);
                }
                // Retry with delay
                const delay = Math.min(attempt * 1_000, 5_000); // 5 seconds max, 1 second min
                await new Promise((resolve) => setTimeout(resolve, delay));
            }
        }

        // Unreachable: throw an error if the publish fails
        throw new Error(`unreachable: send failed after ${maxAttempts} attempts`);
    }

    // ==============================
    // Private
    // ==============================

    /**
     * Gets the jetstream client after the stream is ready
     * @returns {Promise<JetStreamClient>} - The jetstream client
     */
    private async getJetstreamClient(): Promise<JetStreamClient> {
        this.streamSetup ??= this.ensureStream();   // atomic, no double init
        await this.streamSetup;                     // await the stream setup
        return this.client.getJetstreamClient();
    }

    /**
     * Ensures the stream exists (if not, creates it)
     * @returns {Promise<StreamInfo>} - The stream info
     */
    private async ensureStream(): Promise<StreamInfo> {
        const { stream_name, stream_config } = this.config;
        try {
            // Wait for the client to be ready and ensure the stream exists
            return await this.client.streams.info(stream_name);
        } 
        catch (error: unknown) {
            // Not a stream not found error
            if ((error as JetStreamApiError).name !== "StreamNotFoundError") {
                throw error;
            }
            // Wait for the client to be ready and create the stream
            return await this.client.streams.create({ ...stream_config, name: stream_name });
        } 
    }
}