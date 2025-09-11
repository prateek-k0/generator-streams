import { Queue } from '../../util/Queue';
import { yieldFromQueue } from '../../util/yieldFromQueue';

describe('testing yieldFromQueue', () => {
    it('should yield values from the queue until the condition is met', async () => {
        const queue = new Queue<number>();
        queue.enqueue(1);
        queue.enqueue(2);
        queue.enqueue(3);
        const results = [];
        setTimeout(() => {
            queue.enqueue(4);
        }, 100);
        for await (const value of yieldFromQueue(queue, (q) => results.length === 4)) {
            results.push(value);
        }
        expect(results).toEqual([1, 2, 3, 4]);
    });
});