import { compress as snappyCompress, uncompress as snappyUncompress } from 'snappy';

//  Functions
// ===========================================================

export async function compress(input: Uint8Array, debug: boolean = false): Promise<Uint8Array> {
    const start = Date.now();
    try {
        const inputBuffer = Buffer.from(input);
        const compressed = await snappyCompress(inputBuffer);
        const array = new Uint8Array(compressed);

        if (debug) {
            compressionDetails(inputBuffer, array);
        }

        return array;

    } catch (err: unknown) {
        throw new Error(
            `Snappy compression failed: ${err instanceof Error ? err.message : String(err)}`
        );
    } finally {
        if (debug) {
            const end = Date.now();
            console.log(`[snappy] Compression took ${end - start}ms`);
        }
    }
}

export async function decompress(payload: Uint8Array, debug: boolean = false): Promise<string> {
    const start = Date.now();
    try {
        const buffer = Buffer.from(payload); // Convertit Uint8Array en Buffer
        const decompressed = await snappyUncompress(buffer);
        const input = decompressed.toString();

        return input;

    } catch (err: unknown) {
        throw new Error(
            `Snappy decompression failed: ${err instanceof Error ? err.message : String(err)}`
        );
    } finally {
        if (debug) {
            const end = Date.now();
            console.log(`[snappy] Decompression took ${end - start}ms`);
        }
    }
}

//  Functions (private)
// ===========================================================

function compressionDetails(before: Buffer, after: Uint8Array): void {
    const toMB = (bytes: number): number => bytes / (1024 * 1024);

    const originalSize = toMB(before.length).toFixed(3);
    const compressedSize = toMB(after.length).toFixed(3);

    const compressionPercent = Math.floor(((before.length - after.length) / before.length) * 100);

    console.log(`[snappy] data was compressed by ${compressionPercent}% (${originalSize}MB to ${compressedSize}MB)`);
}