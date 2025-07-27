import { StreamInterface } from "./stream";

export class Stream implements StreamInterface {
    private queue: unknown[];
    private streamGenerator: () => AsyncGenerator<unknown, unknown, unknown> = async function*() {}; // yielded type, return type, passed type;

    constructor(generatorFunction?: () => AsyncGenerator<unknown, unknown, unknown>) {
        this.queue = [];
        generatorFunction && (this.streamGenerator = generatorFunction);
    }
    
    static of(...args: unknown[]): Stream {
        const newStream = new Stream(async function*() {
            yield* args;
        });
        return newStream;
    }

    static from(iterable: unknown[]): Stream {
        const newStream = new Stream(async function*() {
            yield* iterable;
        });
        return newStream;
    }

    async subscribe(onValue: (value: unknown) => void, onError?: (error: unknown) => void, onComplete?: () => void) {
        try {
            for await (const value of this.streamGenerator()) {
                onValue(value);
            }
        } catch (err) {
            onError && onError(err);
        } finally {
            onComplete && onComplete();
        }
    }
}