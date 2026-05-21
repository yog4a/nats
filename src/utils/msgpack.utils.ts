import { encode, decode } from '@msgpack/msgpack';

// ===========================================================
// Types
// ===========================================================

export type MsgpackOptions = {
    debugLog?: (message: string) => void;
};

// ===========================================================
// Utilities
// ===========================================================

function formatKb(bytes: number): string {
    return `${(bytes / 1024).toFixed(2)} KB`;
}

function formatMs(ms: number): string {
    return `${ms.toFixed(2)}ms`;
}

// ===========================================================
// Functions
// ===========================================================

export function pack(input: unknown, options: MsgpackOptions = {}): Uint8Array {
    const start = performance.now();
    const encoded = encode(input);

    if (options.debugLog) {
        const duration = performance.now() - start;
        const packedSize = encoded.byteLength;

        const jsonString = JSON.stringify(input);
        const jsonSize = Buffer.byteLength(jsonString, "utf8");
        const reduction = ((jsonSize - packedSize) / jsonSize) * 100;
        const reductionPercent = Math.floor(reduction);

        options.debugLog(
            `(msgpack) packed in ${formatMs(duration)}: ${formatKb(jsonSize)} → ${formatKb(packedSize)} (${reductionPercent}%)`
        );
    }

    return encoded;
}

export function unpack(input: Uint8Array, options: MsgpackOptions = {}): unknown {
    const start = performance.now();
    const decoded = decode(input);

    if (options.debugLog) {
        const duration = performance.now() - start;
        const packedSize = input.byteLength;

        options.debugLog(
            `(msgpack) unpacked in ${formatMs(duration)}: ${formatKb(packedSize)}`
        );
    }

    return decoded;
}
