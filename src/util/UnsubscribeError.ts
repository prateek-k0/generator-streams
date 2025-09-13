/**
 * Custom error class representing an unsubscribe event from a stream.
 *
 * @extends Error
 */
export class UnsubscribeError extends Error {
    message = "Unsubscribbed from the stream";
}