/**
 * Manually yields control to the event loop, allowing other tasks to run.
 *
 * @returns {Promise<void>} A promise that resolves on the next event loop tick.
 */
export const yieldControl = () => new Promise((resolve) => setTimeout(resolve));