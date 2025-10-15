import { compressSync, uncompressSync } from 'snappy';

//  Functions
// ===========================================================

export function compress(input: Uint8Array, debug: boolean = false): Uint8Array {
    const start = performance.now();
    const compressed = compressSync(input) as Buffer;

    if (debug) {
        try {
            const duration = performance.now() - start;
            const originalSize = (input.byteLength / 1024).toFixed(2);
            const compressedSize = (compressed.byteLength / 1024).toFixed(2);

            const ratio = ((input.byteLength - compressed.byteLength) / input.byteLength) * 100;
            const percent = Math.floor(ratio);

            console.log(
            `[snappy] compressed by ${percent}% (${originalSize} KB → ${compressedSize} KB) in ${duration}ms`
            );
        } catch (error: unknown) {
            console.error('[snappy] failed to log compression details:', error);
        }
    }

    return new Uint8Array(
        compressed.buffer, 
        compressed.byteOffset, 
        compressed.byteLength
    );
}

export function decompress(output: Uint8Array, debug: boolean = false): Uint8Array {
    const start = performance.now();
    const decompressed = uncompressSync(output) as Buffer;
  
    if (debug) {
        const duration = performance.now() - start;
        console.log(`[snappy] decompressed in ${duration}ms`);
    }
  
    return new Uint8Array(
        decompressed.buffer,
        decompressed.byteOffset,
        decompressed.byteLength
    );
}
