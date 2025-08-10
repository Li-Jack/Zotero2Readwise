/**
 * Hash utility
 * 提供哈希计算功能
 */

/**
 * 计算字符串的哈希值
 * 使用简单的 DJB2 算法
 */
export function hash(str: string): string {
  let hash = 5381;
  
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = ((hash << 5) + hash) + char; // hash * 33 + char
  }
  
  // 转换为正数并返回十六进制字符串
  return (hash >>> 0).toString(16);
}

/**
 * 计算对象的哈希值
 */
export function hashObject(obj: any): string {
  const json = JSON.stringify(obj, Object.keys(obj).sort());
  return hash(json);
}

/**
 * 比较两个哈希值
 */
export function compareHash(hash1: string, hash2: string): boolean {
  return hash1 === hash2;
}
