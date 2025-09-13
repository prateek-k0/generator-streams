/**
 * Returns a promise that never settles (neither resolves nor rejects).
 *
 * @returns {Promise<IteratorResult<unknown, unknown>>} A promise that never resolves or rejects.
 */
export function unsettledPromise(): Promise<IteratorResult<unknown, unknown>> {
    return new Promise((resolve, reject) => {});
}