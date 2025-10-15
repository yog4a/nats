import { encode, decode } from '@msgpack/msgpack';

// Functions
// ===========================================================

export function pack(input: unknown, debug: boolean = false): Uint8Array {
    const start = performance.now();
    const encoded = encode(input);

    if (debug) {
        try {
            const duration = performance.now() - start;
            const jsonSize = Buffer.byteLength(JSON.stringify(input), "utf8");
            const packedSize = encoded.byteLength;
            const compression = ((jsonSize - packedSize) / jsonSize) * 100;
            const compressionPercent = Math.floor(compression);
            const originalSize = (jsonSize / 1024).toFixed(2);
            const compressedSize = (packedSize / 1024).toFixed(2);
        
            console.log(
                `[msgpack] reduced by ${compressionPercent}% (${originalSize} KB → ${compressedSize} KB) in ${duration}ms`
            );
        } catch (error: unknown) {
            console.error('[msgpack] failed to log packing details:', error);
        }
    }

    return encoded;
}

export function unpack(input: Uint8Array, debug: boolean = false): unknown {
    const start = performance.now();
    const decoded = decode(input);

    if (debug) {
        const duration = performance.now() - start;
        console.log(`[msgpack] unpacked in ${duration}ms`);
    }
    
    return decoded;
}
