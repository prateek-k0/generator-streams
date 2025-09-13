import { Stream } from "./../index";
import { StreamInterface } from "./../stream";

 /**
 * Creates a Stream from the provided arguments.
 *
 * @param {...unknown[]} args - The values to emit in the Stream.
 * @returns {StreamInterface} A StreamInterface instance that yields the provided values.
 */
export function of(...args: unknown[]): StreamInterface {
  const newStream = new Stream();
  newStream[Symbol.asyncIterator] = async function* () {
    yield* args;
  }
  return newStream;
}
