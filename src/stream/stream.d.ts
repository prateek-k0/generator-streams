export interface StreamInterface {
  subscribe: (
    onValue: (value: unknown) => void,
    onError: (error: unknown) => void | undefined,
    onComplete: () => void | undefined
  ) => () => void;
  map: <T>(mapFn: (value: T) => T) => StreamInterface;
  filter: <T>(predicateFn: (value: T) => boolean) => StreamInterface;
  [Symbol.asyncIterator]: () => AsyncGenerator<unknown, unknown, unknown>;  // AsyncGenerator<yielded type, return type, passed type>;
}

