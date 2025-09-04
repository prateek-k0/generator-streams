import { Stream } from "./stream/index";

// Stream.from([1, 2, 3]).repeat(3, 1000).subscribe(console.log);

// const unsubscribe = Stream.interval(1000, 0).filter<number>((value) => value % 2 === 0).subscribe(console.log);

// setTimeout(() => {
//     unsubscribe();
// }, 5000);

// Stream.from([1,2,3]).concat(Stream.from([4,5,6])).subscribe(console.log);
// const stream1 = Stream.interval(1000, 0).take(10);
// const stream2 = Stream.interval(1000, 0).take(5).map((val: number) => val * 2);
// const stream3 = Stream.interval(1000, 0).take(15).map((val: number) => val * 3);

// stream1.zip(stream2, stream3).subscribe(console.log, console.error);

// Stream.from([1, 2, 3]).repeat(5, (count: number) => count * 1000).debounce(500).subscribe((v) => console.log("debounce", v));
// Stream.interval(500, 0).throttle(1000).subscribe((v) => console.log("throttle", v));

// Stream.interval(500, 0).take(5).subscribe(console.log);
// Stream.interval(500, 0).take(5).takeLast(3).subscribe(console.log);
// Stream.interval(500, 0).takeFirst(5).subscribe(console.log);
// Stream.interval(500, 0).until((value) => (value === 5)).subscribe(console.log)
// Stream.interval(500, 0).skip(3).subscribe(console.log);
// Stream.interval(500, 0).skipUntil((value) => (value === 5)).subscribe(console.log)
// Stream.interval(500, 0).take(15).zipLatest(Stream.interval(1000, 0).take(5)).subscribe(console.log);

// let value = 1;
// const stream = new Stream();
// const unsub = stream.subscribe((value) => console.log('put', value));

// const iid = setInterval(() => {
//     stream.put(value++);
// }, 500);

// setTimeout(() => {
//     unsub();
//     clearInterval(iid);
// }, 5000);

// const stream1 = Stream.interval(500, 0).map((value: number) => `stream 1 -> ${value * 2}`).take(5);
// const stream2 = Stream.interval(500, 0).map((value: number) => `stream 2 -> ${(value * 2) + 1}`).take(10);
// stream2.merge(stream1).subscribe(console.log);

// [Symbol.asyncIterator] testing:
// const stream = Stream.interval(1000, 0).take(5);
// (async () => {
//     for await (const value of stream) {
//         console.log(value);
//     }
// })()