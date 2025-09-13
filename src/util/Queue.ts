class QueueNode<T> {
  /**
   * The data stored in the node.
   * @type {T}
   */
  data: T;

  /**
   * Reference to the previous node in the queue.
   * @type {QueueNode<T> | null}
   */
  prev: QueueNode<T> | null;

  /**
   * Reference to the next node in the queue.
   * @type {QueueNode<T> | null}
   */
  next: QueueNode<T> | null;

  /**
   * Creates a new QueueNode.
   * @param {T} data - The data to store in the node.
   */
  constructor(data: T) {
    this.data = data;
    this.prev = null;
    this.next = null;
  }
}

export class Queue<T> {
  front: QueueNode<T> | null;
  rear: QueueNode<T> | null;
  length: number = 0;

  /**
   * Creates a new empty Queue.
   */
  constructor() {
    this.front = null;
    this.rear = null;
    this.length = 0;
  }

  /**
   * Checks if the queue is empty.
   * @returns {boolean} True if the queue is empty, false otherwise.
   */
  isEmpty() {
    return this.front === null;
  }

  /**
   * Adds an item to the rear of the queue.
   * @param {T} data - The data to enqueue.
   */
  enqueue(data: T) {
    const newNode = new QueueNode(data);
    if (this.isEmpty()) {
      this.front = this.rear = newNode;
    } else {
      this.rear && (this.rear.next = newNode);
      newNode.prev = this.rear;
      this.rear = newNode;
    }
    this.length++;
  }

  /**
   * Removes and returns the item at the front of the queue.
   * @returns {T | null} The dequeued data, or null if the queue is empty.
   */
  dequeue() {
    if (this.isEmpty()) {
      console.error("Queue is empty!");
      return null;
    } else {
      const removedData = this.front ? this.front.data : null;
      this.front && (this.front = this.front.next);
      if (this.front === null) {
        this.rear = null;
      } else {
        this.front.prev = null;
      }
      this.length--;
      return removedData;
    }
  }

  /**
   * Returns the item at the front of the queue without removing it.
   * @returns {T | null} The front data, or null if the queue is empty.
   */
  peek() {
    return this.isEmpty() ? null : this.front?.data;
  }

  /**
   * Returns a string representation of the queue.
   * @returns {string} The queue contents as a string.
   */
  display() {
    let current = this.front;
    let output = "";
    while (current) {
      output += current.data + " <-> ";
      current = current.next;
    }
    output += "null";
    return output;
  }

  /**
   * Generator for dequeuing values from the queue.
   * Yields each item in the queue until it is empty.
   * @returns {Generator<T, void, unknown>}
   */
  *[Symbol.iterator]() {
    while(this.isEmpty() === false) {
        yield this.dequeue();
    }
  }
}