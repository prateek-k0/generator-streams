import { awaitableTimeout } from './../../util/awaitableTimeout';

describe('testing awaitableTimeout', () => {
    it('should resolve after the specified delay', async () => {
        const result = await Promise.race([
            awaitableTimeout(500).then(() => 'resolved'),
            new Promise((_, reject) => setTimeout(() => reject(new Error('timeout')), 1000))
        ]);
        expect(result).toBe('resolved');
    });
});