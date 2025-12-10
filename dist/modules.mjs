var __defProp = Object.defineProperty;
var __name = (target, value) => __defProp(target, "name", { value, configurable: true });

// src/modules/stream/config/stream.config.ts
var setStreamConfig = /* @__PURE__ */ __name(({
  streamName,
  streamStorage,
  streamRetention,
  streamDiscard,
  streamMaxSizeMB,
  streamMaxConsumers = 10,
  // 10 consumers
  streamMaxAgeSeconds = 0
  // Unlimited
}) => ({
  "name": streamName,
  // Set the stream name
  "subjects": [`${streamName}.>`],
  // Set the stream subjects
  "storage": streamStorage,
  // Set the stream storage
  "retention": streamRetention,
  // Set the stream retention
  "discard": streamDiscard,
  // Set the stream discard policy
  "max_msgs": -1,
  // Max messages in the stream
  "max_msg_size": -1,
  // Max stream message size
  "max_consumers": streamMaxConsumers,
  // Max consumers for this stream
  "max_age": streamMaxAgeSeconds * 1e9,
  // Nanoseconds
  "max_bytes": streamMaxSizeMB * 1024 * 1024
  // MB
}), "setStreamConfig");

// src/libs/nats-core.ts
import {
  headers
} from "@nats-io/nats-core";

// src/classes/logger.class.ts
var Logger = class _Logger {
  /**
   * @constructor
   * @param {string} prefix - Text to prepend to all log messages
   * @param {boolean} debugMode - Whether to enable debug mode
   */
  constructor(prefix, debugMode = false) {
    this.prefix = prefix;
    this.debugMode = debugMode;
  }
  static {
    __name(this, "Logger");
  }
  // Public methods
  /** Logs informational messages */
  info(...args) {
    try {
      console.info(this.prefix, ...args);
    } catch (error) {
      console.info(this.prefix, "cannot log");
    }
  }
  /** Logs warning messages */
  warn(...args) {
    try {
      console.warn(this.prefix, ...args);
    } catch (error) {
      console.warn(this.prefix, "cannot log");
    }
  }
  /** Logs error messages */
  error(...args) {
    try {
      console.error(this.prefix, ...args);
    } catch (error) {
      console.error(this.prefix, "cannot log");
    }
  }
  /** Logs debug messages */
  debug(...args) {
    if (!this.debugMode) return;
    try {
      console.debug(this.prefix, "\u{1F538}", ...args);
    } catch (error) {
      console.debug(this.prefix, "\u{1F538}", "cannot log");
    }
  }
  /** Re-throws an error with prefix */
  throw(message) {
    throw new Error(`${this.prefix} ${message}`);
  }
  /** Creates a new logger with a suffix */
  child(prefix) {
    return new _Logger(`${this.prefix}${prefix}`);
  }
};

// src/classes/mutex.class.ts
var Mutex = class {
  static {
    __name(this, "Mutex");
  }
  /** Maximum number of concurrent operations allowed */
  maxConcurrent = 1;
  /** Queue of pending operation requests */
  queue = [];
  /** Current number of active operations */
  active = 0;
  /**
   * Creates a new mutex instance
   * @param {number} maxConcurrent - Maximum number of concurrent operations allowed (default: 1)
   */
  constructor({
    maxConcurrent
  }) {
    if (maxConcurrent <= 0) {
      throw new Error("Maximum concurrent operations must be greater than 0");
    }
    this.maxConcurrent = Math.floor(maxConcurrent);
  }
  /**
   * Returns the current number of active operations
   */
  get activeCount() {
    return this.active;
  }
  /**
   * Returns the number of pending slot requests
   */
  get waitingCount() {
    return this.queue.length;
  }
  /**
   * Runs a function while holding a slot, auto-releases on finish/error.
   */
  async run(fn) {
    try {
      await this.acquire();
      return await fn();
    } finally {
      this.release();
    }
  }
  /**
   * Acquires a slot, waiting if necessary until one becomes available
   * @returns A promise that resolves when the slot is acquired
   */
  acquire() {
    if (this.queue.length > 0 || this.active >= this.maxConcurrent) {
      return new Promise((resolve) => {
        this.queue.push({ resolve });
      });
    }
    this.active++;
    return Promise.resolve();
  }
  /**
   * Releases a previously acquired slot
   * If there are waiting slot requests, the next one will be granted
   */
  release() {
    if (this.active <= 0) {
      throw new Error("Release called without a matching acquire");
    }
    this.active--;
    while (this.active < this.maxConcurrent && this.queue.length > 0) {
      const next = this.queue.shift();
      this.active++;
      next.resolve();
    }
  }
};

// src/utils/msgpack.utils.ts
import { encode, decode } from "@msgpack/msgpack";
function pack(input, debug = false) {
  const start = performance.now();
  const encoded = encode(input);
  if (debug) {
    try {
      const duration = performance.now() - start;
      const jsonSize = Buffer.byteLength(JSON.stringify(input), "utf8");
      const packedSize = encoded.byteLength;
      const compression = (jsonSize - packedSize) / jsonSize * 100;
      const compressionPercent = Math.floor(compression);
      const originalSize = (jsonSize / 1024).toFixed(2);
      const compressedSize = (packedSize / 1024).toFixed(2);
      console.log(
        `[msgpack] reduced by ${compressionPercent}% (${originalSize} KB \u2192 ${compressedSize} KB) in ${duration}ms`
      );
    } catch (error) {
      console.error("[msgpack] failed to log packing details:", error);
    }
  }
  return encoded;
}
__name(pack, "pack");
function unpack(input, debug = false) {
  const start = performance.now();
  const decoded = decode(input);
  if (debug) {
    const duration = performance.now() - start;
    console.log(`[msgpack] unpacked in ${duration}ms`);
  }
  return decoded;
}
__name(unpack, "unpack");

// src/utils/snappy.utils.ts
import { compressSync, uncompressSync } from "snappy";
function compress(input, debug = false) {
  const start = performance.now();
  const compressed = compressSync(input);
  if (debug) {
    try {
      const duration = performance.now() - start;
      const originalSize = (input.byteLength / 1024).toFixed(2);
      const compressedSize = (compressed.byteLength / 1024).toFixed(2);
      const ratio = (input.byteLength - compressed.byteLength) / input.byteLength * 100;
      const percent = Math.floor(ratio);
      console.log(
        `[snappy] compressed by ${percent}% (${originalSize} KB \u2192 ${compressedSize} KB) in ${duration}ms`
      );
    } catch (error) {
      console.error("[snappy] failed to log compression details:", error);
    }
  }
  return new Uint8Array(
    compressed.buffer,
    compressed.byteOffset,
    compressed.byteLength
  );
}
__name(compress, "compress");
function decompress(output, debug = false) {
  const start = performance.now();
  const decompressed = uncompressSync(output);
  if (debug) {
    const duration = performance.now() - start;
    console.log(`[snappy] decompressed in ${duration}ms`);
  }
  return new Uint8Array(
    decompressed.buffer,
    decompressed.byteOffset,
    decompressed.byteLength
  );
}
__name(decompress, "decompress");

// src/modules/stream/classes/common.class.ts
var Common = class {
  /**
   * @constructor
   * @param {JetstreamClient} core - The NATS jetstream client instance
   * @param {Options} options - The options for the common class
   */
  constructor(core, options) {
    this.core = core;
    this.options = options;
    const type = options.consumerName ? "consumer" : "publisher";
    if (!core) throw new Error("Core jetstream client is required!");
    if (!options.streamName) throw new Error("Stream name is required!");
    if (type === "consumer" && !options.consumerName) throw new Error("Consumer name is required!");
    const name = options.consumerName ? `[${options.consumerName}]` : "";
    this.logger = new Logger(`[nats][${type}][${options.streamName}]${name}`, options.debug);
  }
  static {
    __name(this, "Common");
  }
  /* Logger */
  logger;
  /* Stream flag (stream is created) */
  streamExists = false;
  /* Consumer flag (consumer is created) */
  consumerExists = false;
  // Setup
  async getStream(config) {
    if (this.streamExists !== true) {
      if (!config.name) {
        throw new Error("Stream name is required!");
      }
      try {
        await this.core.streams.info(config.name);
        this.streamExists = true;
      } catch (error) {
        if (error.name !== "StreamNotFoundError") {
          throw error;
        }
        await this.core.streams.create(config);
        this.streamExists = true;
      }
    }
    const jetstreamClient = await this.core.getJetstreamClient();
    return jetstreamClient;
  }
  async getConsumer(streamName, config) {
    if (this.consumerExists !== true) {
      if (!streamName || !config.durable_name) {
        throw new Error("Stream name and consumer name are required!");
      }
      try {
        await this.core.consumers.info(streamName, config.durable_name);
        this.consumerExists = true;
      } catch (error) {
        if (error.name !== "ConsumerNotFoundError") {
          throw error;
        }
        await this.core.consumers.create(streamName, config.durable_name, config);
        this.consumerExists = true;
      }
    }
    const consumer = await this.core.consumers.getPullConsumer(streamName, config.durable_name);
    return consumer;
  }
  // Utilities
  readMessage(msg) {
    const subject = this.getSubject(msg.subject);
    const compressed = msg.header.get("compressed");
    if (compressed === "true") {
      const dPayload = this.decompressPayload(msg.data);
      const payload = this.parsePayload(dPayload);
      return { subject, payload };
    } else {
      const payload = this.parsePayload(msg.data);
      return { subject, payload };
    }
  }
  setSubject(subject) {
    return `${this.options.streamName}.${subject}`;
  }
  getSubject(subject) {
    return subject.replace(`${this.options.streamName}.`, "");
  }
  getHeader() {
    return headers();
  }
  createPayload(payload) {
    try {
      const packed = pack(payload, this.options.debug);
      return packed;
    } catch (error) {
      this.logger.error("failed to pack only the payload:", error);
      throw error;
    }
  }
  parsePayload(data) {
    try {
      const parsed = unpack(data);
      return {
        data: parsed.data,
        metadata: parsed.metadata
      };
    } catch (error) {
      this.logger.error("failed to unpack only the data:", error);
      throw error;
    }
  }
  compressPayload(packed) {
    try {
      const compressed = compress(packed, this.options.debug);
      return compressed;
    } catch (error) {
      this.logger.error("failed to compress the payload:", error);
      throw error;
    }
  }
  decompressPayload(data) {
    try {
      const decompressed = decompress(data, this.options.debug);
      return decompressed;
    } catch (error) {
      this.logger.error("failed to decompress the payload:", error);
      throw error;
    }
  }
};

// src/modules/stream/modules/publisher.class.ts
var StreamPublisher = class extends Common {
  static {
    __name(this, "StreamPublisher");
  }
  /** Compression threshold in bytes (1 MB) */
  COMPRESSION_THRESHOLD = 1024 * 1024;
  /** Publisher configuration */
  config;
  /** Counter for tracking active publish operations */
  activePublishes = 0;
  /** Timestamp of the last alert for active publishes */
  lastActivePublishesAlert = 0;
  /** Flag indicating if the publisher has been shut down */
  isShuttingDown = false;
  /**
   * Creates a new StreamPublisher instance
   * @param {Client} client - The NATS client instance
   * @param {Config} config - Configuration options for the stream
   * @param {Partial<PublisherOptions>} options - Optional publisher options
   */
  constructor(client, config, options) {
    super(client, {
      streamName: config.streamName,
      consumerName: void 0,
      debug: options?.debug ?? false
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
  async publish(subj, data, metadata) {
    this.incrementActivePublishes();
    try {
      const headers2 = this.getHeader();
      const subject = this.setSubject(subj);
      const payload = this.createPayload({ metadata, data });
      const sizeInBytes = payload.byteLength;
      const compressed = sizeInBytes > this.COMPRESSION_THRESHOLD;
      headers2.set("created_at", Date.now().toString());
      headers2.set("compressed", String(compressed));
      const cPayload = compressed ? this.compressPayload(payload) : payload;
      return await this.sendPayload(subject, cPayload, headers2);
    } finally {
      this.decrementActivePublishes();
    }
  }
  /**
   * Shutdown the publisher
   * @description This method will wait for all publishes to finish before shutting down
   * @returns {Promise<void>} - A promise that resolves when the publisher is shutdown
   */
  async shutdown() {
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
        while (this.activePublishes > 0) {
          if (lastActivePublishes !== this.activePublishes) {
            if (this.options.debug) {
              this.logger.info(`Waiting ${this.activePublishes} publishes to process...`);
            }
            lastActivePublishes = this.activePublishes;
          }
          await new Promise((resolve) => setTimeout(resolve, 1e3));
        }
        if (this.activePublishes === 0) {
          break;
        }
      }
    } finally {
      this.isShuttingDown = false;
      if (this.options.debug) {
        this.logger.info("All publishes finished!");
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
  async sendPayload(subject, payload, headers2) {
    const maxAttempts = 2;
    for (let attempt = 1; attempt <= maxAttempts; attempt++) {
      const stream = await this.getStream(this.config);
      try {
        return await stream.publish(subject, payload, {
          headers: headers2,
          timeout: 15e3,
          // Override the timeout ack
          retries: 0
          // Override the retries by myself (retry with connection ready)
        });
      } catch (err) {
        if (this.options.debug || attempt === maxAttempts) {
          this.logger.error(
            `cannot send payload (${subject}):`,
            err.message
          );
        }
        if (attempt < maxAttempts) {
          const delay = Math.min(attempt * 1e3, 5e3);
          await new Promise((resolve) => setTimeout(resolve, delay));
        }
      }
    }
    throw new Error(`cannot send payload (${subject}) after ${maxAttempts} attempts`);
  }
  /**
   * Increments the active publishes counter
   * Warns when there are too many active publishes (debug mode only)
   * @returns {void}
   */
  incrementActivePublishes() {
    this.activePublishes += 1;
    if (this.activePublishes > 10 && this.options.debug) {
      if (this.lastActivePublishesAlert < Date.now() - 1e4) {
        this.lastActivePublishesAlert = Date.now();
        this.logger.info(`${this.activePublishes} publishes are active...`);
      }
    }
  }
  /**
   * Decrements the active publishes counter
   * @returns {void}
   */
  decrementActivePublishes() {
    this.activePublishes -= 1;
  }
};

// src/libs/nats-jetstream.ts
import {
  StorageType,
  RetentionPolicy,
  DiscardPolicy,
  AckPolicy,
  DeliverPolicy,
  ReplayPolicy,
  jetstreamManager,
  jetstream
} from "@nats-io/jetstream";

// src/modules/stream/config/consumer.config.ts
var setConsumerConfig = /* @__PURE__ */ __name(({
  streamName,
  consumerName,
  consumerFilterSubject = ">",
  consumerDeliverPolicy = DeliverPolicy.All,
  consumerMaxAckPending = 1
}) => ({
  "durable_name": consumerName,
  "filter_subject": `${streamName}.${consumerFilterSubject}`,
  "max_ack_pending": consumerMaxAckPending,
  "deliver_policy": consumerDeliverPolicy,
  // Deliver all messages
  "ack_wait": 10 * 1e3 * 1e6,
  // 10-second ack wait
  "ack_policy": AckPolicy.Explicit,
  // Explicit ack policy
  "replay_policy": ReplayPolicy.Instant
  // Replay original messages
}), "setConsumerConfig");

// src/modules/stream/modules/consumer.class.ts
var StreamConsumer = class extends Common {
  static {
    __name(this, "StreamConsumer");
  }
  /** Mutex for managing concurrent message processing */
  mutex;
  /** Stream name */
  streamName;
  /** Consumer configuration */
  config;
  /** NATS consumer messages instance */
  consumerMessages = null;
  /** Flag indicating if subscription is active */
  subscribeActive = false;
  /** Flag indicating if unsubscribe operation is in progress */
  unsubscribeActive = false;
  /**
   * Creates a new StreamConsumer instance
   * @param {Client} client - The NATS client instance
   * @param {ConsumerConfig} config - Configuration options for the consumer
   * @param {ConsumerOptions} options - Optional consumer options
   */
  constructor(client, config, options) {
    super(client, {
      streamName: config.streamName,
      consumerName: config.consumerName,
      debug: options?.debug ?? false
    });
    this.mutex = new Mutex({
      maxConcurrent: Math.max(Math.floor(options.maxConcurrent), 1)
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
  async subscribe(callback) {
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
    this.subscribeActive = true;
    this.logger.info(`subscribe started!`);
    try {
      await this.setupMessagesConsumer(callback);
    } finally {
      this.subscribeActive = false;
      this.logger.info(`subscribe terminated!`);
    }
  }
  /**
   * Unsubscribes from a NATS stream and stops message processing
   * @returns {Promise<void>} - A promise that resolves when the unsubscribe is complete
   */
  async unsubscribe() {
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
    this.unsubscribeActive = true;
    this.logger.info(`unsubscribe started!`);
    try {
      if (this.consumerMessages) {
        this.consumerMessages.stop();
      }
      while (this.subscribeActive) {
        if (this.options.debug) {
          const activeCount = this.mutex.activeCount;
          const waitingCount = this.mutex.waitingCount;
          this.logger.info(`waiting for ${activeCount} active and ${waitingCount} waiting operations to finish...`);
        }
        await new Promise((resolve) => setTimeout(resolve, 2e3));
      }
    } finally {
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
  async setupMessagesConsumer(callback, attempt = 0) {
    while (!this.unsubscribeActive) {
      try {
        const consumer = await this.getConsumer(this.streamName, this.config);
        this.consumerMessages = await consumer.consume({ max_messages: 1 });
        this.logger.info(`consumer alive!`);
        attempt = 0;
        for await (const msg of this.consumerMessages) {
          if (this.options.debug) {
            this.logger.info(
              `active operations: ${this.mutex.activeCount}`,
              `waiting operations: ${this.mutex.waitingCount}`
            );
          }
          await this.mutex.run(async () => {
            await this.consumeMessage(msg, callback);
          });
        }
        this.logger.info(`consumer stopped!`);
        break;
      } catch (error) {
        attempt++;
        this.logger.error(
          `subscription error:`,
          error.message
        );
      }
      const delay = Math.min(1e3 * attempt, 1e4);
      await new Promise((resolve) => setTimeout(resolve, delay));
    }
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
  async consumeMessage(msg, callback) {
    const clearWorkingSignal = this.createWorkingSignal(msg);
    try {
      const subject = this.getSubject(msg.subject);
      const createdAt = msg.headers.get("created_at");
      const compressed = msg.headers.get("compressed");
      const headers2 = {
        subject,
        compressed: compressed === "true",
        createdAt: Number(createdAt),
        pending: Number(msg.info.pending)
      };
      try {
        if (compressed === "true") {
          const dPayload = this.decompressPayload(msg.data);
          const payload = this.parsePayload(dPayload);
          await callback(subject, payload, headers2);
        } else {
          const payload = this.parsePayload(msg.data);
          await callback(subject, payload, headers2);
        }
        msg.ack();
      } catch (error) {
        msg.term();
        this.logger.error(
          `cannot process message (${msg.subject}):`,
          error.message
        );
      }
    } catch (error) {
      msg.nak();
      this.logger.error(
        `cannot process message (${msg.subject}):`,
        error.message
      );
    } finally {
      clearWorkingSignal();
    }
  }
  /**
   * Creates a working signal
   * @param {JsMsg} message - The NATS message
   * @returns {() => void} - A function to clear the working signal
   */
  createWorkingSignal(message) {
    const ackWaitMs = this.config.ack_wait / 1e6;
    const intervalDelay = Math.floor(ackWaitMs * 0.75);
    const workingInterval = setInterval(() => {
      message.working();
    }, intervalDelay);
    return () => {
      clearInterval(workingInterval);
    };
  }
};
export {
  StreamConsumer,
  StreamPublisher
};
