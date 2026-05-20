import type { ConsumerConfig as NatsConsumerConfig, DeliveryInfo } from '../../../libs/nats-jetstream.js';
import type { Headers } from '../utils/header.utils.js';
import type { Payload } from '../utils/payload.utils.js';

// ===========================================================
// Types
// ===========================================================

/**
 * Configuration for the StreamConsumer
 */
export type ConsumerConfig = {
    /** Name of the stream */
    stream_name: string;
    /** Consumer configuration */
    consumer_config: NatsConsumerConfig & {
        /** Unique name for a durable consumer */
        durable_name: string;
        /** How long (in nanoseconds) to allow messages to remain un-acknowledged before attempting redelivery */
        ack_wait: number;
    };
};

/**
 * Configuration options for the StreamConsumer
 */
export type ConsumerOptions = {
    /** Callback function to log messages */
    onLog?: (...args: any[]) => void;
    /** Callback function to handle errors */
    onError?: (...args: any[]) => void;
    /** Flag to enable/disable debug mode */
    debug?: boolean;
};

/**
 * Callback function type for processing messages
 * @param {string} subject - The subject the message was received on
 * @param {Headers} headers - The headers of the message
 * @param {Payload} payload - The parsed message payload
 * @returns {Promise<void>} - A promise that resolves when message processing is complete
 */
export type ConsumerCallback = (
    subject: string,
    payload: Payload,
    headers: Headers,
    info: DeliveryInfo,
) => Promise<void>;
