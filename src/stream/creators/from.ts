import { Stream } from "./../index";
import { StreamInterface } from "./../stream";

 /**
 * Creates a Stream from a given iterable.
 *
 * @param {Iterable<unknown>} iterable - The iterable to convert into a Stream.
 * @returns {StreamInterface} A StreamInterface instance that yields values from the iterable.
 */
export function from(iterable: Iterable<unknown>): StreamInterface {
  const newStream = new Stream();
  newStream[Symbol.asyncIterator] = async function* () {
    yield* iterable;
  }
  return newStream;
}
