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

    it("testing interval", async () => {
        const stream = interval(100).take(5);
        const results: any[] = [];
        for await (const value of stream) {
            results.push(value);
        }
        expect(results).toEqual([0, 1, 2, 3, 4]);
    });
})