
import { z } from 'zod';
import DOMPurify from 'isomorphic-dompurify';
import { logger } from './logger';

interface SanitizationOptions {
  allowedTags?: string[];
  allowedAttributes?: string[];
  maxLength?: number;
  stripScripts?: boolean;
}

export class InputSanitizer {
  private static readonly DEFAULT_MAX_LENGTH = 10000;
  private static readonly SQL_INJECTION_PATTERNS = [
    /(\b(SELECT|INSERT|UPDATE|DELETE|DROP|CREATE|ALTER|EXEC|UNION)\b)/gi,
    /(--|\/\*|\*\/|;)/g,
    /(\b(OR|AND)\s+\d+\s*=\s*\d+)/gi,
    /('|(\\')|('')|(\\")|(")|(\\""))/g
  ];

  private static readonly XSS_PATTERNS = [
    /<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi,
    /<iframe\b[^<]*(?:(?!<\/iframe>)<[^<]*)*<\/iframe>/gi,
    /javascript:/gi,
    /on\w+\s*=/gi,
    /<object\b[^<]*(?:(?!<\/object>)<[^<]*)*<\/object>/gi
  ];

  static sanitizeString(
    input: string, 
    options: SanitizationOptions = {}
  ): string {
    if (!input || typeof input !== 'string') {
      return '';
    }

    const {
      maxLength = this.DEFAULT_MAX_LENGTH,
      stripScripts = true
    } = options;

    // Length validation
    if (input.length > maxLength) {
      logger.warn('Input exceeds maximum length', { 
        inputLength: input.length, 
        maxLength,
        truncated: true 
      });
      input = input.substring(0, maxLength);
    }

    // Remove potential SQL injection patterns
    for (const pattern of this.SQL_INJECTION_PATTERNS) {
      if (pattern.test(input)) {
        logger.warn('Potential SQL injection attempt detected', { 
          input: input.substring(0, 100),
          pattern: pattern.toString() 
        });
        input = input.replace(pattern, '');
      }
    }

    // Remove XSS patterns
    for (const pattern of this.XSS_PATTERNS) {
      if (pattern.test(input)) {
        logger.warn('Potential XSS attempt detected', { 
          input: input.substring(0, 100),
          pattern: pattern.toString() 
        });
        input = input.replace(pattern, '');
      }
    }

    // HTML sanitization
    if (stripScripts) {
      input = DOMPurify.sanitize(input, {
        ALLOWED_TAGS: options.allowedTags || [],
        ALLOWED_ATTR: options.allowedAttributes || [],
        FORBID_SCRIPTS: true,
        FORBID_TAGS: ['script', 'object', 'embed', 'iframe'],
        STRIP_COMMENTS: true
      });
    }

    return input.trim();
  }

  static sanitizeObject<T extends Record<string, any>>(
    obj: T,
    schema?: z.ZodSchema<T>
  ): T {
    if (!obj || typeof obj !== 'object') {
      return {} as T;
    }

    const sanitized = {} as T;

    for (const [key, value] of Object.entries(obj)) {
      if (typeof value === 'string') {
        sanitized[key as keyof T] = this.sanitizeString(value) as T[keyof T];
      } else if (typeof value === 'object' && value !== null) {
        sanitized[key as keyof T] = this.sanitizeObject(value) as T[keyof T];
      } else {
        sanitized[key as keyof T] = value;
      }
    }

    // Schema validation if provided
    if (schema) {
      try {
        return schema.parse(sanitized);
      } catch (error) {
        logger.error('Schema validation failed after sanitization', { 
          error: error instanceof Error ? error.message : 'Unknown error',
          input: obj 
        });
        throw new Error('Invalid input data');
      }
    }

    return sanitized;
  }

  static validateAndSanitizeArray<T>(
    arr: unknown[],
    itemValidator: (item: unknown) => T,
    maxItems = 1000
  ): T[] {
    if (!Array.isArray(arr)) {
      return [];
    }

    if (arr.length > maxItems) {
      logger.warn('Array exceeds maximum allowed items', { 
        arrayLength: arr.length, 
        maxItems 
      });
      arr = arr.slice(0, maxItems);
    }

    return arr.map(itemValidator).filter(Boolean);
  }

  static isValidEmail(email: string): boolean {
    const emailRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
    return emailRegex.test(email) && email.length <= 320; // RFC 5321 limit
  }

  static isValidPhoneNumber(phone: string): boolean {
    const phoneRegex = /^\+?[\d\s\-\(\)]{10,15}$/;
    return phoneRegex.test(phone);
  }

  static sanitizeFilename(filename: string): string {
    return filename
      .replace(/[^a-zA-Z0-9._-]/g, '_')
      .replace(/_{2,}/g, '_')
      .substring(0, 255);
  }
}
