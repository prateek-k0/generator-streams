// endlessly yield values from a queue, until a condition is met

import { Queue } from "./Queue";
import { yieldControl } from "./yieldControl";

//  TODO: change queue to linked list structure
export async function* yieldFromQueue(queue: Queue<unknown>, until: (q: Queue<unknown>) => boolean) {
    while(until(queue) === false) {     // loop until the predicate becomes true
        if(queue.isEmpty() === false) yield queue.dequeue();
        // manually yield control to avoid infinite-looping
        else await yieldControl();  // is else clause necessary? with "else", it outputs a bunch of accumulated values at once
    }
    if(queue.isEmpty() === false) yield* queue;  // for remaining values inside the queue when the predicate becomes true
}