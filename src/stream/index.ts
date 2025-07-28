import { StreamInterface } from "./stream";
import { awaitableTimeout } from "../util/awaitableTimeout";

export class Stream implements StreamInterface {
  private queue: unknown[];
  private streamGenerator: () => AsyncGenerator<unknown, unknown, unknown> = async function* () {}; // yielded type, return type, passed type;

  constructor(generatorFunction?: () => AsyncGenerator<unknown, unknown, unknown>) {
    this.queue = [];
    generatorFunction && (this.streamGenerator = generatorFunction);
  }

  static of(...args: unknown[]): Stream {
    const newStream = new Stream(async function* () {
      yield* args;
    });
    return newStream;
  }

  static from(iterable: unknown[]): Stream {
    const newStream = new Stream(async function* () {
      yield* iterable;
    });
    return newStream;
  }

  static interval(period?: number, waitUntil?: number, abortController?: AbortController) {
    period ??= 1000;
    waitUntil ??= period;
    let isRunning = true;
    let value = 0;
    let timerId = null;
    let firstYieldDone = false;

    const newStream = new Stream(async function* () {
      // on signal of abort controller, kill the timer
      abortController &&
        abortController.signal.addEventListener("abort", () => {
          isRunning = false;
          timerId && clearTimeout(timerId); // also removes any pre-existing timeouts in the callback queue
        });
      // run the loop
      while (isRunning === true) {
        await awaitableTimeout(firstYieldDone === false ? waitUntil : period);
        yield value++;
        firstYieldDone = true; // set to true, to never use waitUntil again
      }
      return;
    });
    return newStream
  }

  async subscribe(
    onValue: (value: unknown) => void,
    onError?: (error: unknown) => void,
    onComplete?: () => void
  ) {
    try {
      for await (const value of this.streamGenerator()) {
        onValue(value);
      }
    } catch (err) {
      onError && onError(err);
    } finally {
      onComplete && onComplete();
    }
  }
}
