import { Stream } from "../../stream/index";

describe("Testing Stream class", () => {
    it("testing Stream.of", async () => {
        const arr = [1, 2, 3, 4, 5];
        const streamedArray = Stream.of(...arr);
        const newArray = [];
        for await (const value of streamedArray) {
            newArray.push(value);
        }
        expect(newArray).toEqual(arr);
    });

    it("testing Stream.from", async () => {
        const arr = [1, 2, 3, 4, 5];
        const streamedArray = Stream.from(arr);
        const newArray = [];
        for await (const value of streamedArray) {
            newArray.push(value);
        }
        expect(newArray).toEqual(arr);
    });

    it("testing put", async () => {
        const arr = [1, 2, 3, 4, 5];
        const stream = new Stream();
        const results: any[] = [];
        arr.forEach((value) => stream.put(value));
        for await (const value of stream.take(arr.length)) {
            // take is necessary, otherwise it will never end
            results.push(value);
        }
        expect(results).toEqual(arr);
    });

    it("testing stream.interval", async () => {
        const stream = Stream.interval(100).take(5);
        const results: any[] = [];
        for await (const value of stream) {
            results.push(value);
        }
        expect(results).toEqual([0, 1, 2, 3, 4]);
    });

    it("testing map", async () => {
        const stream = Stream.of(1, 2, 3, 4, 5).map<number>((x: number) => x * 2);
        const results: any[] = [];
        for await (const value of stream) {
            results.push(value);
        }
        expect(results).toEqual([2, 4, 6, 8, 10]);
    });

    it("testing filter", async () => {
        const stream = Stream.of(1, 2, 3, 4, 5).filter<number>((x: number) => x % 2 === 0);
        const results: any[] = [];
        for await (const value of stream) {
            results.push(value);
        }
        expect(results).toEqual([2, 4]);
    });

    it("testing repeat", async () => {
        const stream = Stream.of(1, 2, 3).repeat(2);
        const results: any[] = [];
        for await (const value of stream) {
            results.push(value);
        }
        expect(results).toEqual([1, 2, 3, 1, 2, 3]);
        const stream2 = Stream.of(4, 5, 6).repeat(2, 100);
        const results2: any[] = [];
        for await (const value of stream2) {
            results2.push(value);
        }
        expect(results2).toEqual([4, 5, 6, 4, 5, 6]);
        const stream3 = Stream.of(7,8,9).repeat(2, (count: number) => count * 100);
        const results3: any[] = [];
        for await (const value of stream3) {
            results3.push(value);
        }
        expect(results3).toEqual([7, 8, 9, 7, 8, 9]);
    });

    it("testing concat", async () => {
        const stream1 = Stream.of(1, 2, 3);
        const stream2 = Stream.of(4, 5, 6);
        const concatenated = stream1.concat(stream2);
        const results: any[] = [];
        for await (const value of concatenated) {
            results.push(value);
        }
        expect(results).toEqual([1, 2, 3, 4, 5, 6]);
    });

    it("testing merge", async () => {
        const stream1 = Stream.interval(500).take(3).map<number>((value: number) => value * 2);
        const stream2 = Stream.interval(3000).take(3).map<number>((value: number) => value * 2 + 1);
        const merged = stream1.merge(stream2);
        const results: any[] = [];
        for await (const value of merged) {
            results.push(value);
        }
        expect(results).toEqual([0,2,4,1,3,5]);
    });
});
