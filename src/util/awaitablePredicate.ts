/**
 * Returns a promise that resolves immediately if the provided predicate function returns true.
 *
 * @param {() => boolean} fn - A predicate function to evaluate.
 * @returns {Promise<void>} A promise that resolves if the predicate is true.
 */
export const awaitablePredicate = (fn: () => boolean): Promise<void> =>
  new Promise<void>((resolve) => {
    if (fn()) resolve();
  });
