export interface StreamInterface {
  subscribe: (
    onValue: (value: unknown) => void,
    onError: (error: unknown) => void | undefined,
    onComplete: () => void | undefined
  ) => () => void;
}

