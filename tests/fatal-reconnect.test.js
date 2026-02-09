import test from "node:test";
import assert from "node:assert/strict";
import { setTimeout as delay } from "node:timers/promises";
import { connect } from "@nats-io/transport-node";

test("fatal connect error does not reconnect indefinitely", async (t) => {
  const {
    NATS_SERVERS,
    NATS_FATAL_MODE,
    NATS_BAD_USER,
    NATS_BAD_PASS,
  } = process.env;

  const mode = (NATS_FATAL_MODE ?? "tls").toLowerCase();

  const servers = (NATS_SERVERS ?? "")
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);

  const serverList =
    servers.length > 0
      ? servers
      : [
          "nats://localhost:4222",
          "nats://localhost:4223",
          "nats://localhost:4224",
        ];

  const baseOptions = {
    reconnect: true,
    maxReconnectAttempts: 2,
    waitOnFirstConnect: true,
    reconnectTimeWait: 250,
  };

  let connectPromise;
  if (mode === "auth") {
    if (!NATS_BAD_USER || !NATS_BAD_PASS) {
      t.skip(
        "Set NATS_BAD_USER and NATS_BAD_PASS or use NATS_FATAL_MODE=tls|unreachable.",
      );
      return;
    }
    connectPromise = connect({
      servers: serverList,
      user: NATS_BAD_USER,
      pass: NATS_BAD_PASS,
      ...baseOptions,
    });
  } else if (mode === "unreachable") {
    connectPromise = connect({
      servers: [
        "nats://127.0.0.1:65535",
        "nats://127.0.0.1:65534",
        "nats://127.0.0.1:65533",
      ],
      ...baseOptions,
    });
  } else {
    // default: TLS mismatch against a non-TLS server
    connectPromise = connect({
      servers: serverList,
      tls: { rejectUnauthorized: false },
      ...baseOptions,
    });
  }

  try {
    await Promise.race([
      connectPromise,
      delay(8000).then(() => {
        throw new Error("timeout");
      }),
    ]);
    assert.fail(`connect unexpectedly succeeded in ${mode} mode`);
  } catch (err) {
    if (err instanceof Error && err.message === "timeout") {
      assert.fail("connect did not fail within timeout; reconnect may be looping");
    }
    assert.ok(err, "expected connect() to fail on fatal error");
  }
});
