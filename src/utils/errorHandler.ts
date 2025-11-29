/**
 * Error handling utilities for CreatorVault
 * Provides standardized error handling and user-friendly messages
 */

import { logger } from './logger'

/**
 * Custom error class for application-specific errors
 */
export class AppError extends Error {
  constructor(
    message: string,
    public code?: string,
    public statusCode?: number,
    public isOpetrational = true
  ) {
    super(message)
    this.name = 'AppError'
    Object.setPrototypeOf(this, AppError.prototype)
  }
}

/**
 * Error types for better categorization
 */
export enum ErrorType {
  NETWORK = 'NETWORK',
  VALIDATION = 'VALIDATION',
  AUTHENTICATION = 'AUTHENTICATION',
  BLOCKCHAIN = 'BLOCKCHAIN',
  WALLET = 'WALLET',
  API = 'API',
  UNKNOWN = 'UNKNOWN',
}

/**
 * Get user-friendly error message based on error type
 */
export function getUserFriendlyMessage(error: Error | AppError | unknown): string {
  if (error instanceof AppError) {
    return error.message
  }

  if (error instanceof Error) {
    const errorMessage = error.message.toLowerCase()

    // Network errors
    if (errorMessage.includes('network') || errorMessage.includes('fetch')) {
      return 'Network error. Please check your internet connection and try again.'
    }

    // Wallet errors
    if (errorMessage.includes('wallet') || errorMessage.includes('petra')) {
      return 'Wallet connection error. Please ensure Petra Wallet is installed and unlocked.'
    }

    // Aptos/Blockchain errors
    if (errorMessage.includes('aptos') || errorMessage.includes('transaction')) {
      return 'Blockchain transaction error. Please try again or check your wallet balance.'
    }

    // Authentication errors
    if (errorMessage.includes('auth') || errorMessage.includes('unauthorized')) {
      return 'Authentication error. Please sign in again.'
    }

    // YouTube API errors
    if (errorMessage.includes('youtube')) {
      return 'YouTube API error. Please reconnect your YouTube account.'
    }

    // Generic error message
    return error.message || 'An unexpected error occurred. Please try again.'
  }

  return 'An unexpected error occurred. Please try again.'
}

/**
 * Handle and log errors consistently
 */
export function handleError(
  error: Error | AppError | unknown,
  context?: string,
  additionalInfo?: Record<string, any>
): void {
  const errorMessage = error instanceof Error ? error.message : String(error)
  const errorContext = {
    context,
    ...additionalInfo,
  }

  logger.error(errorMessage, error instanceof Error ? error : undefined, errorContext)
}

/**
 * Async error wrapper for handling errors in async functions
 */
export function asyncErrorHandler<T extends (...args: any[]) => Promise<any>>(
  fn: T,
  context?: string
): T {
  return (async (...args: Parameters<T>) => {
    try {
      return await fn(...args)
    } catch (error) {
      handleError(error, context || fn.name)
      throw error
    }
  }) as T
}

/**
 * Determine error type from error object
 */
export function getErrorType(error: Error | unknown): ErrorType {
  if (!(error instanceof Error)) {
    return ErrorType.UNKNOWN
  }

  const message = error.message.toLowerCase()

  if (message.includes('network') || message.includes('fetch')) {
    return ErrorType.NETWORK
  }
  if (message.includes('wallet') || message.includes('petra')) {
    return ErrorType.WALLET
  }
  if (message.includes('auth') || message.includes('unauthorized')) {
    return ErrorType.AUTHENTICATION
  }
  if (message.includes('aptos') || message.includes('transaction') || message.includes('fa') || message.includes('fungible')) {
    return ErrorType.BLOCKCHAIN
  }
  if (message.includes('api') || message.includes('response')) {
    return ErrorType.API
  }
  if (message.includes('invalid') || message.includes('validation')) {
    return ErrorType.VALIDATION
  }

  return ErrorType.UNKNOWN
}

/**
 * Check if error should retry
 */
export function shouldRetry(error: Error | unknown): boolean {
  const errorType = getErrorType(error)
  return errorType === ErrorType.NETWORK || errorType === ErrorType.API
}

/**
 * Retry function with exponential backoff
 */
export async function retryWithBackoff<T>(
  fn: () => Promise<T>,
  maxRetries = 3,
  initialDelay = 1000
): Promise<T> {
  let lastError: Error | unknown

  for (let attempt = 0; attempt < maxRetries; attempt++) {
    try {
      return await fn()
    } catch (error) {
      lastError = error

      if (!shouldRetry(error) || attempt === maxRetries - 1) {
        throw error
      }

      const delay = initialDelay * Math.pow(2, attempt)
      logger.warn(`Retry attempt ${attempt + 1}/${maxRetries} after ${delay}ms`)
      await new Promise((resolve) => setTimeout(resolve, delay))
    }
  }

  throw lastError
}

/**
 * Safe JSON parse with error handling
 */
export function safeJsonParse<T = any>(jsonString: string, defaultValue: T): T {
  try {
    return JSON.parse(jsonString) as T
  } catch (error) {
    handleError(error, 'safeJsonParse', { jsonString })
    return defaultValue
  }
}

/**
 * Check if error is opetrational (expected) or programming error
 */
export function isOpetrationalError(error: Error | AppError | unknown): boolean {
  if (error instanceof AppError) {
    return error.isOpetrational
  }
  return false
}

