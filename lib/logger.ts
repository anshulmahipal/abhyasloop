type LogLevel = 'info' | 'debug' | 'warn' | 'error';

interface UserInfo {
  id?: string | number;
  name?: string;
  email?: string;
}

interface ApiLogData {
  url: string;
  method?: string;
  params?: Record<string, unknown>;
  body?: unknown;
  response?: unknown;
  error?: unknown;
  duration?: number;
}

class Logger {
  private isEnabled: boolean;
  private isDevelopment: boolean;

  constructor() {
    this.isDevelopment = __DEV__ || process.env.NODE_ENV === 'development';
    // Enable by default in development, disable in production
    // Can be overridden with logger.enable() or logger.disable()
    this.isEnabled = this.isDevelopment;
    
    // Optional: Enable via environment variable (for production debugging)
    // Uncomment the line below if you want to enable logging in production via env var
    // if (process.env.EXPO_PUBLIC_ENABLE_LOGGER === 'true') {
    //   this.isEnabled = true;
    // }
  }

  enable() {
    this.isEnabled = true;
  }

  disable() {
    this.isEnabled = false;
  }

  private formatTimestamp(): string {
    return new Date().toLocaleTimeString('en-US', {
      hour12: false,
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      fractionalSecondDigits: 3,
    });
  }

  private formatUserInfo(userInfo?: UserInfo): string {
    if (!userInfo) return 'Anonymous';
    const parts: string[] = [];
    if (userInfo.name) parts.push(`Name: ${userInfo.name}`);
    if (userInfo.id) parts.push(`ID: ${userInfo.id}`);
    if (userInfo.email) parts.push(`Email: ${userInfo.email}`);
    return parts.length > 0 ? parts.join(', ') : 'Anonymous';
  }

  private log(level: LogLevel, message: string, data?: unknown) {
    if (!this.isEnabled) return;

    const timestamp = this.formatTimestamp();
    const prefix = `[${timestamp}] [${level.toUpperCase()}]`;

    switch (level) {
      case 'error':
        console.error(prefix, message, data || '');
        break;
      case 'warn':
        console.warn(prefix, message, data || '');
        break;
      case 'debug':
        console.debug(prefix, message, data || '');
        break;
      default:
        console.log(prefix, message, data || '');
    }
  }

  info(message: string, data?: unknown) {
    this.log('info', message, data);
  }

  debug(message: string, data?: unknown) {
    this.log('debug', message, data);
  }

  warn(message: string, data?: unknown) {
    this.log('warn', message, data);
  }

  error(message: string, error?: unknown) {
    this.log('error', message, error);
  }

  userAction(action: string, userInfo?: UserInfo, additionalData?: unknown) {
    if (!this.isEnabled) return;

    const timestamp = this.formatTimestamp();
    const userDetails = this.formatUserInfo(userInfo);

    console.group(`🔵 [${timestamp}] USER ACTION: ${action}`);
    console.log('👤 User:', userDetails);
    if (additionalData) {
      console.log('📦 Additional Data:', additionalData);
    }
    console.groupEnd();
  }

  apiCall(action: string, data: ApiLogData) {
    if (!this.isEnabled) return;

    const timestamp = this.formatTimestamp();
    const { url, method = 'GET', params, body, response, error, duration } = data;

    console.group(`🌐 [${timestamp}] API CALL: ${action}`);
    console.log('📍 URL:', url);
    console.log('🔧 Method:', method);

    if (params) {
      console.log('📋 Params:', params);
    }

    if (body) {
      console.log('📤 Request Body:', body);
    }

    if (error) {
      console.error('❌ Error:', error);
    } else if (response) {
      console.log('✅ Response:', response);
    }

    if (duration !== undefined) {
      console.log(`⏱️ Duration: ${duration}ms`);
    }

    console.groupEnd();
  }

  async apiCallAsync<T>(
    action: string,
    apiFunction: () => Promise<T>,
    options?: {
      url?: string;
      method?: string;
      params?: Record<string, unknown>;
      body?: unknown;
      userInfo?: UserInfo;
    }
  ): Promise<T> {
    if (!this.isEnabled) {
      return apiFunction();
    }

    const startTime = Date.now();
    const timestamp = this.formatTimestamp();
    const { url, method = 'GET', params, body, userInfo } = options || {};

    console.group(`🌐 [${timestamp}] API CALL START: ${action}`);
    if (userInfo) {
      console.log('👤 User:', this.formatUserInfo(userInfo));
    }
    if (url) console.log('📍 URL:', url);
    if (method) console.log('🔧 Method:', method);
    if (params) console.log('📋 Params:', params);
    if (body) console.log('📤 Request Body:', body);
    console.log('⏳ Waiting for API response...');
    console.groupEnd();

    try {
      const response = await apiFunction();
      const duration = Date.now() - startTime;
      const endTimestamp = this.formatTimestamp();

      console.group(`✅ [${endTimestamp}] API CALL SUCCESS: ${action}`);
      console.log('📥 Response:', response);
      console.log(`⏱️ Duration: ${duration}ms`);
      console.groupEnd();

      return response;
    } catch (error) {
      const duration = Date.now() - startTime;
      const endTimestamp = this.formatTimestamp();

      console.group(`❌ [${endTimestamp}] API CALL FAILED: ${action}`);
      console.error('💥 Error:', error);
      console.log(`⏱️ Duration: ${duration}ms`);
      console.groupEnd();

      throw error;
    }
  }

  group(label: string, callback: () => void) {
    if (!this.isEnabled) {
      callback();
      return;
    }

    console.group(label);
    callback();
    console.groupEnd();
  }
}

export const logger = new Logger();
