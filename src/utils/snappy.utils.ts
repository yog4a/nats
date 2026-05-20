import { compressSync, uncompressSync } from 'snappy';

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

export function compress(input: Uint8Array, debug: boolean = false): Uint8Array {
    const start = debug ? performance.now() : 0;
    const compressed = compressSync(input) as Buffer;

    if (debug) {
        const duration = performance.now() - start;
        const reduction = Math.floor(((input.byteLength - compressed.byteLength) / input.byteLength) * 100);
        console.log(
            `[snappy] compressed in ${formatMs(duration)}: ${formatKb(input.byteLength)} → ${formatKb(compressed.byteLength)} (${reduction}%)`
        );
    }

    return new Uint8Array(
        compressed.buffer,
        compressed.byteOffset,
        compressed.byteLength
    );
}

export function decompress(output: Uint8Array, debug: boolean = false): Uint8Array {
    const start = debug ? performance.now() : 0;
    const decompressed = uncompressSync(output) as Buffer;

    if (debug) {
        const duration = performance.now() - start;
        console.log(
            `[snappy] decompressed in ${duration}ms`
        );
    }

    return new Uint8Array(
        decompressed.buffer,
        decompressed.byteOffset,
        decompressed.byteLength
    );
}
