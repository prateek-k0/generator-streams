// endlessly yield values from a queue, until a condition is met

import { yieldControl } from "./yieldControl";

//  TODO: change queue to linked list structure
export async function* yieldFromQueue(queue: unknown[], until: (q: unknown[]) => boolean = () => false) {
    while(until(queue) === false) {     // loop until the predicate becomes true
        if(queue.length > 0) yield queue.shift();
        // manually yield control to avoid infinite-looping
        else await yieldControl();  // is else clause necessary? with "else", it outputs a bunch of accumulated values at once
    }
    if(queue.length > 0) yield* queue;  // for remaining values inside the queue when the predicate becomes true
}