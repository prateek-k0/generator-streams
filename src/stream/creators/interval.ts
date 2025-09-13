import { Stream } from "./../index";
import { StreamInterface } from "./../stream";
import { awaitableTimeout } from "./../../util/awaitableTimeout";

/**
 * Creates a Stream that emits incrementing numbers at a specified interval.
 *
 * @param {number} [period=1000] - The interval in milliseconds between emissions.
 * @param {number} [waitUntil=period] - The initial delay before the first emission.
 * @returns {StreamInterface} A StreamInterface instance that yields incrementing numbers at the given interval.
 */
export function interval(period?: number, waitUntil?: number): StreamInterface {
  period ??= 1000;
  waitUntil ??= period;
  let isRunning = true;
  let value = 0;
  let firstYieldDone = false;

  const newStream = new Stream();
  newStream[Symbol.asyncIterator] = async function* () {
    // run the loop
    while (isRunning === true) {
      await awaitableTimeout(firstYieldDone === false ? waitUntil : period);
      yield value++;
      firstYieldDone = true; // set to true, to never use waitUntil again
    }
    return;
  }
  return newStream;
}
