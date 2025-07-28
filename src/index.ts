import { Stream } from "./stream/index";

Stream.from([1, 2, 3, 'ttrue']).subscribe(console.log);

const unsubscribe = Stream.interval(1000, 0).filter<number>((value) => value % 2 === 0).subscribe(console.log);

setTimeout(() => {
    unsubscribe();
}, 5000);