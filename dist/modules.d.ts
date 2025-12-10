import { StorageType, RetentionPolicy, DiscardPolicy, StreamConfig as StreamConfig$1, JetStreamClient, ConsumerConfig as ConsumerConfig$1, Consumer, StoredMsg, PubAck, DeliverPolicy } from '@nats-io/jetstream';
import { J as JetstreamClient, L as Logger } from './clients-B3deLMNh.js';
import { MsgHdrs } from '@nats-io/nats-core';
import '@nats-io/transport-node';

type Data = string | number | boolean | null | `0x${string}` | `${bigint}` | `${number}` | Array<Data> | {
    [key: string]: Data;
};
type Metadata = string | number | boolean | {
    [key: string]: Metadata;
};
type Headers = {
    pending: number;
    subject: string;
    compressed: boolean;
    createdAt: number;
};
type Payload = {
    data: {
        [key: string]: Data;
    };
    metadata?: {
        [key: string]: Metadata;
    };
};

/**
 * Configuration options for the StreamConfig
 */
type StreamConfig = {
    /** Name of the NATS stream */
    streamName: string;
    /** Storage type for the stream (memory or file) */
    streamStorage: StorageType;
    /** Retention policy for messages in the stream */
    streamRetention: RetentionPolicy;
    /** Policy for discarding messages when limits are reached */
    streamDiscard: DiscardPolicy;
    /** Maximum number of consumers allowed for this stream (-1 for unlimited) */
    streamMaxConsumers?: number;
    /** Maximum age of messages in seconds before they are removed (0 for unlimited) */
    streamMaxAgeSeconds?: number;
    /** Maximum size of the stream in megabytes */
    streamMaxSizeMB: number;
};

type Options = {
    /** Name of the NATS stream */
    streamName: string;
    /** Name of the NATS consumer */
    consumerName?: string;
    /** Flag to enable/disable debug logging */
    debug: boolean;
};
declare class Common {
    protected readonly core: JetstreamClient;
    protected readonly options: Options;
    protected readonly logger: Logger;
    protected streamExists: boolean;
    protected consumerExists: boolean;
    /**
     * @constructor
     * @param {JetstreamClient} core - The NATS jetstream client instance
     * @param {Options} options - The options for the common class
     */
    constructor(core: JetstreamClient, options: Options);
    getStream(config: Partial<StreamConfig$1> & {
        name: string;
    }): Promise<JetStreamClient>;
    getConsumer(streamName: string, config: Partial<ConsumerConfig$1> & {
        durable_name: string;
    }): Promise<Consumer>;
    readMessage(msg: StoredMsg): {
        subject: string;
        payload: Payload;
    };
    setSubject(subject: string): string;
    getSubject(subject: string): string;
    getHeader(): MsgHdrs;
    createPayload(payload: Payload): Uint8Array;
    parsePayload(data: Uint8Array): Payload;
    compressPayload(packed: Uint8Array): Uint8Array;
    decompressPayload(data: Uint8Array): Uint8Array;
}

/**
 * Configuration options for the StreamPublisher
 */
type PublisherOptions = {
    /** Flag to enable/disable debug mode */
    debug?: boolean;
};
/**
 * Class for publishing messages to a NATS stream
 * @extends Common
 * @param {Client} client - The NATS client instance
 * @param {Config} config - Configuration options for the stream
 * @param {Partial<PublisherOptions>} options - Optional publisher options
 */
declare class StreamPublisher extends Common {
    /** Compression threshold in bytes (1 MB) */
    private readonly COMPRESSION_THRESHOLD;
    /** Publisher configuration */
    private readonly config;
    /** Counter for tracking active publish operations */
    private activePublishes;
    /** Timestamp of the last alert for active publishes */
    private lastActivePublishesAlert;
    /** Flag indicating if the publisher has been shut down */
    private isShuttingDown;
    /**
     * Creates a new StreamPublisher instance
     * @param {Client} client - The NATS client instance
     * @param {Config} config - Configuration options for the stream
     * @param {Partial<PublisherOptions>} options - Optional publisher options
     */
    constructor(client: JetstreamClient, config: StreamConfig, options: PublisherOptions);
    /**
     * Publish a message to a stream with retries
     * @param {string} subj - The subject to publish to
     * @param {Payload['data']} data - The data to publish
     * @param {Payload['metadata']} metadata - Optional metadata to publish
     * @returns {Promise<PubAck>} - The publish acknowledgment
     */
    publish(subj: string, data: Payload['data'], metadata?: Payload['metadata']): Promise<PubAck>;
    /**
     * Shutdown the publisher
     * @description This method will wait for all publishes to finish before shutting down
     * @returns {Promise<void>} - A promise that resolves when the publisher is shutdown
     */
    shutdown(): Promise<void>;
    /**
     * Publishes data to a NATS stream with retries
     * @param {string} subject - The subject to publish to
     * @param {Uint8Array} payload - The payload to publish (compressed)
     * @param {MsgHdrs} headers - The headers to publish
     * @returns {Promise<PubAck>} - The publish acknowledgment
     */
    private sendPayload;
    /**
     * Increments the active publishes counter
     * Warns when there are too many active publishes (debug mode only)
     * @returns {void}
     */
    private incrementActivePublishes;
    /**
     * Decrements the active publishes counter
     * @returns {void}
     */
    private decrementActivePublishes;
}

/**
 * Configuration options for the ConsumerConfig
 */
type ConsumerConfig = {
    /** Name of the NATS stream */
    streamName: string;
    /** Name of the consumer */
    consumerName: string;
    /** Subject filter for the consumer */
    consumerFilterSubject?: string;
    /** Policy for delivering messages to the consumer */
    consumerDeliverPolicy?: DeliverPolicy;
    /** The maximum number of messages without acknowledgement that can be outstanding, once this limit is reached message delivery will be suspended */
    consumerMaxAckPending?: number;
};

/**
 * Configuration options for the StreamConsumer
 */
type ConsumerOptions = {
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
type ConsumerCallback = (subject: string, payload: Payload, headers: Headers) => Promise<void>;
/**
 * Class for consuming messages from a NATS stream
 * @extends Common
 * @param {Client} client - The NATS client instance
 * @param {Config} config - Configuration options for the stream
 * @param {Partial<ConsumerOptions>} options - Optional consumer options
 */
declare class StreamConsumer extends Common {
    /** Mutex for managing concurrent message processing */
    private readonly mutex;
    /** Stream name */
    private readonly streamName;
    /** Consumer configuration */
    private readonly config;
    /** NATS consumer messages instance */
    private consumerMessages;
    /** Flag indicating if subscription is active */
    private subscribeActive;
    /** Flag indicating if unsubscribe operation is in progress */
    private unsubscribeActive;
    /**
     * Creates a new StreamConsumer instance
     * @param {Client} client - The NATS client instance
     * @param {ConsumerConfig} config - Configuration options for the consumer
     * @param {ConsumerOptions} options - Optional consumer options
     */
    constructor(client: JetstreamClient, config: ConsumerConfig, options: ConsumerOptions);
    /**
     * Subscribes to a NATS stream and processes messages
     * @param {Callback} callback - The callback function to process messages
     * @returns {Promise<void>} - A promise that resolves when the subscription is complete
     * @throws {Error} - If the subscription is already active or unsubscribe is running
     */
    subscribe(callback: ConsumerCallback): Promise<void>;
    /**
     * Unsubscribes from a NATS stream and stops message processing
     * @returns {Promise<void>} - A promise that resolves when the unsubscribe is complete
     */
    unsubscribe(): Promise<void>;
    /**
     * Sets up the messages consumer
     * @param {Callback} callback - The callback function to process messages
     * @returns {Promise<void>} - A promise that resolves when the messages consumer is setup
     */
    private setupMessagesConsumer;
    /**
     * Consumes a message from the NATS stream
     * @param {JsMsg} msg - The NATS message
     * @param {Callback} callback - The callback function to process messages
     * @returns {Promise<void>} - A promise that resolves when the message is consumed
     */
    private consumeMessage;
    /**
     * Creates a working signal
     * @param {JsMsg} message - The NATS message
     * @returns {() => void} - A function to clear the working signal
     */
    private createWorkingSignal;
}

export { type ConsumerCallback, type ConsumerConfig, type ConsumerOptions, type PublisherOptions, type StreamConfig, StreamConsumer, type Headers as StreamHeaders, type Payload as StreamPayload, StreamPublisher };
