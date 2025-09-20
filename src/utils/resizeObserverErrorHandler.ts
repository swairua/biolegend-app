// Suppress ResizeObserver loop errors
// These are typically harmless and occur when observers trigger layout changes

let suppressResizeObserverLoopErrors = false;

// Initialize suppression immediately when this module loads
const initializeErrorSuppression = () => {
  if (typeof window === 'undefined') return;

  // Immediate suppression setup
  const isResizeObserverError = (message: any) => {
    return typeof message === 'string' && (
      message.includes('ResizeObserver loop completed with undelivered notifications') ||
      message.includes('ResizeObserver loop limit exceeded') ||
      message.includes('ResizeObserver')
    );
  };

  // Override console.error immediately
  const originalConsoleError = window.console.error;
  window.console.error = (...args) => {
    if (isResizeObserverError(args[0])) {
      // Silently ignore ResizeObserver errors
      return;
    }
    originalConsoleError.apply(console, args);
  };

  // Override window.onerror immediately
  const originalOnError = window.onerror;
  window.onerror = (message, source, lineno, colno, error) => {
    if (isResizeObserverError(message)) {
      return true; // Prevent the error from being logged
    }
    if (originalOnError) {
      return originalOnError.call(window, message, source, lineno, colno, error);
    }
    return false;
  };

  // Handle error events
  window.addEventListener('error', (event) => {
    if (isResizeObserverError(event.message)) {
      event.preventDefault();
      event.stopPropagation();
      event.stopImmediatePropagation();
    }
  }, true); // Use capture phase

  // Handle unhandled rejections
  window.addEventListener('unhandledrejection', (event) => {
    if (isResizeObserverError(event.reason)) {
      event.preventDefault();
    }
  });
};

// Initialize immediately when module loads
if (typeof window !== 'undefined') {
  initializeErrorSuppression();
}

export const enableResizeObserverErrorSuppression = () => {
  if (suppressResizeObserverLoopErrors) return;

  suppressResizeObserverLoopErrors = true;

  // The actual suppression is already handled in module initialization
  // This function now just marks that suppression is enabled
  console.debug('ResizeObserver error suppression enabled');
};

export const disableResizeObserverErrorSuppression = () => {
  suppressResizeObserverLoopErrors = false;
  // Note: This doesn't restore the original console.error
  // In practice, you'd rarely need to disable this
};
