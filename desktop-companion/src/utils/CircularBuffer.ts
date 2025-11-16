/**
 * Circular buffer for storing recent log lines
 * Prevents unbounded memory growth when monitoring log files
 */
export class CircularBuffer<T> {
  private buffer: T[];
  private capacity: number;
  private writeIndex: number = 0;
  private size: number = 0;

  constructor(capacity: number) {
    this.capacity = capacity;
    this.buffer = new Array(capacity);
  }

  /**
   * Add item to buffer
   * Overwrites oldest item when buffer is full
   */
  push(item: T): void {
    this.buffer[this.writeIndex] = item;
    this.writeIndex = (this.writeIndex + 1) % this.capacity;
    if (this.size < this.capacity) {
      this.size++;
    }
  }

  /**
   * Get all items in insertion order
   */
  getAll(): T[] {
    if (this.size < this.capacity) {
      return this.buffer.slice(0, this.size);
    }
    
    // Buffer is full, need to reorder
    const firstPart = this.buffer.slice(this.writeIndex);
    const secondPart = this.buffer.slice(0, this.writeIndex);
    return [...firstPart, ...secondPart];
  }

  /**
   * Get last N items (most recent)
   */
  getLast(n: number): T[] {
    const all = this.getAll();
    return all.slice(-n);
  }

  /**
   * Clear buffer
   */
  clear(): void {
    this.writeIndex = 0;
    this.size = 0;
    this.buffer = new Array(this.capacity);
  }

  /**
   * Get current size
   */
  getSize(): number {
    return this.size;
  }

  /**
   * Check if buffer is full
   */
  isFull(): boolean {
    return this.size === this.capacity;
  }
}
