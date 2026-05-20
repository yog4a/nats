import { t as __name } from "./chunk-cy2TeOE5.cjs";
import { A as WithRequired, C as StreamInfo, D as NatsConnection, O as NodeConnectionOptions, S as StreamConfig, a as ConsumerInfo, f as JetStreamClient, g as PushConsumer, i as ConsumerConfig, p as JetStreamManager, r as Consumer, s as ConsumerUpdateConfig, w as StreamUpdateConfig } from "./nats-jetstream-BL4kUK0G.cjs";

//#region src/clients/jetstream/jetstream.types.d.ts
type JetstreamConfig = NodeConnectionOptions & {
  servers: string | string[];
  reconnect: boolean;
  maxReconnectAttempts: number;
};
type JetstreamOptions = {
  onLog?: (...args: any[]) => void;
  onError?: (...args: any[]) => void;
};
//#endregion
//#region src/classes/gate.class.d.ts
/**
 * Gate class provides a mechanism to control and check gate state (open/closed).
 * It's useful for managing asynchronous initialization processes and ensuring
 * operations only proceed when the gate is open, like a queue waiting to be processed.
 */
declare class Gate {
  /** Tracks whether the door is open */
  private _isOpen;
  /** Tracks the number of waiters currently waiting for the door to open */
  private _waitingCount;
  /** Promise that resolves when the door becomes open */
  private _pendingPromise;
  /** Function to resolve the pending promise when door opens */
  private _pendingResolve;
  /** Function to reject the pending promise if needed */
  private _pendingReject;
  /**
   * Opens the gate and resolves any pending promises.
   * If already open, this method has no effect.
   * @param resolvePending Whether to resolve pending promises (default: true)
   */
  open(resolvePending?: boolean): void;
  /**
   * Closes the gate.
   * If already closed, this method has no effect.
   * This resets any pending promises, requiring callers to wait again.
   * @param rejectPending Whether to reject pending promises (default: false)
   */
  close(rejectPending?: boolean): void;
  /**
   * Waits for the gate to be open before proceeding.
   * If the gate is already open, resolves immediately.
   * If the gate is closed, returns a promise that will resolve when the gate opens.
   * This allows code to wait at the "gate" until it's ready to proceed.
   * @returns A promise that resolves when the gate is open
   */
  enterOrWait(): Promise<void>;
  /**
   * Returns the current state of the gate.
   * @returns true if the gate is open, false if it is closed
   */
  isOpen(): boolean;
  /**
   * Returns the current state of the gate.
   * @returns true if the gate is closed, false if it is open
   */
  isClosed(): boolean;
  /**
   * Returns the number of callers currently waiting for the gate to open.
   * @returns The number of waiters
   */
  getWaitingCount(): number;
  /**
   * Resets the gate to its initial state.
   * Clears the promise, resolve function, reject function, and waiting count.
   */
  private reset;
}
//#endregion
//#region src/clients/jetstream/jetstream.core.d.ts
declare class JetstreamCore {
  readonly config: JetstreamConfig;
  readonly options: JetstreamOptions;
  protected readonly connection: Gate;
  protected nc: NatsConnection | null;
  protected jsc: JetStreamClient | null;
  protected jsm: JetStreamManager | null;
  private wanted;
  private runner;
  constructor(config: JetstreamConfig, options?: JetstreamOptions);
  destroy(): Promise<void>;
  private run;
  private connectLoop;
  private watchServerStatus;
}
//#endregion
//#region src/clients/jetstream/jetstream.streams.d.ts
declare function streamsModule(this: JetstreamClient): {
  list: () => Promise<StreamInfo[]>;
  info: (streamName: StreamConfig["name"]) => Promise<StreamInfo>;
  create: (streamConfig: WithRequired<Partial<StreamConfig>, "name">) => Promise<StreamInfo>;
  update: (streamName: StreamConfig["name"], streamUpdateConfig: Partial<StreamUpdateConfig>) => Promise<StreamInfo>;
  destroy: (streamName: StreamConfig["name"]) => Promise<boolean>;
};
//#endregion
//#region src/clients/jetstream/jetstream.consumers.d.ts
declare function consumersModule(this: JetstreamClient): {
  list: (streamName: string) => Promise<ConsumerInfo[]>;
  info: (streamName: string, consumerName: string) => Promise<ConsumerInfo>;
  create: (streamName: string, consumerName: string, config: Partial<ConsumerConfig>) => Promise<ConsumerInfo>;
  update: (streamName: string, consumerName: string, config: Partial<ConsumerUpdateConfig>) => Promise<ConsumerInfo>;
  destroy: (streamName: string, consumerName: string) => Promise<boolean>;
  getPullConsumer: (streamName: string, consumerName: string) => Promise<Consumer>;
  getPushConsumer: (streamName: string, consumerName: string) => Promise<PushConsumer>;
};
//#endregion
//#region src/clients/jetstream/jetstream.client.d.ts
declare class JetstreamClient extends JetstreamCore {
  readonly streams: ReturnType<typeof streamsModule>;
  readonly consumers: ReturnType<typeof consumersModule>;
  /**
   * @constructor
   * @param connectionOptions - The connection options for the NATS connection
   * @param debug - Whether to enable debug mode
   */
  constructor(config: JetstreamConfig, options?: JetstreamOptions);
  isReady(): Promise<void>;
  getNatsConnection(): Promise<NatsConnection>;
  getJetstreamClient(): Promise<JetStreamClient>;
  getJetstreamManager(): Promise<JetStreamManager>;
}
//#endregion
export { JetstreamOptions as i, JetstreamCore as n, JetstreamConfig as r, JetstreamClient as t };
//# sourceMappingURL=clients-CsEIqCln.d.cts.map