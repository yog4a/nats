import type { JsMsg, ConsumerMessages } from "../../../libs/nats-jetstream.js";
import type { JetstreamClient } from "../../../clients.js";
import type { ConsumerConfig, ConsumerOptions, ConsumerCallback } from './consumer.types.js';
import { ConsumerSetup } from './consumer.setup.js';
import { ConsumerUtils } from './consumer.utils.js';

// ===========================================================
// Class
// ===========================================================

/**
 * Class for consuming messages from a NATS stream
 * @extends Common
 * @param {Client} client - The NATS client instance
 * @param {Config} config - Configuration options for the stream
 * @param {Partial<ConsumerOptions>} options - Optional consumer options
 */
export class StreamConsumer extends ConsumerSetup {
    /** Consumer utilities */
    private readonly consumerUtils: ConsumerUtils;
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
        super(client, config, options);
        this.consumerUtils = new ConsumerUtils(client, config, options);
    }

    // ==============================
    // Public
    // ==============================

    /**
     * Subscribes to a NATS stream and processes messages
     * @param {Callback} callback - The callback function to process messages
     * @returns {Promise<void>} - A promise that resolves when the subscription is complete
     * @throws {Error} - If the subscription is already active or unsubscribe is running
     */
    public async subscribe(callback: ConsumerCallback): Promise<void> {
        if (this.subscribeActive || this.unsubscribeActive) {
            return; // already active or unsubscribe is running
        }
        this.subscribeActive = true;

        // Log the subscription
        this.options.onLog?.("subscribe started!");

        try {
            // Setup the messages consumer
            let attempt = 0;
        
            // This is the basic pattern for processing messages forever
            while (!this.unsubscribeActive) {
                try {
                    // Get the consumer and messages consumer
                    this.consumerMessages = await this.getMessagesConsumer({ max_messages: 1 });
    
                    // Log the subscription
                    this.options.onLog?.("consumer alive!");
                    attempt = 0;

                    // Consume messages (infinite loop)
                    for await (const msg of this.consumerMessages) {
                        await this.consumeMessage(msg, callback);
                    }
    
                    // Log the subscription
                    this.options.onLog?.("consumer stopped!");

                } catch (error: unknown) {
                    attempt++;
                    this.options.onError?.(`subscription error (attempt ${attempt}): ${(error as Error).message}`);
                }
    
                // Wait (avoid infinite loop)
                if (!this.unsubscribeActive) {
                    const delay = Math.min(1_000 * attempt, 10_000); // Delay (min: 1s, max: 10s)
                    await new Promise(resolve => setTimeout(resolve, delay));
                }
            }
    
            // Stop the consumer (additional security)
            if (this.consumerMessages) {
                await this.consumerMessages.close();
                this.consumerMessages = null;
            }
        }
        finally {
            // Reset flag
            this.subscribeActive = false;
            this.options.onLog?.("subscribe terminated!");
        }
    }

    /**
     * Unsubscribes from a NATS stream and stops message processing
     * @returns {Promise<void>} - A promise that resolves when the unsubscribe is complete
     */
    public async unsubscribe(): Promise<void> {
        if (!this.subscribeActive || this.unsubscribeActive) {
            return; // already running or not active
        }
        this.unsubscribeActive = true;

        // Log the unsubscribe
        this.options.onLog?.("unsubscribe started!");

        try {
            // Stop the consumer (exit the infinite loop)
            if (this.consumerMessages) {
                this.consumerMessages.stop();
            }

            // Wait for the consumer to be stopped
            while (this.subscribeActive) {
                this.options.onLog?.("waiting for the subscription to be stopped...");
                await new Promise(resolve => setTimeout(resolve, 2_000));
            }

        } finally {
            // Reset flag
            this.unsubscribeActive = false;
            this.options.onLog?.("unsubscribe terminated!");
        }
    }

    // ==============================
    // Private
    // ==============================

    /**
     * Consumes a message from the NATS stream
     * @param {JsMsg} msg - The NATS message
     * @param {Callback} callback - The callback function to process messages
     * @returns {Promise<void>} - A promise that resolves when the message is consumed
     */
    private async consumeMessage(msg: JsMsg, callback: ConsumerCallback): Promise<void> {
        // Create a working signal
        const clearWorkingSignal = this.consumerUtils.createWorkingSignal(msg);

        try {
            if (!msg.headers) {
                throw new Error('Message headers are required!');
            }
            const { subject, headers, payload, info } = this.readStreamMessage(msg);

            await callback(subject, payload, headers, info);
            msg.ack();
        }
        catch (error: unknown) {
            msg.nak(); // Message has not been processed (not acknowledged)
            throw new Error(`cannot process message (${msg.subject}): ${(error as Error).message}`);
        }
        finally {
            clearWorkingSignal();
        }
    }
}