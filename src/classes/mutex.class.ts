/**
 * Simple mutex implementation that limits concurrent operations
 * Provides acquire/release functionality with configurable concurrency limit
 */
export class Mutex {
    /** Maximum number of concurrent operations allowed */
    private readonly maxConcurrent: number = 1;
    /** Queue of pending operation requests */
    private queue: Array<{ resolve: () => void }> = [];
    /** Current number of active operations */
    private active: number = 0;
    /**
     * Creates a new mutex instance
     * @param {number} maxConcurrent - Maximum number of concurrent operations allowed (default: 1)
     */
    constructor({
        maxConcurrent,
    }: {
        maxConcurrent: number;
    }) {
        if (maxConcurrent <= 0) {
            throw new Error('Maximum concurrent operations must be greater than 0');
        }
        this.maxConcurrent = Math.floor(maxConcurrent);
    }

    /**
     * Returns the current number of active operations
     */
    public get activeCount(): number {
        return this.active;
    }

    /**
     * Returns the number of pending slot requests
     */
    public get waitingCount(): number {
        return this.queue.length;
    }

    /**
     * Runs a function while holding a slot, auto-releases on finish/error.
     */
    public async run<T>(fn: () => Promise<T>): Promise<T> {
        try {
            await this.acquire();
            return await fn();
        } finally {
            this.release();
        }
    }

    /**
     * Acquires a slot, waiting if necessary until one becomes available
     * @returns A promise that resolves when the slot is acquired
     */
    public acquire(): Promise<void> {
        if (this.queue.length > 0 || this.active >= this.maxConcurrent) {
            return new Promise<void>((resolve) => {
                this.queue.push({ resolve });
            });
        }
        this.active++;
        return Promise.resolve();
    }

    /**
     * Releases a previously acquired slot
     * If there are waiting slot requests, the next one will be granted
     */
    public release(): void {
        if (this.active <= 0) {
            throw new Error("Release called without a matching acquire");
        }
        this.active--;

        while (this.active < this.maxConcurrent && this.queue.length > 0) {
            const next = this.queue.shift()!;
            this.active++;
            next.resolve();
        }
    }
}
