// ===========================================================
// Constants
// ===========================================================

/**
 * Convert MiB to bytes
 */
export const toBytes = (mib: number): number => mib * 1024 * 1024;

/**
 * Convert seconds to nanoseconds
 */
export const toNanoSeconds = (seconds: number): number => seconds * 1_000_000_000; 