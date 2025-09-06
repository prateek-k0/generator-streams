import { Stream } from "./../index";
import { StreamInterface } from "./../stream";

export function from(iterable: unknown[]): StreamInterface {
  const newStream = new Stream(async function* () {
    yield* iterable;
  });
  return newStream;
}
