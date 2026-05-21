import { pack, unpack } from '../../../utils/msgpack.utils.js';
import { compress, decompress } from '../../../utils/snappy.utils.js';

// ===========================================================
// Types
// ===========================================================

type Data =
    | string
    | number
    | boolean
    | null
    | undefined
    | Array<Data>
    | { [key: string]: Data };

type Metadata =
    | string
    | number
    | boolean
    | { [key: string]: Metadata };

export type Payload = {
    data: {
        [key: string]: Data;
    }
    metadata?: {
        [key: string]: Metadata;
    };
};

// ===========================================================
// Utilities
// ===========================================================

export function packPayload(payload: Payload, debugLog?: (message: string) => void): Uint8Array {
    const start = performance.now();
    try {
        const buffer = Buffer.from(JSON.stringify(payload));

        if (debugLog) {
            const duration = performance.now() - start;
            debugLog(`(json) stringified in ${duration.toFixed(2)}ms`);
        }
        return buffer;
    } 
    catch (error: unknown) {
        const err = error instanceof Error ? error.message : String(error);
        throw new Error(`(json) failed to stringify the payload: ${err}`);
    }
}

export function parsePayload(data: Uint8Array, debugLog?: (message: string) => void): Payload {
    const start = performance.now();
    try {
        const payload = JSON.parse(data.toString()) as Payload;

        if (debugLog) {
            const duration = performance.now() - start;
            debugLog(`(json) parsed in ${duration.toFixed(2)}ms`);
        }
        return payload;
    } 
    catch (error: unknown) {
        const err = error instanceof Error ? error.message : String(error);
        throw new Error(`(json) failed to parse the payload: ${err}`);
    }
}

export function compressPayload(packed: Uint8Array, debugLog?: (message: string) => void): Uint8Array {
    try {
        return compress(packed, { debugLog });
    } catch (error: unknown) {
        const err = error instanceof Error ? error.message : String(error);
        throw new Error(`(snappy) failed to compress the payload: ${err}`);
    }
}

export function decompressPayload(data: Uint8Array, debugLog?: (message: string) => void): Uint8Array {
    try {
        return decompress(data, { debugLog });
    } catch (error: unknown) {
        const err = error instanceof Error ? error.message : String(error);
        throw new Error(`(snappy) failed to decompress the payload: ${err}`);
    }
}