import { Queue } from "../../../util/Queue";
import { of, from, interval } from "./../../../stream/creators/index";
import { Stream } from "./../../../stream/index"

describe("Testing Stream Creators", () => {
        it("testing of creator", async () => {
        const arr = [1, 2, 3, 4, 5];
        const streamedArray = of(...arr);
        const newArray: unknown[] = [];
        for await (const value of streamedArray) {
            newArray.push(value);
        }
        expect(newArray).toEqual(arr);
    });

    it("testing from creator", async () => {
        const arr = [1, 2, 3, 4, 5];
        const streamedArray = from(arr);
        const newArray: unknown[] = [];
        for await (const value of streamedArray) {
            newArray.push(value);
        }
        expect(newArray).toEqual(arr);
    });

    it("testing from creator with Queue", async () => {
        const q = new Queue();
        q.enqueue(1);
        q.enqueue(2);
        q.enqueue(3);
        q.enqueue(4);
        q.enqueue(5);
        const streamedArray = from(q);
        const newArray: unknown[] = [];
        for await (const value of streamedArray) {
            newArray.push(value);
        }
        expect(newArray).toEqual([1,2,3,4,5]);
    });

    it("testing interval", async () => {
        const stream = interval(100).take(5);
        const results: unknown[] = [];
        for await (const value of stream) {
            results.push(value);
        }
        expect(results).toEqual([0, 1, 2, 3, 4]);
    });
})