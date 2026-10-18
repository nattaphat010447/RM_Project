const LOG_LEVELS = {
  ERROR: 'error',
  WARN: 'warn',
  INFO: 'info',
  DEBUG: 'debug'
};

const IS_PRODUCTION = import.meta.env.PROD;
const IS_DEV = import.meta.env.DEV;

class Logger {
  constructor(context = 'App') {
    this.context = context;
  }

  _log(level, message, data = null) {
    if (IS_PRODUCTION && level === LOG_LEVELS.DEBUG) {
      return;
    }

    const timestamp = new Date().toISOString();
    const prefix = `[${timestamp}] [${this.context}] [${level.toUpperCase()}]`;

    if (data) {
      console[level](prefix, message, data);
    } else {
      console[level](prefix, message);
    }

    if (IS_PRODUCTION && level === LOG_LEVELS.ERROR) {
      this._sendToServer(level, message, data);
    }
  }

  _sendToServer(level, message, data) {
    try {
      const errorLog = {
        level,
        message,
        context: this.context,
        timestamp: new Date().toISOString(),
        userAgent: navigator.userAgent,
        url: window.location.href,
        data: data ? JSON.stringify(data) : null
      };

      navigator.sendBeacon('/api/client-logs/', JSON.stringify(errorLog));
    } catch (e) {
      // Silent fail
    }
  }

  error(message, data = null) {
    this._log(LOG_LEVELS.ERROR, message, data);
  }

  warn(message, data = null) {
    this._log(LOG_LEVELS.WARN, message, data);
  }

  info(message, data = null) {
    this._log(LOG_LEVELS.INFO, message, data);
  }

  debug(message, data = null) {
    if (IS_DEV) {
      this._log(LOG_LEVELS.DEBUG, message, data);
    }
  }
}

export const createLogger = (context) => new Logger(context);
export default new Logger();
