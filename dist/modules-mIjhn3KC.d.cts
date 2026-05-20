import { t as __name } from "./chunk-cy2TeOE5.cjs";
import { S as StreamConfig, h as PubAck, i as ConsumerConfig$1, l as DeliveryInfo, m as JsMsg, n as ConsumeOptions, o as ConsumerMessages, x as StoredMsg } from "./nats-jetstream-BL4kUK0G.cjs";
import { t as JetstreamClient } from "./clients-CsEIqCln.cjs";
import { t as MsgHdrs } from "./libs-B5j4qCBb.cjs";

//#region src/modules/stream/modules/publisher.types.d.ts
/**
 * Configuration for the StreamPublisher
 */
type PublisherConfig = {
  /** Name of the stream */stream_name: string; /** Consumer configuration */
  stream_config: Partial<Omit<StreamConfig, 'name'>>;
};
/**
 * Configuration options for the StreamPublisher
 */
type PublisherOptions = {
  /** Callback function to log messages */onLog?: (...args: any[]) => void; /** Callback function to handle errors */
  onError?: (...args: any[]) => void; /** Maximum number of attempts to publish a message */
  maxAttempts?: number; /** Flag to enable/disable debug mode */
  debug?: boolean;
};
//#endregion
//#region src/modules/stream/utils/header.utils.d.ts
type Headers = {
  /** Content encoding of the message. */contentEncoding: "snappy" | "none"; /** Content type of the message. */
  contentType: "application/msgpack"; /** Number of milliseconds elapsed (unix timestamp) */
  createdAt: string;
};
//#endregion
//#region src/modules/stream/utils/payload.utils.d.ts
type Data = string | number | boolean | null | Array<Data> | {
  [key: string]: Data;
};
type Metadata = string | number | boolean | {
  [key: string]: Metadata;
};
type Payload = {
  data: {
    [key: string]: Data;
  };
  metadata?: {
    [key: string]: Metadata;
  };
};
//#endregion
//#region src/modules/stream/modules/consumer.types.d.ts
/**
 * Configuration for the StreamConsumer
 */
type ConsumerConfig = {
  /** Name of the stream */stream_name: string; /** Consumer configuration */
  consumer_config: ConsumerConfig$1 & {
    /** Unique name for a durable consumer */durable_name: string; /** How long (in nanoseconds) to allow messages to remain un-acknowledged before attempting redelivery */
    ack_wait: number;
  };
};
/**
 * Configuration options for the StreamConsumer
 */
type ConsumerOptions = {
  /** Callback function to log messages */onLog?: (...args: any[]) => void; /** Callback function to handle errors */
  onError?: (...args: any[]) => void; /** Flag to enable/disable debug mode */
  debug?: boolean;
};
/**
 * Callback function type for processing messages
 * @param {string} subject - The subject the message was received on
 * @param {Headers} headers - The headers of the message
 * @param {Payload} payload - The parsed message payload
 * @returns {Promise<void>} - A promise that resolves when message processing is complete
 */
type ConsumerCallback = (subject: string, payload: Payload, headers: Headers, info: DeliveryInfo) => Promise<void>;
//#endregion
//#region src/modules/stream/classes/common.class.d.ts
declare class Common {
  /** Flag to enable/disable debug mode */
  protected readonly debug: boolean;
  /**
   * Creates a new Common instance
   * @param {PublisherOptions} options - Optional publisher options
   */
  constructor(options: PublisherOptions);
  /**
   * Reads a stored message from a NATS stream
   * @description This method will read a stored message from a NATS stream and return the subject and payload
   * @param {StoredMsg} msg - The message to read
   * @returns {{ subject: string, headers: Headers, payload: Payload }} - The subject, headers and payload of the message
   */
  readStoredMessage(msg: StoredMsg): {
    subject: string;
    headers: Headers;
    payload: Payload;
  };
  /**
   * Reads a message from a NATS stream
   * @description This method will read a message from a NATS stream and return the subject, headers, payload and info
   * @param {JsMsg} msg - The message to read
   * @returns {{ subject: string, headers: Headers, payload: Payload, info: DeliveryInfo }} - The subject, headers, payload and info of the message
   */
  readStreamMessage(msg: JsMsg): {
    subject: string;
    headers: Headers;
    payload: Payload;
    info: DeliveryInfo;
  };
  /**
   * Reads a message from a NATS stream
   * @description This method will read a message from a NATS stream and return the subject and payload
   * @param {Uint8Array<ArrayBufferLike>} data - The data to read
   * @param {Headers} headers - The headers to read
   * @returns {Payload} - The payload of the message
   */
  private extractPayload;
}
//#endregion
//#region src/modules/stream/modules/publisher.setup.d.ts
/**
 * Class for setting up a publisher
 * @extends Common
 * @param {JetstreamClient} client - The NATS jetstream client instance
 * @param {PublisherConfig} config - The publisher config
 * @param {PublisherOptions} options - The publisher options
 */
declare class PublisherSetup extends Common {
  protected readonly client: JetstreamClient;
  protected readonly config: PublisherConfig;
  protected readonly options: PublisherOptions;
  /** Stream setup promise */
  private streamSetup;
  /**
   * @constructor
   * @param {JetstreamClient} client - NATS Jetstream client instance
   * @param {PublisherConfig} config - The publisher config
   * @param {PublisherOptions} options - The publisher options
   */
  constructor(client: JetstreamClient, config: PublisherConfig, options: PublisherOptions);
  /**
   * Publish a message to a stream with retries
   * @param {string} subject - The subject to publish to
   * @param {Uint8Array} payload - The payload to publish (compressed)
   * @param {MsgHdrs} headers - The headers to publish
   * @returns {Promise<PubAck>} - The publish acknowledgment
   */
  send(subject: string, payload: Uint8Array, headers: MsgHdrs): Promise<PubAck>;
  /**
   * Gets the jetstream client after the stream is ready
   * @returns {Promise<JetStreamClient>} - The jetstream client
   */
  private getJetstreamClient;
  /**
   * Ensures the stream exists (if not, creates it)
   * @returns {Promise<StreamInfo>} - The stream info
   */
  private ensureStream;
}
//#endregion
//#region src/modules/stream/modules/publisher.class.d.ts
/**
 * Class for publishing messages to a NATS stream
 * @extends Common
 * @param {Client} client - The NATS client instance
 * @param {Config} config - Configuration options for the stream
 * @param {Partial<PublisherOptions>} options - Optional publisher options
 */
declare class StreamPublisher extends PublisherSetup {
  /** Compression threshold in bytes (1 MB) */
  private readonly COMPRESSION_THRESHOLD;
  /** Counter for tracking active publish operations */
  private activePublishes;
  /** Flag indicating if the publisher has been shut down */
  private isShuttingDown;
  /** Resolve promise for draining publishes */
  private drainResolve;
  /**
   * Creates a new StreamPublisher instance
   * @param {Client} client - The NATS client instance
   * @param {Config} config - Configuration options for the stream
   * @param {Partial<PublisherOptions>} options - Optional publisher options
   */
  constructor(client: JetstreamClient, config: PublisherConfig, options: PublisherOptions);
  /**
   * Publish a message to a stream with retries
   * @param {string} subject - The subject to publish to
   * @param {Payload} payload - The payload to publish
   * @returns {Promise<PubAck>} - The publish acknowledgment
   */
  publish(subject: string, payload: Payload): Promise<PubAck>;
  /**
   * Shutdown the publisher
   * @description This method will wait for all publishes to finish before shutting down
   * @returns {Promise<void>} - A promise that resolves when the publisher is shutdown
   */
  shutdown(): Promise<void>;
  /**
   * Increments the active publishes counter
   * @description This method will increment the active publishes counter
   */
  private incrementActivePublishes;
  /**
   * Decrements the active publishes counter
   * @description This method will resolve the drain promise if all publishes are finished
   */
  private decrementActivePublishes;
}
//#endregion
//#region src/modules/stream/modules/consumer.setup.d.ts
/**
 * Class for setting up a consumer
 * @extends Common
 * @param {JetstreamClient} client - The NATS jetstream client instance
 * @param {ConsumerConfig} config - The consumer config
 * @param {ConsumerOptions} options - The consumer options
 */
declare class ConsumerSetup extends Common {
  protected readonly client: JetstreamClient;
  protected readonly config: ConsumerConfig;
  protected readonly options: ConsumerOptions;
  /** Consumer setup promise */
  private consumerSetup;
  /**
   * @constructor
   * @param {JetstreamClient} client - NATS Jetstream client instance
   * @param {ConsumerConfig} config - The consumer config
   * @param {ConsumerOptions} options - The consumer options
   */
  constructor(client: JetstreamClient, config: ConsumerConfig, options: ConsumerOptions);
  /**
   * Gets the messages consumer
   * @returns {Promise<ConsumerMessages>} - The messages consumer
   */
  getMessagesConsumer(opts?: ConsumeOptions): Promise<ConsumerMessages>;
  /**
   * Gets the pull consumer after the consumer is ready
   * @returns {Promise<Consumer>} - The pull consumer
   */
  private getPullConsumer;
  /**
   * Ensures the consumer exists (if not, creates it)
   * @returns {Promise<ConsumerInfo>} - The consumer info
   */
  private ensureConsumerExists;
  /**
   * Logs the messages consumer status
   * @param {ConsumerMessages} messagesConsumer - The messages consumer
   */
  private logMessagesConsumerStatus;
}
//#endregion
//#region src/modules/stream/modules/consumer.class.d.ts
/**
 * Class for consuming messages from a NATS stream
 * @extends Common
 * @param {Client} client - The NATS client instance
 * @param {Config} config - Configuration options for the stream
 * @param {Partial<ConsumerOptions>} options - Optional consumer options
 */
declare class StreamConsumer extends ConsumerSetup {
  /** Consumer utilities */
  private readonly consumerUtils;
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
   * Consumes a message from the NATS stream
   * @param {JsMsg} msg - The NATS message
   * @param {Callback} callback - The callback function to process messages
   * @returns {Promise<void>} - A promise that resolves when the message is consumed
   */
  private consumeMessage;
}
//#endregion
export { ConsumerOptions as a, PublisherConfig as c, ConsumerConfig as i, PublisherOptions as l, StreamPublisher as n, Payload as o, ConsumerCallback as r, Headers as s, StreamConsumer as t };
//# sourceMappingURL=modules-mIjhn3KC.d.cts.map