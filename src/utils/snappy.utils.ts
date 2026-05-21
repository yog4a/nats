import { compressSync, uncompressSync } from 'snappy';

// ===========================================================
// Types
// ===========================================================

export type SnappyOptions = {
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

export function compress(input: Uint8Array, options: SnappyOptions = {}): Uint8Array {
    const start = performance.now();
    const compressed = compressSync(input) as Buffer;

    if (options.debugLog) {
        const duration = performance.now() - start;
        const reduction = Math.floor(((input.byteLength - compressed.byteLength) / input.byteLength) * 100);

        options.debugLog(
            `(snappy) compressed in ${formatMs(duration)}: ${formatKb(input.byteLength)} → ${formatKb(compressed.byteLength)} (${reduction}%)`
        );
    }

    return new Uint8Array(
        compressed.buffer,
        compressed.byteOffset,
        compressed.byteLength
    );
}

export function decompress(output: Uint8Array, options: SnappyOptions = {}): Uint8Array {
    const start = performance.now();
    const decompressed = uncompressSync(output) as Buffer;

    if (options.debugLog) {
        const duration = performance.now() - start;

        options.debugLog(
            `(snappy) decompressed in ${formatMs(duration)}`
        );
    }

    return new Uint8Array(
        decompressed.buffer,
        decompressed.byteOffset,
        decompressed.byteLength
    );
}
