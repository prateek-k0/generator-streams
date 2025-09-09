import { Stream } from "./../index";
import { StreamInterface } from "./../stream";

export function of(...args: unknown[]): StreamInterface {
  const newStream = new Stream();
  newStream[Symbol.asyncIterator] = async function* () {
    yield* args;
  }
  return newStream;
}
