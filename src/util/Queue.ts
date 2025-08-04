class QueueNode {
  data: unknown;
  prev: QueueNode | null;
  next: QueueNode | null;

  constructor(data: unknown) {
    this.data = data;
    this.prev = null;
    this.next = null;
  }
}

export class Queue {
  front: QueueNode | null;
  rear: QueueNode | null;

  constructor() {
    this.front = null;
    this.rear = null;
  }

  isEmpty() {
    return this.front === null;
  }

  enqueue(data: unknown) {
    const newNode = new QueueNode(data);
    if (this.isEmpty()) {
      this.front = this.rear = newNode;
    } else {
      this.rear && (this.rear.next = newNode);
      newNode.prev = this.rear;
      this.rear = newNode;
    }
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
      return removedData;
    }
  }

   peek() {
    return this.isEmpty() ? null : this.front?.data;
  }

  display() {
    let current = this.front;
    let output = '';
    while (current) {
      output += current.data + ' <-> ';
      current = current.next;
    }
    output += 'null';
    console.log(output);
  }
}

const q = new Queue();
q.enqueue(1);
q.enqueue(2);
q.enqueue(3);
q.enqueue(4);
q.dequeue();
q.dequeue();
q.enqueue(5);
q.enqueue(6);
q.display();


