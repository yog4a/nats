import type { JsMsg } from "../../../libs/nats-jetstream.js";
import type { JetstreamClient } from "../../../clients.js";
import type { ConsumerConfig, ConsumerOptions } from './consumer.types.js';

/**
 * Class for consumer utilities
 */
export class ConsumerUtils {
    /** Working interval delay in milliseconds */
    private readonly workingIntervalDelay: number;

    /**
     * @constructor
     * @param {Client} client - The NATS client instance
     * @param {ConsumerConfig} config - Configuration options for the consumer
     * @param {ConsumerOptions} options - Optional consumer options
     */
    constructor(
        client: JetstreamClient,
        config: ConsumerConfig,
        options: ConsumerOptions,
    ) {
        // Calculate the working interval delay (75% of the ack wait)
        const ackWaitMs = (config.consumer_config.ack_wait) / 1_000_000;
        this.workingIntervalDelay = Math.floor(ackWaitMs * 0.75);
    }

    // ==============================
    // Public
    // ==============================

    /**
     * Creates a working signal (keep the message alive during processing)
     * @param {JsMsg} message - The NATS message
     * @returns {() => void} - A function to clear the working signal
     */
    public createWorkingSignal(message: JsMsg): () => void {
        const workingInterval = setInterval(
            () => message.working(),
            this.workingIntervalDelay,
        );

        return () => clearInterval(workingInterval);
    }
}