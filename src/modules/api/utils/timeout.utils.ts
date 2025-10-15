/**
 * Adds a timeout to a promise.
 * 
 * @param promise - The promise to add a timeout to.
 * @param ms - The timeout in milliseconds.
 * @param errorMsg - The error message to throw if the promise times out.
 * 
 * @returns The promise with the timeout.
 */
export async function withTimeout<T>(promise: Promise<T>, errorMsg: string, ms: number): Promise<T> {
    return new Promise<T>((resolve, reject) => {
        const timer = setTimeout(() => {
            reject(new Error(errorMsg));
        }, ms);
        
        promise
            .then(result => {
                clearTimeout(timer);
                resolve(result);
            })
            .catch(err => {
                clearTimeout(timer);
                reject(err);
            });
    });
}

/**
 * Adds an expiration to a promise.
 * 
 * @param promise - The promise to add an expiration to.
 * @param errorMsg - The error message to throw if the promise expires.
 * @param expireAt - The expiration date.
 * 
 * @returns The promise with the expiration.
 */
export async function withExpiration<T>(promise: Promise<T>, errorMsg: string, delay: number): Promise<T> {
    return new Promise<T>((resolve, reject) => {
        const timer = setTimeout(() => {
            reject(new Error(errorMsg));
        }, delay);

        promise
            .then(result => {
                clearTimeout(timer);
                resolve(result);
            })
            .catch(err => {
                clearTimeout(timer);
                reject(err);
            });
    });
}
