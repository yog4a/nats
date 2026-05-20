import type { StreamConfig } from '../../../libs/nats-jetstream.js';
import type { Payload, Headers } from '../types.js';

// ===========================================================
// Types
// ===========================================================

/**
 * Configuration for the StreamPublisher
 */
export type PublisherConfig = {
    /** Name of the stream */
    stream_name: string;
    /** Consumer configuration */
    stream_config: Partial<Omit<StreamConfig, 'name'>>;
};

/**
 * Configuration options for the StreamPublisher
 */
export type PublisherOptions = {
    /** Callback function to log messages */
    onLog?: (...args: any[]) => void;
    /** Callback function to handle errors */
    onError?: (...args: any[]) => void;
    /** Maximum number of attempts to publish a message */
    maxAttempts?: number;
    /** Flag to enable/disable debug mode */
    debug?: boolean;
};
