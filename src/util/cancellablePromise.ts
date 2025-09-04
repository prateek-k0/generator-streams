// cancellablePromise wraps a promise and rejects it if it doesn't settle within the specified timeout
export function cancellablePromise(promise: Promise<unknown>, timeout: number) {
    const rejectTimeout = new Promise((_, reject) => {
        setTimeout(() => reject(new Error('Promise timed out')), timeout);
    });
    return Promise.race([promise, rejectTimeout]);
}