import { JetstreamClient, type JetstreamConfig, type JetstreamOptions } from "../src/clients.js";

// ===========================================================
// Config
// ===========================================================

const config: JetstreamConfig = {
    servers: "localhost:4222",
    reconnect: true,
    maxReconnectAttempts: -1,
};

const options: JetstreamOptions = {
    onLog: (...args: any[]) => {
        console.log(...args);
    },
    onError: (...args: any[]) => {
        console.error(...args);
    },
};

// ===========================================================
// Client
// ===========================================================

export const client = new JetstreamClient(config, options);

// ===========================================================
// Main
// ===========================================================

process.on("exit", async () => {
    await client.destroy();
    process.exit(0);
});

process.on("SIGINT", async () => {
    await client.destroy();
    process.exit(0);
});

process.on("SIGTERM", async () => {
    await client.destroy();
    process.exit(0);
});