import { Queue } from '../../util/Queue';

describe('testing Queue', () => {
    it('should enqueue and dequeue items in FIFO order', async () => {
        const queue = new Queue<number>();
        queue.enqueue(1);
        queue.enqueue(2);
        queue.enqueue(3);
        expect(queue.length).toBe(3);
        expect(queue.peek()).toBe(1);
        expect(queue.isEmpty()).toBe(false);
        expect(queue.display()).toBe("1 <-> 2 <-> 3 <-> null");
        // After dequeing all elements
        expect(queue.dequeue()).toBe(1);
        expect(queue.dequeue()).toBe(2);
        expect(queue.dequeue()).toBe(3);
        expect(queue.display()).toBe("null");
        expect(queue.length).toBe(0);
        expect(queue.peek()).toBe(null);
    });

    it('should handle dequeue from an empty queue gracefully', async () => {
        const queue = new Queue<number>();
        expect(queue.dequeue()).toBe(null);
        expect(queue.isEmpty()).toBe(true);
    });

    it("should support iteration", async () => {
        const queue = new Queue<number>();
        queue.enqueue(10);
        queue.enqueue(20);
        queue.enqueue(30);
        const result: number[] = [];
        for (const value of queue) {
            value !== null && result.push(value);
        }
        expect(result).toEqual([10, 20, 30]);
    });
});