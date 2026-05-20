import { connect } from "@nats-io/transport-node";

(async () => {
    const nc = await connect({
        servers: "localhost:4222",
        maxReconnectAttempts: -1,
        reconnectTimeWait: 2_000,
    });

    console.log("Connected to NATS server");

    (async () => {
        for await (const status of nc.status()) {
            console.log(status.type, status);
        }
    })();

    setTimeout(async () => {
        await nc.drain();
    }, 10_000);
    await nc.closed();
})();