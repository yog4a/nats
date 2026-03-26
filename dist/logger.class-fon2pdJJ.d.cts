import { Consumer, ConsumerConfig, ConsumerInfo, ConsumerUpdateConfig, DeliverPolicy, DiscardPolicy, JetStreamClient, JetStreamManager, PubAck, PushConsumer, RetentionPolicy, StorageType, StoredMsg, StreamConfig } from "@nats-io/jetstream";

//#region \0rolldown/runtime.js
//#endregion
//#region src/classes/logger.class.d.ts
/**
 * Simple logger utility with a prefix and optional debug mode.
 *
 * Provides standard log methods (`info`, `warn`, `error`, `debug`)
 * with consistent formatting and an optional debug toggle.
 */
declare class Logger {
  private readonly prefix;
  private readonly debugMode;
  /**
   * @constructor
   * @param {string} prefix - Text to prepend to all log messages
   * @param {boolean} debugMode - Whether to enable debug mode
   */
  constructor(prefix: string, debugMode?: boolean);
  /** Logs informational messages */
  info(...args: any[]): void;
  /** Logs warning messages */
  warn(...args: any[]): void;
  /** Logs error messages */
  error(...args: any[]): void;
  /** Logs debug messages */
  debug(...args: any[]): void;
  /** Re-throws an error with prefix */
  throw(message: string): void;
  /** Creates a new logger with a suffix */
  child(prefix: string): Logger;
}
//#endregion
export { ConsumerUpdateConfig as a, JetStreamClient as c, PushConsumer as d, RetentionPolicy as f, __name as g, StreamConfig as h, ConsumerInfo as i, JetStreamManager as l, StoredMsg as m, Consumer as n, DeliverPolicy as o, StorageType as p, ConsumerConfig as r, DiscardPolicy as s, Logger as t, PubAck as u };
//# sourceMappingURL=logger.class-fon2pdJJ.d.cts.map