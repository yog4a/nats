import type { StoredMsg, JsMsg, DeliveryInfo } from '../../../libs/nats-jetstream.js';
import type { PublisherOptions } from '../modules/publisher.types.js';
import { getHeaders, type Headers } from '../utils/header.utils.js';
import { decompressPayload, parsePayload, type Payload } from '../utils/payload.utils.js';

// ===========================================================
// Class
// ===========================================================

export class Common {
    private readonly debugLog: (message: string) => void;

    // ==============================
    // Constructor
    // ==============================

    /**
     * Creates a new Common instance
     * @param {PublisherOptions} options - Optional publisher options
     */
    constructor(
        options: PublisherOptions,
    ) {
        this.debugLog = options.onLog ?? (() => {});
    }

    // ==============================
    // Utilities
    // ==============================

    /**
     * Reads a stored message from a NATS stream
     * @description This method will read a stored message from a NATS stream and return the subject and payload
     * @param {StoredMsg} msg - The message to read
     * @returns {{ subject: string, headers: Headers, payload: Payload }} - The subject, headers and payload of the message
     */
    public readStoredMessage(msg: StoredMsg): { subject: string, headers: Headers, payload: Payload } {
        const subject = msg.subject;
        const headers = getHeaders(msg.header);
        const payload = this.extractPayload(msg.data, headers);

        return { subject, headers, payload };
    }

    /**
     * Reads a message from a NATS stream
     * @description This method will read a message from a NATS stream and return the subject, headers, payload and info
     * @param {JsMsg} msg - The message to read
     * @returns {{ subject: string, headers: Headers, payload: Payload, info: DeliveryInfo }} - The subject, headers, payload and info of the message
     */
    public readStreamMessage(msg: JsMsg): { subject: string, headers: Headers, payload: Payload, info: DeliveryInfo } {
        if (!msg.headers) {
            throw new Error('Message headers are required!');
        }

        const info = msg.info;
        const subject = msg.subject;
        const headers = getHeaders(msg.headers);
        const payload = this.extractPayload(msg.data, headers);

        return { subject, headers, payload, info };
    }

    // ==============================
    // Utilities
    // ==============================

    /**
     * Reads a message from a NATS stream
     * @description This method will read a message from a NATS stream and return the subject and payload
     * @param {Uint8Array<ArrayBufferLike>} data - The data to read
     * @param {Headers} headers - The headers to read
     * @returns {Payload} - The payload of the message
     */
    private extractPayload(data: Uint8Array<ArrayBufferLike>, headers: Headers): Payload {
        if (headers.contentEncoding === 'snappy') {
            const dPayload = decompressPayload(data, { debugLog: this.debugLog });
            const payload = parsePayload(dPayload, { debugLog: this.debugLog });
            return payload;
        } else {
            const payload = parsePayload(data, { debugLog: this.debugLog });
            return payload;
        }
    }
}