import { encode, decode } from '@msgpack/msgpack';

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

export function pack(input: unknown, debug: boolean = false): Uint8Array {
    const start = debug ? performance.now() : 0;
    const encoded = encode(input);

    if (debug) {
        const duration = performance.now() - start;
        const packedSize = encoded.byteLength;

        const jsonString = JSON.stringify(input);
        const jsonSize = Buffer.byteLength(jsonString, "utf8");
        const reduction = ((jsonSize - packedSize) / jsonSize) * 100;
        const reductionPercent = Math.floor(reduction);

        console.log(
            `[msgpack] packed in ${formatMs(duration)}: ${formatKb(jsonSize)} → ${formatKb(packedSize)} (${reductionPercent}%)`
        );
    }

    return encoded;
}

export function unpack(input: Uint8Array, debug: boolean = false): unknown {
    const start = debug ? performance.now() : 0;
    const decoded = decode(input);

    if (debug) {
        const duration = performance.now() - start;
        const packedSize = input.byteLength;

        console.log(
            `[msgpack] unpacked in ${formatMs(duration)}: ${formatKb(packedSize)}`
        );
    }

    return decoded;
}
