/**
 * Formats milliseconds into a human-readable time string.
 * 
 * @param ms - The time in milliseconds.
 * 
 * @returns A formatted time string (e.g., "1h 30m 45s 123ms", "2m 30s 500ms", "45s 123ms", "500ms").
 */
export function formatTime(ms: number): string {
    if (ms < 1000) {
        return `${ms}ms`;
    }

    const hours = Math.floor(ms / (1000 * 60 * 60));
    const minutes = Math.floor((ms % (1000 * 60 * 60)) / (1000 * 60));
    const seconds = Math.floor((ms % (1000 * 60)) / 1000);
    const milliseconds = ms % 1000;

    const parts: string[] = [];

    if (hours > 0) {
        parts.push(`${hours}h`);
    }
    if (minutes > 0) {
        parts.push(`${minutes}m`);
    }
    if (seconds > 0) {
        parts.push(`${seconds}s`);
    }
    if (milliseconds > 0) {
        parts.push(`${milliseconds}ms`);
    }

    return parts.join(' ');
}