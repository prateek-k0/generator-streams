// returns a promis that never settles
export function unsettledPromise(): Promise<IteratorResult<unknown, unknown>> {
    return new Promise((reolve, reject) => {});
}