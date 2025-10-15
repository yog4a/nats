import type { JsMsg, ConsumerMessages } from 'src/libs/nats-jetstream.js';
import type { JetstreamClient } from "src/clients/client.jetstream.js";
import type { Payload, Headers } from '../types.js';
import { setConsumerConfig, type ConsumerConfig } from '../config/consumer.config.js';
import { Common } from '../classes/common.class.js';
import { Mutex } from 'src/classes/mutex.class.js';

// Types
// ===========================================================

/**
 * Configuration options for the StreamConsumer
 */
export type ConsumerOptions = {
    /** Maximum number of concurrent message processing operations */
    maxConcurrent: number;
    /** Flag to enable/disable debug logging */
    debug?: boolean;
}; 

/**
 * Callback function type for processing messages
 * @param {string} subject - The subject the message was received on
 * @param {Headers} headers - The headers of the message
 * @param {Payload} payload - The parsed message payload
 * @returns {Promise<void>} - A promise that resolves when message processing is complete
 */
export type ConsumerCallback = (
    subject: string, 
    payload: Payload,
    headers: Headers,
) => Promise<void>;

// Class
// ===========================================================

/**
 * Class for consuming messages from a NATS stream
 * @extends Common
 * @param {Client} client - The NATS client instance
 * @param {Config} config - Configuration options for the stream
 * @param {Partial<ConsumerOptions>} options - Optional consumer options
 */
export class StreamConsumer extends Common {
    /** Mutex for managing concurrent message processing */
    private readonly mutex: Mutex;
    /** Stream name */
    private readonly streamName: string;
    /** Consumer configuration */
    private readonly config: ReturnType<typeof setConsumerConfig>;
    /** NATS consumer messages instance */
    private consumerMessages: ConsumerMessages | null = null;
    /** Flag indicating if subscription is active */
    private subscribeActive: boolean = false;
    /** Flag indicating if unsubscribe operation is in progress */
    private unsubscribeActive: boolean = false;
    /**
     * Creates a new StreamConsumer instance
     * @param {Client} client - The NATS client instance
     * @param {ConsumerConfig} config - Configuration options for the consumer
     * @param {ConsumerOptions} options - Optional consumer options
     */
    constructor(
        client: JetstreamClient,
        config: ConsumerConfig,
        options: ConsumerOptions,
    ) {
        super(client, {
            streamName: config.streamName,
            consumerName: config.consumerName,
            debug: options?.debug ?? false,
        });

        this.mutex = new Mutex({
            maxConcurrent: Math.max(Math.floor(options.maxConcurrent), 1),
        });

        this.config = setConsumerConfig(config);
        this.streamName = config.streamName;
        this.getConsumer(this.streamName, this.config);
    }

    // Public

    /**
     * Subscribes to a NATS stream and processes messages
     * @param {Callback} callback - The callback function to process messages
     * @returns {Promise<void>} - A promise that resolves when the subscription is complete
     * @throws {Error} - If the subscription is already active or unsubscribe is running
     */
    public async subscribe(callback: ConsumerCallback): Promise<void> {
        if (this.subscribeActive) {
            if (this.options.debug) {
                this.logger.info("Subscription is already active!");
            }
            return;
        }
        if (this.unsubscribeActive) {
            if (this.options.debug) {
                this.logger.info("Unsubscribe is already running...");
            }
            return;
        }

        // Set flag
        this.subscribeActive = true;

        // Log the subscription
        this.logger.info(`subscribe started!`);

        try {
            // Setup the messages consumer
            await this.setupMessagesConsumer(callback);

        } finally { 
            // Reset flag
            this.subscribeActive = false;
            this.logger.info(`subscribe terminated!`);
        }
    }

    /**
     * Unsubscribes from a NATS stream and stops message processing
     * @returns {Promise<void>} - A promise that resolves when the unsubscribe is complete
     */
    public async unsubscribe(): Promise<void> {
        if (!this.subscribeActive) {
            if (this.options.debug) {
                this.logger.info("Subscription is not active!");
            }
            return;
        }
        if (this.unsubscribeActive) {
            if (this.options.debug) {
                this.logger.info("Unsubscribe is already running...");
            }
            return;
        }

        // Set flag
        this.unsubscribeActive = true;
        
        // Log the unsubscribe
        this.logger.info(`unsubscribe started!`);

        try {
            // Stop the consumer (exit the infinite loop)
            if (this.consumerMessages) {
                this.consumerMessages.stop();
            }

            // Wait for the consumer to be stopped
            while (this.subscribeActive) {
                if (this.options.debug) {
                    const activeCount = this.mutex.activeCount;
                    const waitingCount = this.mutex.waitingCount;
                    this.logger.info(`waiting for ${activeCount} active and ${waitingCount} waiting operations to finish...`);
                }
                await new Promise(resolve => setTimeout(resolve, 2_000));
            }

        } finally {
            // Reset flag
            this.unsubscribeActive = false;
            this.logger.info(`unsubscribe terminated!`);
        }
    }

    // Private

    /**
     * Sets up the messages consumer
     * @param {Callback} callback - The callback function to process messages
     * @returns {Promise<void>} - A promise that resolves when the messages consumer is setup
     */
    private async setupMessagesConsumer(callback: ConsumerCallback, attempt: number = 0): Promise<void> {
        // This is the basic pattern for processing messages forever
        while (!this.unsubscribeActive) {
            try {
                // Get the consumer and messages consumer
                const consumer = await this.getConsumer(this.streamName, this.config);
                this.consumerMessages = await consumer.consume({ max_messages: 1 });

                // Log the subscription
                this.logger.info(`consumer alive!`);
                attempt = 0;

                // Consume messages (infinite loop)
                for await (const msg of this.consumerMessages!) {
                    if (this.options.debug) {
                        this.logger.info(
                            `active operations: ${this.mutex.activeCount}`,
                            `waiting operations: ${this.mutex.waitingCount}`,
                        );
                    }
                    // Limit concurrent operations
                    await this.mutex.run(async () => {
                        // Consume the message
                        await this.consumeMessage(msg, callback);
                    });
                }

                // Log the subscription
                this.logger.info(`consumer stopped!`);

                // If the processing is stop without an error, break the while loop
                break;
    
            } catch (error) {
                attempt++;
                this.logger.error(`subscription error:`, 
                    (error as Error).message,
                );
            }

            // Wait (avoid infinite loop)
            const delay = Math.min(1_000 * attempt, 10_000); // Delay (min: 1s, max: 10s)
            await new Promise(resolve => setTimeout(resolve, delay));
        }

        // Stop the consumer (additional security)
        if (this.consumerMessages) {
            await this.consumerMessages.close();
            this.consumerMessages = null;
        }
    }

    /**
     * Consumes a message from the NATS stream
     * @param {JsMsg} msg - The NATS message
     * @param {Callback} callback - The callback function to process messages
     * @returns {Promise<void>} - A promise that resolves when the message is consumed
     */
    private async consumeMessage(msg: JsMsg, callback: ConsumerCallback): Promise<void> {
        // Create a working signal
        const clearWorkingSignal = this.createWorkingSignal(msg);

        try {
            // Decode msg
            const subject = this.getSubject(msg.subject);

            // Decode headers
            const createdAt = msg.headers!.get('created_at');
            const compressed = msg.headers!.get('compressed');

            // Headers
            const headers = {
                subject,
                compressed: compressed === 'true',
                createdAt: Number(createdAt),
                pending: Number(msg.info.pending),
            };

            // Decode the payload
            try {
                if (compressed === 'true') {
                    const dPayload = this.decompressPayload(msg.data);
                    const payload = this.parsePayload(dPayload);
                    await callback(subject, payload, headers);
                } else {
                    const payload = this.parsePayload(msg.data);
                    await callback(subject, payload, headers);
                }
                msg.ack(); 
            } 
            catch (error) {
                msg.term(); // Message has not been processed (not acknowledged)
                this.logger.error(`cannot process message (${msg.subject}):`, 
                    (error as Error).message,
                );
            }
        } 
        catch (error) {
            msg.nak(); // Message has not been processed (not acknowledged)
            this.logger.error(`cannot process message (${msg.subject}):`, 
                (error as Error).message,
            );
        } 
        finally {
            clearWorkingSignal();
        }
    }

    /**
     * Creates a working signal
     * @param {JsMsg} message - The NATS message
     * @returns {() => void} - A function to clear the working signal
     */
    private createWorkingSignal(message: JsMsg): () => void {
        const ackWaitMs = (this.config.ack_wait) / 1_000_000;
        const intervalDelay = Math.floor(ackWaitMs * 0.75);

        const workingInterval = setInterval(() => {
            message.working();
        }, intervalDelay);
        
        return () => {
            clearInterval(workingInterval);
        }
    }
}