# @yog4a/nats

Personal NATS / JetStream helpers with small, opinionated wrappers.

This package ships three entrypoints:
- `@yog4a/nats` — convenience re-exports of NATS JS libraries
- `@yog4a/nats/clients` — a `JetstreamClient` wrapper with stream/consumer helpers
- `@yog4a/nats/modules` — stream publisher/consumer utilities

## Features

- JetStream client wrapper with `start()`, `stop()`, `isReady()`
- Stream and consumer management helpers
- Stream publisher with payload packing and optional compression
- Stream consumer with concurrency control and working/ack handling
- Stream/consumer auto-create if missing (via JetStream manager)
- ESM + CJS builds with `dist/` included

## Installation

From GitHub (tagged release):
```bash
pnpm add github:yog4a/nats#vX.Y.Z
npm install github:yog4a/nats#vX.Y.Z
```

## Usage

### Root entrypoint (NATS re-exports)
```ts
import { NatsCore, NatsJetstream, NatsKv, NatsTransportNode, Msgpack, Snappy } from "@yog4a/nats";
```

### JetStream client wrapper
```ts
import { JetstreamClient } from "@yog4a/nats/clients";

const client = new JetstreamClient({
  servers: [
    "nats://localhost:4222",
    "nats://localhost:4223",
    "nats://localhost:4224",
  ],
}, true);

await client.start();
await client.isReady();

const streams = await client.streams.list();
const consumers = await client.consumers.list("mystream");
```

`JetstreamClient` exposes:
- `streams` — list/info/create/update/destroy
- `consumers` — list/info/create/update/destroy + getPullConsumer/getPushConsumer
- `getNatsConnection()`, `getJetstreamClient()`, `getJetstreamManager()`

### Stream publisher / consumer
```ts
import { StreamPublisher, StreamConsumer } from "@yog4a/nats/modules";
import type { StreamConfig, ConsumerConfig } from "@yog4a/nats/modules";
import { JetstreamClient } from "@yog4a/nats/clients";
import { NatsJetstream } from "@yog4a/nats";

const client = new JetstreamClient({ servers: ["nats://localhost:4222"] });
await client.start();

const streamConfig: StreamConfig = {
  streamName: "mystream",
  streamStorage: NatsJetstream.StorageType.File,
  streamRetention: NatsJetstream.RetentionPolicy.Limits,
  streamDiscard: NatsJetstream.DiscardPolicy.Old,
  streamMaxSizeMB: 100,
};

const consumerConfig: ConsumerConfig = {
  streamName: "mystream",
  consumerName: "worker-1",
};

const publisher = new StreamPublisher(client, streamConfig, { debug: true });
await publisher.publish("foo", { hello: "world" }, { traceId: "abc" });

const consumer = new StreamConsumer(
  client,
  consumerConfig,
  { maxConcurrent: 10, debug: true },
);

await consumer.subscribe(async (subject, payload, headers) => {
  // payload: { data, metadata? }
  // headers: { subject, createdAt, compressed, pending }
});
```

## Payload format

Streams use a packed payload format:
```ts
type Data =
  | string
  | number
  | boolean
  | null
  | `0x${string}`
  | `${bigint}`
  | `${number}`
  | Array<Data>
  | { [key: string]: Data };

type Metadata =
  | string
  | number
  | boolean
  | { [key: string]: Metadata };

type Payload = {
  data: { [key: string]: Data };
  metadata?: { [key: string]: Metadata };
};
```

The publisher:
- sets headers `created_at` and `compressed`
- compresses payloads larger than 1MB (snappy)
- retries publish (2 attempts)

The consumer:
- unpacks and decompresses when needed
- sends `working()` signals during processing
- `ack()` on success, `term()` on handler error, `nak()` on decode failure
- limits concurrency with `maxConcurrent`

## Tests

There is an integration test to verify fatal connection errors do not reconnect forever.
It expects a local NATS cluster unless you override `NATS_SERVERS`.

```bash
node tests/fatal-reconnect.test.js
```

Optional modes:
```bash
NATS_FATAL_MODE=unreachable node tests/fatal-reconnect.test.js
NATS_FATAL_MODE=auth NATS_BAD_USER=bad NATS_BAD_PASS=bad node tests/fatal-reconnect.test.js
```

## Release / Tags

Recommended flow (keeps `dist/` in the tagged commit):
```bash
pnpm version patch --no-git-tag-version
pnpm build
git add package.json dist
git commit -m "release v$(node -p "require('./package.json').version")"
VERSION=$(node -p "require('./package.json').version")
git tag -a "v$VERSION" -m "release v$VERSION"
git push origin main --tags
```

## License

This project is licensed under the **Creative Commons Attribution–NonCommercial 4.0 International License (CC BY-NC 4.0)**. You’re free to use and modify it for personal or open-source projects, **but commercial use is not allowed**.
