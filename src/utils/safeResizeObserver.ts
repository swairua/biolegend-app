// Safe ResizeObserver utility that prevents loops and handles errors gracefully

interface SafeResizeObserverCallback {
  (entries: ResizeObserverEntry[]): void;
}

export class SafeResizeObserver {
  private observer: ResizeObserver | null = null;
  private timeoutId: NodeJS.Timeout | null = null;
  private isObserving = false;
  private debounceMs: number;
  private callback: SafeResizeObserverCallback;

  constructor(callback: SafeResizeObserverCallback, debounceMs = 250) {
    this.callback = callback;
    this.debounceMs = debounceMs;
    
    try {
      this.observer = new ResizeObserver((entries) => {
        this.handleResize(entries);
      });
    } catch (error) {
      console.debug('ResizeObserver not supported, falling back gracefully');
      this.observer = null;
    }
  }

  private handleResize = (entries: ResizeObserverEntry[]) => {
    // Clear any pending callback
    if (this.timeoutId) {
      clearTimeout(this.timeoutId);
    }

    // Debounce the callback to prevent loops
    this.timeoutId = setTimeout(() => {
      try {
        // Use requestAnimationFrame to ensure we're not in a layout cycle
        requestAnimationFrame(() => {
          this.callback(entries);
        });
      } catch (error) {
        // Silently handle errors to prevent console spam
        console.debug('ResizeObserver callback error:', error);
      }
    }, this.debounceMs);
  };

  observe(target: Element): void {
    if (!this.observer || this.isObserving) return;

    try {
      this.observer.observe(target);
      this.isObserving = true;
    } catch (error) {
      console.debug('Failed to observe element:', error);
    }
  }

  unobserve(target: Element): void {
    if (!this.observer) return;

    try {
      this.observer.unobserve(target);
      this.isObserving = false;
    } catch (error) {
      console.debug('Failed to unobserve element:', error);
    }
  }

  disconnect(): void {
    if (this.observer) {
      try {
        this.observer.disconnect();
        this.isObserving = false;
      } catch (error) {
        console.debug('Failed to disconnect observer:', error);
      }
    }

    if (this.timeoutId) {
      clearTimeout(this.timeoutId);
      this.timeoutId = null;
    }
  }
}

// Convenience function to create a safe ResizeObserver
export const createSafeResizeObserver = (
  callback: SafeResizeObserverCallback,
  debounceMs = 250
): SafeResizeObserver => {
  return new SafeResizeObserver(callback, debounceMs);
};
