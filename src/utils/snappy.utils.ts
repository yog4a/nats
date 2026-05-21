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

function getReductionPercent(inputBytes: number, outputBytes: number): number {
    if (inputBytes === 0) return 0;
    return Math.floor(((inputBytes - outputBytes) / inputBytes) * 100);
}

// ===========================================================
// Functions
// ===========================================================

export function compress(input: Uint8Array, options: SnappyOptions = {}): Uint8Array {
    const start = performance.now();
    const compressed = compressSync(input) as Buffer;

    if (options.debugLog) {
        const duration = performance.now() - start;
        const reduction = getReductionPercent(input.byteLength, compressed.byteLength);

        options.debugLog(
            `(snappy) compressed in ${formatMs(duration)}: ${formatKb(input.byteLength)} → ${formatKb(compressed.byteLength)} (-${reduction}%)`
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
        const reduction = getReductionPercent(decompressed.byteLength, output.byteLength);

        options.debugLog(
            `(snappy) decompressed in ${formatMs(duration)}: ${formatKb(output.byteLength)} → ${formatKb(decompressed.byteLength)} (+${reduction}%)`
        );
    }

    return new Uint8Array(
        decompressed.buffer,
        decompressed.byteOffset,
        decompressed.byteLength
    );
}
