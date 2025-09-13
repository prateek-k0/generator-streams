import { StreamInterface } from "./stream";
import { awaitableTimeout } from "../util/awaitableTimeout";
import { raceWithIndex } from "../util/raceWithIndex";
import { yieldFromQueue } from "../util/yieldFromQueue";
import { unsettledPromise } from "../util/unsettledPromise";
import { Queue } from "../util/Queue";
import { UnsubscribeError } from "../util/UnsubscribeError";
import { awaitablePredicate } from "../util/awaitablePredicate";

// TODO: make Stream generic with typescript generics
// export class Stream<T> implements StreamInterface<T> {
// change all unknown types to T

// stream class that defines operators over streamables
export class Stream implements StreamInterface {
  private _queue: Queue<unknown> = new Queue<unknown>();
  private _isSubscribed = false;
  private _isStopped = false;

  // TODO: make it event based, rather than queue based
  /**
   * Returns an async iterator that yields values from the stream until stopped.
   * @returns {AsyncGenerator<unknown, unknown, unknown>}
   */
  async *[Symbol.asyncIterator](): AsyncGenerator<unknown, unknown, unknown> {
    yield* yieldFromQueue(this._queue, () => this._isStopped === true);
    return;
  }

  /**
   * Adds a value to the stream.
   * @param {unknown} value - The value to add.
   */
  put(value: unknown): void {
    this._queue.enqueue(value);
  }

  /**
   * Transforms each value in the stream using the provided mapping function.
   * @param {(value: unknown) => unknown} mapFn - Function to apply to each value.
   * @returns {StreamInterface} The stream instance.
   */
  map(mapFn: (value: unknown) => unknown): StreamInterface {
    let oldStream = this[Symbol.asyncIterator].bind(this);
    this[Symbol.asyncIterator] = async function* () {
      for await (const value of oldStream()) {
        yield mapFn(value);
      }
    };
    return this;
  }

  /**
   * Filters values in the stream using the provided predicate function.
   * @param {(value: unknown) => boolean} predicateFn - Function to determine if a value should be included.
   * @returns {StreamInterface} The stream instance.
   */
  filter(predicateFn: (value: unknown) => boolean): StreamInterface {
    let oldStream = this[Symbol.asyncIterator].bind(this);
    this[Symbol.asyncIterator] = async function* () {
      for await (const value of oldStream()) {
        if (predicateFn(value)) yield value;
      }
    };
    return this;
  }

  /**
   * Repeats the stream a specified number of times, optionally with a delay between repetitions.
   * @param {number} count - Number of times to repeat.
   * @param {number|Function} [delay] - Delay in ms or function returning delay.
   * @returns {StreamInterface} The stream instance.
   */
  repeat(count: number, delay?: number | Function): StreamInterface {
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

  /**
   * Concatenates this stream with additional streams.
   * @param {...StreamInterface[]} streams - Streams to concatenate.
   * @returns {StreamInterface} The stream instance.
   */
  concat(...streams: StreamInterface[]): StreamInterface {
    let allStreams = [this, ...streams].map((stream) => stream[Symbol.asyncIterator]());
    this[Symbol.asyncIterator] = async function* () {
      for (const stream of allStreams) {
        yield* stream;
      }
    };
    return this;
  }

  // kept changes for splice commented, since i'm fucking skeptical
  /**
   * Merges this stream with additional streams, emitting values as they arrive.
   * @param {...StreamInterface[]} streams - Streams to merge.
   * @returns {StreamInterface} The stream instance.
   */
  merge(...streams: StreamInterface[]): StreamInterface {
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
  /**
   * Zips this stream with additional streams, emitting arrays of values from each stream.
   * @param {...StreamInterface[]} streams - Streams to zip.
   * @returns {StreamInterface} The stream instance.
   */
  zip(...streams: StreamInterface[]): StreamInterface {
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

  /**
   * Zips this stream with additional streams, emitting arrays of the latest values from each stream.
   * @param {...StreamInterface[]} streams - Streams to zip.
   * @returns {StreamInterface} The stream instance.
   */
  zipLatest(...streams: StreamInterface[]): StreamInterface {
    const allStreams = [this, ...streams].map((stream) => stream[Symbol.asyncIterator]());
    this[Symbol.asyncIterator] = async function* () {
      const zippedResults = new Array(allStreams.length).fill(undefined);
      let completedStreams = 0;
      let activePromises = allStreams.map((stream) => stream.next());
      // for first yield, zipLatest waits for all streams to emit atleast once
      const firstResults = await Promise.all(activePromises);
      for (let i = 0; i < allStreams.length; zippedResults[i] = firstResults[i].value, i++);
      yield zippedResults.slice();
      // advance each generator to the next yield, and store the promises in activePromises array
      for (let i = 0; i < allStreams.length; activePromises[i] = allStreams[i].next(), i++);

      // for consecutive yields
      while (completedStreams < allStreams.length) {
        const { result, index } = await raceWithIndex(activePromises);
        if (result.done) {
          completedStreams++;
          activePromises[index] = unsettledPromise();
        } else {
          zippedResults[index] = result.value;
          activePromises[index] = allStreams[index].next();
          yield zippedResults.slice();
        }
      }
    };
    return this;
  }

  /**
   * Emits values from the stream only after a specified delay since the last emission.
   * @param {number} delay - Delay in milliseconds.
   * @returns {StreamInterface} The stream instance.
   */
  debounce(delay: number): StreamInterface {
    let oldStream = this[Symbol.asyncIterator].bind(this);
    this[Symbol.asyncIterator] = async function* () {
      let queue = new Queue<unknown>();
      let streamCompleted = false;
      // shedule consumer for oldStream as a microtask, or use IIFE
      queueMicrotask(async () => {
        const activatedOldStream = oldStream();
        let timerId: NodeJS.Timeout | null = null;
        while (this._isStopped === false) {
          const result: IteratorResult<unknown, unknown> | void = await Promise.race([
            activatedOldStream.next(),
            awaitablePredicate(() => this._isStopped === true), // to break out of the loop if stream is stopped
          ]);
          if (result === undefined) break;
          else if (result.done) break;
          timerId && clearTimeout(timerId);
          timerId = setTimeout(() => {
            queue.enqueue(result.value);
          }, delay);
        }
        // gotta use setTimeout, else it omits last value(s) from the queue :/
        // because the last timeout is still pending when the stream completes
        setTimeout(() => {
          streamCompleted = true;
        }, delay);
      });
      // yield values from "yieldFromQueue" generator
      yield* yieldFromQueue(queue, () => streamCompleted === true || this._isStopped === true);
    };
    return this;
  }

  /**
   * Emits values from the stream at most once per specified delay interval.
   * @param {number} delay - Delay in milliseconds.
   * @returns {StreamInterface} The stream instance.
   */
  throttle(delay: number): StreamInterface {
    let oldStream = this[Symbol.asyncIterator].bind(this);
    this[Symbol.asyncIterator] = async function* () {
      let queue = new Queue<unknown>();
      let streamCompleted = false;
      // schedule consumer for oldStream as a microtask, or use IIFE
      queueMicrotask(async () => {
        const activatedOldStream = oldStream();
        let emitting: boolean = false;
        while (this._isStopped === false) {
          const result: IteratorResult<unknown, unknown> | void = await Promise.race([
            activatedOldStream.next(),
            awaitablePredicate(() => this._isStopped === true), // to break out of the loop if stream is stopped
          ]);
          // stream is limited, so pause consuming
          if (result === undefined) break;
          else if (result.done) break;
          else if (emitting === true) continue;
          emitting = true;
          queue.enqueue(result.value);
          setTimeout(() => {
            emitting = false;
          }, delay);
        }
        // unlike debounce, throttle can complete immediately
        streamCompleted = true;
      });
      // yield values from "yieldFromQueue" generator
      yield* yieldFromQueue(queue, () => streamCompleted === true || this._isStopped === true);
    };
    return this;
  }

  /**
   * Emits only the first `count` values from the stream.
   * @param {number} count - Number of values to take.
   * @returns {StreamInterface} The stream instance.
   */
  take(count: number): StreamInterface {
    let oldStream = this[Symbol.asyncIterator].bind(this);
    this[Symbol.asyncIterator] = async function* () {
      let yieldCount = 0;
      for await (const value of oldStream()) {
        yield value;
        yieldCount++;
        if (yieldCount === count) {
          this._isStopped = true;
          break;
        }
      }
    };
    return this;
  }

  /**
   * Emits only the first `count` values from the stream.
   * @param {number} count - Number of values to take.
   * @returns {StreamInterface} The stream instance.
   */
  takeFirst(count: number): StreamInterface {
    return this.take(count);
  }

  /**
   * Emits only the last `count` values from the stream after completion.
   * @param {number} count - Number of values to take.
   * @returns {StreamInterface} The stream instance.
   */
  takeLast(count: number): StreamInterface {
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

  /**
   * Emits values from the stream until the predicate function returns true.
   * @param {(value: unknown) => boolean} predicateFn - Function to determine when to stop.
   * @returns {StreamInterface} The stream instance.
   */
  takeUntil(predicateFn: (value: unknown) => boolean): StreamInterface {
    let oldStream = this[Symbol.asyncIterator].bind(this);
    this[Symbol.asyncIterator] = async function* () {
      for await (const value of oldStream()) {
        yield value;
        if (predicateFn(value) === true) {
          this._isStopped = true;
          break;
        }
      }
    };
    return this;
  }

  /**
   * Skips the first `count` values from the stream.
   * @param {number} count - Number of values to skip.
   * @returns {StreamInterface} The stream instance.
   */
  skip(count: number): StreamInterface {
    let oldStream = this[Symbol.asyncIterator].bind(this);
    this[Symbol.asyncIterator] = async function* () {
      let skipCount = 0;
      for await (const value of oldStream()) {
        if (skipCount < count) {
          skipCount++;
          continue;
        }
        yield value;
      }
    };
    return this;
  }

  /**
   * Skips values from the stream until the predicate function returns true.
   * @param {(value: unknown) => boolean} predicateFn - Function to determine when to start emitting.
   * @returns {StreamInterface} The stream instance.
   */
  skipUntil(predicateFn: (value: unknown) => boolean): StreamInterface {
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

  /**
   * Invokes a function for each value in the stream without modifying the stream.
   * @param {(value: unknown) => void} fn - Function to invoke for each value.
   * @returns {StreamInterface} The stream instance.
   */
  peek(fn: (value: unknown) => void): StreamInterface {
    let oldStream = this[Symbol.asyncIterator].bind(this);
    this[Symbol.asyncIterator] = async function* () {
      for await (const value of oldStream()) {
        fn(value);
        yield value;
      }
    };
    return this;
  }

  // TODO: create a method to branch streams into 2

  // TODO: create a multiple subscription method, instead of subscribing with just on "onValue"
  // add multiple subscribers to a list, and call them all on new value
  // also add unsubscribe for individual subscribers

  /**
   * Subscribes to the stream, invoking callbacks for values, errors, and completion.
   * @param {(value: unknown) => void} onValue - Callback for each value.
   * @param {(error: unknown) => void} [onError] - Callback for errors.
   * @param {() => void} [onComplete] - Callback for completion.
   * @returns {() => void} Unsubscribe function.
   */
  subscribe(
    onValue: (value: unknown) => void,
    onError?: (error: unknown) => void,
    onComplete?: () => void
  ): () => void {
    if (this._isSubscribed === true) {
      throw new UnsubscribeError("Stream is already subscribed, cannot subscribe again.");
    }
    queueMicrotask(async () => {
      this._isSubscribed = true;
      this._isStopped = false;
      try {
        const stream = this[Symbol.asyncIterator].bind(this)();
        while (this._isStopped === false) {
          const result: IteratorResult<unknown, unknown> | void = await Promise.race([
            stream.next(),
            awaitablePredicate(() => this._isStopped === true), // to break out of the loop if stream is stopped
          ]);
          if (result === undefined) break;
          else if (result.done) break;
          onValue(result.value);
        }
        onComplete && onComplete();
      } catch (err) {
        onError && onError(err);
      } finally {
        this._isSubscribed = false;
        this._isStopped = true;
      }
    });
    return () => {
      if (this._isSubscribed === false) {
        throw new UnsubscribeError("Stream is not subscribed, cannot unsubscribe.");
      }
      this._isSubscribed = false;
      this._isStopped = true;
    };
  }
}
