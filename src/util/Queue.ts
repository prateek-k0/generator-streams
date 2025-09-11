class QueueNode<T> {
  data: T;
  prev: QueueNode<T> | null;
  next: QueueNode<T> | null;
  

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

  constructor() {
    this.front = null;
    this.rear = null;
    this.length = 0;
  }

  isEmpty() {
    return this.front === null;
  }

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

  peek() {
    return this.isEmpty() ? null : this.front?.data;
  }

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

  // generator support for dequeing values from the queue
  *[Symbol.iterator]() {
    while(this.isEmpty() === false) {
        yield this.dequeue();
    }
  }
}