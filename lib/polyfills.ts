// Polyfills for React Native Web compatibility
// This MUST run before any other imports to prevent "window is not defined" errors

// Immediately set up window and localStorage at module load time
(function setupPolyfills() {
  'use strict';
  
  // Only run if window doesn't exist
  if (typeof window === 'undefined') {
    const globalObj = typeof global !== 'undefined' ? global : typeof self !== 'undefined' ? self : {};
    const g = globalObj as any;
    
    // Create in-memory storage
    const memoryStorage: { [key: string]: string } = {};
    
    // Create localStorage implementation
    const localStorageImpl: Storage = {
      getItem: (key: string): string | null => {
        // In browser, try to use actual localStorage
        try {
          if (typeof g.localStorage !== 'undefined' && g.localStorage.getItem) {
            return g.localStorage.getItem(key);
          }
        } catch {}
        // Fallback to memory
        return memoryStorage[key] || null;
      },
      setItem: (key: string, value: string): void => {
        try {
          if (typeof g.localStorage !== 'undefined' && g.localStorage.setItem) {
            g.localStorage.setItem(key, value);
            return;
          }
        } catch {}
        memoryStorage[key] = value;
      },
      removeItem: (key: string): void => {
        try {
          if (typeof g.localStorage !== 'undefined' && g.localStorage.removeItem) {
            g.localStorage.removeItem(key);
            return;
          }
        } catch {}
        delete memoryStorage[key];
      },
      clear: (): void => {
        try {
          if (typeof g.localStorage !== 'undefined' && g.localStorage.clear) {
            g.localStorage.clear();
            return;
          }
        } catch {}
        Object.keys(memoryStorage).forEach(k => delete memoryStorage[k]);
      },
      get length(): number {
        try {
          if (typeof g.localStorage !== 'undefined' && typeof g.localStorage.length === 'number') {
            return g.localStorage.length;
          }
        } catch {}
        return Object.keys(memoryStorage).length;
      },
      key: (index: number): string | null => {
        try {
          if (typeof g.localStorage !== 'undefined' && g.localStorage.key) {
            return g.localStorage.key(index);
          }
        } catch {}
        const keys = Object.keys(memoryStorage);
        return keys[index] || null;
      },
    };
    
    // Create window object
    const windowObj: any = {
      ...g,
      location: {
        get origin() {
          try {
            if (typeof process !== 'undefined' && process.env?.EXPO_PUBLIC_SUPABASE_URL) {
              return new URL(process.env.EXPO_PUBLIC_SUPABASE_URL).origin;
            }
          } catch {}
          return 'https://localhost:3000';
        },
        href: 'https://localhost:3000',
        protocol: 'https:',
        host: 'localhost:3000',
        hostname: 'localhost',
        port: '3000',
        pathname: '/',
        search: '',
        hash: '',
        assign: () => {},
        replace: () => {},
        reload: () => {},
      },
      navigator: {
        userAgent: 'ReactNative',
        platform: 'ReactNative',
        language: 'en-US',
      },
      document: {
        createElement: () => ({
          tagName: 'DIV',
          setAttribute: () => {},
          getAttribute: () => null,
          addEventListener: () => {},
          removeEventListener: () => {},
          style: {},
        }),
        createTextNode: () => ({}),
        body: {
          appendChild: () => {},
          removeChild: () => {},
        },
      },
      addEventListener: () => {},
      removeEventListener: () => {},
      crypto: {
        getRandomValues: (arr: any) => {
          for (let i = 0; i < arr.length; i++) {
            arr[i] = Math.floor(Math.random() * 256);
          }
          return arr;
        },
      },
      localStorage: localStorageImpl,
    };
    
    // Set window on global
    g.window = windowObj;
    
    // Also set localStorage on global for AsyncStorage
    if (typeof g.localStorage === 'undefined') {
      g.localStorage = localStorageImpl;
    }
    
    // Make window available globally
    if (typeof global !== 'undefined') {
      (global as any).window = windowObj;
      if (typeof (global as any).localStorage === 'undefined') {
        (global as any).localStorage = localStorageImpl;
      }
    }
  }
})();

export {};
