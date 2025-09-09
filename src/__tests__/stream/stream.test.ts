import { Stream } from "../../stream/index";
import { of, from, interval } from "../../stream/creators/index";

describe("Testing Stream class", () => {
    it("testing put", async () => {
        const arr = [1, 2, 3, 4, 5];
        const stream = new Stream();
        const results: unknown[] = [];
        arr.forEach((value) => stream.put(value));
        for await (const value of stream.take(arr.length)) {
            // take is necessary, otherwise it will never end
            results.push(value);
        }
        expect(results).toEqual(arr);
    });

    it("testing interval", async () => {
        const stream = interval(100).take(5);
        const results: unknown[] = [];
        for await (const value of stream) {
            results.push(value);
        }
        expect(results).toEqual([0, 1, 2, 3, 4]);
    });

    it("testing map", async () => {
        const stream = of(1, 2, 3, 4, 5).map((x) => (x as number) * 2);
        const results: unknown[] = [];
        for await (const value of stream) {
            results.push(value);
        }
        expect(results).toEqual([2, 4, 6, 8, 10]);
    });

    it("testing filter", async () => {
        const stream = of(1, 2, 3, 4, 5).filter((x) => (x as number) % 2 === 0);
        const results: unknown[] = [];
        for await (const value of stream) {
            results.push(value);
        }
        expect(results).toEqual([2, 4]);
    });

    it("testing repeat", async () => {
        const stream = of(1, 2, 3).repeat(2);
        const results: unknown[] = [];
        for await (const value of stream) {
            results.push(value);
        }
        expect(results).toEqual([1, 2, 3, 1, 2, 3]);
        const stream2 = of(4, 5, 6).repeat(2, 100);
        const results2: unknown[] = [];
        for await (const value of stream2) {
            results2.push(value);
        }
        expect(results2).toEqual([4, 5, 6, 4, 5, 6]);
        const stream3 = of(7,8,9).repeat(2, (count: number) => count * 100);
        const results3: unknown[] = [];
        for await (const value of stream3) {
            results3.push(value);
        }
        expect(results3).toEqual([7, 8, 9, 7, 8, 9]);
    });

    it("testing concat", async () => {
        const stream1 = of(1, 2, 3);
        const stream2 = of(4, 5, 6);
        const concatenated = stream1.concat(stream2);
        const results: unknown[] = [];
        for await (const value of concatenated) {
            results.push(value);
        }
        expect(results).toEqual([1, 2, 3, 4, 5, 6]);
    });

    it("testing merge", async () => {
        const stream1 = interval(500).take(3).map((value) => (value as number) * 2);
        const stream2 = interval(3000).take(3).map((value) => (value as number) * 2 + 1);
        const merged = stream1.merge(stream2);
        const results: unknown[] = [];
        for await (const value of merged) {
            results.push(value);
        }
        expect(results).toEqual([0,2,4,1,3,5]);
    });

    it("testing peek", async () => {
        const stream = of(1, 2, 3, 4, 5).peek((value) => console.log("peeked", value));
        const results: unknown[] = [];
        for await (const value of stream) {
            results.push(value);
        }
        expect(results).toEqual([1, 2, 3, 4, 5]);
    });

    it("testing zip", async () => {
        const stream1 = of(1, 2, 3, 4, 5);
        const stream2 = of('a', 'b', 'c');
        const zipped = stream1.zip(stream2);
        const results: unknown[] = [];
        for await (const value of zipped) {
            results.push(value);
        }
        expect(results).toEqual([[1, 'a'], [2, 'b'], [3, 'c'], [4, undefined], [5, undefined]]);
    });

    it("testing zipLatest", async () => {
        const stream1 = of('a', 'b', 'c');
        const stream2 = interval(100, 100).take(5);
        const zipped = stream1.zipLatest(stream2);
        const results: unknown[] = [];
        for await (const value of zipped) {
            results.push(value);
        }
        const expected = [['a', 0], ['b', 0], ['c', 0], ['c', 1], ['c', 2], ['c', 3], ['c', 4]];
        console.log(results, expected);
        expect(results).toEqual(expected);
    });

    it("testing throttle", async () => {
        const stream1 = interval(100, 0).throttle(300).take(5);
        const results1: unknown[] = [];
        for await (const value of stream1) {
            results1.push(value);
        }
        expect(results1).toEqual([0, 3, 6, 9, 12]);

        const stream2 = interval(100, 0).take(4).throttle(200);
        const results2: unknown[] = [];
        for await (const value of stream2) {
            results2.push(value);
        }
        expect(results2).toEqual([0, 2]);
    });
});
