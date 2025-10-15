import { encode, decode } from '@msgpack/msgpack';

//  Functions
// ===========================================================

export function pack(input: unknown, debug: boolean = false): Uint8Array {
    const start = Date.now();
    try {
        const encoded = encode(input);

        if (debug) {
            const duration = Date.now() - start;
            const { compressionPercent, originalSize, compressedSize } = getCompressionDetails(input, encoded);
            console.log(`[msgpack] data was reduced by ${compressionPercent}% (${originalSize}MB to ${compressedSize}MB) in ${duration}ms`);
        }

        return encoded;

    } catch (err: unknown) {
        throw new Error(
            `[msgpack] failed to pack data: ${err instanceof Error ? err.message : String(err)}`
        );
    };
}

export function unpack(input: Uint8Array, debug: boolean = false): unknown {
    const start = Date.now();
    try {
        const decoded = decode(input);

        if (debug) {
            const duration = Date.now() - start;
            console.log(`[msgpack] data was unpacked in ${duration}ms`);    
        }

        return decoded;

    } catch (err: unknown) {
        throw new Error(
            `[msgpack] failed to unpack data: ${err instanceof Error ? err.message : String(err)}`
        );
    }
}

//  Functions (private)
// ===========================================================

function getCompressionDetails(data: unknown, result: Uint8Array) {
    const toMB = (bytes: number): number => bytes / (1024 * 1024);

    const stringifiedData = JSON.stringify(data);
    const originalSize = Buffer.byteLength(stringifiedData);
    const compressedSize = result.byteLength;
    const compressionPercent = ((originalSize - compressedSize) / originalSize) * 100;

    return {
        originalSize: toMB(originalSize).toFixed(3),
        compressedSize: toMB(compressedSize).toFixed(3),
        compressionPercent: Math.floor(compressionPercent),
    }
}