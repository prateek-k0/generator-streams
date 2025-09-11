import { awaitablePredicate } from './../../util/awaitablePredicate';
import { awaitableTimeout } from './../../util/awaitableTimeout';

describe('testing awaitablePredicate', () => {
  it('should resolve immediately if predicate is true', async () => {
    const predicate = () => true;
    await expect(awaitablePredicate(predicate)).resolves.toBeUndefined();
  });

  it('should not resolve if predicate is false', async () => {
    const predicate = () => false;
    // await expect(awaitablePredicate(predicate)).resolves.toBeUndefined();
    // Note: This test will actually hang indefinitely since the promise never resolves.
    // In a real-world scenario, you might want to implement a timeout or a way to change the predicate.
    // rather, use a timeout to check that it does not resolve within a certain time
    const result = await Promise.race([
      awaitablePredicate(predicate).then(() => 'predicate resolved'),
      awaitableTimeout(1000).then(() => 'timeout')
    ]);
    expect(result).toBe('timeout');
  });
});