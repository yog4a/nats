import { Logger } from './logger.class.js';

/**
 * Base class providing a scoped `logger` instance.
 */
export abstract class Loggable {
    /** Logger instance scoped to this class */
    protected readonly logger: Logger;

    // ================================
    // Constructor
    // ================================

    /**
     * @param name         Name or prefix for this class (e.g., `[Swaps]`)
     * @param config       Either { logger: Logger } for logger inheritance, or { options: LoggerOptions } for new logger options.
     */
    constructor(
        name: string,
        debug?: boolean,
    ) {
        this.logger = new Logger(name, debug ?? false);
    }
}
