/**
 * Hash Utility Unit Tests
 * 测试哈希计算、对象哈希和比较功能
 */

import { describe, it, expect } from '@jest/globals';
import { hash, hashObject, compareHash } from '../../src/utils/hash';

describe('Hash Utility', () => {
  describe('hash()', () => {
    it('should generate consistent hash for same string', () => {
      const input = 'test string';
      const hash1 = hash(input);
      const hash2 = hash(input);
      
      expect(hash1).toBe(hash2);
    });

    it('should generate different hashes for different strings', () => {
      const hash1 = hash('string1');
      const hash2 = hash('string2');
      
      expect(hash1).not.toBe(hash2);
    });

    it('should handle empty string', () => {
      const result = hash('');
      expect(result).toBeDefined();
      expect(typeof result).toBe('string');
    });

    it('should handle special characters', () => {
      const result = hash('特殊字符!@#$%^&*()_+{}[]|\\:";\'<>?,./');
      expect(result).toBeDefined();
      expect(typeof result).toBe('string');
    });

    it('should handle unicode characters', () => {
      const result = hash('你好世界 🌍 Hello World');
      expect(result).toBeDefined();
      expect(typeof result).toBe('string');
    });

    it('should handle very long strings', () => {
      const longString = 'a'.repeat(10000);
      const result = hash(longString);
      expect(result).toBeDefined();
      expect(typeof result).toBe('string');
    });

    it('should return hexadecimal string', () => {
      const result = hash('test');
      expect(result).toMatch(/^[0-9a-f]+$/);
    });
  });

  describe('hashObject()', () => {
    it('should generate consistent hash for same object', () => {
      const obj = { a: 1, b: 'test', c: true };
      const hash1 = hashObject(obj);
      const hash2 = hashObject(obj);
      
      expect(hash1).toBe(hash2);
    });

    it('should generate same hash for objects with different key order', () => {
      const obj1 = { a: 1, b: 2, c: 3 };
      const obj2 = { c: 3, a: 1, b: 2 };
      
      const hash1 = hashObject(obj1);
      const hash2 = hashObject(obj2);
      
      expect(hash1).toBe(hash2);
    });

    it('should generate different hashes for different objects', () => {
      const obj1 = { a: 1 };
      const obj2 = { a: 2 };
      
      const hash1 = hashObject(obj1);
      const hash2 = hashObject(obj2);
      
      expect(hash1).not.toBe(hash2);
    });

    it('should handle nested objects', () => {
      const obj = {
        level1: {
          level2: {
            level3: 'value'
          }
        }
      };
      
      const result = hashObject(obj);
      expect(result).toBeDefined();
      expect(typeof result).toBe('string');
    });

    it('should handle arrays in objects', () => {
      const obj = {
        numbers: [1, 2, 3],
        strings: ['a', 'b', 'c'],
        mixed: [1, 'a', true, null]
      };
      
      const result = hashObject(obj);
      expect(result).toBeDefined();
      expect(typeof result).toBe('string');
    });

    it('should handle null and undefined values', () => {
      const obj = {
        nullValue: null,
        undefinedValue: undefined,
        normalValue: 'test'
      };
      
      const result = hashObject(obj);
      expect(result).toBeDefined();
      expect(typeof result).toBe('string');
    });

    it('should handle empty object', () => {
      const result = hashObject({});
      expect(result).toBeDefined();
      expect(typeof result).toBe('string');
    });

    it('should handle Date objects', () => {
      const obj = {
        date: new Date('2024-01-01'),
        timestamp: Date.now()
      };
      
      const result = hashObject(obj);
      expect(result).toBeDefined();
      expect(typeof result).toBe('string');
    });
  });

  describe('compareHash()', () => {
    it('should return true for identical hashes', () => {
      const hash1 = hash('test');
      const hash2 = hash('test');
      
      expect(compareHash(hash1, hash2)).toBe(true);
    });

    it('should return false for different hashes', () => {
      const hash1 = hash('test1');
      const hash2 = hash('test2');
      
      expect(compareHash(hash1, hash2)).toBe(false);
    });

    it('should be case sensitive', () => {
      const hash1 = 'abc123';
      const hash2 = 'ABC123';
      
      expect(compareHash(hash1, hash2)).toBe(false);
    });

    it('should handle empty strings', () => {
      expect(compareHash('', '')).toBe(true);
      expect(compareHash('hash', '')).toBe(false);
      expect(compareHash('', 'hash')).toBe(false);
    });
  });

  describe('Hash collision tests', () => {
    it('should have low collision rate for similar strings', () => {
      const hashes = new Set<string>();
      const collisions = [];
      
      // Generate hashes for similar strings
      for (let i = 0; i < 1000; i++) {
        const str = `annotation_${i}_highlight`;
        const h = hash(str);
        
        if (hashes.has(h)) {
          collisions.push({ string: str, hash: h });
        }
        hashes.add(h);
      }
      
      // Should have no or very few collisions
      expect(collisions.length).toBe(0);
    });

    it('should handle annotation-specific data structures', () => {
      const annotation1 = {
        type: 'highlight',
        text: 'This is important',
        color: 'yellow',
        page: 42,
        timestamp: 1704067200000
      };
      
      const annotation2 = {
        type: 'highlight',
        text: 'This is important',
        color: 'yellow',
        page: 42,
        timestamp: 1704067200001 // Slightly different timestamp
      };
      
      const hash1 = hashObject(annotation1);
      const hash2 = hashObject(annotation2);
      
      // Different timestamps should produce different hashes
      expect(hash1).not.toBe(hash2);
    });
  });
});
