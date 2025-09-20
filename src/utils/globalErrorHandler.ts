import { toast } from 'sonner';
import { parseErrorMessage } from './errorHelpers';

let lastToast = {
  message: '',
  time: 0,
};

const COOLDOWN_MS = 4000;

function showOnce(message: string, description?: string) {
  const now = Date.now();
  if (message === lastToast.message && now - lastToast.time < COOLDOWN_MS) return;
  lastToast = { message, time: now };
  if (description) {
    toast.error(message, { description, duration: 5000 });
  } else {
    toast.error(message, { duration: 5000 });
  }
}

function formatAuthMessage(raw: string) {
  const msg = raw.replace('[object Object]', '').trim();
  if (!msg || msg.length < 3) return 'Sign-in issue';
  return /auth|authentication|signin|login/i.test(msg) ? msg : `Sign-in issue: ${msg}`;
}

export function initGlobalErrorHandler() {
  if (typeof window === 'undefined') return;

  // Avoid double-init
  const anyWindow = window as any;
  if (anyWindow.__GLOBAL_ERROR_HANDLER_INITIALIZED__) return;
  anyWindow.__GLOBAL_ERROR_HANDLER_INITIALIZED__ = true;

  window.addEventListener('error', (event) => {
    try {
      const source = (event as any).error ?? event.message;
      const parsed = parseErrorMessage(source);
      const lower = (parsed || '').toLowerCase();

      if (lower.includes('[object object]')) {
        showOnce('An unexpected error occurred');
        return;
      }

      if (lower.includes('auth') || lower.includes('authentication') || lower.includes('invalid refresh token')) {
        showOnce(formatAuthMessage(parsed));
        return;
      }
    } catch {}
  });

  window.addEventListener('unhandledrejection', (event) => {
    try {
      const reason = (event as any).reason ?? 'Unknown error';
      const parsed = parseErrorMessage(reason);
      const lower = (parsed || '').toLowerCase();

      if (lower.includes('[object object]')) {
        showOnce('An unexpected error occurred');
        return;
      }

      if (lower.includes('auth') || lower.includes('authentication') || lower.includes('invalid refresh token')) {
        showOnce(formatAuthMessage(parsed));
        return;
      }
    } catch {}
  });
}
