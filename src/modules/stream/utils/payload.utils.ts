import { pack, unpack, type MsgpackOptions } from '../../../utils/msgpack.utils.js';
import { compress, decompress, type SnappyOptions } from '../../../utils/snappy.utils.js';

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

export function packPayload(payload: Payload, options: MsgpackOptions = {}): Uint8Array {
    try {
        //return pack(payload, options);
        return Buffer.from(JSON.stringify(payload));
    } catch (error: unknown) {
        const err = error instanceof Error ? error.message : String(error);
        throw new Error(`(msgpack) failed to pack the payload: ${err}`);
    }
}

export function parsePayload(data: Uint8Array, options: MsgpackOptions = {}): Payload {
    try {
        //return unpack(data, options) as Payload;
        return JSON.parse(data.toString()) as Payload;
    } catch (error: unknown) {
        const err = error instanceof Error ? error.message : String(error);
        throw new Error(`(msgpack) failed to parse the payload: ${err}`);
    }
}

export function compressPayload(packed: Uint8Array, options: SnappyOptions = {}): Uint8Array {
    try {
        return compress(packed, options);
    } catch (error: unknown) {
        const err = error instanceof Error ? error.message : String(error);
        throw new Error(`(snappy) failed to compress the payload: ${err}`);
    }
}

export function decompressPayload(data: Uint8Array, options: SnappyOptions = {}): Uint8Array {
    try {
        return decompress(data, options);
    } catch (error: unknown) {
        const err = error instanceof Error ? error.message : String(error);
        throw new Error(`(snappy) failed to decompress the payload: ${err}`);
    }
}