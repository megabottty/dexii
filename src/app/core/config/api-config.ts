declare global {
  interface Window {
    __DEXII_API_BASE__?: string;
  }
}

const trimTrailingSlash = (value: string): string => value.replace(/\/+$/, '');

export const getApiBaseUrl = (): string => {
  const fromWindow = typeof window !== 'undefined' ? window.__DEXII_API_BASE__ : undefined;
  if (fromWindow && fromWindow.trim()) {
    return trimTrailingSlash(fromWindow.trim());
  }

  if (typeof window !== 'undefined') {
    const hostname = window.location.hostname;
    const protocol = window.location.protocol;

    if (hostname === 'localhost' || hostname === '127.0.0.1') {
      // Allow overriding the port for local development via window variable
      const port = (window as any).__DEXII_LOCAL_PORT__ || '5001';
      return `http://${hostname}:${port}/api`;
    }

    // Default fallback for hosted frontend + hosted API under /api.
    return `${protocol}//${window.location.host}/api`;
  }

  return 'http://localhost:5001/api';
};

export {};
