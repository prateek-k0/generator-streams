// custom interface for our stream class

import { Streamable } from "../streamable/streamable";

export interface StreamInterface extends Streamable {
  put: (value: unknown) => void;
  map: <T>(fn: (value: T) => unknown) => StreamInterface;
  filter: <T>(fn: (value: T) => boolean) => StreamInterface;
  repeat: (count: number, delay?: number | Function) => StreamInterface;
  concat: (...streams: StreamInterface[]) => StreamInterface;
  merge: (...streams: StreamInterface[]) => StreamInterface;
  zip: (...streams: StreamInterface[]) => StreamInterface;
  zipLatest: (...streams: StreamInterface[]) => StreamInterface;
  debounce: (delay: number) => StreamInterface;
  throttle: (delay: number) => StreamInterface;
  take: (count: number) => StreamInterface;
  takeFirst: (count: number) => StreamInterface;
  takeLast: (count: number) => StreamInterface;
  takeUntil: (predicateFn: (value: unknown) => boolean) => StreamInterface;
  skip: (count: number) => StreamInterface;
  skipUntil: (predicateFn: (value: unknown) => boolean) => StreamInterface;
  // static methods
  // static of: (...args: unknown[]) => StreamInterface;
  // static from: (iterable: unknown[]) => StreamInterface;
  // static interval: (ms: number) => StreamInterface;
}

