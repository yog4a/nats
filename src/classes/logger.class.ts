/**
 * Simple logger utility with a prefix and optional debug mode.
 *
 * Provides standard log methods (`info`, `warn`, `error`, `debug`)
 * with consistent formatting and an optional debug toggle.
 */
export class Logger {
    /**
     * @constructor
     * @param {string} prefix - Text to prepend to all log messages
     * @param {boolean} debugMode - Whether to enable debug mode
     */
    constructor(
        private readonly prefix: string,
        private readonly debugMode: boolean = false,
    ) {}

    // Public methods

    /** Logs informational messages */
    public info(...args: any[]): void {
        try {
            console.info(this.prefix, ...args);
        } catch (error) {
            console.info(this.prefix, 'cannot log');
        }
    }

    /** Logs warning messages */
    public warn(...args: any[]): void {
        try {
            console.warn(this.prefix, ...args);
        } catch (error) {
            console.warn(this.prefix, 'cannot log');
        }
    }

    /** Logs error messages */
    public error(...args: any[]): void {
        try {
            console.error(this.prefix, ...args);
        } catch (error) {
            console.error(this.prefix, 'cannot log');
        }
    }

    /** Logs debug messages */
    public debug(...args: any[]): void {
        if (!this.debugMode) return;
        try {
            console.debug(this.prefix, '🔸', ...args);
        } catch (error) {
            console.debug(this.prefix, '🔸', 'cannot log');
        }
    }

    /** Re-throws an error with prefix */
    public throw(message: string): void {
        throw new Error(`${this.prefix} ${message}`);
    }

    /** Creates a new logger with a suffix */
    public child(prefix: string): Logger {
        return new Logger(`${this.prefix}${prefix}`);
    }
}