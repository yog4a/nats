import type { JetStreamApiError, Consumer, StreamConfig, ConsumerConfig, JetStreamClient, StoredMsg } from 'src/libs/nats-jetstream.js';
import type { JetstreamClient } from "src/clients.js";
import type { Payload, Headers } from '../types.js';
import { headers, type MsgHdrs } from 'src/libs/nats-core.js';
import { Logger, Gate } from 'src/classes/index.js';
import { pack, unpack } from 'src/utils/msgpack.utils.js';
import { compress, decompress } from 'src/utils/snappy.utils.js';

// Types
// ===========================================================

type Options = {
    /** Name of the NATS stream */
    streamName: string,
    /** Name of the NATS consumer */
    consumerName?: string,
    /** Flag to enable/disable debug logging */
    debug: boolean;
};

// Class
// ===========================================================

export class Common {
    /* Logger */
    protected readonly logger: Logger;
    /* Stream flag (stream is created) */
    protected streamExists: boolean = false;
    /* Consumer flag (consumer is created) */
    protected consumerExists: boolean = false;
    /**
     * @constructor
     * @param {JetstreamClient} core - The NATS jetstream client instance
     * @param {Options} options - The options for the common class
     */
    constructor(
        protected readonly core: JetstreamClient, 
        protected readonly options: Options,
    ) {
        // Get the type
        const type = options.consumerName ? 'consumer' : 'publisher';

        // Verify the required options
        if (!core) throw new Error('Core jetstream client is required!');
        if (!options.streamName) throw new Error('Stream name is required!');
        if (type === 'consumer' && !options.consumerName) throw new Error('Consumer name is required!');

        // Setup logger
        const name = options.consumerName ? `[${options.consumerName}]` : '';
        this.logger = new Logger(`[nats][${type}][${options.streamName}]${name}`, options.debug);
    }

    // Setup

    public async getStream(config: Partial<StreamConfig> & { name: string }): Promise<JetStreamClient> {
        if (this.streamExists !== true) {
            if (!config.name) {
                throw new Error('Stream name is required!');
            }
            try {
                // Wait for the client to be ready and ensure the stream exists
                await this.core.streams.info(config.name);
                this.streamExists = true;

            } catch (error) {
                // Not a stream not found error
                if ((error as JetStreamApiError).name !== "StreamNotFoundError") {
                    throw error;
                }

                // Wait for the client to be ready and create the stream
                await this.core.streams.create(config);
                this.streamExists = true;
            }
        }
        // Wait for the client to be ready and return the jetstream client
        const jetstreamClient = await this.core.getJetstreamClient();
        return jetstreamClient;
    }

    public async getConsumer(streamName: string, config: Partial<ConsumerConfig> & { durable_name: string }): Promise<Consumer> {
        if (this.consumerExists !== true) {
            if (!streamName || !config.durable_name) {
                throw new Error('Stream name and consumer name are required!');
            }
            try {
                // Verify if the consumer exists
                await this.core.consumers.info(streamName, config.durable_name);
                this.consumerExists = true;

            } catch (error) {
                // Not a consumer not found error
                if ((error as JetStreamApiError).name !== "ConsumerNotFoundError") {
                    throw error;
                }

                // Create the consumer
                await this.core.consumers.create(streamName, config.durable_name, config);
                this.consumerExists = true;
            }
        }
        // Wait for the client to be ready and return the consumer
        const consumer = await this.core.consumers.getPullConsumer(streamName, config.durable_name);
        return consumer;
    }

    // Utilities

    public readMessage(msg: StoredMsg): { subject: string, payload: Payload } {
        // Decode subject
        const subject = this.getSubject(msg.subject);

        // Decode headers
        const compressed = msg.header.get('compressed');

        if (compressed === 'true') {
            const dPayload = this.decompressPayload(msg.data);
            const payload = this.parsePayload(dPayload);
            return { subject, payload };
        } else {
            const payload = this.parsePayload(msg.data);
            return { subject, payload };   
        }
    }

    public setSubject(subject: string): string {
        return `${this.options.streamName}.${subject}`;
    }

    public getSubject(subject: string): string {
        return subject.replace(`${this.options.streamName}.`, '');
    }

    public getHeader(): MsgHdrs {
        return headers();
    }

    public createPayload(payload: Payload): Uint8Array {
        try {
            const packed = pack(payload, this.options.debug);
            return packed;
        } catch (error: unknown) {
            this.logger.error('failed to pack only the payload:', error);
            throw error;
        }
    }

    public parsePayload(data: Uint8Array): Payload {
        try {
            const parsed = unpack(data) as Payload;
            return {
                data: parsed.data,
                metadata: parsed.metadata,
            };
        } catch (error: unknown) {
            this.logger.error('failed to unpack only the data:', error);
            throw error;
        }
    }

    public compressPayload(packed: Uint8Array): Uint8Array {
        try {
            const compressed = compress(packed, this.options.debug);
            return compressed;
        } catch (error: unknown) {
            this.logger.error('failed to compress the payload:', error);
            throw error;
        }
    }

    public decompressPayload(data: Uint8Array): Uint8Array {
        try {
            const decompressed = decompress(data, this.options.debug);   
            return decompressed;
        } catch (error: unknown) {
            this.logger.error('failed to decompress the payload:', error);
            throw error;
        }
    }
}