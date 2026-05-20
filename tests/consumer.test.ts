import { client } from "./clients.test.js";
import { StreamConsumer, type ConsumerConfig, type ConsumerOptions } from "../src/modules.js";
import { AckPolicy, DeliverPolicy, ReplayPolicy } from "../src/libs/nats-jetstream.js";
import { toBytes, toNanoSeconds } from "../src/utils.js";

// ===========================================================
// Config
// ===========================================================

const config: ConsumerConfig = {
    stream_name: "test",
    consumer_config: {
        durable_name: "test-worker",
        name: "test-worker",
        filter_subject: "test.>",
        ack_policy: AckPolicy.Explicit,
        deliver_policy: DeliverPolicy.All,
        replay_policy: ReplayPolicy.Instant,
        max_ack_pending: 1,
        max_batch: 1,
        max_waiting: 1,
        ack_wait: toNanoSeconds(5 * 60),
        max_deliver: 5,
    },
};

const options: ConsumerOptions = {
    onLog: (...args: any[]) => {
        console.log(...args);
    },
    onError: (...args: any[]) => {
        console.error(...args);
    },
    debug: true,
};

// ===========================================================
// Publisher
// ===========================================================

const consumer = new StreamConsumer(client, config, options);

consumer.subscribe(async (subject, payload, headers, info) => {
    console.log(subject, payload, headers, info.pending);
    return Promise.resolve();
});

// ===========================================================
// Main
// ===========================================================

process.on("exit", async () => {
    await consumer.unsubscribe();
});

process.on("SIGINT", async () => {
    await consumer.unsubscribe();
});

process.on("SIGTERM", async () => {
    await consumer.unsubscribe();
});