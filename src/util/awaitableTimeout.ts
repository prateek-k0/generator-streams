/**
 * Returns a promise that resolves after a specified delay in milliseconds.
 *
 * @param {number} [delay=1000] - The delay in milliseconds before the promise resolves.
 * @returns {Promise<void>} A promise that resolves after the delay.
 */
export const awaitableTimeout = (delay = 1000) => new Promise((resolve) => {
    setTimeout(resolve, delay);
});