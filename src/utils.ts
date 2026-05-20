// ===========================================================
// Constants
// ===========================================================

/**
 * Convert seconds to nanoseconds
 */
export const fromSecondsToNanoSeconds = (seconds: number): number => seconds * 1_000_000_000; 

/**
 * Convert gigabytes to bytes
 */
export const fromGigaToBytes = (gib: number): number => gib * 1024 ** 3;

/**
 * Convert megabytes to bytes
 */
export const fromMegaToBytes = (mib: number): number => mib * 1024 ** 2;
