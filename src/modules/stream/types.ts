// Types
// ===========================================================

type Data =
    | string
    | number
    | boolean
    | null
    | `0x${string}`
    | `${bigint}`
    | `${number}`
    | Array<Data>
    | { [key: string]: Data };

type Metadata =
    | string
    | number
    | boolean
    | { [key: string]: Metadata };

export type Headers = {
    pending: number;
    subject: string;
    compressed: boolean;
    createdAt: number;
};

export type Payload = {
    data: {
        [key: string]: Data;
    }
    metadata?: {
        [key: string]: Metadata;
    };
};
