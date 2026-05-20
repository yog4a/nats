import { client } from "./clients.test.js";
import { StreamPublisher, type PublisherConfig, type PublisherOptions } from "../src/modules.js";
import { RetentionPolicy, StorageType, DiscardPolicy, StoreCompression } from "../src/libs/nats-jetstream.js";
import { toBytes, toNanoSeconds } from "../src/utils.js";

// ===========================================================
// Config
// ===========================================================

const config: PublisherConfig = {
    stream_name: "test",
    stream_config: {
        subjects: ["test.>"],
        retention: RetentionPolicy.Limits,
        storage: StorageType.Memory,
        discard: DiscardPolicy.Old,
        compression: StoreCompression.None,
        max_msgs: 100,
        max_bytes: toBytes(16),
        max_age: 0,
        max_msg_size: toBytes(1),
        max_msgs_per_subject: -1,
        max_consumers: -1,
        num_replicas: 1,
        duplicate_window: toNanoSeconds(2 * 60),
        allow_direct: true,
        sealed: false,
        deny_delete: false,
        deny_purge: false,
        allow_rollup_hdrs: false,
        allow_msg_ttl: false,
        allow_msg_counter: false,
        allow_msg_schedules: false,
        allow_atomic: false,
        no_ack: false,
    },
};

const options: PublisherOptions = {
    onLog: (...args: any[]) => {
        console.log(...args);
    },
    onError: (...args: any[]) => {
        console.error(...args);
    },
    maxAttempts: 3,
    debug: true,
};

// ===========================================================
// Publisher
// ===========================================================

let counter = 0;
const publisher = new StreamPublisher(client, config, options);

setInterval(async () => {
    const subject = `${config.stream_name}.test1`;
    const payload = {
        data: {
            count: counter++,
        },
        metadata: {
            timestamp: Date.now(),
        },
    };
    await publisher.publish(subject, payload);
}, 5_000);

// ===========================================================
// Main
// ===========================================================

process.on("exit", async () => {
    await publisher.shutdown();
    process.exit(0);
});

process.on("SIGINT", async () => {
    await publisher.shutdown();
    process.exit(0);
});

process.on("SIGTERM", async () => {
    await publisher.shutdown();
    process.exit(0);
});