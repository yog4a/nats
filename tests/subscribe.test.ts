import { client, StreamBlocks } from '../clients/index.js';

// Stream
// ===========================================================

const { 
    config, 
    options, 
    consumer 
} = StreamBlocks.getConsumer({
    chainId: 1,
    index: 1,
});

// Service
// ===========================================================

export class Nats {

    public static subscribe(callback: (payload: any) => Promise<void>) {
        return consumer.subscribe(async (subject, payload, headers) => {
            await callback(payload);
        });
    }

    public static async printStreamInfo(): Promise<any | null> {
        const { streamName } = config;
        const stream = await client.streams.info(streamName);
        console.log(stream.state);
    }

    public static async printConsumerInfo(): Promise<any | null> {
        const { streamName, consumerName } = config;
        const consumers = await client.consumers.list(streamName);
        console.log(consumers);
    }

    public static async printRemainingMessages(): Promise<any | null> {
        const { streamName, consumerName } = config;
        const consumer = await client.consumers.info(streamName, consumerName);
        console.log(`(NATS) ${consumer.num_pending} messages remaining`);
    }
}

Nats.subscribe(async (payload) => {
    console.log(payload);
});