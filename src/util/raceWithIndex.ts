// for merge, we need something that can keep track of what streams can be moved forward, in asynchronous manner
// we use a modified version of Promise.race, which keeps track of the index of the promise that reslves first
export function raceWithIndex(
  promiseIterable: Promise<IteratorResult<unknown>>[]
): Promise<{ result: IteratorResult<unknown>; index: number }> {
  return new Promise((resolve, reject) => {
    promiseIterable.forEach((promise, index) => {
      Promise.resolve(promise)
        .then((result) => resolve({ result, index }))
        .catch((err) => reject(err));
    });
  });
}
