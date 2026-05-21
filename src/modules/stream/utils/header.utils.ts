import { headers, type MsgHdrs } from '../../../libs/nats-core.js';

// ===========================================================
// Types
// ===========================================================

export type Headers = {
    /** Content encoding of the message. */
    contentEncoding: "snappy" | "none";
    /** Content type of the message. */
    contentType: "application/json";
    /** Number of milliseconds elapsed (unix timestamp) */
    createdAt: string;
};

// ===========================================================
// Functions
// ===========================================================

export function setHeaders(config: Headers): MsgHdrs {
    const h = headers();

    h.set("content-type", config.contentType);
    h.set("content-encoding", config.contentEncoding);
    h.set('created-at', config.createdAt);

    return h;
}

export function getHeaders(h: MsgHdrs): Headers {
    const contentEncoding = h.get('content-encoding') as Headers['contentEncoding'];
    const contentType = h.get('content-type') as Headers['contentType'];
    const createdAt = h.get('created-at') as Headers['createdAt'];

    return {
        createdAt,
        contentEncoding,
        contentType,
    };
}
