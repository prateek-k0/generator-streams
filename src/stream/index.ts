import { StreamInterface } from "./stream";
import { awaitableTimeout } from "../util/awaitableTimeout";
import { raceWithIndex } from "../util/raceWithIndex";
import { yieldFromQueue } from "../util/yieldFromQueue";
import { unsettledPromise } from "../util/unsettledPromise";
import { Queue } from "../util/Queue";
import { UnsubscribeError } from "../util/UnsubscribeError";
import { promisifyAbortController } from "../util/promisifyAbortController";

export class Stream implements StreamInterface {
  private queue: Queue<unknown>;
  private unsubscribeController = new AbortController();
  isSubscribed = false;

  constructor(generatorFunction?: () => AsyncGenerator<unknown, unknown, unknown>) { 
    this.queue = new Queue<unknown>();
    if (generatorFunction) {
      this[Symbol.asyncIterator] = generatorFunction.bind(this);
    }
  }

  // TODO: make it event based, rather than queue based
  async *[Symbol.asyncIterator](): AsyncGenerator<unknown, unknown, unknown> {
    // do we need to use abort controller here?
    // yield* yieldFromQueue(this.queue, () => this.unsubscribeController.signal.aborted === true);
    yield* yieldFromQueue(this.queue, () => false); // rather use unsub method to stop the stream
    return;
  }

  put(value: unknown): void {
    this.queue.enqueue(value);
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

  static interval(period?: number, waitUntil?: number) {
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

  map<T>(mapFn: (value: T) => unknown) {
    let oldStream = (this[Symbol.asyncIterator]).bind(this);
    this[Symbol.asyncIterator] = async function* () {
      for await (const value of oldStream()) {
        yield mapFn(value as T);
      }
    };
    return this;
  }

  filter<T>(predicateFn: (value: T) => boolean) {
    let oldStream = this[Symbol.asyncIterator].bind(this);
    this[Symbol.asyncIterator] = async function* () {
      for await (const value of oldStream()) {
        if (predicateFn(value as T)) yield value;
      }
    };
    return this;
  }

  repeat(count: number, delay?: number | Function) {
    let oldStream = this[Symbol.asyncIterator].bind(this);
    this[Symbol.asyncIterator] = async function* () {
      for (let i = 0; i < count; i++) {
        yield* oldStream();
        if (delay && i < count - 1) {
          const timeoutDelay = typeof delay === "function" ? delay(i + 1) : delay;
          await awaitableTimeout(timeoutDelay);
        }
      }
    };
    return this;
  }

  concat(...streams: Stream[]) {
    let allStreams = [this, ...streams].map((stream) => stream[Symbol.asyncIterator]());
    this[Symbol.asyncIterator] = async function* () {
      for (const stream of allStreams) {
        yield* stream;
      }
    };
    return this;
  }

  // kept changes for splice commented, since i'm fucking skeptical
  merge(...streams: Stream[]) {
    const allStreams = [this, ...streams].map((stream) => stream[Symbol.asyncIterator]());
    this[Symbol.asyncIterator] = async function* () {
      let activePromises = allStreams.map((stream) => stream.next());
      let completedStreams = 0;
      // while (allStreams.length > 0) {
      while (completedStreams < allStreams.length) {
        const { result, index } = await raceWithIndex(activePromises);
        if (result.done) {
          // we dont need it anymore, since we are using unsettledPromise and completedStreams variable
          // activePromises.splice(index, 1); // remove the result from active promises
          // allStreams.splice(index, 1); // remove the stream too
          completedStreams++; // update count for completed streams
          activePromises[index] = unsettledPromise(); // remove the result from active promises
        } else {
          yield result.value;
          activePromises[index] = allStreams[index].next(); // replace the result from the next yield of the same stream
        }
      }
    };
    return this;
  }

  // kept changes for splice commented, since i'm fucking skeptical
  zip(...streams: Stream[]) {
    const allStreams = [this, ...streams].map((stream) => stream[Symbol.asyncIterator]());
    this[Symbol.asyncIterator] = async function* () {
      let completedStreams = 0;
      let completedStreamsDict: { [key: number]: boolean } = {};
      // while (allStreams.length > 0) {
      // const completedResults = await Promise.all(allStreams.map((stream) => stream.next()));
      // const results = completedResults
      //   .filter((result, index) => {
      //     if (result.done) {
      //       allStreams.splice(index, 1); // remove the stream
      //       return false;
      //     }
      //     return true;
      //   })
      //   .map((result) => result.value);
      // if (results.length > 0) yield results;
      // }
      let activePromises = allStreams.map((stream) => stream.next());
      const zippedResults = new Array(allStreams.length).fill(undefined); // similar to zipLatest
      while (completedStreams < allStreams.length) {
        const completedResults = await Promise.all(activePromises); // dropped map, since its slower, instead updated next yields in for-loop monotonically
        for (let index = 0; index < allStreams.length; index++) {
          // changed to for-loop instead of map and filter
          const result = completedResults[index];
          if (result.done && completedStreamsDict[index] !== true) {
            completedStreams++;
            completedStreamsDict[index] = true; // mark this stream as completed
          }
          zippedResults[index] = result.value; // update the zipped results
          activePromises[index] = allStreams[index].next(); // replace the result from the next yield of the same stream
        }
        if (completedStreams < allStreams.length) yield zippedResults.slice();
      }
    };
    return this;
  }

  zipLatest(...streams: Stream[]) {
    const allStreams = [this, ...streams].map((stream) => stream[Symbol.asyncIterator]());
    this[Symbol.asyncIterator] = async function* () {
      const zippedResults = new Array(allStreams.length).fill(undefined);
      let completedStreams = 0;
      let activePromises = allStreams.map((stream) => stream.next());
      // for first yield, zipLatest waits for all streams to emit atleast once
      const firstResults = await Promise.all(activePromises);
      for (let i = 0; i < allStreams.length; zippedResults[i] = firstResults[i].value, i++);
      yield zippedResults.slice();
      // for consecutive yields
      while (completedStreams < allStreams.length) {
        const { result, index } = await raceWithIndex(activePromises);
        if (result.done) {
          completedStreams++;
          activePromises[index] = unsettledPromise();
        } else {
          zippedResults[index] = result.value;
          activePromises[index] = allStreams[index].next();
        }
        yield zippedResults.slice();
      }
    };
    return this;
  }

  debounce(delay: number) {
    let oldStream = this[Symbol.asyncIterator].bind(this);
    this[Symbol.asyncIterator] = async function* () {
      let queue = new Queue<unknown>();
      let streamCompleted = false;
      // shedule consumer for oldStream as a microtask, or use IIFE
      queueMicrotask(async () => {
        let timerId: NodeJS.Timeout | null = null;
        for await (const value of oldStream()) {
          timerId && clearTimeout(timerId);
          timerId = setTimeout(() => {
            queue.enqueue(value);
          }, delay);
        }
        // gotta use setTimeout, else it omits last value(s) from the queue :/
        // because the last timeout is still pending when the stream completes
        setTimeout(() => {
          streamCompleted = true;
        }, delay);
      });
      // yield values from "yieldFromQueue" generator
      yield* yieldFromQueue(queue, () => streamCompleted === true);
    };
    return this;
  }

  throttle(delay: number) {
    let oldStream = this[Symbol.asyncIterator].bind(this);
    this[Symbol.asyncIterator] = async function* () {
      let queue = new Queue<unknown>();
      let streamCompleted = false;
      // shedule consumer for oldStream as a microtask, or use IIFE
      queueMicrotask(async () => {
        let emitting: boolean = false;
        for await (const value of oldStream()) {
          if (emitting === true) continue;
          else {
            emitting = true;
            queue.enqueue(value);
            setTimeout(() => {
              emitting = false;
            }, delay);
          }
        }
        // gotta use setTimeout, else it omits last value(s) from the queue :/
        // because the last timeout is still pending when the stream completes
        setTimeout(() => {
          streamCompleted = true;
        }, delay);
      });
      // yield values from "yieldFromQueue" generator
      yield* yieldFromQueue(queue, () => streamCompleted === true);
    };
    return this;
  }

  take(count: number) {
    let oldStream = this[Symbol.asyncIterator].bind(this);
    this[Symbol.asyncIterator] = async function* () {
      let yieldedCount = 0;
      for await (const value of oldStream()) {
        yield value;
        yieldedCount++;
        if (yieldedCount === count) break;
      }
    };
    return this;
  }

  takeFirst(count: number) {
    return this.take(count);
  }

  takeLast(count: number) {
    let oldStream = this[Symbol.asyncIterator].bind(this);
    this[Symbol.asyncIterator] = async function* () {
      let queue: unknown[] = new Array(count).fill(undefined);
      for await (const value of oldStream()) {
        // doesnt maintain the relative order of emitted values from the stream
        // queue[index] = value;
        // index = (index + 1) % count;
        if (queue.length === count) queue.shift();
        queue.push(value);
      }
      yield* queue;
    };
    return this;
  }

  takeUntil(predicateFn: (value: unknown) => boolean) {
    let oldStream = this[Symbol.asyncIterator].bind(this);
    this[Symbol.asyncIterator] = async function* () {
      for await (const value of oldStream()) {
        yield value;
        if (predicateFn(value) === true) break;
      }
    };
    return this;
  }

  skip(count: number) {
    let oldStream = this[Symbol.asyncIterator].bind(this);
    this[Symbol.asyncIterator] = async function* () {
      let skippedCount = 0;
      for await (const value of oldStream()) {
        if (skippedCount < count) {
          skippedCount++;
          continue;
        }
        yield value;
      }
    };
    return this;
  }

  skipUntil(predicateFn: (value: unknown) => boolean) {
    let oldStream = this[Symbol.asyncIterator].bind(this);
    let conditionMet = false;
    this[Symbol.asyncIterator] = async function* () {
      for await (const value of oldStream()) {
        if (predicateFn(value) === true) conditionMet = true;
        if (conditionMet === true) yield value;
      }
    };
    return this;
  }

  // TODO: create a method to branch streams into 2

  // TODO: create a multiple subscription method, instead of subscribing with just on "onValue"
  subscribe(
    onValue: (value: unknown) => void,
    onError?: (error: unknown) => void,
    onComplete?: () => void
  ) {
    if (this.isSubscribed === true) {
      throw new UnsubscribeError("Stream is already subscribed, cannot subscribe again.");
    }
    this.unsubscribeController = new AbortController();
    this.isSubscribed = true;
    queueMicrotask(async () => {
      try {
        const stream = this[Symbol.asyncIterator].bind(this)();
        while (true) {
          const { value, done } = await Promise.race([
            stream.next(),
            promisifyAbortController(this.unsubscribeController, new UnsubscribeError()),
          ]);
          if (done) break;
          onValue(value);
        }
        onComplete && onComplete();
      } catch (err) {
        if (err instanceof UnsubscribeError) {
          console.log(err.message);
        } else onError && onError(err);
      }
    });
    return () => {
      if (this.isSubscribed === false) {
        throw new UnsubscribeError("Stream is not subscribed, cannot unsubscribe.");
      }
      this.isSubscribed = false;
      this.unsubscribeController.abort();
    };
  }
}
