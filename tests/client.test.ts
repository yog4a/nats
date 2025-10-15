import { JetstreamClient } from "../src/clients.js";
import { StreamPublisher } from "../src/modules.js";
import { NatsJetstream } from "../src/index.js";

// Client
// ===========================================================

const client = new JetstreamClient({
    servers: [
        "nats://localhost:4222",
        "nats://localhost:4223",
        "nats://localhost:4224",
    ],
    debug: false,
});

client.start();

const streamConfig = {
    streamName: 'test',
    streamStorage: NatsJetstream.StorageType.Memory,
    streamRetention: NatsJetstream.RetentionPolicy.Limits,
    streamDiscard: NatsJetstream.DiscardPolicy.Old,
    streamMaxConsumers: 1,
    streamMaxAgeSeconds: 60,
    streamMaxSizeMB: 1024,
}

const publisherOptions = {
    debug: false,
};

const publisher = new StreamPublisher(client, streamConfig, publisherOptions);

// Test 1 
// ===========================================================

(async function test1() {
    const streamName = 'test';
    try {
        // Publish message
        await publisher.publish('test.fail', { data: 'test' }, { metadata: { test: 'test' } });

        // Get stream info
        const stream = await client.streams.info(streamName);
        const lastSequence = stream.state.last_seq;

        // Get last message
        const jsm = await client.getJetstreamManager();
        const msg = await jsm.streams.getMessage(streamName, { seq: lastSequence });

        console.log(msg);

    } catch (error) {
        console.error(error);
    }
    return null;
})();

// Consumers
// ===========================================================

const consumers = client.consumers;