import { Stream } from "./../index";
import { StreamInterface } from "./../stream";

export function from(iterable: Iterable<unknown>): StreamInterface {
  const newStream = new Stream();
  newStream[Symbol.asyncIterator] = async function* () {
    yield* iterable;
  }
  return newStream;
}
