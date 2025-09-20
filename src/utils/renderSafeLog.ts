/**
 * Render-safe logging utility that doesn't trigger setState during render
 */
export function renderSafeLog(message: string, data?: any) {
  // Use setTimeout to defer console.log to the next tick
  setTimeout(() => {
    if (data) {
      console.log(message, data);
    } else {
      console.log(message);
    }
  }, 0);
}

/**
 * Render-safe error logging
 */
export function renderSafeError(message: string, error?: any) {
  setTimeout(() => {
    if (error) {
      console.error(message, error);
    } else {
      console.error(message);
    }
  }, 0);
}

/**
 * Render-safe warning logging
 */
export function renderSafeWarn(message: string, data?: any) {
  setTimeout(() => {
    if (data) {
      console.warn(message, data);
    } else {
      console.warn(message);
    }
  }, 0);
}
