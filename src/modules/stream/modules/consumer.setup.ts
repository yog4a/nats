import type { JetStreamApiError, ConsumerInfo, ConsumerMessages, Consumer, ConsumeOptions } from '../../../libs.js';
import type { JetstreamClient } from '../../../clients.js';
import type { ConsumerConfig, ConsumerOptions } from './consumer.types.js';
import { Common } from '../classes/common.class.js';

// ===========================================================
// Class
// ===========================================================

/**
 * Class for setting up a consumer
 * @extends Common
 * @param {JetstreamClient} client - The NATS jetstream client instance
 * @param {ConsumerConfig} config - The consumer config
 * @param {ConsumerOptions} options - The consumer options
 */
export class ConsumerSetup extends Common {
    /** Consumer setup promise */
    private consumerSetup: Promise<ConsumerInfo> | null = null;

    // ==============================
    // Constructor
    // ==============================

    /**
     * @constructor
     * @param {JetstreamClient} client - NATS Jetstream client instance
     * @param {ConsumerConfig} config - The consumer config
     * @param {ConsumerOptions} options - The consumer options
     */
    constructor(
        protected readonly client: JetstreamClient,
        protected readonly config: ConsumerConfig,
        protected readonly options: ConsumerOptions,
    ) {
        if (!client) {
            throw new Error('Jetstream client is required!');
        }
        if (!config.stream_name) {
            throw new Error('Stream name is required!');
        }
        if (!config.consumer_config.durable_name) {
            throw new Error('Consumer durable name is required!');
        }
        if (!config.consumer_config.ack_wait) {
            throw new Error('Consumer ack wait is required!');
        }
        super(options);
        this.consumerSetup = this.ensureConsumerExists();
    }

    // ==============================
    // Public
    // ==============================

    /**
     * Gets the messages consumer
     * @returns {Promise<ConsumerMessages>} - The messages consumer
     */
    public async getMessagesConsumer(opts?: ConsumeOptions): Promise<ConsumerMessages> {
        const pullConsumer = await this.getPullConsumer();
        const messagesConsumer = await pullConsumer.consume(opts);

        // Log the messages consumer
        this.logMessagesConsumerStatus(messagesConsumer);
        messagesConsumer.closed().then((error) => {
            if (error) {
                this.options.onError?.(`Consumer closed: ${error.message}`);
            }
            this.consumerSetup = null;
        });

        return messagesConsumer;
    }

    // ==============================
    // Private
    // ==============================

    /**
     * Gets the pull consumer after the consumer is ready
     * @returns {Promise<Consumer>} - The pull consumer
     */
    private async getPullConsumer(): Promise<Consumer> {
        this.consumerSetup ??= this.ensureConsumerExists();     // atomic, no double init
        await this.consumerSetup;                               // await the consumer setup

        const { stream_name, consumer_config } = this.config;
        return this.client.consumers.getPullConsumer(stream_name, consumer_config.durable_name);
    }

    /**
     * Ensures the consumer exists (if not, creates it)
     * @returns {Promise<ConsumerInfo>} - The consumer info
     */
    private async ensureConsumerExists(): Promise<ConsumerInfo> {
        const { stream_name, consumer_config } = this.config;
        try {
            // Verify if the consumer exists
            return await this.client.consumers.info(stream_name, consumer_config.durable_name);
        }
        catch (error: unknown) {
            // Not a consumer not found error
            if ((error as JetStreamApiError).name !== "ConsumerNotFoundError") {
                throw error;
            }
            // Wait for the client to be ready and create the consumer
            return await this.client.consumers.create(stream_name, consumer_config.durable_name, consumer_config);
        }
    }

    /**
     * Logs the messages consumer status
     * @param {ConsumerMessages} messagesConsumer - The messages consumer
     */
    private async logMessagesConsumerStatus(messagesConsumer: ConsumerMessages): Promise<void> {
        for await (const status of messagesConsumer.status()) {
            switch (status.type) {
                case "heartbeats_missed":
                    this.options.onLog?.(`Heartbeats missed: ${status.count}`);
                    break;
                case "consumer_not_found":
                    this.options.onLog?.(`Consumer not found: ${status.name} on stream ${status.stream}: ${status.count}`);
                    break;
                case "stream_not_found":
                    this.options.onLog?.(`Stream not found: ${status.name}` + (status.consumerCreateFails !== undefined ? ` (create fails: ${status.consumerCreateFails})` : ""));
                    break;
                case "consumer_deleted":
                    this.options.onLog?.(`Consumer deleted: ${status.code} ${status.description}`);
                    const error = new Error(`Consumer deleted: ${status.code} ${status.description}`);
                    this.consumerSetup = null;
                    messagesConsumer.stop(error);
                    break;
                case "no_responders":
                    this.options.onLog?.(`No responders: code=${status.code}`);
                    break;
                case "ordered_consumer_recreated":
                    this.options.onLog?.(`Ordered consumer recreated: ${status.name}`);
                    break;
                case "exceeded_limits":
                    this.options.onLog?.(`Exceeded limits: code=${status.code}, description=${status.description}`);
                    break;
                case "debug":
                    this.options.onLog?.(`Debug: code=${status.code}, description=${status.description}`);
                    break;
                case "discard":
                    this.options.onLog?.(`Discard: messages left=${status.messagesLeft}, bytes left=${status.bytesLeft}`);
                    break;
                case "reset":
                    this.options.onLog?.(`Consumer reset: ${status.name}`);
                    break;
                case "next":
                    // this.options.onLog?.(`Next pull: options=${JSON.stringify(status.options)}`);
                    break;
                case "heartbeat":
                    this.options.onLog?.(`Heartbeat: lastConsumerSequence=${status.lastConsumerSequence}, lastStreamSequence=${status.lastStreamSequence}`);
                    break;
                case "flow_control":
                    this.options.onLog?.(`Flow control`);
                    break;
                case "consumer_pinned":
                    this.options.onLog?.(`Consumer pinned: id=${status.id}`);
                    break;
                case "consumer_unpinned":
                    this.options.onLog?.(`Consumer unpinned`);
                    break;
                default:
                    this.options.onLog?.(`Unknown consumer status: ${JSON.stringify(status)}`);
            }
        }
    }
}