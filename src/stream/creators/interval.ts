import { Stream } from "./../index";
import { StreamInterface } from "./../stream";
import { awaitableTimeout } from "./../../util/awaitableTimeout";

export function interval(period?: number, waitUntil?: number): StreamInterface {
  period ??= 1000;
  waitUntil ??= period;
  let isRunning = true;
  let value = 0;
  let firstYieldDone = false;

  const newStream = new Stream(async function* () {
    // run the loop
    while (isRunning === true) {
      await awaitableTimeout(firstYieldDone === false ? waitUntil : period);
      yield value++;
      firstYieldDone = true; // set to true, to never use waitUntil again
    }
    return;
  });
  return newStream;
}
