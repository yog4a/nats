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

const responder1 = new API.Responder(core, {
    baseEndpoint: 'test',
    maxConcurrentRequests: 3,
    queueName: 'test',
    debug: true,
});

const responder2 = new API.Responder(core, {
    baseEndpoint: 'test',
    maxConcurrentRequests: 10,
    queueName: 'test',
    debug: true,
});

// Service
// ===========================================================

responder1.subscribe(async (request, metadata) => {
    setInterval(() => {
        const start = performance.now();
        setImmediate(() => {
            const delay = performance.now() - start;
            if (delay > 5) console.log("Event loop lag:", delay.toFixed(2), "ms");
        });
    }, 500);

    const randomNumber = Math.floor(Math.random() * 10) + 1;
    await new Promise(resolve => setTimeout(resolve, randomNumber * 1000));

    return {
        result: randomNumber,
    };
});

// responder2.subscribe(async (request, metadata) => {
//     const randomNumber = Math.floor(Math.random() * 10) + 1;

//     console.log("TEST2", randomNumber);
//     await new Promise(resolve => setTimeout(resolve, randomNumber * 1000));

//     return {
//         result: randomNumber,
//     };
// });

setTimeout(async () => {
    const promises = [];

    for (let i = 0; i < 2; i++) {
        promises.push(requester.request(`test.${i}`, {
            message: `Hello, world! ${i}`,
        }));
    }

    const results = await Promise.all(promises);
    console.log(results);
}, 3_000);
