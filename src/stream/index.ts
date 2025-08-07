import { StreamInterface } from "./stream";
import { awaitableTimeout } from "../util/awaitableTimeout";
import { raceWithIndex } from "../util/raceWithIndex";
import { yieldFromQueue } from "../util/generatorFromQueue";
import { unsettledPromise } from "../util/unsettledPromise";
import { Queue } from "../util/Queue";
import { UnsubscribeError } from "../util/UnsubscribeError";
import { promisifyAbortController } from "../util/promisifyAbortController";

// TODO: change all quees to linked lists
export class Stream implements StreamInterface {
  private queue: Queue<unknown>;
  private streamGenerator: () => AsyncGenerator<unknown, unknown, unknown> = async function* () {}; // yielded type, return type, passed type;
  private unsubscribeController = new AbortController();

  constructor(generatorFunction?: () => AsyncGenerator<unknown, unknown, unknown>) {
    this.queue = new Queue<unknown>();
    if (generatorFunction) {
      this.streamGenerator = generatorFunction;
    } else {
      this.streamGenerator = async function* () {
        yield* yieldFromQueue(this.queue, () => this.unsubscribeController.signal.aborted === true);
      };
    }
  }

  // TODO: for pushing in the queue
  serialize(value: unknown): void {
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

  map<T>(mapFn: (value: T) => T) {
    let oldStream = this.streamGenerator;
    this.streamGenerator = async function* () {
      for await (const value of oldStream()) {
        yield mapFn(value as T);
      }
    };
    return this;
  }

  filter<T>(predicateFn: (value: T) => boolean) {
    let oldStream = this.streamGenerator;
    this.streamGenerator = async function* () {
      for await (const value of oldStream()) {
        if (predicateFn(value as T)) yield value;
      }
    };
    return this;
  }

  repeat(count: number, delay?: number | Function) {
    let oldStream = this.streamGenerator;
    this.streamGenerator = async function* () {
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

  // to return the internal generator
  generator() {
    return this.streamGenerator();
  }

  concat(...streams: Stream[]) {
    let allStreams = [this, ...streams].map((stream) => stream.generator());
    this.streamGenerator = async function* () {
      for (const stream of allStreams) {
        yield* stream;
      }
    };
    return this;
  }

  merge(...streams: Stream[]) {
    const allStreams = [this, ...streams].map((stream) => stream.generator());
    this.streamGenerator = async function* () {
      let activePromises = allStreams.map((stream) => stream.next());
      while (allStreams.length > 0) {
        const { result, index } = await raceWithIndex(activePromises);
        if (result.done) {
          activePromises.splice(index, 1); // remove the result from active promises
          allStreams.splice(index, 1); // remove the stream too
        } else {
          yield result.value;
          activePromises[index] = allStreams[index].next(); // replace the result from the next yield of the same stream
        }
      }
    };
    return this;
  }

  zip(...streams: Stream[]) {
    const allStreams = [this, ...streams].map((stream) => stream.generator());
    this.streamGenerator = async function* () {
      while (allStreams.length > 0) {
        const completedResults = await Promise.all(allStreams.map((stream) => stream.next()));
        const results = completedResults
          .filter((result, index) => {
            if (result.done) {
              allStreams.splice(index, 1); // remove the stream
              return false;
            }
            return true;
          })
          .map((result) => result.value);
        if (results.length > 0) yield results;
      }
    };
    return this;
  }

  zipLatest(...streams: Stream[]) {
    const allStreams = [this, ...streams].map((stream) => stream.generator());
    this.streamGenerator = async function* () {
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
    let oldStream = this.streamGenerator;
    this.streamGenerator = async function* () {
      let queue = new Queue<unknown>();
      let streamCompleted = false;
      // shedule consumer for oldStream as a microtask, or use IIFE
      queueMicrotask(async () => {
        let timerId: number | null = null;
        for await (const value of oldStream()) {
          timerId && clearTimeout(timerId);
          timerId = setTimeout(() => {
            queue.enqueue(value);
          }, delay);
        }
        // gotta use setTimeout, else it omits last value(s) from the queue :/
        setTimeout(() => {
          streamCompleted = true;
        }, delay);
      });
      // yield values from "yieldFromQueue" generator
      yield* yieldFromQueue(queue, () => streamCompleted === true);
    };
    return this;
  }

  // quite similar to debounce
  throttle(delay: number) {
    let oldStream = this.streamGenerator;
    this.streamGenerator = async function* () {
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
    let oldStream = this.streamGenerator;
    this.streamGenerator = async function* () {
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
    let oldStream = this.streamGenerator;
    this.streamGenerator = async function* () {
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
    let oldStream = this.streamGenerator;
    this.streamGenerator = async function* () {
      for await (const value of oldStream()) {
        yield value;
        if (predicateFn(value) === true) break;
      }
    };
    return this;
  }

  skip(count: number) {
    let oldStream = this.streamGenerator;
    this.streamGenerator = async function* () {
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
    let oldStream = this.streamGenerator;
    let conditionMet = false;
    this.streamGenerator = async function* () {
      for await (const value of oldStream()) {
        if (predicateFn(value) === true) conditionMet = true;
        if (conditionMet === true) yield value;
      }
    };
    return this;
  }

  until(predicateFn: (value: unknown) => boolean) {
    let oldStream = this.streamGenerator;
    this.streamGenerator = async function* () {
      for await (const value of oldStream()) {
        yield value;
        if (predicateFn(value) === true) break;
      }
    };
    return this;
  }

  // TODO: create a method to branch streams into 2


  subscribe(
    onValue: (value: unknown) => void,
    onError?: (error: unknown) => void,
    onComplete?: () => void
  ) {
    this.unsubscribeController = new AbortController();
    queueMicrotask(async () => {
      try {
        const stream = this.streamGenerator();
        while (true) {
          const { value, done } = await Promise.race([
            stream.next(),
            promisifyAbortController(this.unsubscribeController, new UnsubscribeError()),
          ]);
          onValue(value);
          if (done) break;
        }
        onComplete && onComplete();
      } catch (err) {
        if (err instanceof UnsubscribeError) {
          console.log(err.message);
        }
        else onError && onError(err);
      }
    });
    return () => {
      this.unsubscribeController.abort();
    }
  }
}
