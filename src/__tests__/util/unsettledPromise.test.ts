import { unsettledPromise } from './../../util/unsettledPromise';
import { awaitableTimeout } from './../../util/awaitableTimeout';

describe('testing unsettledPromise', () => {
    it('should return a promise that is not settled', async () => {
        const promise = unsettledPromise();
        const result = await Promise.race([
            promise.then(() => 'resolved'),
            awaitableTimeout(100).then(() => 'timeout')
        ]);
        expect(result).toBe('timeout');
    });
});