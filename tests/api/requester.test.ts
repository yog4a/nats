import { Core, API } from '../../src/index.js';

// Service
// ===========================================================

export const core = new Core({
    servers: [
        "nats://localhost:4222",
        "nats://localhost:4223",
        "nats://localhost:4224",
    ],
    maxReconnectAttempts: -1,
    reconnect: true,
});

const requester = new API.Requester(core, {
    endpoint: 'test',
    timeout: 3_000,
    maxAttempts: 2,
    debug: true,
});

// Service
// ===========================================================

(async () => {
    const promises = [];

    for (let i = 0; i < 5; i++) {
        promises.push(requester.request(`test.${i}`, {
            message: `Hello, world! ${i}`,
        }));
    }

    const results = await Promise.all(promises);
    console.log(results);
})();