import { Stream } from "../../stream/index";

describe("Testing Stream class", () => {
    it("testing Stream.of", async() => {
        const arr = [1,2,3,4,5];
        const streamedArray = Stream.of(...arr);
        const newArray = [];
        for await (const value of streamedArray) {
            newArray.push(value);
        }
        expect(newArray).toEqual(arr);
    });

    it("testing Stream.from", async() => {
        const arr = [1,2,3,4,5];
        const streamedArray = Stream.from(arr);
        const newArray = [];
        for await (const value of streamedArray) {
            newArray.push(value);
        }
        expect(newArray).toEqual(arr);
    });

    it("testing serialize", async () => {
        const arr = [1,2,3,4,5];
        const stream = new Stream();
        const results: any[] = [];
        arr.forEach((value) => stream.serialize(value));
        for await (const value of stream.take(arr.length)) {    // take is necessary, otherwise it will never end
            results.push(value);
        }
        expect(results).toEqual(arr);
    });
})