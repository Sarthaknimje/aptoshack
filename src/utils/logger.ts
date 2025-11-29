/**
 * Frontend logging utility for CreatorVault
 * Provides structured logging with different log levels
 */

export enum LogLevel {
  DEBUG = 'DEBUG',
  INFO = 'INFO',
  WARN = 'WARN',
  ERROR = 'ERROR',
}

interface LogEntry {
  level: LogLevel
  message: string
  timestamp: string
  context?: Record<string, any>
  error?: Error
}

class Logger {
  private isDevelopment = import.meta.env.DEV
  private logHistory: LogEntry[] = []
  private maxHistorySize = 100

  /**
   * Log a debug message (only in development)
   */
  debug(message: string, context?: Record<string, any>) {
    if (this.isDevelopment) {
      this.log(LogLevel.DEBUG, message, context)
    }
  }

  /**
   * Log an informational message
   */
  info(message: string, context?: Record<string, any>) {
    this.log(LogLevel.INFO, message, context)
  }

  /**
   * Log a warning message
   */
  warn(message: string, context?: Record<string, any>) {
    this.log(LogLevel.WARN, message, context)
  }

  /**
   * Log an error message
   */
  error(message: string, error?: Error, context?: Record<string, any>) {
    this.log(LogLevel.ERROR, message, context, error)
  }

  /**
   * Core logging function
   */
  private log(
    level: LogLevel,
    message: string,
    context?: Record<string, any>,
    error?: Error
  ) {
    const entry: LogEntry = {
      level,
      message,
      timestamp: new Date().toISOString(),
      context,
      error,
    }

    // Add to history
    this.logHistory.push(entry)
    if (this.logHistory.length > this.maxHistorySize) {
      this.logHistory.shift()
    }

    // Console output
    const logMethod = this.getConsoleMethod(level)
    const prefix = `[${entry.timestamp}] [${level}]`

    if (error) {
      logMethod(prefix, message, context || '', error)
    } else if (context) {
      logMethod(prefix, message, context)
    } else {
      logMethod(prefix, message)
    }

    // In production, you might want to send errors to a monitoring service
    if (!this.isDevelopment && level === LogLevel.ERROR) {
      this.reportToMonitoring(entry)
    }
  }

  /**
   * Get the appropriate console method for the log level
   */
  private getConsoleMethod(level: LogLevel): typeof console.log {
    switch (level) {
      case LogLevel.DEBUG:
        return console.debug.bind(console)
      case LogLevel.INFO:
        return console.info.bind(console)
      case LogLevel.WARN:
        return console.warn.bind(console)
      case LogLevel.ERROR:
        return console.error.bind(console)
      default:
        return console.log.bind(console)
    }
  }

  /**
   * Report errors to monitoring service (placeholder)
   */
  private reportToMonitoring(entry: LogEntry) {
    // TODO: Implement error reporting to services like Sentry, LogRocket, etc.
    // Example: Sentry.captureException(entry.error, { extra: entry.context })
  }

  /**
   * Get the log history
   */
  getHistory(): LogEntry[] {
    return [...this.logHistory]
  }

  /**
   * Clear the log history
   */
  clearHistory() {
    this.logHistory = []
  }

  /**
   * Export logs as JSON for debugging
   */
  exportLogs(): string {
    return JSON.stringify(this.logHistory, null, 2)
  }
}

// Export singleton instance
export const logger = new Logger()

// Export convenience functions
export const logDebug = logger.debug.bind(logger)
export const logInfo = logger.info.bind(logger)
export const logWarn = logger.warn.bind(logger)
export const logError = logger.error.bind(logger)

