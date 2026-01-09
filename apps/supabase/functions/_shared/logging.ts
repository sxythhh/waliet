// Sanitize sensitive data from logs
// This module provides utilities for safe logging that removes PII

// Patterns to sanitize
const SENSITIVE_PATTERNS: Array<{ pattern: RegExp; replacement: string }> = [
  // Email addresses
  { pattern: /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g, replacement: '[EMAIL]' },
  // Phone numbers (various formats)
  { pattern: /(\+?1?[-.\s]?)?\(?\d{3}\)?[-.\s]?\d{3}[-.\s]?\d{4}/g, replacement: '[PHONE]' },
  // IP addresses
  { pattern: /\b\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}\b/g, replacement: '[IP]' },
  // Credit card numbers
  { pattern: /\b\d{4}[-\s]?\d{4}[-\s]?\d{4}[-\s]?\d{4}\b/g, replacement: '[CARD]' },
  // JWT tokens
  { pattern: /eyJ[a-zA-Z0-9_-]*\.eyJ[a-zA-Z0-9_-]*\.[a-zA-Z0-9_-]*/g, replacement: '[JWT]' },
  // API keys (common patterns)
  { pattern: /\b(sk_|pk_|api_|key_)[a-zA-Z0-9]{20,}/g, replacement: '[API_KEY]' },
  // UUIDs (keep first 8 chars for debugging)
  { pattern: /([a-f0-9]{8})-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}/gi, replacement: '$1-****' },
];

// Sensitive field names to redact in objects
const SENSITIVE_FIELDS = new Set([
  'password',
  'secret',
  'token',
  'api_key',
  'apiKey',
  'authorization',
  'cookie',
  'credit_card',
  'creditCard',
  'ssn',
  'social_security',
  'private_key',
  'privateKey',
]);

// Sanitize a string value
export function sanitizeString(value: string): string {
  let sanitized = value;
  for (const { pattern, replacement } of SENSITIVE_PATTERNS) {
    sanitized = sanitized.replace(pattern, replacement);
  }
  return sanitized;
}

// Recursively sanitize an object
export function sanitizeObject(obj: unknown, depth = 0): unknown {
  // Prevent infinite recursion
  if (depth > 10) return '[MAX_DEPTH]';

  if (obj === null || obj === undefined) return obj;

  if (typeof obj === 'string') {
    return sanitizeString(obj);
  }

  if (typeof obj === 'number' || typeof obj === 'boolean') {
    return obj;
  }

  if (Array.isArray(obj)) {
    return obj.map(item => sanitizeObject(item, depth + 1));
  }

  if (typeof obj === 'object') {
    const sanitized: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(obj)) {
      // Check if field name is sensitive
      if (SENSITIVE_FIELDS.has(key.toLowerCase())) {
        sanitized[key] = '[REDACTED]';
      } else {
        sanitized[key] = sanitizeObject(value, depth + 1);
      }
    }
    return sanitized;
  }

  return '[UNKNOWN_TYPE]';
}

// Safe logging functions that sanitize data
export function safeLog(message: string, data?: unknown): void {
  const sanitizedMessage = sanitizeString(message);
  if (data !== undefined) {
    console.log(sanitizedMessage, sanitizeObject(data));
  } else {
    console.log(sanitizedMessage);
  }
}

export function safeError(message: string, error?: unknown): void {
  const sanitizedMessage = sanitizeString(message);
  if (error instanceof Error) {
    console.error(sanitizedMessage, {
      name: error.name,
      message: sanitizeString(error.message),
      // Don't log stack traces in production
    });
  } else if (error !== undefined) {
    console.error(sanitizedMessage, sanitizeObject(error));
  } else {
    console.error(sanitizedMessage);
  }
}

export function safeWarn(message: string, data?: unknown): void {
  const sanitizedMessage = sanitizeString(message);
  if (data !== undefined) {
    console.warn(sanitizedMessage, sanitizeObject(data));
  } else {
    console.warn(sanitizedMessage);
  }
}

// Utility to create a truncated ID for logging (shows first and last few chars)
export function truncateId(id: string | null | undefined, visibleChars = 8): string {
  if (!id) return '[NULL]';
  if (id.length <= visibleChars * 2) return id;
  return `${id.substring(0, visibleChars)}...${id.substring(id.length - 4)}`;
}
