import type { JetStreamApiError, StreamInfo, ConsumerInfo } from '@nats-io/jetstream';
import type { Client } from "src/core/client.class";
import type { streamConfig, consumerConfig } from '../config';
import { createInbox, headers, type MsgHdrs } from '@nats-io/nats-core';
import { Logger, Gate } from '@yogaajs/classes';

// Types
// ===========================================================

type Options = {
    streamName: string,
    consumerName?: string,
    debug?: boolean;
};

export type StreamConfig = ReturnType<typeof streamConfig>;
export type ConsumerConfig = ReturnType<typeof consumerConfig>;

export type Request = {
    timestamp: number;
    request: Record<string, any>;
};

export type Response = {
    timestamp: number;
} & (
    | { result: Record<string, any>; error: null }
    | { result: null; error: string }
);

// Class
// ===========================================================

export class Common {
    protected readonly client: Client;
    protected readonly logger: Logger;
    protected readonly connection: Gate = new Gate();
    protected readonly streamName: Options['streamName'];

    // Constructor

    constructor(
        client: Client, 
        options: Options,
    ) {
        if (!client) throw new Error('Client is required!');
        if (!options.streamName) throw new Error('Stream name is required!');

        // Setup client
        this.client = client;

        // Setup stream name
        this.streamName = options.streamName;

        // Logger
        const type = options.consumerName ? 'responder' : 'requester';
        const name = options.consumerName ? `[${options.consumerName}]` : '';
        const prefix = `[nats][${type}][${options.streamName}]${name}`;
        this.logger = new Logger(prefix, options.debug);
    }

    // Setup

    protected async isReady(): Promise<void> {
        await this.client.isReady();
        await this.connection.enterOrWait();
    }

    protected async setupStream(config: StreamConfig): Promise<void> {
        try {
            // Verify if the stream exists
            await this.client.streams.info(config.name);

            // Open the gate
            this.connection.open();

        } catch (error) {
            // Not a stream not found error
            if ((error as JetStreamApiError).name !== "StreamNotFoundError") {
                throw error;
            }

            // Create the stream
            await this.client.streams.create(config);

            // Open the gate
            this.connection.open();
        }
    }

    protected async setupConsumer(config: ConsumerConfig): Promise<void> {
        try {
            // Verify if the consumer exists
            await this.client.consumers.info(this.streamName, config.durable_name);

            // Open the gate
            this.connection.open();

        } catch (error) {
            // Not a consumer not found error
            if ((error as JetStreamApiError).name !== "ConsumerNotFoundError") {
                throw error;
            }

            // Create the consumer
            await this.client.consumers.create(this.streamName, config);

            // Open the gate
            this.connection.open();
        }
    }

    // Utilities

    protected setSubject(subject: string): string {
        return `${this.streamName}.${subject}`;
    }
    
    protected getSubject(subject: string): string {
        return subject.replace(`${this.streamName}.`, '');
    }

    protected createPayload(request: Request['request']): string {
        const payload: Request = { timestamp: Date.now(), request };
        return JSON.stringify(payload);
    }

    protected parsePayload(payload: string): Request {
        return JSON.parse(payload) as Request;
    }

    protected setHeader(inbox: string): MsgHdrs {
        const hdrs = headers();
        hdrs.set('reply-inbox', inbox);
        return hdrs;
    }
    
    protected getHeader(hdrs: MsgHdrs): string {
        return hdrs.get('reply-inbox') || '';
    }

    protected setInbox(subject: string): string {
        return createInbox(subject);
    }
}