/**
 * Security Utilities
 * 安全相关的工具函数
 */

import * as crypto from 'crypto';

/**
 * Check if running in a secure context
 */
export function isSecureContext(): boolean {
  // Check for HTTPS or local context
  if (typeof window !== 'undefined') {
    const protocol = window.location?.protocol;
    return protocol === 'https:' || 
           protocol === 'chrome:' || 
           protocol === 'zotero:' ||
           window.location?.hostname === 'localhost' ||
           window.location?.hostname === '127.0.0.1';
  }
  
  // In Node.js or Zotero desktop, assume secure
  return true;
}

/**
 * Sanitize URL to prevent XSS and injection attacks
 */
export function sanitizeUrl(url: string): string | null {
  if (!url) return null;
  
  // Remove any javascript: or data: protocols
  if (url.match(/^(javascript|data|vbscript|file):/i)) {
    return null;
  }
  
  // Ensure URL starts with allowed protocols
  const allowedProtocols = ['http:', 'https:', 'zotero:', 'chrome:', 'about:'];
  try {
    const parsedUrl = new URL(url);
    if (!allowedProtocols.includes(parsedUrl.protocol)) {
      return null;
    }
    
    // Remove any potentially dangerous characters
    return parsedUrl.toString().replace(/[<>'"]/g, '');
  } catch {
    // If URL parsing fails, treat as relative URL
    // Remove any dangerous characters
    return url.replace(/[<>'"\\]/g, '');
  }
}

/**
 * Validate API token format
 */
export function validateApiToken(token: string): boolean {
  if (!token || typeof token !== 'string') {
    return false;
  }
  
  const trimmed = token.trim();
  
  // Check basic requirements
  if (trimmed.length < 20 || trimmed.length > 500) {
    return false;
  }
  
  // Check for valid characters (alphanumeric, dash, underscore)
  if (!/^[A-Za-z0-9\-_]+$/.test(trimmed)) {
    return false;
  }
  
  // Check for common invalid patterns
  if (trimmed.includes(' ') || 
      trimmed.includes('\n') || 
      trimmed.includes('\t')) {
    return false;
  }
  
  // Don't allow sequential repeated characters (possible placeholder)
  if (/(.)\1{9,}/.test(trimmed)) {
    return false;
  }
  
  // Don't allow common placeholder values
  const placeholders = [
    'your-token-here',
    'api-token',
    'xxxxxxxx',
    '12345678',
    'abcdefgh',
    'test-token',
    'demo-token'
  ];
  
  if (placeholders.some(p => trimmed.toLowerCase().includes(p))) {
    return false;
  }
  
  return true;
}

/**
 * Hash sensitive data for storage or comparison
 */
export function hashSensitiveData(data: string, salt?: string): string {
  const finalSalt = salt || 'z2r-default-salt';
  return crypto
    .createHash('sha256')
    .update(data + finalSalt)
    .digest('hex');
}

/**
 * Generate a random nonce for security purposes
 */
export function generateNonce(length: number = 32): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  let nonce = '';
  
  if (typeof crypto !== 'undefined' && crypto.getRandomValues) {
    const array = new Uint8Array(length);
    crypto.getRandomValues(array);
    for (let i = 0; i < length; i++) {
      nonce += chars[array[i] % chars.length];
    }
  } else {
    // Fallback for environments without crypto
    for (let i = 0; i < length; i++) {
      nonce += chars[Math.floor(Math.random() * chars.length)];
    }
  }
  
  return nonce;
}

/**
 * Escape HTML to prevent XSS
 */
export function escapeHtml(unsafe: string): string {
  return unsafe
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

/**
 * Check if a string contains potential SQL injection patterns
 */
export function containsSqlInjection(input: string): boolean {
  const sqlPatterns = [
    /(\b(SELECT|INSERT|UPDATE|DELETE|DROP|UNION|ALTER|CREATE)\b)/gi,
    /(--|#|\/\*|\*\/)/g,
    /(\bOR\b\s*\d+\s*=\s*\d+)/gi,
    /(\bAND\b\s*\d+\s*=\s*\d+)/gi,
    /(';|";)/g
  ];
  
  return sqlPatterns.some(pattern => pattern.test(input));
}

/**
 * Sanitize file path to prevent directory traversal
 */
export function sanitizeFilePath(path: string): string {
  // Remove any directory traversal patterns
  return path
    .replace(/\.\./g, '')
    .replace(/\/\//g, '/')
    .replace(/\\/g, '/')
    .replace(/^[\/\\]+/, '');
}

/**
 * Validate email address format
 */
export function validateEmail(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}

/**
 * Create a secure random ID
 */
export function createSecureId(prefix: string = 'id'): string {
  const timestamp = Date.now().toString(36);
  const random = generateNonce(8);
  return `${prefix}_${timestamp}_${random}`;
}

/**
 * Check password strength
 */
export function checkPasswordStrength(password: string): {
  score: number;
  feedback: string[];
} {
  let score = 0;
  const feedback: string[] = [];
  
  // Length check
  if (password.length >= 8) score++;
  if (password.length >= 12) score++;
  if (password.length < 8) {
    feedback.push('Password should be at least 8 characters');
  }
  
  // Complexity checks
  if (/[a-z]/.test(password)) score++;
  if (/[A-Z]/.test(password)) score++;
  if (/[0-9]/.test(password)) score++;
  if (/[^A-Za-z0-9]/.test(password)) score++;
  
  // Common patterns to avoid
  if (/^[0-9]+$/.test(password)) {
    feedback.push('Password should not be only numbers');
    score = Math.max(0, score - 2);
  }
  
  if (/^[a-zA-Z]+$/.test(password)) {
    feedback.push('Password should include numbers or symbols');
    score = Math.max(0, score - 1);
  }
  
  // Check for common passwords
  const commonPasswords = ['password', '12345678', 'qwerty', 'admin', 'letmein'];
  if (commonPasswords.some(common => password.toLowerCase().includes(common))) {
    feedback.push('Password is too common');
    score = 0;
  }
  
  // Provide feedback based on score
  if (score < 3) {
    feedback.push('Consider using a mix of uppercase, lowercase, numbers, and symbols');
  }
  
  return { score: Math.min(5, score), feedback };
}

/**
 * Mask sensitive data for display
 */
export function maskSensitiveData(
  data: string, 
  showFirst: number = 3, 
  showLast: number = 3
): string {
  if (!data || data.length <= showFirst + showLast) {
    return '***';
  }
  
  const first = data.substring(0, showFirst);
  const last = data.substring(data.length - showLast);
  const masked = '*'.repeat(Math.max(3, data.length - showFirst - showLast));
  
  return `${first}${masked}${last}`;
}

/**
 * Validate JSON Web Token format (basic check)
 */
export function validateJWT(token: string): boolean {
  const parts = token.split('.');
  
  if (parts.length !== 3) {
    return false;
  }
  
  try {
    // Check if each part is valid base64
    parts.forEach(part => {
      const decoded = atob(part.replace(/-/g, '+').replace(/_/g, '/'));
      if (parts.indexOf(part) < 2) {
        // Header and payload should be valid JSON
        JSON.parse(decoded);
      }
    });
    return true;
  } catch {
    return false;
  }
}

/**
 * Rate limit checker
 */
export class RateLimiter {
  private attempts: Map<string, number[]> = new Map();
  private readonly maxAttempts: number;
  private readonly windowMs: number;
  
  constructor(maxAttempts: number = 5, windowMs: number = 60000) {
    this.maxAttempts = maxAttempts;
    this.windowMs = windowMs;
  }
  
  isAllowed(key: string): boolean {
    const now = Date.now();
    const attempts = this.attempts.get(key) || [];
    
    // Remove old attempts
    const validAttempts = attempts.filter(
      timestamp => now - timestamp < this.windowMs
    );
    
    if (validAttempts.length >= this.maxAttempts) {
      return false;
    }
    
    // Add current attempt
    validAttempts.push(now);
    this.attempts.set(key, validAttempts);
    
    return true;
  }
  
  reset(key: string): void {
    this.attempts.delete(key);
  }
  
  cleanup(): void {
    const now = Date.now();
    
    for (const [key, attempts] of this.attempts.entries()) {
      const validAttempts = attempts.filter(
        timestamp => now - timestamp < this.windowMs
      );
      
      if (validAttempts.length === 0) {
        this.attempts.delete(key);
      } else {
        this.attempts.set(key, validAttempts);
      }
    }
  }
}
