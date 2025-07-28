import { Stream } from "./stream/index";

Stream.from([1, 2, 3, 'ttrue']).subscribe(console.log);

const abortController = new AbortController();
Stream.interval(1000, 0, abortController).subscribe(console.log);
setTimeout(() => {
  abortController.abort();
}, 2999);