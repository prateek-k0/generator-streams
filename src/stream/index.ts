import { StreamInterface } from "./stream";
import { awaitableTimeout } from "../util/awaitableTimeout";
import { raceWithIndex } from "../util/raceWithIndex";
import { yieldFromQueue } from "../util/yieldFromQueue";
import { unsettledPromise } from "../util/unsettledPromise";
import { Queue } from "../util/Queue";
import { UnsubscribeError } from "../util/UnsubscribeError";
import { promisifyAbortController } from "../util/promisifyAbortController";
import { awaitablePredicate } from "../util/awaitablePredicate";

// TODO: make Stream generic with typescript generics
// export class Stream<T> implements StreamInterface<T> {
// change all unknown types to T

// stream class that defines operators over streamables
export class Stream implements StreamInterface {
  private _queue: Queue<unknown> = new Queue<unknown>();
  private _unsubscribeController = new AbortController();
  private _isSubscribed = false;
  private _isStopped = false;

  // TODO: make it event based, rather than queue based
  async *[Symbol.asyncIterator](): AsyncGenerator<unknown, unknown, unknown> {
    yield* yieldFromQueue(this._queue, () => this._isStopped === true);
    return;
  }

  put(value: unknown): void {
    this._queue.enqueue(value);
  }

  map(mapFn: (value: unknown) => unknown): StreamInterface {
    let oldStream = this[Symbol.asyncIterator].bind(this);
    this[Symbol.asyncIterator] = async function* () {
      for await (const value of oldStream()) {
        yield mapFn(value);
      }
    };
    return this;
  }

  filter(predicateFn: (value: unknown) => boolean): StreamInterface {
    let oldStream = this[Symbol.asyncIterator].bind(this);
    this[Symbol.asyncIterator] = async function* () {
      for await (const value of oldStream()) {
        if (predicateFn(value)) yield value;
      }
    };
    return this;
  }

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
          else {
            if (result.done) break;
            timerId && clearTimeout(timerId);
              timerId = setTimeout(() => {
                queue.enqueue(result.value);
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
      yield* yieldFromQueue(queue, () => streamCompleted === true || this._isStopped === true);
    };
    return this;
  }

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
          else {
            if (result.done) break;
            if (emitting === true) continue;
            else {
              emitting = true;
              queue.enqueue(result.value);
              setTimeout(() => {
                emitting = false;
              }, delay);
            }
          }
        }
        // unlike debounce, throttle can complete immediately
        streamCompleted = true;
      });
      // yield values from "yieldFromQueue" generator
      yield* yieldFromQueue(queue, () => streamCompleted === true || this._isStopped === true);
    };
    return this;
  }

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

  takeFirst(count: number): StreamInterface {
    return this.take(count);
  }

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
  subscribe(
    onValue: (value: unknown) => void,
    onError?: (error: unknown) => void,
    onComplete?: () => void
  ) {
    if (this._isSubscribed === true) {
      throw new UnsubscribeError("Stream is already subscribed, cannot subscribe again.");
    }
    this._unsubscribeController = new AbortController();
    this._isSubscribed = true;
    this._isStopped = false;
    queueMicrotask(async () => {
      try {
        const stream = this[Symbol.asyncIterator].bind(this)();
        while (true) {
          const { value, done } = await Promise.race([
            stream.next(),
            promisifyAbortController(this._unsubscribeController, new UnsubscribeError()),
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
      if (this._isSubscribed === false) {
        throw new UnsubscribeError("Stream is not subscribed, cannot unsubscribe.");
      }
      this._isSubscribed = false;
      this._unsubscribeController.abort();
    };
  }
}
