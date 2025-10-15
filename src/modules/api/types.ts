// Local Types
// ===========================================================

type Result =
  | string
  | number
  | boolean
  | null
  | undefined
  | { [key: string | number]: Result }
  | Result[];

// Types
// ===========================================================

export namespace API {
    export type Endpoint = string;
    export type Request = {
        request: {
            [key: string]: string | number | boolean | Request['request'];
        };
        metadata?: {
            [key: string]: string | number | boolean;
        };
    };
    export type Response = {
        result?: Result;
        error?: {
            code?: number;
            message: string;
        };
    };
}
