// for merge, we need something that can keep track of what streams can be moved forward, in asynchronous manner
// we use a modified version of Promise.race, which keeps track of the index of the promise that reslves first
/**
 * Returns a promise that resolves with the result and index of the first settled promise in the iterable.
 *
 * @param {Promise<T>[]} promiseIterable - An array of promises to race.
 * @returns {Promise<{ result: T; index: number }>} A promise resolving to the result and index of the first settled promise.
 */
export function raceWithIndex<T>(
  promiseIterable: Promise<T>[]
): Promise<{ result: T; index: number }> {
  return new Promise((resolve, reject) => {
    promiseIterable.forEach((promise, index) => {
      Promise.resolve(promise)
        .then((result) => resolve({ result, index }))
        .catch((err) => reject(err));
    });
  });
}
