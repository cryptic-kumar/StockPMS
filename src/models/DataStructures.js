// models/DataStructures.js

/**
 * QUEUE (First-In-First-Out / FIFO)
 * Used to process Buy/Sell order requests in the exact order they were received.
 */
export class TransactionQueue {
  #items; // Encapsulated private array

  constructor() {
    this.#items = [];
  }

  // Add an order to the back of the queue
  enqueue(transaction) {
    this.#items.push(transaction);
  }

  // Remove and return the order from the front of the queue
  dequeue() {
    if (this.isEmpty()) {
      return null; // Handle edge case of dequeuing an empty queue
    }
    return this.#items.shift();
  }

  // Look at the next order without removing it
  peek() {
    if (this.isEmpty()) return null;
    return this.#items[0];
  }

  isEmpty() {
    return this.#items.length === 0;
  }

  // Returns a copy of the queue for the React UI to render
  // We return a copy [...array] so the UI can't mutate the actual queue
  getQueueState() {
    return [...this.#items];
  }
}

/**
 * STACK (Last-In-First-Out / LIFO)
 * Used to store the history of actions so the user can "Undo" the most recent one.
 */
export class UndoStack {
  #items;
  #maxSize;

  // We add a maxSize to handle the edge case of an infinite stack crashing the browser
  constructor(maxSize = 50) {
    this.#items = [];
    this.#maxSize = maxSize;
  }

  // Add an inverse transaction to the top of the stack
  push(inverseTransaction) {
    if (this.#items.length >= this.#maxSize) {
      // If stack is full, remove the oldest item at the bottom to save memory
      this.#items.shift();
    }
    this.#items.push(inverseTransaction);
  }

  // Remove and return the most recent transaction from the top
  pop() {
    if (this.isEmpty()) {
      return null; // Handle edge case: nothing left to undo
    }
    return this.#items.pop();
  }

  peek() {
    if (this.isEmpty()) return null;
    return this.#items[this.#items.length - 1];
  }

  isEmpty() {
    return this.#items.length === 0;
  }
}
