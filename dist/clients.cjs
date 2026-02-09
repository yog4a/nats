"use strict";
var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __hasOwnProp = Object.prototype.hasOwnProperty;
var __name = (target, value) => __defProp(target, "name", { value, configurable: true });
var __export = (target, all) => {
  for (var name in all)
    __defProp(target, name, { get: all[name], enumerable: true });
};
var __copyProps = (to, from, except, desc) => {
  if (from && typeof from === "object" || typeof from === "function") {
    for (let key of __getOwnPropNames(from))
      if (!__hasOwnProp.call(to, key) && key !== except)
        __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
  }
  return to;
};
var __toCommonJS = (mod) => __copyProps(__defProp({}, "__esModule", { value: true }), mod);

// src/clients.ts
var clients_exports = {};
__export(clients_exports, {
  JetstreamClient: () => JetstreamClient
});
module.exports = __toCommonJS(clients_exports);

// src/libs/nats-jetstream.ts
var import_jetstream = require("@nats-io/jetstream");

// src/libs/nats-transport.ts
var import_transport_node = require("@nats-io/transport-node");

// src/classes/gate.class.ts
var Gate = class {
  static {
    __name(this, "Gate");
  }
  /** Tracks whether the door is open */
  _isOpen = false;
  /** Tracks the number of waiters currently waiting for the door to open */
  _waitingCount = 0;
  /** Promise that resolves when the door becomes open */
  _pendingPromise = null;
  /** Function to resolve the pending promise when door opens */
  _pendingResolve = null;
  /** Function to reject the pending promise if needed */
  _pendingReject = null;
  // Public methods
  /**
   * Opens the gate and resolves any pending promises.
   * If already open, this method has no effect.
   * @param resolvePending Whether to resolve pending promises (default: true)
   */
  open(resolvePending = true) {
    if (this._isOpen !== true) {
      this._isOpen = true;
      if (resolvePending) {
        this._pendingResolve?.();
      }
      this.reset();
    }
  }
  /**
   * Closes the gate.
   * If already closed, this method has no effect.
   * This resets any pending promises, requiring callers to wait again.
   * @param rejectPending Whether to reject pending promises (default: false)
   */
  close(rejectPending = false) {
    if (this._isOpen !== false) {
      this._isOpen = false;
      if (rejectPending) {
        this._pendingReject?.();
      }
      this.reset();
    }
  }
  /**
   * Waits for the gate to be open before proceeding.
   * If the gate is already open, resolves immediately.
   * If the gate is closed, returns a promise that will resolve when the gate opens.
   * This allows code to wait at the "gate" until it's ready to proceed.
   * @returns A promise that resolves when the gate is open
   */
  enterOrWait() {
    if (this._isOpen === true) {
      return Promise.resolve();
    }
    this._waitingCount++;
    if (!this._pendingPromise) {
      this._pendingPromise = new Promise((resolve, reject) => {
        this._pendingResolve = resolve;
        this._pendingReject = reject;
      });
    }
    return this._pendingPromise;
  }
  /**
   * Returns the current state of the gate.
   * @returns true if the gate is open, false if it is closed
   */
  isOpen() {
    return this._isOpen;
  }
  /**
   * Returns the current state of the gate.
   * @returns true if the gate is closed, false if it is open
   */
  isClosed() {
    return this._isOpen === false;
  }
  /**
   * Returns the number of callers currently waiting for the gate to open.
   * @returns The number of waiters
   */
  getWaitingCount() {
    return this._waitingCount;
  }
  // Private methods
  /**
   * Resets the gate to its initial state.
   * Clears the promise, resolve function, reject function, and waiting count.
   */
  reset() {
    this._pendingPromise = null;
    this._pendingResolve = null;
    this._pendingReject = null;
    this._waitingCount = 0;
  }
};

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

// src/clients/core/jetstream.class.ts
var JetstreamCore = class {
  /**
   * @constructor
   * @param connectionOptions - The connection options for the NATS connection
   * @param debug - Whether to enable debug mode
   */
  constructor(connectionOptions, debug = false) {
    this.connectionOptions = connectionOptions;
    this.debug = debug;
  }
  static {
    __name(this, "JetstreamCore");
  }
  /* Gate (manage internal connection state) */
  connection = new Gate();
  /* Logger (manage internal logging messages) */
  logger = new Logger("[Nats][Jetstream]");
  /* Nats connection */
  nc = null;
  /* Jetstream client */
  js = null;
  /* Jetstream manager */
  jsm = null;
  /* Starting flag */
  starting = false;
  /* Stopping flag */
  stopping = false;
  // ===========================================================
  // Public
  // ===========================================================
  async start() {
    if (this.starting) {
      if (this.debug) {
        this.logger.info("Start already in progress, skipping...");
      }
      return;
    }
    this.starting = true;
    try {
      if (this.nc || this.js || this.jsm) {
        await this.stop();
      }
      await this.initNatsConnection();
      await this.initJetstreamClient();
      await this.initJetstreamManager();
      setImmediate(() => {
        this.connection.open();
      });
    } finally {
      this.starting = false;
    }
  }
  async stop() {
    if (this.stopping) {
      if (this.debug) {
        this.logger.info("Stop already in progress, skipping...");
      }
      return;
    }
    this.stopping = true;
    try {
      this.connection.close();
      if (this.jsm) {
        this.jsm = null;
        if (this.debug) {
          this.logger.info(`Jetstream manager stopped.`);
        }
      }
      if (this.js) {
        this.js = null;
        if (this.debug) {
          this.logger.info(`Jetstream client stopped.`);
        }
      }
      if (this.nc) {
        try {
          await this.nc.drain();
          if (this.debug) {
            this.logger.info(`NATS connection drained.`);
          }
        } catch (error) {
          this.logger.error(
            "Error draining NATS connection:",
            error.message
          );
        }
        try {
          await this.nc.close();
          if (this.debug) {
            this.logger.info(`NATS connection closed.`);
          }
        } catch (error) {
          this.logger.error(
            "Error closing NATS connection:",
            error.message
          );
        }
        this.nc = null;
        if (this.debug) {
          this.logger.info(`NATS connection removed.`);
        }
      }
    } finally {
      this.stopping = false;
    }
  }
  // ===========================================================
  // Private
  // ===========================================================
  async initNatsConnection(attempt = 0) {
    if (this.nc) {
      if (this.debug) {
        this.logger.info(`Connection to NATS server already initialized!`);
      }
      return;
    }
    while (!this.nc) {
      try {
        this.nc = await (0, import_transport_node.connect)(this.connectionOptions);
        this.listenServerEvents();
        if (this.debug) {
          this.logger.info(`NATS connection initialized.`);
        }
        break;
      } catch (error) {
        attempt++;
        this.logger.error(
          `NATS connection failed (attempt ${attempt}):`,
          error.message
        );
      }
      const delay = Math.min(1e3 * attempt, 1e4);
      await new Promise((resolve) => setTimeout(resolve, delay));
    }
  }
  async initJetstreamManager(attempt = 0) {
    if (!this.nc) {
      this.logger.error(`Cannot initialize Jetstream manager: Nats connection not initialized!`);
      return;
    }
    if (this.jsm) {
      if (this.debug) {
        this.logger.info(`Jetstream manager already initialized!`);
      }
      return;
    }
    while (!this.jsm) {
      try {
        this.jsm = await (0, import_jetstream.jetstreamManager)(this.nc);
        if (this.debug) {
          this.logger.info(`Jetstream manager initialized.`);
        }
        break;
      } catch (error) {
        attempt++;
        this.logger.error(
          `Failed to initialize jetstream manager (attempt ${attempt}):`,
          error.message
        );
      }
      const delay = Math.min(1e3 * attempt, 1e4);
      await new Promise((resolve) => setTimeout(resolve, delay));
    }
  }
  async initJetstreamClient(attempt = 0) {
    if (!this.nc) {
      this.logger.error(`Cannot initialize Jetstream client: Nats connection not initialized!`);
      return;
    }
    if (this.js) {
      if (this.debug) {
        this.logger.info(`Jetstream client already initialized!`);
      }
      return;
    }
    while (!this.js) {
      try {
        this.js = (0, import_jetstream.jetstream)(this.nc);
        if (this.debug) {
          this.logger.info(`Jetstream client initialized.`);
        }
        break;
      } catch (error) {
        attempt++;
        this.logger.error(
          `Failed to initialize jetstream client (attempt ${attempt}):`,
          error.message
        );
      }
      const delay = Math.min(1e3 * attempt, 1e4);
      await new Promise((resolve) => setTimeout(resolve, delay));
    }
  }
  listenServerEvents() {
    const natsConnection = this.nc;
    natsConnection.closed().then((err) => {
      this.connection.close();
      if (err) {
        this.logger.error(`NATS connection closed with an error:`, err.message, err.cause);
        setTimeout(() => {
          this.start();
        }, 1e3);
      } else {
        this.logger.info(`NATS connection closed.`);
      }
    });
    (async () => {
      for await (const s of natsConnection.status()) {
        switch (s.type) {
          // Client disconnected
          case "disconnect":
            this.connection.close();
            this.logger.info(`client disconnected - ${s.server}`);
            break;
          // Client is attempting to reconnect
          case "reconnecting":
            this.connection.close();
            this.logger.info("client is attempting to reconnect...");
            break;
          // Client reconnected
          case "reconnect":
            this.connection.open();
            this.logger.info(`client reconnected - ${s.server}`);
            break;
          // Client received a signal telling it that the server is transitioning to Lame Duck Mode
          case "ldm":
            this.logger.info(`client transitioning to Lame Duck Mode - ${s.server}`);
            break;
          // Client received a cluster update
          case "update":
            if (s.added && s.added.length > 0) {
              this.logger.info(`cluster update - ${s.added} added`);
            }
            if (s.deleted && s.deleted.length > 0) {
              this.logger.info(`cluster update - ${s.deleted} removed`);
            }
            break;
          // Client received an async error from the server
          case "error":
            this.logger.info(`client got an error - ${s.error}`);
            break;
          // Client has a stale connection
          case "staleConnection":
            this.logger.info("client has a stale connection");
            break;
          // Client initiated a reconnect
          case "forceReconnect":
            this.logger.info("client initiated a reconnect");
            break;
          // Client is slow
          case "slowConsumer":
            this.logger.info(`client is slow - ${s.sub.getSubject()} ${s.pending} pending messages`);
            break;
          // Ping
          case "ping":
            break;
          // Unknown status
          default:
            this.logger.error(`got an unknown status (${s.type}): ${JSON.stringify(s)}`);
            break;
        }
      }
    })().then();
  }
};

// src/clients/modules/streams.module.ts
function streamsModule() {
  const logger = this.core.logger.child("[Streams]");
  const list = /* @__PURE__ */ __name(async () => {
    const jetstreamManager2 = await this.getJetstreamManager();
    const lister = jetstreamManager2.streams.list();
    const streams = [];
    for await (const stream of lister) {
      streams.push(stream);
    }
    return streams;
  }, "list");
  const info = /* @__PURE__ */ __name(async (streamName) => {
    const jetstreamManager2 = await this.getJetstreamManager();
    return await jetstreamManager2.streams.info(streamName);
  }, "info");
  const create = /* @__PURE__ */ __name(async (streamConfig) => {
    const jetstreamManager2 = await this.getJetstreamManager();
    const info2 = await jetstreamManager2.streams.add(streamConfig);
    if (this.debug) {
      logger.info(`Stream "${streamConfig.name}" created!`);
    }
    return info2;
  }, "create");
  const update = /* @__PURE__ */ __name(async (streamName, streamUpdateConfig) => {
    const jetstreamManager2 = await this.getJetstreamManager();
    const info2 = await jetstreamManager2.streams.update(streamName, streamUpdateConfig);
    if (this.debug) {
      logger.info(`Stream "${streamName}" updated!`);
    }
    return info2;
  }, "update");
  const destroy = /* @__PURE__ */ __name(async (streamName) => {
    const jetstreamManager2 = await this.getJetstreamManager();
    const deleted = await jetstreamManager2.streams.delete(streamName);
    if (this.debug) {
      logger.info(`Stream "${streamName}" deleted!`);
    }
    return deleted;
  }, "destroy");
  return {
    list,
    info,
    create,
    update,
    destroy
  };
}
__name(streamsModule, "streamsModule");

// src/clients/modules/consumers.module.ts
function consumersModule() {
  const logger = this.core.logger.child("[Consumers]");
  const list = /* @__PURE__ */ __name(async (streamName) => {
    const jetstreamManager2 = await this.getJetstreamManager();
    const lister = jetstreamManager2.consumers.list(streamName);
    const consumers = [];
    for await (const consumer of lister) {
      consumers.push(consumer);
    }
    return consumers;
  }, "list");
  const info = /* @__PURE__ */ __name(async (streamName, consumerName) => {
    const jetstreamManager2 = await this.getJetstreamManager();
    return await jetstreamManager2.consumers.info(streamName, consumerName);
  }, "info");
  const create = /* @__PURE__ */ __name(async (streamName, consumerName, config) => {
    const jetstreamManager2 = await this.getJetstreamManager();
    const fullConfig = { ...config, name: consumerName };
    const info2 = await jetstreamManager2.consumers.add(streamName, fullConfig);
    if (this.debug) {
      logger.info(`Consumer "${config.durable_name}" created for stream "${streamName}"`);
    }
    return info2;
  }, "create");
  const update = /* @__PURE__ */ __name(async (streamName, consumerName, config) => {
    const jetstreamManager2 = await this.getJetstreamManager();
    const info2 = await jetstreamManager2.consumers.update(streamName, consumerName, config);
    if (this.debug) {
      logger.info(`Consumer "${consumerName}" updated for stream "${streamName}"`);
    }
    return info2;
  }, "update");
  const destroy = /* @__PURE__ */ __name(async (streamName, consumerName) => {
    const jetstreamManager2 = await this.getJetstreamManager();
    const isDeleted = await jetstreamManager2.consumers.delete(streamName, consumerName);
    if (this.debug) {
      logger.info(`Consumer "${consumerName}" deleted from stream "${streamName}"`);
    }
    return isDeleted;
  }, "destroy");
  const getPullConsumer = /* @__PURE__ */ __name(async (streamName, consumerName) => {
    const jetstreamManager2 = await this.getJetstreamManager();
    const info2 = await jetstreamManager2.consumers.info(streamName, consumerName);
    if (!info2.config.durable_name) {
      throw new Error("Consumer is ephemeral");
    }
    if (info2.config.deliver_subject) {
      throw new Error("Consumer is push consumer");
    }
    const jetstreamClient = await this.getJetstreamClient();
    const pullConsumer = await jetstreamClient.consumers.get(streamName, consumerName);
    return pullConsumer;
  }, "getPullConsumer");
  const getPushConsumer = /* @__PURE__ */ __name(async (streamName, consumerName) => {
    const jetstreamManager2 = await this.getJetstreamManager();
    const info2 = await jetstreamManager2.consumers.info(streamName, consumerName);
    if (!info2.config.durable_name) {
      throw new Error("Consumer is ephemeral");
    }
    if (!info2.config.deliver_subject) {
      throw new Error("Consumer is pull consumer");
    }
    const jetstreamClient = await this.getJetstreamClient();
    const pushConsumer = await jetstreamClient.consumers.getPushConsumer(streamName, consumerName);
    return pushConsumer;
  }, "getPushConsumer");
  return {
    list,
    info,
    create,
    update,
    destroy,
    getPullConsumer,
    getPushConsumer
  };
}
__name(consumersModule, "consumersModule");

// src/clients/client.jetstream.ts
var JetstreamClient = class {
  /**
   * @constructor
   * @param connectionOptions - The connection options for the NATS connection
   * @param debug - Whether to enable debug mode
   */
  constructor(connectionOptions, debug = false) {
    this.connectionOptions = connectionOptions;
    this.debug = debug;
    this.core = new JetstreamCore(connectionOptions, debug);
    this.streams = streamsModule.call(this);
    this.consumers = consumersModule.call(this);
  }
  static {
    __name(this, "JetstreamClient");
  }
  /* Jetstream core */
  core;
  /* Streams component */
  streams;
  /* Consumers component */
  consumers;
  // Public (main)
  async start() {
    await this.core.start();
  }
  async stop() {
    await this.core.stop();
  }
  async isReady() {
    return this.core.connection.enterOrWait();
  }
  // Public (variables)
  async getNatsConnection() {
    await this.core.connection.enterOrWait();
    return this.core.nc;
  }
  async getJetstreamClient() {
    await this.core.connection.enterOrWait();
    return this.core.js;
  }
  async getJetstreamManager() {
    await this.core.connection.enterOrWait();
    return this.core.jsm;
  }
};
// Annotate the CommonJS export names for ESM import in node:
0 && (module.exports = {
  JetstreamClient
});
