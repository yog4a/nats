import type { API } from '../types.js';
import type { Core } from "src/core/core.class";
import { headers, type MsgHdrs } from '@nats-io/nats-core';
import { Logger } from '@yogaajs/classes';
import { pack, unpack } from 'src/utils/msgpack.utils';

// Types
// ===========================================================

export type CommonOptions = {
    type: "requester" | "responder",
    debug?: boolean;
};

// Class
// ===========================================================

export class Common {
    protected readonly client: Core;
    protected readonly logger: Logger;
    protected readonly debug: boolean;

    // Constructor

    constructor(
        client: Core, 
        options: CommonOptions,
    ) {
        // Setup client
        this.client = client;

        // Setup options
        this.debug = options.debug ?? false;

        // Setup logger
        const prefix = `[nats][api][${options.type}]`;
        this.logger = new Logger(prefix, options.debug);
    }

    // Utilities

    protected getHeaders(): MsgHdrs {
        return headers();
    }

    protected getEndpoint(subject: string): API.Endpoint {
        return subject.replace(`api.`, '');
    }

    protected createPayload(data: API.Request | API.Response): Uint8Array {
        return pack(data, this.debug);
    }

    protected parsePayload(payload: Uint8Array): API.Request | API.Response {
        return unpack(payload, this.debug) as API.Request | API.Response;
    }
}