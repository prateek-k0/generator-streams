// the root of streams
// defines that a stream must have a subscribe method and be async iterable
// use this to make custom streams that work with other stream operators
export interface Streamable {
  subscribe: (
    onValue: (value: unknown) => void,
    onError?: (error: unknown) => void | undefined,
    onComplete?: () => void | undefined
  ) => () => void;
  [Symbol.asyncIterator]: () => AsyncGenerator<unknown, unknown, unknown>;  // AsyncGenerator<yielded type, return type, passed type>;
}

